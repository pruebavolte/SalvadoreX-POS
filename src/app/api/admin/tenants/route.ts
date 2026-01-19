import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withRBAC, isRBACEnabled } from "@/lib/rbac";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

const supabase = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['whitelabel:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parentId = searchParams.get("parentId");
    const activeOnly = searchParams.get("active") === "true";

    let query = supabase
      .from("tenants")
      .select(`
        *,
        parent:tenants!parent_id(id, name, slug),
        domains:domains(*)
      `);

    if (type) {
      query = query.eq("type", type);
    }

    if (parentId) {
      query = query.eq("parent_id", parentId);
    }

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data: tenants, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("Error fetching tenants:", error);
      return NextResponse.json(
        { error: "Error al obtener tenants", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ tenants: tenants || [] });
  } catch (error) {
    console.error("Error in GET /api/admin/tenants:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['whitelabel:manage'],
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
          { error: "Solo administradores de plataforma pueden crear tenants" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { name, slug, type, description, parent_id, settings } = body;

    if (!name || !slug || !type) {
      return NextResponse.json(
        { error: "Nombre, slug y tipo son requeridos" },
        { status: 400 }
      );
    }

    const validTypes = ["PLATFORM", "WHITE_LABEL", "BUSINESS", "LOCATION"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Tipo de tenant no válido" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .eq("parent_id", parent_id || null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un tenant con ese slug en este nivel" },
        { status: 400 }
      );
    }

    let path = slug;
    if (parent_id) {
      const { data: parentTenant } = await supabase
        .from("tenants")
        .select("path")
        .eq("id", parent_id)
        .single();

      if (parentTenant?.path) {
        path = `${parentTenant.path}.${slug}`;
      }
    }

    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert({
        name,
        slug,
        type,
        description: description || null,
        parent_id: parent_id || null,
        path,
        settings: settings || {},
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating tenant:", error);
      return NextResponse.json(
        { error: "Error al crear tenant", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tenant creado correctamente",
      tenant,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/tenants:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
