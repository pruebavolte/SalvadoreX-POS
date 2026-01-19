import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

function extractProjectRef(supabaseUrl: string): string | null {
  try {
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const target = searchParams.get("target") || "primary";

    let supabaseUrl: string | undefined;
    
    if (target === "secondary") {
      supabaseUrl = process.env.SUPABASE_URL_2;
    } else {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    }

    if (!supabaseUrl) {
      console.log(`[Supabase URL] No URL configured for target: ${target}`);
      const envVarName = target === "secondary" ? "SUPABASE_URL_2" : "NEXT_PUBLIC_SUPABASE_URL";
      return NextResponse.json(
        { error: `Variable de entorno ${envVarName} no configurada`, configured: false },
        { status: 404 }
      );
    }

    const projectRef = extractProjectRef(supabaseUrl);
    
    if (!projectRef) {
      console.log(`[Supabase URL] Could not extract project ref from URL: ${supabaseUrl}`);
      return NextResponse.json(
        { error: "URL de Supabase invalida - no se pudo extraer el proyecto", configured: false },
        { status: 400 }
      );
    }
    
    console.log(`[Supabase URL] Successfully extracted project ref: ${projectRef} for target: ${target}`);

    const dashboardUrl = `https://supabase.com/dashboard/project/${projectRef}`;
    const tableEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    const settingsUrl = `https://supabase.com/dashboard/project/${projectRef}/settings/api`;

    return NextResponse.json({
      configured: true,
      projectRef,
      urls: {
        dashboard: dashboardUrl,
        tableEditor: tableEditorUrl,
        sqlEditor: sqlEditorUrl,
        apiSettings: settingsUrl,
      },
    });
  } catch (error) {
    console.error("[API] Error getting Supabase URL:", error);
    return NextResponse.json(
      { error: "Error al obtener la URL de Supabase" },
      { status: 500 }
    );
  }
}
