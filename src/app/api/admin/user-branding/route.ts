import { NextRequest, NextResponse } from "next/server";
import { withRBAC } from "@/lib/rbac";
import { supabaseAdmin } from "@/lib/supabase/server";

const supabase = supabaseAdmin as any;

// GET - Obtener datos de branding del tenant de un usuario
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

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    // Buscar el tenant del usuario que sea de tipo WHITE_LABEL
    const { data: userTenant, error: userTenantError } = await supabase
      .from("user_tenants")
      .select(`
        tenant_id,
        role_id,
        tenants:tenant_id (
          id,
          type,
          name,
          slug,
          settings
        ),
        roles:role_id (
          id,
          scope,
          name
        )
      `)
      .eq("user_id", userId)
      .single();

    if (userTenantError || !userTenant) {
      return NextResponse.json({
        isWhiteLabel: false,
        branding: null,
      });
    }

    const tenant = userTenant.tenants;
    const role = userTenant.roles;

    // Verificar si es marca blanca
    const isWhiteLabel = tenant?.type === "WHITE_LABEL" || role?.scope === "WHITE_LABEL";

    if (!isWhiteLabel) {
      return NextResponse.json({
        isWhiteLabel: false,
        branding: null,
      });
    }

    // Buscar el dominio asociado
    const { data: domain } = await supabase
      .from("domains")
      .select("hostname, is_primary")
      .eq("tenant_id", tenant.id)
      .eq("is_primary", true)
      .single();

    const settings = tenant.settings || {};
    const branding = settings.branding || {};

    return NextResponse.json({
      isWhiteLabel: true,
      tenantId: tenant.id,
      branding: {
        platformName: branding.platform_name || tenant.name || "",
        logoUrl: branding.logo_url || "",
        primaryColor: branding.primary_color || "#3b82f6",
        customDomain: domain?.hostname || settings.custom_domain || "",
      },
    });
  } catch (error) {
    console.error("Error fetching user branding:", error);
    return NextResponse.json(
      { error: "Error al obtener datos de branding" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar datos de branding del tenant
export async function PUT(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['users:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const body = await request.json();
    const { tenantId, platformName, logoUrl, primaryColor, customDomain } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId es requerido" },
        { status: 400 }
      );
    }

    // Obtener el tenant actual con nombre
    const { data: currentTenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, settings")
      .eq("id", tenantId)
      .single();

    if (tenantError || !currentTenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    // Preparar nuevos settings
    const currentSettings = currentTenant.settings || {};
    const currentBranding = currentSettings.branding || {};
    const updatedSettings = {
      ...currentSettings,
      custom_domain: customDomain || currentSettings.custom_domain,
      branding: {
        ...currentBranding,
        platform_name: platformName || currentBranding.platform_name || null,
        logo_url: logoUrl !== undefined ? logoUrl : currentBranding.logo_url || null,
        primary_color: primaryColor || currentBranding.primary_color || "#3b82f6",
      },
    };

    // Solo actualizar name si platformName tiene valor
    const updateData: any = {
      settings: updatedSettings,
    };
    if (platformName && platformName.trim()) {
      updateData.name = platformName;
    }

    // Actualizar el tenant
    const { error: updateError } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId);

    if (updateError) {
      console.error("Error updating tenant:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar el tenant" },
        { status: 500 }
      );
    }

    // Actualizar o crear el dominio si se proporcionó
    if (customDomain) {
      // Verificar si ya existe un dominio para este tenant
      const { data: existingDomain } = await supabase
        .from("domains")
        .select("id, hostname")
        .eq("tenant_id", tenantId)
        .eq("is_primary", true)
        .single();

      if (existingDomain) {
        // Actualizar dominio existente
        if (existingDomain.hostname !== customDomain) {
          // Verificar que el nuevo dominio no esté en uso
          const { data: domainInUse } = await supabase
            .from("domains")
            .select("id")
            .eq("hostname", customDomain)
            .neq("tenant_id", tenantId)
            .single();

          if (domainInUse) {
            return NextResponse.json(
              { error: "El dominio ya está en uso por otro tenant" },
              { status: 400 }
            );
          }

          await supabase
            .from("domains")
            .update({ hostname: customDomain })
            .eq("id", existingDomain.id);
        }
      } else {
        // Verificar que el dominio no esté en uso
        const { data: domainInUse } = await supabase
          .from("domains")
          .select("id")
          .eq("hostname", customDomain)
          .single();

        if (domainInUse) {
          return NextResponse.json(
            { error: "El dominio ya está en uso" },
            { status: 400 }
          );
        }

        // Crear nuevo dominio
        await supabase
          .from("domains")
          .insert({
            tenant_id: tenantId,
            hostname: customDomain,
            is_primary: true,
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Branding actualizado correctamente",
    });
  } catch (error) {
    console.error("Error updating user branding:", error);
    return NextResponse.json(
      { error: "Error al actualizar branding" },
      { status: 500 }
    );
  }
}
