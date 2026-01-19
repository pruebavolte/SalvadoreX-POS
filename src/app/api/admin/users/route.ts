import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/supabase/users";
import { withRBAC } from "@/lib/rbac";
import { supabaseAdmin } from "@/lib/supabase/server";
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

    const usersData = await getAllUsers();

    const users = usersData.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      image: user.image,
      createdAt: user.created_at,
      vertical_id: user.vertical_id || null,
      vertical_name: user.vertical_name || null,
      lastLoginDate: user.last_login_date || null,
      location: user.location || null,
      createdById: user.created_by_id || null,
      createdByName: user.created_by_name || null,
      createdByEmail: user.created_by_email || null,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Error al obtener usuarios", details: error instanceof Error ? error.message : "Unknown error" },
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

    const body = await request.json();
    const { email, firstName, lastName, roleId, verticalId, customDomain, branding } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, nombre y apellido son requeridos" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    let role = null;
    if (roleId) {
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, scope, name")
        .eq("id", roleId)
        .single();
      
      if (roleError || !roleData) {
        return NextResponse.json(
          { error: "El rol seleccionado no existe" },
          { status: 400 }
        );
      }
      role = roleData;
    }

    if (role?.scope === "WHITE_LABEL" && !customDomain) {
      return NextResponse.json(
        { error: "Los usuarios de Marca Blanca requieren un dominio personalizado" },
        { status: 400 }
      );
    }

    if (customDomain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain)) {
        return NextResponse.json(
          { error: "Formato de dominio inválido" },
          { status: 400 }
        );
      }

      const { data: existingDomain } = await supabase
        .from("domains")
        .select("id")
        .eq("hostname", customDomain)
        .single();

      if (existingDomain) {
        return NextResponse.json(
          { error: "El dominio ya está registrado por otro usuario" },
          { status: 400 }
        );
      }
    }

    const tempClerkId = `admin_created_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const currentUser = await getAuthenticatedUser();
    
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        clerk_id: tempClerkId,
        email,
        first_name: firstName,
        last_name: lastName,
        role: "USER",
        vertical_id: verticalId || null,
        created_by_id: currentUser?.id || null,
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Error al crear usuario", details: userError.message },
        { status: 500 }
      );
    }

    let tenantId: string | null = null;
    let tenantCreated = false;

    if (role) {
      if (role.scope === "PLATFORM") {
        tenantId = "00000000-0000-0000-0000-000000000001";
      } else if (role.scope === "WHITE_LABEL" && customDomain) {
        const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
        
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .insert({
            type: "WHITE_LABEL",
            name: branding?.platform_name || `${firstName} ${lastName} - Marca Blanca`,
            slug: `${slug}-${Date.now()}`,
            active: true,
            settings: {
              owner_email: email,
              custom_domain: customDomain,
              branding: {
                platform_name: branding?.platform_name || null,
                logo_url: branding?.logo_url || null,
                primary_color: branding?.primary_color || "#3b82f6",
              },
            },
          })
          .select()
          .single();

        if (tenantError) {
          console.error("Error creating tenant:", tenantError);
          await supabase.from("users").delete().eq("id", user.id);
          return NextResponse.json(
            { error: "Error al crear el tenant de marca blanca", details: tenantError.message },
            { status: 500 }
          );
        }

        tenantId = tenant.id;
        tenantCreated = true;

        const { error: domainError } = await supabase
          .from("domains")
          .insert({
            tenant_id: tenant.id,
            hostname: customDomain,
            is_primary: true,
          });

        if (domainError) {
          console.error("Error creating domain:", domainError);
          await supabase.from("tenants").delete().eq("id", tenant.id);
          await supabase.from("users").delete().eq("id", user.id);
          return NextResponse.json(
            { error: "Error al registrar el dominio", details: domainError.message },
            { status: 500 }
          );
        }
      } else if (role.scope === "BUSINESS" || role.scope === "EMPLOYEE") {
        tenantId = "00000000-0000-0000-0000-000000000001";
      }

      if (tenantId) {
        const { error: userTenantError } = await supabase
          .from("user_tenants")
          .insert({
            user_id: user.id,
            tenant_id: tenantId,
            role_id: roleId,
            status: "active",
          });

        if (userTenantError) {
          console.error("Error assigning user to tenant:", userTenantError);
          if (tenantCreated && tenantId) {
            await supabase.from("domains").delete().eq("tenant_id", tenantId);
            await supabase.from("tenants").delete().eq("id", tenantId);
          }
          await supabase.from("users").delete().eq("id", user.id);
          return NextResponse.json(
            { error: "Error al asignar el rol al usuario", details: userTenantError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado correctamente",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        rbacRole: role?.name || null,
        tenantId: tenantId,
        customDomain: customDomain || null,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/admin/users:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
