import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";

// Types for query results
interface OrderItemData {
  product_id: string | null;
  quantity: number | null;
  orders: {
    user_id: string;
    status: string;
  };
}

interface SaleItemData {
  product_id: string | null;
  quantity: number | null;
  sales: {
    user_id: string;
    status: string;
  };
}

interface ProductWithCategory {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  user_id: string;
  category_id: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  categories: {
    id: string;
    name: string;
  } | null;
}

// Get best-selling products
// If restaurantId is provided, get that restaurant's best sellers (no auth required)
// Otherwise, get the authenticated user's best sellers
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const searchParams = request.nextUrl.searchParams;
    const restaurantId = searchParams.get("restaurantId");

    let targetUserId: string;

    // If restaurantId is provided, use it (PUBLIC ACCESS - no auth required)
    if (restaurantId) {
      targetUserId = restaurantId;
    } else {
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
      targetUserId = userData.id;

      if (userData.role === "CUSTOMER" && userData.restaurant_id) {
        targetUserId = userData.restaurant_id;
      }
    }

    // Get order items (from digital menu orders) grouped by product
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select(`
        product_id,
        quantity,
        orders!inner (
          user_id,
          status
        )
      `)
      .eq("orders.user_id", targetUserId)
      .in("orders.status", ["PENDING", "PREPARING", "READY", "COMPLETED"]);

    if (orderItemsError) {
      console.error("Error fetching order items:", orderItemsError);
    }

    // Get sale items (from POS sales) grouped by product
    const { data: saleItemsData, error: saleItemsError } = await supabase
      .from("sale_items")
      .select(`
        product_id,
        quantity,
        sales!inner (
          user_id,
          status
        )
      `)
      .eq("sales.user_id", targetUserId)
      .in("sales.status", ["pending", "completed"]);

    if (saleItemsError) {
      console.error("Error fetching sale items:", saleItemsError);
    }

    // Type assertions for the data
    const typedOrderItems = orderItemsData as OrderItemData[] | null;
    const typedSaleItems = saleItemsData as SaleItemData[] | null;

    // Aggregate quantities by product_id
    const productSales: Record<string, number> = {};

    // Add order items
    if (typedOrderItems) {
      for (const item of typedOrderItems) {
        if (item.product_id) {
          productSales[item.product_id] =
            (productSales[item.product_id] || 0) + (item.quantity || 0);
        }
      }
    }

    // Add sale items
    if (typedSaleItems) {
      for (const item of typedSaleItems) {
        if (item.product_id) {
          productSales[item.product_id] =
            (productSales[item.product_id] || 0) + (item.quantity || 0);
        }
      }
    }

    // Get product IDs sorted by quantity sold
    const sortedProductIds = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .map(([productId]) => productId);

    if (sortedProductIds.length === 0) {
      return NextResponse.json({ products: [], productSales: {} });
    }

    // Fetch full product details for best sellers
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .in("id", sortedProductIds)
      .eq("active", true);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return NextResponse.json(
        { error: "Error al obtener productos más vendidos" },
        { status: 500 }
      );
    }

    // Type assertion for products
    const typedProducts = (products || []) as ProductWithCategory[];

    // Sort products by sales quantity
    const sortedProducts = typedProducts.sort((a, b) => {
      const salesA = productSales[a.id] || 0;
      const salesB = productSales[b.id] || 0;
      return salesB - salesA;
    });

    return NextResponse.json({
      products: sortedProducts,
      productSales,
    });
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    return NextResponse.json(
      { error: "Error al obtener productos más vendidos" },
      { status: 500 }
    );
  }
}
