import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { 
  getSupabaseAdmin, 
  isSecondaryDatabaseConfigured,
  type DatabaseTarget 
} from "@/lib/supabase/factory";

const SYNC_TABLES = [
  'users',
  'categories',
  'products',
  'customers',
  'sales',
  'sale_items',
];

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
    const { direction } = body;

    if (!direction || !["primary-to-secondary", "secondary-to-primary"].includes(direction)) {
      return NextResponse.json(
        { error: "Direccion de sincronizacion invalida" },
        { status: 400 }
      );
    }

    if (!isSecondaryDatabaseConfigured()) {
      return NextResponse.json(
        { error: "La base de datos secundaria no esta configurada" },
        { status: 400 }
      );
    }

    const sourceTarget: DatabaseTarget = direction === "primary-to-secondary" ? "primary" : "secondary";
    const destTarget: DatabaseTarget = direction === "primary-to-secondary" ? "secondary" : "primary";

    const sourceClient = getSupabaseAdmin(sourceTarget);
    const destClient = getSupabaseAdmin(destTarget);

    const syncResults: { table: string; synced: number; error?: string }[] = [];

    for (const tableName of SYNC_TABLES) {
      try {
        const { data: sourceData, error: sourceError } = await sourceClient
          .from(tableName)
          .select('*');

        if (sourceError) {
          syncResults.push({ 
            table: tableName, 
            synced: 0, 
            error: `Error leyendo origen: ${sourceError.message}` 
          });
          continue;
        }

        if (!sourceData || sourceData.length === 0) {
          syncResults.push({ table: tableName, synced: 0 });
          continue;
        }

        const { error: upsertError } = await destClient
          .from(tableName)
          .upsert(sourceData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          syncResults.push({ 
            table: tableName, 
            synced: 0, 
            error: `Error escribiendo destino: ${upsertError.message}` 
          });
          continue;
        }

        syncResults.push({ table: tableName, synced: sourceData.length });
      } catch (e) {
        syncResults.push({ 
          table: tableName, 
          synced: 0, 
          error: e instanceof Error ? e.message : "Error desconocido" 
        });
      }
    }

    const totalSynced = syncResults.reduce((acc, r) => acc + r.synced, 0);
    const hasErrors = syncResults.some(r => r.error);

    return NextResponse.json({
      success: !hasErrors || totalSynced > 0,
      message: hasErrors 
        ? `Sincronizacion parcial: ${totalSynced} registros sincronizados con algunos errores`
        : `Sincronizacion completada: ${totalSynced} registros sincronizados`,
      direction,
      results: syncResults,
    });
  } catch (error) {
    console.error("[API] Error syncing databases:", error);
    return NextResponse.json(
      { error: "Error al sincronizar las bases de datos" },
      { status: 500 }
    );
  }
}
