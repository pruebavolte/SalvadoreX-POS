import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withRBAC, isRBACEnabled } from "@/lib/rbac";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

const supabase = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage', 'users:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { data: roles, error } = await supabase
      .from("roles")
      .select(`
        *,
        role_permissions:role_permissions(
          permission:permissions(*)
        )
      `)
      .order("scope", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching roles:", error);
      return NextResponse.json(
        { error: "Error al obtener roles", details: error.message },
        { status: 500 }
      );
    }

    const rolesWithPermissions = roles?.map((role: any) => ({
      ...role,
      permissions: role.role_permissions?.map((rp: any) => rp.permission) || [],
      role_permissions: undefined,
    })) || [];

    return NextResponse.json({ roles: rolesWithPermissions });
  } catch (error) {
    console.error("Error in GET /api/admin/roles:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    // Legacy check for SUPER_ADMIN when RBAC is disabled
    if (!isRBACEnabled()) {
      const currentUser = await getAuthenticatedUser();
      if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Solo administradores de plataforma pueden crear roles" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { name, slug, scope, description, permission_ids } = body;

    if (!name || !slug || !scope) {
      return NextResponse.json(
        { error: "Nombre, slug y scope son requeridos" },
        { status: 400 }
      );
    }

    const { data: existingRole } = await supabase
      .from("roles")
      .select("id")
      .eq("slug", slug)
      .is("tenant_id", null)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: "Ya existe un rol con ese slug" },
        { status: 400 }
      );
    }

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        name,
        slug,
        scope,
        description: description || null,
        is_system: false,
        tenant_id: null,
      })
      .select()
      .single();

    if (roleError) {
      console.error("Error creating role:", roleError);
      return NextResponse.json(
        { error: "Error al crear rol", details: roleError.message },
        { status: 500 }
      );
    }

    if (permission_ids && permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: role.id,
        permission_id: permissionId,
      }));

      const { error: permError } = await supabase
        .from("role_permissions")
        .insert(rolePermissions);

      if (permError) {
        console.error("Error assigning permissions:", permError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Rol creado correctamente",
      role,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/roles:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
