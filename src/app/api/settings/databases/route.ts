import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { 
  getActiveDatabase, 
  isSecondaryDatabaseConfigured,
  getDatabaseConfig,
  getSupabaseClient,
  type DatabaseTarget 
} from "@/lib/supabase/factory";
import { cookies } from "next/headers";

const ACTIVE_DB_COOKIE = "salvadorex_active_db";

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname.slice(0, 8)}...`;
  } catch {
    return "***";
  }
}

export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const cookieStore = await cookies();
    const savedDb = cookieStore.get(ACTIVE_DB_COOKIE)?.value as DatabaseTarget | undefined;
    const activeDatabase = savedDb || getActiveDatabase();

    const primaryConfig = getDatabaseConfig("primary");
    const secondaryConfig = getDatabaseConfig("secondary");

    const databases = [
      {
        target: "primary" as const,
        name: "Principal",
        configured: Boolean(primaryConfig.url && primaryConfig.anonKey),
        connected: false,
        url: primaryConfig.url ? maskUrl(primaryConfig.url) : undefined,
      },
      {
        target: "secondary" as const,
        name: "Secundaria",
        configured: isSecondaryDatabaseConfigured(),
        connected: false,
        url: secondaryConfig.url ? maskUrl(secondaryConfig.url) : undefined,
      },
    ];

    for (const db of databases) {
      if (db.configured) {
        try {
          const client = getSupabaseClient(db.target);
          const { error } = await client.rpc('version').maybeSingle();
          if (error) {
            const { error: tableError } = await client.from("users").select("id").limit(1);
            db.connected = !tableError;
          } else {
            db.connected = true;
          }
        } catch (e) {
          db.connected = false;
        }
      }
    }

    return NextResponse.json({
      activeDatabase,
      databases,
    });
  } catch (error) {
    console.error("[API] Error fetching database config:", error);
    return NextResponse.json(
      { error: "Failed to fetch database configuration" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { activeDatabase } = body;

    if (!activeDatabase || !["primary", "secondary"].includes(activeDatabase)) {
      return NextResponse.json(
        { error: "Invalid database target" },
        { status: 400 }
      );
    }

    if (activeDatabase === "secondary" && !isSecondaryDatabaseConfigured()) {
      return NextResponse.json(
        { error: "La base de datos secundaria no esta configurada" },
        { status: 400 }
      );
    }

    try {
      const client = getSupabaseClient(activeDatabase as DatabaseTarget);
      const { error } = await client.from("users").select("id").limit(1);
      if (error) {
        return NextResponse.json(
          { error: `No se puede conectar a la base de datos: ${error.message}` },
          { status: 400 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: "Error al verificar conexion con la base de datos" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_DB_COOKIE, activeDatabase, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      activeDatabase,
      message: `Base de datos cambiada a ${activeDatabase}`,
    });
  } catch (error) {
    console.error("[API] Error switching database:", error);
    return NextResponse.json(
      { error: "Failed to switch database" },
      { status: 500 }
    );
  }
}
