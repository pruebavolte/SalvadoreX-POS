import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const term = searchParams.get("term") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const limit = parseInt(searchParams.get("limit") || "500");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = supabaseAdmin;

    // If filtering by categoryId, get all products from that category
    if (categoryId) {
      const { data: products, error, count } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          sku,
          barcode,
          product_type,
          price,
          cost,
          image_url,
          active,
          created_at,
          user_id,
          category_id,
          categories(name)
        `, { count: 'exact' })
        .eq("category_id", categoryId)
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching category products:", error);
        return NextResponse.json(
          { error: "Error al obtener productos de la categoría" },
          { status: 500 }
        );
      }

      const formattedProducts = products?.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        productType: product.product_type,
        price: product.price,
        cost: product.cost,
        imageUrl: product.image_url,
        active: product.active,
        createdAt: product.created_at,
        userId: product.user_id,
        categoryId: product.category_id,
        categoryName: product.categories?.name || null,
      })) || [];

      return NextResponse.json({ 
        products: formattedProducts,
        total: count || 0,
        limit,
        offset
      });
    }

    // If there's a search term, we need to do a more complex query
    // to also search in the category name
    if (term.trim()) {
      const searchPattern = `%${term.trim()}%`;
      
      // First, get category IDs that match the search term
      const { data: matchingCategories } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", searchPattern);
      
      const categoryIds = matchingCategories?.map((c: any) => c.id) || [];
      
      // Build the main products query
      let query = supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          sku,
          barcode,
          product_type,
          price,
          cost,
          image_url,
          active,
          created_at,
          user_id,
          category_id,
          categories(name)
        `, { count: 'exact' });
      
      // Build OR conditions for product fields
      // Use ilike with proper pattern for each field
      if (categoryIds.length > 0) {
        // Search in name, sku, barcode OR category_id matches
        query = query.or(
          `name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern},category_id.in.(${categoryIds.join(',')})`
        );
      } else {
        // Search only in product fields
        query = query.or(
          `name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern}`
        );
      }
      
      const { data: products, error, count } = await query
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Error fetching all products:", error);
        return NextResponse.json(
          { error: "Error al obtener productos" },
          { status: 500 }
        );
      }

      const formattedProducts = products?.map((product: any) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        productType: product.product_type,
        price: product.price,
        cost: product.cost,
        imageUrl: product.image_url,
        active: product.active,
        createdAt: product.created_at,
        userId: product.user_id,
        categoryId: product.category_id,
        categoryName: product.categories?.name || null,
      })) || [];

      return NextResponse.json({ 
        products: formattedProducts,
        total: count || 0,
        limit,
        offset
      });
    }

    // No search term - just get all products with pagination
    const { data: products, error, count } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        sku,
        barcode,
        product_type,
        price,
        cost,
        image_url,
        active,
        created_at,
        user_id,
        category_id,
        categories(name)
      `, { count: 'exact' })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching all products:", error);
      return NextResponse.json(
        { error: "Error al obtener productos" },
        { status: 500 }
      );
    }

    const formattedProducts = products?.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      productType: product.product_type,
      price: product.price,
      cost: product.cost,
      imageUrl: product.image_url,
      active: product.active,
      createdAt: product.created_at,
      userId: product.user_id,
      categoryId: product.category_id,
      categoryName: product.categories?.name || null,
    })) || [];

    return NextResponse.json({ 
      products: formattedProducts,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching all products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
