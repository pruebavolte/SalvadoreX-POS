import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
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

    const supabase = supabaseAdmin as any;
    const { searchParams } = new URL(request.url);
    const verticalId = searchParams.get("verticalId");

    let query = supabase
      .from("vertical_template_products")
      .select(`
        id,
        vertical_id,
        source_product_id,
        name,
        description,
        sku,
        barcode,
        category_name,
        product_type,
        suggested_price,
        suggested_cost,
        image_url,
        is_active,
        display_order,
        created_at,
        verticals(id, name)
      `)
      .order("display_order", { ascending: true });

    if (verticalId) {
      query = query.eq("vertical_id", verticalId);
    }

    const { data: templateProducts, error } = await query;

    if (error) {
      console.error("Error fetching template products:", error);
      return NextResponse.json(
        { error: "Error al obtener productos plantilla" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templateProducts: templateProducts || [] });
  } catch (error) {
    console.error("Error fetching template products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos plantilla" },
      { status: 500 }
    );
  }
}

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
    const { productId, verticalIds, action, vertical_id, name, description, sku, barcode, category_name, product_type, suggested_price, suggested_cost, image_url } = body;

    const supabase = supabaseAdmin as any;

    // Handle copying existing product to verticals (check this FIRST before direct creation)
    if (productId && verticalIds && Array.isArray(verticalIds) && action !== "create_direct") {
      const { data: product, error: productError } = await supabase
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
          categories(name)
        `)
        .eq("id", productId)
        .single();

      if (productError || !product) {
        console.error("Error fetching product:", productError);
        return NextResponse.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }

      if (action === "remove") {
        const { error: deleteError } = await supabase
          .from("vertical_template_products")
          .delete()
          .eq("source_product_id", productId)
          .in("vertical_id", verticalIds);

        if (deleteError) {
          console.error("Error removing template products:", deleteError);
          return NextResponse.json(
            { error: "Error al eliminar productos plantilla" },
            { status: 500 }
          );
        }

        return NextResponse.json({ 
          success: true, 
          message: `Producto eliminado de ${verticalIds.length} giro(s) de negocio` 
        });
      }

      const templateRecords = verticalIds.map((verticalId: string) => ({
        vertical_id: verticalId,
        source_product_id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        category_name: product.categories?.name || null,
        product_type: product.product_type || 'normal',
        suggested_price: product.price || 0,
        suggested_cost: product.cost || 0,
        image_url: product.image_url,
        is_active: true,
        display_order: 0,
        created_by: currentUser.id,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("vertical_template_products")
        .upsert(templateRecords, { 
          onConflict: 'vertical_id,source_product_id',
          ignoreDuplicates: false 
        })
        .select();

      if (insertError) {
        console.error("Error inserting template products:", insertError);
        return NextResponse.json(
          { error: "Error al agregar productos plantilla", details: insertError.message },
          { status: 500 }
        );
      }

      await supabase
        .from("products")
        .update({ is_template_source: true })
        .eq("id", productId);

      return NextResponse.json({ 
        success: true, 
        message: `Producto agregado a ${verticalIds.length} giro(s) de negocio`,
        templateProducts: inserted
      });
    }

    // Handle direct creation of template product (not from existing product)
    if (action === "create_direct" || (vertical_id && name)) {
      if (!vertical_id) {
        return NextResponse.json(
          { error: "Se requiere el ID del giro de negocio" },
          { status: 400 }
        );
      }

      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: "Se requiere el nombre del producto" },
          { status: 400 }
        );
      }

      const { data: existingCount } = await supabase
        .from("vertical_template_products")
        .select("id", { count: "exact", head: true })
        .eq("vertical_id", vertical_id);

      const templateId = crypto.randomUUID();
      const templateRecord = {
        id: templateId,
        vertical_id,
        source_product_id: templateId, // Self-referencing indicates directly created template
        name: name.trim(),
        description: description || null,
        sku: sku || null,
        barcode: barcode || null,
        category_name: category_name || null,
        product_type: product_type || "normal",
        suggested_price: suggested_price || 0,
        suggested_cost: suggested_cost || 0,
        image_url: image_url || null,
        is_active: true,
        display_order: (existingCount?.length || 0) + 1,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from("vertical_template_products")
        .insert(templateRecord)
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting template product:", insertError);
        return NextResponse.json(
          { error: "Error al crear producto plantilla", details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Producto plantilla creado correctamente",
        templateProduct: inserted,
      });
    }

    // If we reach here, the request is malformed
    return NextResponse.json(
      { error: "Solicitud inválida: Se requiere productId con verticalIds para copiar productos, o vertical_id con name para crear directamente" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error managing template products:", error);
    return NextResponse.json(
      { error: "Error al gestionar productos plantilla" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Se requiere el ID del producto plantilla" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin as any;

    const { error: deleteError } = await supabase
      .from("vertical_template_products")
      .delete()
      .eq("id", templateId);

    if (deleteError) {
      console.error("Error deleting template product:", deleteError);
      return NextResponse.json(
        { error: "Error al eliminar producto plantilla" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Producto plantilla eliminado correctamente" 
    });
  } catch (error) {
    console.error("Error deleting template product:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto plantilla" },
      { status: 500 }
    );
  }
}
