import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { Pool } from "pg";

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

    console.log("[Devices GET] User ID:", user.id, "Email:", user.email);

    if (!databaseUrl) {
      console.error("[Devices GET] DATABASE_URL not configured");
      return NextResponse.json({ 
        error: "Configuración de base de datos incompleta" 
      }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const connection = await findTerminalConnectionPg(pool, user.id);

      if (!connection) {
        return NextResponse.json({ 
          error: "No hay conexión activa",
          needsConnection: true 
        }, { status: 400 });
      }

      const devicesResponse = await fetch(
        "https://api.mercadopago.com/point/integration-api/devices",
        {
          headers: {
            "Authorization": `Bearer ${connection.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!devicesResponse.ok) {
        const errorText = await devicesResponse.text();
        console.error("[Devices Fetch Error]", errorText);
        
        if (devicesResponse.status === 401) {
          return NextResponse.json({ 
            error: "Token expirado",
            needsReconnection: true 
          }, { status: 401 });
        }
        
        return NextResponse.json({ 
          error: "Error al obtener dispositivos" 
        }, { status: 500 });
      }

      const devicesData = await devicesResponse.json();
      
      const devices = devicesData.devices?.map((device: any) => ({
        id: device.id,
        pos_id: device.pos_id,
        store_id: device.store_id,
        external_pos_id: device.external_pos_id,
        operating_mode: device.operating_mode,
      })) || [];

      return NextResponse.json({ 
        devices,
        count: devices.length 
      });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("[Get Devices Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener dispositivos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log("[Devices POST] User ID:", user.id, "Email:", user.email);

    const body = await request.json();
    const { deviceId, deviceName } = body;

    if (!deviceId) {
      return NextResponse.json({ error: "Falta deviceId" }, { status: 400 });
    }

    if (!databaseUrl) {
      console.error("[Select Device Error] DATABASE_URL not configured");
      return NextResponse.json({ 
        error: "Configuración de base de datos incompleta" 
      }, { status: 500 });
    }

    const pool = new Pool({ connectionString: databaseUrl });
    
    try {
      const connection = await findTerminalConnectionPg(pool, user.id);

      if (!connection) {
        console.error("[Select Device Error] No connection found for user:", user.id);
        return NextResponse.json({ 
          error: "No hay conexión activa de Mercado Pago",
          needsConnection: true 
        }, { status: 400 });
      }

      console.log("[Devices POST] Found connection ID:", connection.id, "for user_id:", connection.user_id);

      const deviceNameFinal = deviceName || `Terminal ${deviceId}`;

      const result = await pool.query(
        `UPDATE terminal_connections 
         SET selected_device_id = $1, 
             selected_device_name = $2, 
             updated_at = NOW() 
         WHERE id = $3::uuid 
         RETURNING id`,
        [deviceId, deviceNameFinal, connection.id]
      );
      
      console.log("[Devices POST] Device saved successfully via pg. Rows updated:", result.rowCount);
      
      if (result.rowCount === 0) {
        return NextResponse.json({ 
          error: "No se encontró la conexión para actualizar" 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true,
        deviceId,
        deviceName: deviceNameFinal
      });
    } finally {
      await pool.end();
    }
  } catch (error: any) {
    console.error("[Select Device Error] Exception:", error);
    return NextResponse.json(
      { error: error.message || "Error al seleccionar dispositivo" },
      { status: 500 }
    );
  }
}
