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
        { valid: false, error: "URL, Anon Key, y Service Role Key son requeridos" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { valid: false, error: "URL invalida" },
        { status: 400 }
      );
    }

    if (!url.includes("supabase.co")) {
      return NextResponse.json(
        { valid: false, error: "La URL debe ser de Supabase (*.supabase.co)" },
        { status: 400 }
      );
    }

    try {
      const testClient = createClient(url, serviceRoleKey);
      
      const { error } = await testClient.rpc('version').maybeSingle();
      
      if (error) {
        const { error: tableError } = await testClient.from("users").select("id").limit(1);
        
        if (tableError && !tableError.message.includes("does not exist")) {
          return NextResponse.json({
            valid: false,
            error: `Error de conexion: ${tableError.message}`
          });
        }
      }

      return NextResponse.json({
        valid: true,
        message: "Conexion validada exitosamente"
      });
    } catch (e) {
      return NextResponse.json({
        valid: false,
        error: "No se pudo conectar a la base de datos. Verifica las credenciales."
      });
    }
  } catch (error) {
    console.error("[API] Error validating connection:", error);
    return NextResponse.json(
      { valid: false, error: "Error al validar la conexion" },
      { status: 500 }
    );
  }
}
