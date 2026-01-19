import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      barcode,
      sku,
      price,
      cost,
      description,
      category_name,
      unit,
      stock,
      min_stock,
      max_stock,
      image_url,
      active,
      available_in_pos,
      available_in_digital_menu,
      track_inventory,
      product_type,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre del producto es requerido" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin as any;

    const productData: Record<string, any> = {
      user_id: currentUser.id,
      name: name.trim(),
      barcode: barcode || null,
      sku: sku || `SKU-${Date.now()}`,
      price: price || 0,
      cost: cost || 0,
      description: description || null,
      stock: stock || 0,
      min_stock: min_stock || 10,
      max_stock: max_stock || 500,
      image_url: image_url || null,
      active: active !== false,
      available_in_pos: available_in_pos !== false,
      available_in_digital_menu: available_in_digital_menu === true,
      track_inventory: track_inventory !== false,
      product_type: product_type || "normal",
      is_template_source: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (unit) {
      productData.unit = unit;
    }

    if (category_name) {
      productData.category_name = category_name;
    }

    const { data: product, error } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Error al crear el producto", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Producto creado correctamente",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}
