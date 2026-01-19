import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRBAC } from "@/lib/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function deriveDomainType(hostname: string): "subdomain" | "custom" {
  return hostname.endsWith(".negocio.international") ? "subdomain" : "custom";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { id } = await params;
    const body = await request.json();
    const { name, businessType, domain, primaryColor, logoUrl } = body;

    // Validate businessType - if provided, it must not be empty after trimming
    const trimmedBusinessType = typeof businessType === "string" ? businessType.trim() : null;
    if (businessType !== undefined && businessType !== null && !trimmedBusinessType) {
      return NextResponse.json(
        { error: "Business type cannot be empty" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (name) {
      updateData.name = name;
    }

    const { data: currentTenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", id)
      .single();

    const currentSettings = (currentTenant?.settings || {}) as Record<string, unknown>;
    const currentBranding = (currentSettings.branding || {}) as Record<string, unknown>;

    const newBranding = {
      ...currentBranding,
      platform_name: name || currentBranding.platform_name,
      primary_color: primaryColor || currentBranding.primary_color,
      logo_url: logoUrl !== undefined ? logoUrl : currentBranding.logo_url,
    };

    // Use trimmed businessType if provided, otherwise keep existing
    const finalBusinessType = trimmedBusinessType || currentSettings.business_type;

    updateData.settings = {
      ...currentSettings,
      branding: newBranding,
      business_type: finalBusinessType,
    };

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (tenantError) {
      console.error("[WhiteLabels] Error updating tenant:", tenantError);
      return NextResponse.json(
        { error: "Error updating brand" },
        { status: 500 }
      );
    }

    let finalDomain = domain;

    if (domain) {
      const { data: existingDomain } = await supabase
        .from("domains")
        .select("id")
        .eq("tenant_id", id)
        .eq("is_primary", true)
        .single();

      if (existingDomain) {
        const { error: updateDomainError } = await supabase
          .from("domains")
          .update({ hostname: domain })
          .eq("id", existingDomain.id);

        if (updateDomainError) {
          console.error("[WhiteLabels] Error updating domain:", updateDomainError);
          return NextResponse.json(
            { error: "Error updating domain. The domain may already be in use." },
            { status: 500 }
          );
        }
      } else {
        const { error: insertDomainError } = await supabase
          .from("domains")
          .insert({
            tenant_id: id,
            hostname: domain,
            is_primary: true,
          });

        if (insertDomainError) {
          console.error("[WhiteLabels] Error creating domain:", insertDomainError);
          return NextResponse.json(
            { error: "Error creating domain. The domain may already be in use." },
            { status: 500 }
          );
        }
      }
    } else {
      const { data: storedDomain } = await supabase
        .from("domains")
        .select("hostname")
        .eq("tenant_id", id)
        .eq("is_primary", true)
        .single();

      finalDomain = storedDomain?.hostname || "";
    }

    const derivedDomainType = finalDomain ? deriveDomainType(finalDomain) : "custom";

    return NextResponse.json({
      brand: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        domainType: derivedDomainType,
        domain: finalDomain,
        primaryColor: newBranding.primary_color as string,
        logoUrl: newBranding.logo_url as string,
        status: finalDomain ? "active" : "pending",
        createdAt: tenant.created_at,
      },
    });
  } catch (error) {
    console.error("[WhiteLabels] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { id } = await params;

    const { error: domainDeleteError } = await supabase
      .from("domains")
      .delete()
      .eq("tenant_id", id);

    if (domainDeleteError) {
      console.error("[WhiteLabels] Error deleting domain:", domainDeleteError);
      return NextResponse.json(
        { error: "Error deleting brand domain" },
        { status: 500 }
      );
    }

    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[WhiteLabels] Error deleting tenant:", error);
      return NextResponse.json(
        { error: "Error deleting brand" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WhiteLabels] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
