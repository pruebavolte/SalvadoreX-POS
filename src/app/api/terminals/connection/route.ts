import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

async function findTerminalConnectionPg(pool: Pool, userId: string) {
  const result = await pool.query(
    `SELECT * FROM terminal_connections 
     WHERE user_id = $1 AND provider = 'mercadopago' 
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!databaseUrl) {
      console.error("[Get Connection] DATABASE_URL not configured");
      return NextResponse.json({ error: "Configuración de base de datos incompleta" }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const connection = await findTerminalConnectionPg(pool, user.id);

      if (!connection) {
        return NextResponse.json({ connected: false });
      }

      const isExpired = connection.token_expires_at && 
        new Date(connection.token_expires_at) < new Date();

      if (isExpired) {
        const refreshed = await refreshToken(pool, connection);
        if (!refreshed) {
          return NextResponse.json({ 
            connected: false,
            expired: true,
            message: "Tu conexión ha expirado. Por favor reconecta."
          });
        }
        
        const updatedResult = await pool.query(
          `SELECT * FROM terminal_connections WHERE id = $1`,
          [connection.id]
        );
        
        return NextResponse.json({
          connected: true,
          connection: sanitizeConnection(updatedResult.rows[0])
        });
      }

      return NextResponse.json({
        connected: true,
        connection: sanitizeConnection(connection)
      });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("[Get Connection Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener conexión" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!databaseUrl) {
      return NextResponse.json({ error: "Configuración de base de datos incompleta" }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const connection = await findTerminalConnectionPg(pool, user.id);
      
      if (connection) {
        await pool.query(
          `DELETE FROM terminal_connections WHERE id = $1`,
          [connection.id]
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("[Delete Connection Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al desconectar" },
      { status: 500 }
    );
  }
}

async function refreshToken(pool: Pool, connection: any): Promise<boolean> {
  const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
  const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;

  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !connection.refresh_token) {
    return false;
  }

  try {
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) return false;

    const tokens = await response.json();

    await pool.query(
      `UPDATE terminal_connections SET
        access_token = $1,
        refresh_token = $2,
        token_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4`,
      [
        tokens.access_token,
        tokens.refresh_token,
        new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        connection.id
      ]
    );

    return true;
  } catch {
    return false;
  }
}

function sanitizeConnection(connection: any) {
  return {
    id: connection.id,
    provider: connection.provider,
    status: connection.status,
    selected_device_id: connection.selected_device_id,
    selected_device_name: connection.selected_device_name,
    connected_at: connection.created_at,
    live_mode: connection.live_mode,
  };
}
