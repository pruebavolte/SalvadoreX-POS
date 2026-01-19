import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { getUserPermissionsInTenant, getUserTenants } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (tenantId) {
      const permissions = await getUserPermissionsInTenant(currentUser.id, tenantId);

      if (!permissions) {
        return NextResponse.json(
          { error: "No se encontraron permisos para este tenant" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        userId: currentUser.id,
        tenantId,
        role: permissions.role,
        permissions: permissions.permissions,
        modules: permissions.modules,
      });
    }

    const userTenants = await getUserTenants(currentUser.id);

    const allPermissions = await Promise.all(
      userTenants.map(async (ut) => {
        const perms = await getUserPermissionsInTenant(currentUser.id, ut.tenant_id);
        return {
          tenantId: ut.tenant_id,
          tenantName: ut.tenant?.name || "",
          tenantSlug: ut.tenant?.slug || "",
          role: perms?.role || null,
          permissions: perms?.permissions || [],
          modules: perms?.modules || [],
        };
      })
    );

    return NextResponse.json({
      userId: currentUser.id,
      tenants: allPermissions,
    });
  } catch (error) {
    console.error("Error in GET /api/me/permissions:", error);
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    );
  }
}
