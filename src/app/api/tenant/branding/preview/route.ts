import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { supabaseAdmin } from "@/lib/supabase/server";

const supabase = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    // For development, allow preview without auth check
    const isDev = process.env.NODE_ENV === "development";
    
    if (!isDev) {
      const { userId: clerkUserId } = await auth();
      
      if (!clerkUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const currentUser = await getUserByClerkId(clerkUserId) as any;
      
      // Only allow ADMIN, SUPER_ADMIN, or WHITE_LABEL users to preview
      if (!currentUser || !["ADMIN", "SUPER_ADMIN", "WHITE_LABEL"].includes(currentUser.role || "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // If WHITE_LABEL, verify they own this tenant
      if (currentUser.role === "WHITE_LABEL" && currentUser.tenant_id !== tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug, type, settings")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.log("[Preview] Tenant not found for ID:", tenantId, "Error:", tenantError?.message);
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const settings = tenant.settings || {};
    const branding = settings.branding || {};

    // Get custom domain if configured
    const { data: domain } = await supabase
      .from("domains")
      .select("hostname")
      .eq("tenant_id", tenantId)
      .eq("is_primary", true)
      .single();

    return NextResponse.json({
      isPlatform: false,
      isPreview: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantType: tenant.type,
      branding: {
        platformName: branding.platform_name || tenant.name || "Mi Plataforma",
        logoUrl: branding.logo_url || "",
        primaryColor: branding.primary_color || "#3b82f6",
        secondaryColor: branding.secondary_color || "#64748b",
        customDomain: domain?.hostname || "",
      },
    });
  } catch (error) {
    console.error("Error fetching tenant branding preview:", error);
    return NextResponse.json(
      { error: "Error fetching branding preview" },
      { status: 500 }
    );
  }
}
