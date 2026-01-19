import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { 
  getSupabaseClient,
  getDatabaseConfig,
  type DatabaseTarget 
} from "@/lib/supabase/factory";

export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get("target") as DatabaseTarget;

    if (!target || !["primary", "secondary"].includes(target)) {
      return NextResponse.json(
        { error: "Invalid database target" },
        { status: 400 }
      );
    }

    const config = getDatabaseConfig(target);
    if (!config.url || !config.anonKey) {
      return NextResponse.json({
        connected: false,
        error: "Base de datos no configurada",
      });
    }

    try {
      const client = getSupabaseClient(target);
      
      const startTime = Date.now();
      const { data, error } = await client.from("users").select("id").limit(1);
      const latency = Date.now() - startTime;

      if (error) {
        return NextResponse.json({
          connected: false,
          error: error.message,
          latency,
        });
      }

      return NextResponse.json({
        connected: true,
        latency,
        message: `Conexion exitosa (${latency}ms)`,
      });
    } catch (e) {
      return NextResponse.json({
        connected: false,
        error: e instanceof Error ? e.message : "Error de conexion desconocido",
      });
    }
  } catch (error) {
    console.error("[API] Error testing database connection:", error);
    return NextResponse.json(
      { error: "Failed to test database connection" },
      { status: 500 }
    );
  }
}
