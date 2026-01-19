import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";

// GET /api/returns - Get all returns
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("returns")
      .select(`
        *,
        sale:sales(sale_number, created_at, total),
        customer:customers(name, phone),
        items:return_items(
          id,
          quantity,
          unit_price,
          subtotal,
          product:products(name, sku)
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      limit,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns", success: false },
      { status: 500 }
    );
  }
}

// POST /api/returns - Create a new return
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sale_id, customer_id, items, reason, total } = body;

    // Validate required fields
    if (!sale_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Sale ID and items are required", success: false },
        { status: 400 }
      );
    }

    // Start a transaction by creating the return first
    const { data: returnData, error: returnError } = await (supabase
      .from("returns") as any)
      .insert({
        sale_id,
        customer_id,
        user_id: userId,
        reason,
        subtotal: total || 0,
        tax: total ? total * 0.16 : 0,
        total: total ? total * 1.16 : 0,
        status: "completed",
      })
      .select()
      .single();

    if (returnError) throw returnError;

    // Insert return items
    const returnItems = items.map((item: any) => ({
      return_id: returnData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await (supabase
      .from("return_items") as any)
      .insert(returnItems);

    if (itemsError) throw itemsError;

    // Update product stock (add back returned items)
    for (const item of items) {
      const { error: stockError } = await (supabase.rpc as any)("increment_product_stock", {
        product_id: item.product_id,
        quantity_change: item.quantity,
      });

      if (stockError) {
        console.error("Error updating stock:", stockError);
        // Continue with other items even if one fails
      }
    }

    // Fetch the complete return data with relations
    const { data: completeReturn, error: fetchError } = await (supabase
      .from("returns") as any)
      .select(`
        *,
        sale:sales(sale_number),
        customer:customers(name),
        items:return_items(
          id,
          quantity,
          unit_price,
          subtotal,
          product:products(name, sku)
        )
      `)
      .eq("id", returnData.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(
      { data: completeReturn, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: "Failed to create return", success: false },
      { status: 500 }
    );
  }
}
