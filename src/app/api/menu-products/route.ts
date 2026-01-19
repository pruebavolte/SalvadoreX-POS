import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";

// Get menu products
// If restaurantId is provided, get that restaurant's public menu (no auth required)
// Otherwise, get the authenticated user's menu (for admin or customer)
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");

    let query = supabase
      .from("products")
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq("available_in_digital_menu", true)
      .eq("active", true);

    // If restaurantId is provided, filter by it (PUBLIC ACCESS - no auth required)
    if (restaurantId) {
      query = query.eq("user_id", restaurantId);

      const { data: products, error } = await query.order("name");

      if (error) {
        console.error("Error fetching menu products:", error);
        return NextResponse.json(
          { error: "Error al obtener productos del menú" },
          { status: 500 }
        );
      }

      return NextResponse.json({ products: products || [] });
    }

    // No restaurantId provided - require authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Get the user's UUID and role from Supabase
    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // If user is ADMIN, show their own products
    // If user is CUSTOMER, show products from their restaurant
    let targetUserId = userData.id;

    if (userData.role === "CUSTOMER" && userData.restaurant_id) {
      targetUserId = userData.restaurant_id;
    }

    query = query.eq("user_id", targetUserId);

    const { data: products, error } = await query.order("name");

    if (error) {
      console.error("Error fetching menu products:", error);
      return NextResponse.json(
        { error: "Error al obtener productos del menú" },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error("Error fetching menu products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos del menú" },
      { status: 500 }
    );
  }
}
