import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export async function GET() {
  try {
    const userData = await getAuthenticatedUser();

    if (!userData) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    // Get products for this user
    const { data: myProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name, user_id")
      .eq("user_id", userData.id);

    // Get ALL products (to see if there are products with different user_ids)
    const { data: allProducts, error: allProductsError } = await supabase
      .from("products")
      .select("id, name, user_id")
      .limit(10);

    // Get categories for this user
    const { data: myCategories } = await supabase
      .from("categories")
      .select("id, name, user_id")
      .eq("user_id", userData.id);

    // Get ALL categories
    const { data: allCategories } = await supabase
      .from("categories")
      .select("id, name, user_id")
      .limit(10);

    // Get sales for this user
    const { data: mySales } = await supabase
      .from("sales")
      .select("id, sale_number, user_id, total")
      .eq("user_id", userData.id);

    // Get ALL sales
    const { data: allSales } = await supabase
      .from("sales")
      .select("id, sale_number, user_id, total")
      .limit(10);

    // Get all users to see if there are multiple
    const { data: allUsers } = await supabase
      .from("users")
      .select("id, email, role");

    return NextResponse.json({
      current_user: {
        id: userData.id,
        email: userData.email,
        clerk_id: userData.clerk_id,
        role: userData.role,
      },
      my_data: {
        products_count: myProducts?.length || 0,
        products: myProducts || [],
        categories_count: myCategories?.length || 0,
        categories: myCategories || [],
        sales_count: mySales?.length || 0,
        sales: mySales || [],
      },
      all_data_sample: {
        products_count: allProducts?.length || 0,
        products: allProducts || [],
        categories_count: allCategories?.length || 0,
        categories: allCategories || [],
        sales_count: allSales?.length || 0,
        sales: allSales || [],
      },
      all_users: allUsers || [],
    });
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error.message, details: error },
      { status: 500 }
    );
  }
}
