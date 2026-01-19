import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    // Try to find tenant by slug directly
    let { data: tenant, error } = await supabase
      .from("tenants")
      .select("id, name, slug, type, settings")
      .eq("slug", slug)
      .single();

    // If not found, try matching by partial slug (for slugs with timestamp suffix)
    if (!tenant) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, slug, type, settings")
        .ilike("slug", `${slug}-%`);

      if (tenants && tenants.length > 0) {
        tenant = tenants[0];
      }
    }

    // Also try matching by name (lowercase, slugified)
    if (!tenant) {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, slug, type, settings")
        .ilike("name", slug);

      if (tenants && tenants.length > 0) {
        tenant = tenants[0];
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("[Tenants] Error fetching tenant by slug:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
