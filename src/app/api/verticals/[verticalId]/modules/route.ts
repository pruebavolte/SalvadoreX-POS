import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { getSupabaseAdmin } from "@/lib/supabase/factory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ verticalId: string }> }
) {
  try {
    const { verticalId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await (supabaseAdmin.from("vertical_module_configs") as any)
      .select(`
        *,
        module:system_modules(*)
      `)
      .eq("vertical_id", verticalId);

    if (error) {
      console.error("Error fetching vertical modules:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in GET vertical modules:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ verticalId: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { verticalId } = await params;
    const body = await req.json();
    const { module_ids } = body as { module_ids: string[] };

    if (!Array.isArray(module_ids)) {
      return NextResponse.json(
        { error: "module_ids debe ser un array" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: existingConfigs, error: fetchError } = await (supabaseAdmin.from("vertical_module_configs") as any)
      .select("id, module_id")
      .eq("vertical_id", verticalId);

    if (fetchError) {
      console.error("Error fetching existing configs:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const existingModuleIds = new Set((existingConfigs || []).map((c: { module_id: string }) => c.module_id));
    const newModuleIds = new Set(module_ids);

    const toAdd = module_ids.filter(id => !existingModuleIds.has(id));
    const toRemove = (existingConfigs || [])
      .filter((c: { module_id: string }) => !newModuleIds.has(c.module_id))
      .map((c: { id: string }) => c.id);

    if (toRemove.length > 0) {
      const { error: deleteError } = await (supabaseAdmin.from("vertical_module_configs") as any)
        .delete()
        .in("id", toRemove);

      if (deleteError) {
        console.error("Error removing module configs:", deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    if (toAdd.length > 0) {
      const newConfigs = toAdd.map((moduleId, index) => ({
        vertical_id: verticalId,
        module_id: moduleId,
        enabled_by_default: true,
        is_required: false,
        is_recommended: false,
        sort_order: (existingConfigs?.length || 0) + index,
      }));

      const { error: insertError } = await (supabaseAdmin.from("vertical_module_configs") as any)
        .insert(newConfigs);

      if (insertError) {
        console.error("Error inserting module configs:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { data: updatedConfigs, error: refetchError } = await (supabaseAdmin.from("vertical_module_configs") as any)
      .select(`
        *,
        module:system_modules(*)
      `)
      .eq("vertical_id", verticalId);

    if (refetchError) {
      console.error("Error refetching configs:", refetchError);
      return NextResponse.json({ error: refetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedConfigs,
      message: `Módulos actualizados: ${toAdd.length} agregados, ${toRemove.length} eliminados`,
    });
  } catch (error) {
    console.error("Error in PUT vertical modules:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
