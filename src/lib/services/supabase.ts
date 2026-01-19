// Supabase service - Conexión real a Supabase
import { supabase } from "@/lib/supabase/client";
import {
  Product,
  Category,
  Customer,
  Sale,
  SaleItem,
  User,
  VariantType,
  ProductVariant,
} from "@/types/database";
import {
  ApiResponse,
  PaginatedResponse,
  ProductFilter,
  CustomerFilter,
  SaleFilter,
} from "@/types/api";

// =================================================================
// PRODUCTS
// =================================================================

export async function getProducts(
  filter?: ProductFilter,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<Product>> {
  try {
    let query = supabase
      .from("products")
      .select("*, category:categories(*)", { count: "exact" });

    // Apply filters
    if (filter) {
      if (filter.user_id) {
        query = query.eq("user_id", filter.user_id);
      }
      if (filter.category_id) {
        query = query.eq("category_id", filter.category_id);
      }
      if (filter.search) {
        query = query.or(
          `name.ilike.%${filter.search}%,sku.ilike.%${filter.search}%,barcode.ilike.%${filter.search}%`
        );
      }
      if (filter.in_stock !== undefined) {
        if (filter.in_stock) {
          query = query.gt("stock", 0);
        } else {
          query = query.eq("stock", 0);
        }
      }
      if (filter.active !== undefined) {
        query = query.eq("active", filter.active);
      }
      if (filter.product_type !== undefined) {
        query = query.eq("product_type", filter.product_type);
      }
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []) as Product[],
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      data: [],
      page,
      limit,
      total: 0,
      totalPages: 0,
    };
  }
}

export async function getProductById(id: string): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      data: data as Product,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Producto no encontrado",
      success: false,
    };
  }
}

export async function createProduct(
  product: Omit<Product, "id" | "created_at" | "updated_at">
): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await (supabase
      .from("products") as any)
      .insert([product])
      .select("*, category:categories(*)")
      .single();

    if (error) throw error;

    return {
      data: data as Product,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear producto",
      success: false,
    };
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await (supabase
      .from("products") as any)
      .update(updates)
      .eq("id", id)
      .select("*, category:categories(*)")
      .single();

    if (error) throw error;

    return {
      data: data as Product,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al actualizar producto",
      success: false,
    };
  }
}

export async function deleteProduct(id: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await (supabase.from("products") as any).delete().eq("id", id);

    if (error) throw error;

    return {
      data: true,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: false,
      error: error.message || "Error al eliminar producto",
      success: false,
    };
  }
}

// =================================================================
// CATEGORIES
// =================================================================

export async function getCategories(): Promise<ApiResponse<Category[]>> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("name");

    if (error) throw error;

    return {
      data: (data || []) as Category[],
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: [],
      error: error.message || "Error al obtener categorías",
      success: false,
    };
  }
}

export async function createCategory(
  category: Omit<Category, "id">
): Promise<ApiResponse<Category>> {
  try {
    const { data, error } = await (supabase
      .from("categories") as any)
      .insert([category])
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as Category,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear categoría",
      success: false,
    };
  }
}

// =================================================================
// CUSTOMERS
// =================================================================

export async function getCustomers(
  filter?: CustomerFilter,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<Customer>> {
  try {
    let query = supabase
      .from("customers")
      .select("*", { count: "exact" });

    // Apply filters
    if (filter) {
      if (filter.search) {
        query = query.or(
          `name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`
        );
      }
      if (filter.has_credit !== undefined) {
        if (filter.has_credit) {
          query = query.gt("credit_balance", 0);
        } else {
          query = query.eq("credit_balance", 0);
        }
      }
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []) as Customer[],
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return {
      data: [],
      page,
      limit,
      total: 0,
      totalPages: 0,
    };
  }
}

export async function getCustomerById(
  id: string
): Promise<ApiResponse<Customer>> {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      data: data as Customer,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Cliente no encontrado",
      success: false,
    };
  }
}

export async function createCustomer(
  customer: Omit<Customer, "id" | "created_at">
): Promise<ApiResponse<Customer>> {
  try {
    const { data, error } = await (supabase
      .from("customers") as any)
      .insert([customer])
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as Customer,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear cliente",
      success: false,
    };
  }
}

export async function updateCustomer(
  id: string,
  updates: Partial<Customer>
): Promise<ApiResponse<Customer>> {
  try {
    const { data, error } = await (supabase
      .from("customers") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as Customer,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al actualizar cliente",
      success: false,
    };
  }
}

export async function deleteCustomer(
  id: string
): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await (supabase.from("customers") as any).delete().eq("id", id);

    if (error) throw error;

    return {
      data: true,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: false,
      error: error.message || "Error al eliminar cliente",
      success: false,
    };
  }
}

// =================================================================
// SALES
// =================================================================

export async function getSales(
  filter?: SaleFilter,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<Sale>> {
  try {
    let query = supabase
      .from("sales")
      .select("*, customer:customers(*)", { count: "exact" });

    // Apply filters
    if (filter) {
      if (filter.customer_id) {
        query = query.eq("customer_id", filter.customer_id);
      }
      if (filter.user_id) {
        query = query.eq("user_id", filter.user_id);
      }
      if (filter.payment_method) {
        query = query.eq("payment_method", filter.payment_method);
      }
      if (filter.status) {
        query = query.eq("status", filter.status);
      }
      if (filter.start_date) {
        query = query.gte("created_at", filter.start_date);
      }
      if (filter.end_date) {
        query = query.lte("created_at", filter.end_date);
      }
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []) as Sale[],
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("Error fetching sales:", error);
    return {
      data: [],
      page,
      limit,
      total: 0,
      totalPages: 0,
    };
  }
}

export async function getSaleById(id: string): Promise<ApiResponse<Sale>> {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select("*, customer:customers(*), sale_items(*)")
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      data: data as Sale,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Venta no encontrada",
      success: false,
    };
  }
}

export async function createSale(
  sale: Omit<Sale, "id" | "sale_number" | "created_at">
): Promise<ApiResponse<Sale>> {
  try {
    // Note: sale_number will be auto-generated by the database trigger
    const { data, error } = await (supabase
      .from("sales") as any)
      .insert([{ ...sale, sale_number: "" }])
      .select("*, customer:customers(*)")
      .single();

    if (error) throw error;

    return {
      data: data as Sale,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear venta",
      success: false,
    };
  }
}

export async function createSaleWithItems(
  sale: Omit<Sale, "id" | "sale_number" | "created_at">,
  items: Omit<SaleItem, "id" | "sale_id">[]
): Promise<ApiResponse<Sale>> {
  try {
    // Create sale
    const { data: saleData, error: saleError } = await (supabase
      .from("sales") as any)
      .insert([{ ...sale, sale_number: "" }])
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items
    const saleItems = items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
      subtotal: item.subtotal,
      sale_id: saleData.id,
    }));

    const { data: insertedSaleItems, error: itemsError } = await (supabase
      .from("sale_items") as any)
      .insert(saleItems)
      .select();

    if (itemsError) throw itemsError;

    // Create sale item variants (if any items have variants)
    if (insertedSaleItems && insertedSaleItems.length > 0) {
      const variantsToInsert: any[] = [];

      items.forEach((item: any, index) => {
        if (item.selectedVariants && item.selectedVariants.length > 0) {
          const saleItemId = insertedSaleItems[index]?.id;
          if (saleItemId) {
            item.selectedVariants.forEach((variant: any) => {
              variantsToInsert.push({
                sale_item_id: saleItemId,
                variant_id: variant.variant_id,
                price_applied: variant.price_applied,
              });
            });
          }
        }
      });

      if (variantsToInsert.length > 0) {
        const { error: variantsError } = await (supabase
          .from("sale_item_variants") as any)
          .insert(variantsToInsert);

        if (variantsError) {
          console.error("Error inserting sale item variants:", variantsError);
          // Don't throw - variants are optional, sale should still complete
        }
      }
    }

    // Update product stock
    for (const item of items) {
      const { error: stockError } = await (supabase.rpc as any)("decrement_stock", {
        product_id: item.product_id,
        quantity: item.quantity,
      });

      // If the RPC doesn't exist, update manually
      if (stockError) {
        // Fetch current product stock
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await (supabase
            .from("products") as any)
            .update({ stock: (product as any).stock - item.quantity })
            .eq("id", item.product_id);
        }
      }
    }

    // Process recipe deductions (automatic ingredient stock deduction for recipe products)
    const { error: recipeError } = await (supabase.rpc as any)("process_recipe_deductions", {
      p_sale_id: saleData.id,
      p_user_id: sale.user_id,
    });

    // Log recipe deduction errors but don't fail the sale
    if (recipeError) {
      console.error("Error processing recipe deductions:", recipeError);
      // Continue with sale completion even if recipe deductions fail
    }

    // Get complete sale data
    const { data: completeSale, error: fetchError } = await supabase
      .from("sales")
      .select("*, customer:customers(*), sale_items(*)")
      .eq("id", saleData.id)
      .single();

    if (fetchError) throw fetchError;

    return {
      data: completeSale as Sale,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear venta",
      success: false,
    };
  }
}

// =================================================================
// SALE ITEMS
// =================================================================

export async function getSaleItems(
  saleId: string
): Promise<ApiResponse<SaleItem[]>> {
  try {
    const { data, error } = await supabase
      .from("sale_items")
      .select("*, product:products(*)")
      .eq("sale_id", saleId);

    if (error) throw error;

    return {
      data: (data || []) as SaleItem[],
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: [],
      error: error.message || "Error al obtener items de venta",
      success: false,
    };
  }
}

// =================================================================
// REPORTS & ANALYTICS
// =================================================================

export async function getLowStockProducts(): Promise<ApiResponse<Product[]>> {
  try {
    const { data, error } = await supabase
      .from("low_stock_products")
      .select("*");

    if (error) throw error;

    return {
      data: (data || []) as Product[],
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: [],
      error: error.message || "Error al obtener productos con stock bajo",
      success: false,
    };
  }
}

export async function getDailySalesReport(
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase.from("daily_sales_report").select("*");

    if (startDate) {
      query = query.gte("sale_date", startDate);
    }
    if (endDate) {
      query = query.lte("sale_date", endDate);
    }

    query = query.order("sale_date", { ascending: false }).limit(30);

    const { data, error } = await query;

    if (error) throw error;

    return {
      data: data || [],
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: [],
      error: error.message || "Error al obtener reporte diario",
      success: false,
    };
  }
}

// =================================================================
// PRODUCT VARIANTS
// =================================================================

export async function getVariantTypes(userId: string): Promise<ApiResponse<VariantType[]>> {
  try {
    const { data, error } = await supabase
      .from("variant_types")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    if (error) throw error;

    return {
      data: (data || []) as VariantType[],
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: [],
      error: error.message || "Error al obtener tipos de variantes",
      success: false,
    };
  }
}

export async function createVariantType(
  variantType: Omit<VariantType, "id" | "created_at">
): Promise<ApiResponse<VariantType>> {
  try {
    const { data, error } = await (supabase
      .from("variant_types") as any)
      .insert([variantType])
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as VariantType,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear tipo de variante",
      success: false,
    };
  }
}

export async function getOrCreateVariantType(
  name: string,
  userId: string
): Promise<ApiResponse<VariantType>> {
  try {
    // First try to find existing
    const { data: existing } = await supabase
      .from("variant_types")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", name)
      .single();

    if (existing) {
      return {
        data: existing as VariantType,
        error: null,
        success: true,
      };
    }

    // Create new
    const { data, error } = await (supabase
      .from("variant_types") as any)
      .insert([{ name, user_id: userId }])
      .select()
      .single();

    if (error) throw error;

    return {
      data: data as VariantType,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al obtener/crear tipo de variante",
      success: false,
    };
  }
}

export async function getProductVariants(
  productId: string
): Promise<ApiResponse<ProductVariant[]>> {
  try {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*, variant_type:variant_types(*)")
      .eq("product_id", productId)
      .eq("active", true)
      .order("sort_order");

    if (error) throw error;

    return {
      data: (data || []) as ProductVariant[],
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: [],
      error: error.message || "Error al obtener variantes del producto",
      success: false,
    };
  }
}

export async function createProductVariant(
  variant: Omit<ProductVariant, "id" | "created_at" | "updated_at">
): Promise<ApiResponse<ProductVariant>> {
  try {
    const { data, error } = await (supabase
      .from("product_variants") as any)
      .insert([variant])
      .select("*, variant_type:variant_types(*)")
      .single();

    if (error) throw error;

    return {
      data: data as ProductVariant,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear variante",
      success: false,
    };
  }
}

export async function updateProductVariant(
  id: string,
  updates: Partial<ProductVariant>
): Promise<ApiResponse<ProductVariant>> {
  try {
    const { data, error } = await (supabase
      .from("product_variants") as any)
      .update(updates)
      .eq("id", id)
      .select("*, variant_type:variant_types(*)")
      .single();

    if (error) throw error;

    return {
      data: data as ProductVariant,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al actualizar variante",
      success: false,
    };
  }
}

export async function deleteProductVariant(id: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await (supabase
      .from("product_variants") as any)
      .delete()
      .eq("id", id);

    if (error) throw error;

    return {
      data: true,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: false,
      error: error.message || "Error al eliminar variante",
      success: false,
    };
  }
}

export async function createProductWithVariants(
  product: Omit<Product, "id" | "created_at" | "updated_at">,
  variants: Array<{
    variant_type_name: string;
    name: string;
    price_modifier: number;
    is_absolute_price: boolean;
    is_default?: boolean;
  }>,
  userId: string
): Promise<ApiResponse<Product>> {
  try {
    // Create product first
    const { data: productData, error: productError } = await (supabase
      .from("products") as any)
      .insert([{ ...product, has_variants: variants.length > 0 }])
      .select("*, category:categories(*)")
      .single();

    if (productError) throw productError;

    // Create variants
    if (variants.length > 0) {
      for (const variant of variants) {
        // Get or create variant type
        const variantTypeResult = await getOrCreateVariantType(
          variant.variant_type_name,
          userId
        );

        if (!variantTypeResult.success || !variantTypeResult.data) {
          console.error("Error creating variant type:", variantTypeResult.error);
          continue;
        }

        // Create product variant
        await (supabase.from("product_variants") as any).insert([{
          product_id: productData.id,
          variant_type_id: variantTypeResult.data.id,
          name: variant.name,
          price_modifier: variant.price_modifier,
          is_absolute_price: variant.is_absolute_price,
          is_default: variant.is_default || false,
          active: true,
          sort_order: 0,
        }]);
      }
    }

    return {
      data: productData as Product,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al crear producto con variantes",
      success: false,
    };
  }
}

export async function getProductWithVariants(
  productId: string
): Promise<ApiResponse<Product>> {
  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("id", productId)
      .single();

    if (productError) throw productError;

    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("*, variant_type:variant_types(*)")
      .eq("product_id", productId)
      .eq("active", true)
      .order("sort_order");

    if (variantsError) throw variantsError;

    return {
      data: { ...(product as any), variants: variants || [] } as Product,
      error: null,
      success: true,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error.message || "Error al obtener producto con variantes",
      success: false,
    };
  }
}
