import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";

// GET /api/recipes?product_id=xxx - Get recipes for a product
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required", success: false },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        ingredient:ingredients(*)
      `)
      .eq("product_id", productId)
      .order("created_at");

    if (error) throw error;

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes", success: false },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create or update product recipe
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { product_id, ingredients } = body;

    // Validate required fields
    if (!product_id || !ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json(
        { error: "Product ID and ingredients array are required", success: false },
        { status: 400 }
      );
    }

    // Update product type to 'recipe'
    const { error: productError } = await (supabase
      .from("products") as any)
      .update({ product_type: "recipe" })
      .eq("id", product_id);

    if (productError) throw productError;

    // Delete existing recipes for this product
    const { error: deleteError } = await supabase
      .from("recipes")
      .delete()
      .eq("product_id", product_id);

    if (deleteError) throw deleteError;

    // Insert new recipes
    if (ingredients.length > 0) {
      const recipeData = ingredients.map((ingredient: any) => ({
        product_id,
        ingredient_id: ingredient.ingredient_id,
        quantity: ingredient.quantity,
        unit_name: ingredient.unit_name,
      }));

      const { error: insertError } = await (supabase
        .from("recipes") as any)
        .insert(recipeData);

      if (insertError) throw insertError;
    }

    // Fetch the complete recipe with ingredients
    const { data, error } = await supabase
      .from("recipes")
      .select(`
        *,
        ingredient:ingredients(*)
      `)
      .eq("product_id", product_id);

    if (error) throw error;

    // Get updated product with calculated cost
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    return NextResponse.json(
      {
        data,
        product,
        success: true,
        message: "Recipe saved successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving recipe:", error);
    return NextResponse.json(
      { error: "Failed to save recipe", success: false },
      { status: 500 }
    );
  }
}

// DELETE /api/recipes?product_id=xxx - Delete recipe for a product
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required", success: false },
        { status: 400 }
      );
    }

    // Delete recipes
    const { error: deleteError } = await supabase
      .from("recipes")
      .delete()
      .eq("product_id", productId);

    if (deleteError) throw deleteError;

    // Update product type back to 'simple'
    const { error: productError } = await (supabase
      .from("products") as any)
      .update({ product_type: "simple", calculated_cost: 0 })
      .eq("id", productId);

    if (productError) throw productError;

    return NextResponse.json({
      success: true,
      message: "Recipe deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe", success: false },
      { status: 500 }
    );
  }
}
