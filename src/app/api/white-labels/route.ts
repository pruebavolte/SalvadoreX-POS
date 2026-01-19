import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRBAC } from "@/lib/rbac";
import { createSubdomain } from "@/lib/godaddy";
import { generateLandingPageForTenant } from "@/lib/landing-generator";

function getSupabaseClient() {
  const activeDb = process.env.ACTIVE_SUPABASE_DATABASE || process.env.NEXT_PUBLIC_ACTIVE_SUPABASE_DATABASE || 'primary';
  
  if (activeDb === 'secondary') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL_2 || process.env.SUPABASE_URL_2 || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY_2 || '';
    if (url && key) {
      return createClient(url, key);
    }
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

const supabase = getSupabaseClient();

function deriveDomainType(hostname: string): "subdomain" | "custom" {
  return hostname.endsWith(".negocio.international") ? "subdomain" : "custom";
}

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { data: tenants, error } = await supabase
      .from("tenants")
      .select("id, name, slug, type, settings, created_at")
      .eq("type", "WHITE_LABEL")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[WhiteLabels] Error fetching tenants:", error);
      return NextResponse.json({ error: "Error fetching brands" }, { status: 500 });
    }

    const { data: domains } = await supabase
      .from("domains")
      .select("tenant_id, hostname, is_primary");

    const domainsMap = new Map(
      domains?.map(d => [d.tenant_id, d.hostname]) || []
    );

    const brands = tenants?.map(tenant => {
      const settings = tenant.settings || {} as Record<string, any>;
      const branding = settings.branding || {};
      const domain = domainsMap.get(tenant.id) || "";
      
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        domainType: domain ? deriveDomainType(domain) : "custom",
        domain: domain,
        primaryColor: branding.primary_color || "#3b82f6",
        logoUrl: branding.logo_url || "",
        businessType: settings.business_type || "",
        status: domain ? "active" : "pending",
        createdAt: tenant.created_at,
      };
    }) || [];

    return NextResponse.json({ brands });
  } catch (error) {
    console.error("[WhiteLabels] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const body = await request.json();
    const { name, businessType, domain, primaryColor, logoUrl } = body;

    // Validate and trim required fields
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedBusinessType = typeof businessType === "string" ? businessType.trim() : "";
    const trimmedDomain = typeof domain === "string" ? domain.trim() : "";

    if (!trimmedName || !trimmedDomain || !trimmedBusinessType) {
      return NextResponse.json(
        { error: "Name, business type, and domain are required" },
        { status: 400 }
      );
    }

    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now();

    const { data: platformTenant } = await supabase
      .from("tenants")
      .select("id, path")
      .eq("type", "PLATFORM")
      .single();

    const parentPath = platformTenant?.path || "root";
    const tenantPath = `${parentPath}.${slug.replace(/-/g, "_")}`;

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: trimmedName,
        slug,
        type: "WHITE_LABEL",
        parent_id: platformTenant?.id || null,
        path: tenantPath,
        settings: {
          branding: {
            platform_name: trimmedName,
            primary_color: primaryColor || "#3b82f6",
            logo_url: logoUrl || "",
          },
          business_type: trimmedBusinessType,
        },
      })
      .select()
      .single();

    if (tenantError) {
      console.error("[WhiteLabels] Error creating tenant:", tenantError);
      return NextResponse.json(
        { error: "Error creating brand" },
        { status: 500 }
      );
    }

    const derivedDomainType = deriveDomainType(domain);
    let dnsStatus = { success: false, error: "", details: "" };

    // If it's a subdomain of negocio.international, create it in GoDaddy
    if (derivedDomainType === "subdomain") {
      const subdomain = domain.replace(".negocio.international", "");
      console.log(`[WhiteLabels] Creating subdomain in GoDaddy: ${subdomain}`);
      
      const godaddyResult = await createSubdomain(subdomain);
      dnsStatus = {
        success: godaddyResult.success,
        error: godaddyResult.error || "",
        details: godaddyResult.details || "",
      };

      if (!godaddyResult.success) {
        console.error("[WhiteLabels] GoDaddy subdomain creation failed:", godaddyResult);
        // Don't fail the whole operation, just log the DNS error
        // The domain record will still be created in our database
      } else {
        console.log(`[WhiteLabels] GoDaddy subdomain created successfully: ${godaddyResult.fullDomain}`);
      }
    }

    const { error: domainError } = await supabase
      .from("domains")
      .insert({
        tenant_id: tenant.id,
        hostname: trimmedDomain,
        is_primary: true,
      });

    if (domainError) {
      console.error("[WhiteLabels] Error creating domain:", domainError);
      await supabase.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json(
        { error: "Error creating domain. The domain may already be in use." },
        { status: 500 }
      );
    }

    // Generate landing page asynchronously (fire-and-forget)
    console.log(`[WhiteLabels] Starting landing page generation for ${trimmedName} (${trimmedBusinessType})`);
    generateLandingPageForTenant(tenant.id, trimmedName, trimmedBusinessType)
      .then((result) => {
        if (result.success) {
          console.log(`[WhiteLabels] Landing page generated successfully for ${trimmedName}`);
        } else {
          console.error(`[WhiteLabels] Landing page generation failed for ${trimmedName}:`, result.error);
        }
      })
      .catch((err) => {
        console.error("[WhiteLabels] Error generating landing page:", err);
      });

    return NextResponse.json({
      brand: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        domainType: derivedDomainType,
        domain,
        primaryColor: primaryColor || "#3b82f6",
        logoUrl: logoUrl || "",
        status: dnsStatus.success ? "active" : "pending",
        createdAt: tenant.created_at,
      },
      dns: {
        success: dnsStatus.success,
        error: dnsStatus.error,
        details: dnsStatus.details,
        message: dnsStatus.success 
          ? `Subdominio ${domain} creado exitosamente en GoDaddy. El DNS puede tardar unos minutos en propagarse.`
          : derivedDomainType === "subdomain" 
            ? `Error al crear subdominio: ${dnsStatus.error}. ${dnsStatus.details}`
            : "Los dominios personalizados requieren configuración manual de DNS.",
      },
    });
  } catch (error) {
    console.error("[WhiteLabels] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
