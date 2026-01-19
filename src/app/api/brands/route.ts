import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabase } from "@/lib/supabase/client";
import type { Brand, CreateBrandRequest } from "@/types/brand";

// GET /api/brands - List all brands (for super admin) or user's brand
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const brandId = searchParams.get("id");

    // If specific brand requested
    if (brandId) {
      const { data, error } = await supabase
        .from("brands")
        .select("*, vertical:verticals(*)")
        .eq("id", brandId)
        .single();

      if (error) throw error;

      return NextResponse.json({ data, success: true });
    }

    // List all brands
    let query = supabase
      .from("brands")
      .select("*, vertical:verticals(*)", { count: "exact" });

    // If not super admin, only show user's brand
    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      query = query.eq("owner_email", user?.email);
    }

    const { data, error, count } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json({
      data: data as Brand[],
      total: count || 0,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands", success: false },
      { status: 500 }
    );
  }
}

// POST /api/brands - Create new brand
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateBrandRequest = await req.json();
    const { name, slug, description, owner_email, owner_name, vertical_id, plan, branding } = body;

    // Validate required fields
    if (!name || !slug || !owner_email) {
      return NextResponse.json(
        { error: "Missing required fields: name, slug, owner_email", success: false },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existingBrand } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingBrand) {
      return NextResponse.json(
        { error: "Brand slug already exists", success: false },
        { status: 409 }
      );
    }

    // Get vertical default modules if vertical_id provided
    let defaultModules = {};
    let defaultSettings = {};

    if (vertical_id) {
      const { data: vertical } = await (supabase
        .from("verticals") as any)
        .select("default_modules, default_settings")
        .eq("id", vertical_id)
        .single();

      if (vertical) {
        defaultModules = vertical.default_modules || {};
        defaultSettings = vertical.default_settings || {};
      }
    }

    // Create brand
    const { data, error } = await (supabase
      .from("brands") as any)
      .insert({
        name,
        slug,
        description,
        owner_email,
        owner_name,
        vertical_id,
        plan: plan || "free",
        branding: branding || {},
        enabled_modules: defaultModules,
        settings: defaultSettings,
        active: true,
        onboarding_completed: false,
      })
      .select("*, vertical:verticals(*)")
      .single();

    if (error) throw error;

    // Create onboarding record
    await (supabase.from("brand_onboarding") as any).insert({
      brand_id: data.id,
      steps_completed: [],
      current_step: "brand_info",
      completed: false,
    });

    return NextResponse.json(
      { data: data as Brand, success: true },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create brand",
        success: false,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/brands - Update brand
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Brand ID is required", success: false },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated directly
    delete updates.created_at;
    delete updates.total_restaurants;
    delete updates.total_sales;
    delete updates.total_transactions;

    const { data, error } = await (supabase
      .from("brands") as any)
      .update(updates)
      .eq("id", id)
      .select("*, vertical:verticals(*)")
      .single();

    if (error) throw error;

    return NextResponse.json({ data: data as Brand, success: true });
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/brands - Delete brand
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Brand ID is required", success: false },
        { status: 400 }
      );
    }

    // Only super admin or brand owner can delete
    const { data: brand } = await (supabase
      .from("brands") as any)
      .select("owner_email")
      .eq("id", id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found", success: false },
        { status: 404 }
      );
    }

    const isOwner = brand.owner_email === user?.email;
    const isSuperAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to delete this brand", success: false },
        { status: 403 }
      );
    }

    const { error } = await (supabase.from("brands") as any).delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand", success: false },
      { status: 500 }
    );
  }
}
