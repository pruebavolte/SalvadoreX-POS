import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withRBAC, isRBACEnabled } from "@/lib/rbac";
import { assertTenantHierarchy } from "@/lib/rbac/hierarchy-validator";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

const supabase = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['users:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId");

    let query = supabase
      .from("user_tenants")
      .select(`
        *,
        user:users(id, email, first_name, last_name, role, image),
        tenant:tenants(id, name, slug, type),
        role:roles(id, name, slug, scope, is_system)
      `);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: userTenants, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user tenants:", error);
      return NextResponse.json(
        { error: "Error al obtener asignaciones", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ userTenants: userTenants || [] });
  } catch (error) {
    console.error("Error in GET /api/admin/user-tenants:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['users:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId: actorUserId, tenantId: actorTenantId } = rbacResult;

    const body = await request.json();
    const { user_id, tenant_id, role_id } = body;

    if (!user_id || !tenant_id || !role_id) {
      return NextResponse.json(
        { error: "user_id, tenant_id y role_id son requeridos" },
        { status: 400 }
      );
    }

    // Validate tenant hierarchy when RBAC is enabled
    if (isRBACEnabled() && actorTenantId) {
      try {
        await assertTenantHierarchy(actorUserId, actorTenantId, tenant_id);
      } catch (error: any) {
        console.error("[RBAC] Tenant hierarchy validation failed:", error);
        return NextResponse.json(
          { error: error.message || "No puede asignar roles fuera de su jerarquía de tenants" },
          { status: 403 }
        );
      }
    }

    const { data: existing } = await supabase
      .from("user_tenants")
      .select("id")
      .eq("user_id", user_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_tenants")
        .update({
          role_id,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating user tenant:", updateError);
        return NextResponse.json(
          { error: "Error al actualizar asignación" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Asignación actualizada correctamente",
      });
    }

    const { data: userTenant, error } = await supabase
      .from("user_tenants")
      .insert({
        user_id,
        tenant_id,
        role_id,
        status: "active",
        invited_by: actorUserId,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating user tenant:", error);
      return NextResponse.json(
        { error: "Error al crear asignación", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuario asignado correctamente",
      userTenant,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/user-tenants:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['users:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId: actorUserId, tenantId: actorTenantId } = rbacResult;

    // Legacy check for SUPER_ADMIN when RBAC is disabled
    if (!isRBACEnabled()) {
      const currentUser = await getAuthenticatedUser();
      if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Solo administradores de plataforma pueden eliminar asignaciones" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId");

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: "userId y tenantId son requeridos" },
        { status: 400 }
      );
    }

    // Validate tenant hierarchy when RBAC is enabled
    if (isRBACEnabled() && actorTenantId) {
      try {
        await assertTenantHierarchy(actorUserId, actorTenantId, tenantId);
      } catch (error: any) {
        console.error("[RBAC] Tenant hierarchy validation failed:", error);
        return NextResponse.json(
          { error: error.message || "No puede eliminar asignaciones fuera de su jerarquía de tenants" },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from("user_tenants")
      .delete()
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error deleting user tenant:", error);
      return NextResponse.json(
        { error: "Error al eliminar asignación" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Asignación eliminada correctamente",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/user-tenants:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
