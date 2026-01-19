import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const supabase = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get("host") || "";
    const xForwardedHost = request.headers.get("x-forwarded-host") || "";
    
    // Use x-forwarded-host if available (for proxied requests), otherwise use host
    const effectiveHostname = xForwardedHost || hostname;
    
    const cleanHostname = effectiveHostname
      .replace(/^www\./, "")
      .replace(/:\d+$/, "");
    
    console.log("[Branding] Host:", hostname, "X-Forwarded-Host:", xForwardedHost, "Clean:", cleanHostname);
    
    const isLocalDev = 
      cleanHostname.includes("localhost") || 
      cleanHostname.includes("127.0.0.1") ||
      cleanHostname.includes(".replit.dev") ||
      cleanHostname.includes(".replit.app") ||
      cleanHostname.includes(".picard.replit.dev");

    if (isLocalDev) {
      return NextResponse.json({
        isPlatform: true,
        branding: {
          platformName: "SalvadoreX",
          logoUrl: "/icons/logo.svg",
          primaryColor: "#3b82f6",
          secondaryColor: "#64748b",
        },
      });
    }

    const { data: domain, error: domainError } = await supabase
      .from("domains")
      .select("tenant_id, hostname")
      .eq("hostname", cleanHostname)
      .single();

    if (domainError || !domain) {
      return NextResponse.json({
        isPlatform: true,
        branding: {
          platformName: "SalvadoreX",
          logoUrl: "/icons/logo.svg",
          primaryColor: "#3b82f6",
          secondaryColor: "#64748b",
        },
      });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug, type, settings")
      .eq("id", domain.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({
        isPlatform: true,
        branding: {
          platformName: "SalvadoreX",
          logoUrl: "/icons/logo.svg",
          primaryColor: "#3b82f6",
          secondaryColor: "#64748b",
        },
      });
    }

    const settings = tenant.settings || {};
    const branding = settings.branding || {};

    return NextResponse.json({
      isPlatform: false,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantType: tenant.type,
      branding: {
        platformName: branding.platform_name || tenant.name || "Mi Plataforma",
        logoUrl: branding.logo_url || "",
        primaryColor: branding.primary_color || "#3b82f6",
        secondaryColor: branding.secondary_color || "#64748b",
        customDomain: cleanHostname,
      },
    });
  } catch (error) {
    console.error("Error fetching tenant branding:", error);
    return NextResponse.json({
      isPlatform: true,
      branding: {
        platformName: "SalvadoreX",
        logoUrl: "/icons/logo.svg",
        primaryColor: "#3b82f6",
        secondaryColor: "#64748b",
      },
    });
  }
}
