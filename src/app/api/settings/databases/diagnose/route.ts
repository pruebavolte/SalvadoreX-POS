import { NextRequest, NextResponse } from "next/server";
import { 
  getSupabaseAdmin, 
  getDatabaseConfig,
  isSecondaryDatabaseConfigured,
  type DatabaseTarget 
} from "@/lib/supabase/factory";

interface TableInfo {
  name: string;
  rowCount: number;
}

interface DiagnosticResult {
  target: DatabaseTarget;
  configured: boolean;
  connected: boolean;
  projectRef?: string;
  tables: TableInfo[];
  totalRows: number;
  error?: string;
}

function extractProjectRef(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function diagnoseDatabaseTarget(target: DatabaseTarget): Promise<DiagnosticResult> {
  const config = getDatabaseConfig(target);
  
  const result: DiagnosticResult = {
    target,
    configured: false,
    connected: false,
    tables: [],
    totalRows: 0,
  };

  if (target === "secondary" && !isSecondaryDatabaseConfigured()) {
    result.error = "Base de datos secundaria no configurada";
    return result;
  }

  if (!config.url || !config.anonKey) {
    result.error = "URL o clave de Supabase no configurada";
    return result;
  }

  result.configured = true;
  result.projectRef = extractProjectRef(config.url) || undefined;

  try {
    const supabase = getSupabaseAdmin(target);
    
    const tablesToCheck = [
      'users', 'tenants', 'products', 'categories', 'customers', 
      'sales', 'sale_items', 'landing_pages', 'tenant_config'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          result.tables.push({ name: tableName, rowCount: count });
          result.totalRows += count;
        }
      } catch {
        // Table might not exist, skip it
      }
    }
    
    result.connected = true;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Error de conexion";
    result.connected = false;
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment) {
      return NextResponse.json({ error: "Solo disponible en desarrollo" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const target = (searchParams.get("target") as DatabaseTarget) || "primary";
    const checkBoth = searchParams.get("all") === "true";

    if (checkBoth) {
      const [primaryResult, secondaryResult] = await Promise.all([
        diagnoseDatabaseTarget("primary"),
        diagnoseDatabaseTarget("secondary"),
      ]);
      
      return NextResponse.json({
        primary: primaryResult,
        secondary: secondaryResult,
        activeDatabase: process.env.ACTIVE_SUPABASE_DATABASE || "primary",
      });
    }

    const result = await diagnoseDatabaseTarget(target);
    return NextResponse.json(result);

  } catch (error) {
    console.error("[API] Error diagnosing database:", error);
    return NextResponse.json(
      { error: "Error al diagnosticar la base de datos" },
      { status: 500 }
    );
  }
}
