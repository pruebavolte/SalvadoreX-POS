import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabaseAdmin } from "@/lib/supabase/server";

const supabase = supabaseAdmin as any;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores de plataforma pueden modificar permisos de roles" },
        { status: 403 }
      );
    }

    const { roleId } = await params;
    const body = await request.json();
    const { permission_ids } = body;

    if (!Array.isArray(permission_ids)) {
      return NextResponse.json(
        { error: "permission_ids debe ser un array" },
        { status: 400 }
      );
    }

    const { data: role } = await supabase
      .from("roles")
      .select("id, is_system")
      .eq("id", roleId)
      .single();

    if (!role) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      );
    }

    if (role.is_system) {
      return NextResponse.json(
        { error: "No se pueden modificar los permisos de roles del sistema" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (deleteError) {
      console.error("Error deleting existing permissions:", deleteError);
      return NextResponse.json(
        { error: "Error al actualizar permisos" },
        { status: 500 }
      );
    }

    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: roleId,
        permission_id: permissionId,
      }));

      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(rolePermissions);

      if (insertError) {
        console.error("Error inserting permissions:", insertError);
        return NextResponse.json(
          { error: "Error al asignar permisos" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Permisos actualizados correctamente",
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/roles/[roleId]/permissions:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
