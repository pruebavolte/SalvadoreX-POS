import { supabaseAdmin } from "./server";

interface TemplateProduct {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_name?: string;
  product_type?: string;
  suggested_price?: number;
  suggested_cost?: number;
  image_url?: string;
}

export async function copyTemplateProductsToUser(
  userId: string,
  verticalId: string
): Promise<{ success: boolean; productsCopied: number; error?: string }> {
  try {
    const supabase = supabaseAdmin as any;

    console.log(`[TemplateProducts] Fetching templates for vertical ${verticalId}`);

    const { data: templateProducts, error: fetchError } = await supabase
      .from("vertical_template_products")
      .select(`
        id,
        name,
        description,
        sku,
        barcode,
        category_name,
        product_type,
        suggested_price,
        suggested_cost,
        image_url
      `)
      .eq("vertical_id", verticalId)
      .eq("is_active", true);

    if (fetchError) {
      console.error("[TemplateProducts] Error fetching templates:", fetchError);
      return { success: false, productsCopied: 0, error: fetchError.message };
    }

    if (!templateProducts || templateProducts.length === 0) {
      console.log(`[TemplateProducts] No templates found for vertical ${verticalId}`);
      return { success: true, productsCopied: 0 };
    }

    console.log(`[TemplateProducts] Found ${templateProducts.length} template(s)`);

    const { data: existingProducts, error: existingError } = await supabase
      .from("products")
      .select("name")
      .eq("user_id", userId);

    if (existingError) {
      console.error("[TemplateProducts] Error checking existing products:", existingError);
    }

    const existingNames = new Set(
      (existingProducts || []).map((p: { name: string }) => p.name.toLowerCase())
    );

    const productsToCreate = (templateProducts as TemplateProduct[])
      .filter((tp) => !existingNames.has(tp.name.toLowerCase()))
      .map((template) => ({
        user_id: userId,
        name: template.name,
        description: template.description || null,
        sku: template.sku || null,
        barcode: template.barcode || null,
        product_type: template.product_type || "normal",
        price: template.suggested_price || 0,
        cost: template.suggested_cost || 0,
        image_url: template.image_url || null,
        active: true,
        copied_from_template_id: template.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

    if (productsToCreate.length === 0) {
      console.log(`[TemplateProducts] All templates already exist for user ${userId}`);
      return { success: true, productsCopied: 0 };
    }

    console.log(`[TemplateProducts] Creating ${productsToCreate.length} product(s)`);

    const { data: inserted, error: insertError } = await supabase
      .from("products")
      .insert(productsToCreate)
      .select("id");

    if (insertError) {
      console.error("[TemplateProducts] Error inserting products:", insertError);
      return { success: false, productsCopied: 0, error: insertError.message };
    }

    const copiedCount = inserted?.length || 0;
    console.log(`[TemplateProducts] Successfully copied ${copiedCount} products to user ${userId}`);

    return { success: true, productsCopied: copiedCount };
  } catch (error) {
    console.error("[TemplateProducts] Unexpected error:", error);
    return {
      success: false,
      productsCopied: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
