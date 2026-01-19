import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, anonKey, serviceRoleKey } = body;

    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "URL, Anon Key, y Service Role Key son requeridos" },
        { status: 400 }
      );
    }

    try {
      const testClient = createClient(url, serviceRoleKey);
      const { error } = await testClient.from("users").select("id").limit(1);
      
      if (error && !error.message.includes("does not exist")) {
        return NextResponse.json(
          { error: `Error de conexion: ${error.message}` },
          { status: 400 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: "No se pudo conectar a la base de datos proporcionada" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Base de datos secundaria vinculada exitosamente. Configura las variables de entorno SUPABASE_URL_2, SUPABASE_ANON_KEY_2, y SUPABASE_SERVICE_ROLE_KEY_2 con los valores proporcionados para persistir la configuracion.",
      instructions: {
        SUPABASE_URL_2: url,
        SUPABASE_ANON_KEY_2: "***" + anonKey.slice(-8),
        SUPABASE_SERVICE_ROLE_KEY_2: "***" + serviceRoleKey.slice(-8),
      }
    });
  } catch (error) {
    console.error("[API] Error linking secondary database:", error);
    return NextResponse.json(
      { error: "Error al vincular la base de datos secundaria" },
      { status: 500 }
    );
  }
}
