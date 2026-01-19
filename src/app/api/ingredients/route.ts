import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseClient } from "@/lib/auth-wrapper";

// GET /api/ingredients - Get all ingredients
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock") === "true";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("ingredients")
      .select("*", { count: "exact" });

    // Filters
    if (category) {
      query = query.eq("category", category);
    }

    const { data: allData, error, count } = await query
      .order("name")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Filter low stock items in JavaScript since Supabase doesn't support column comparison directly
    let data = allData;
    if (lowStock && allData) {
      data = allData.filter((item: any) => item.current_stock < item.min_stock);
    }

    return NextResponse.json({
      data,
      total: lowStock ? data?.length || 0 : count || 0,
      page,
      limit,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredients", success: false },
      { status: 500 }
    );
  }
}

// POST /api/ingredients - Create new ingredient
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseClient();

    const body = await req.json();
    const {
      name,
      description,
      sku,
      category,
      current_stock,
      min_stock,
      max_stock,
      unit_type,
      unit_name,
      cost_per_unit,
      restaurant_id,
    } = body;

    // Validate required fields
    if (!name || !sku || !unit_type || !unit_name) {
      return NextResponse.json(
        { error: "Missing required fields (name, sku, unit_type, unit_name)", success: false },
        { status: 400 }
      );
    }

    // Use authenticated user ID if restaurant_id is not provided or is invalid
    const validRestaurantId = (restaurant_id && restaurant_id !== "default") 
      ? restaurant_id 
      : user.id;

    const { data, error } = await (supabase
      .from("ingredients") as any)
      .insert({
        name,
        description,
        sku,
        category,
        current_stock: current_stock || 0,
        min_stock: min_stock || 0,
        max_stock: max_stock || 1000,
        unit_type,
        unit_name,
        cost_per_unit: cost_per_unit || 0,
        restaurant_id: validRestaurantId,
      })
      .select()
      .single();

    if (error) {
      console.error("[Ingredients API] Insert error:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "SKU already exists", success: false },
          { status: 409 }
        );
      }
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Table 'ingredients' does not exist. Please run schema migration.", success: false },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { data, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to create ingredient", success: false },
      { status: 500 }
    );
  }
}

// PATCH /api/ingredients - Update ingredient
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseClient();

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Ingredient ID is required", success: false },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase
      .from("ingredients") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error updating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to update ingredient", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/ingredients - Delete ingredient
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseClient();

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Ingredient ID is required", success: false },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient", success: false },
      { status: 500 }
    );
  }
}
