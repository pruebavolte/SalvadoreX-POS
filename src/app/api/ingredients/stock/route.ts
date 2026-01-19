import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";

// POST /api/ingredients/stock - Adjust ingredient stock
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      ingredient_id,
      quantity,
      transaction_type, // 'purchase', 'adjustment', 'waste'
      notes,
      restaurant_id,
    } = body;

    // Validate required fields
    if (!ingredient_id || quantity === undefined || !transaction_type || !restaurant_id) {
      return NextResponse.json(
        { error: "Missing required fields", success: false },
        { status: 400 }
      );
    }

    // Validate transaction type
    const validTypes = ["purchase", "adjustment", "waste"];
    if (!validTypes.includes(transaction_type)) {
      return NextResponse.json(
        { error: "Invalid transaction type", success: false },
        { status: 400 }
      );
    }

    // Call the update_ingredient_stock function
    const { error } = await (supabase.rpc as any)("update_ingredient_stock", {
      p_ingredient_id: ingredient_id,
      p_quantity: quantity,
      p_transaction_type: transaction_type,
      p_user_id: userId,
      p_restaurant_id: restaurant_id,
      p_sale_id: null,
      p_return_id: null,
      p_product_id: null,
      p_notes: notes || null,
    });

    if (error) {
      console.error("Error updating ingredient stock:", error);
      throw error;
    }

    // Fetch updated ingredient
    const { data: ingredient, error: fetchError } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", ingredient_id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({
      data: ingredient,
      success: true,
      message: "Stock updated successfully",
    });
  } catch (error: any) {
    console.error("Error adjusting ingredient stock:", error);

    // Handle specific errors
    if (error.message && error.message.includes("Insufficient ingredient stock")) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to adjust ingredient stock", success: false },
      { status: 500 }
    );
  }
}
