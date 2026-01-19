import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { BarcodeLookupResult, GlobalProduct, Product } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  generic_name?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

async function searchTenantProducts(barcode: string, userId?: string): Promise<Product | null> {
  let query = supabase
    .from("products")
    .select("*")
    .or(`barcode.eq.${barcode},sku.eq.${barcode}`)
    .eq("active", true)
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching tenant products:", error);
    return null;
  }

  return data?.[0] || null;
}

async function searchGlobalProducts(barcode: string): Promise<GlobalProduct | null> {
  const { data, error } = await supabase
    .from("global_products")
    .select("*")
    .eq("barcode", barcode)
    .limit(1);

  if (error) {
    console.error("Error searching global products:", error);
    return null;
  }

  if (data?.[0]) {
    await supabase
      .from("global_products")
      .update({ 
        lookup_count: (data[0].lookup_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", data[0].id);
  }

  return data?.[0] || null;
}

async function searchOpenFoodFacts(barcode: string): Promise<{
  name: string;
  brand?: string;
  category?: string;
  image_url?: string;
  description?: string;
} | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          "User-Agent": "SalvadoreX-POS/1.0 (contact@salvadorex.com)",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product?.product_name) {
      return null;
    }

    return {
      name: data.product.product_name,
      brand: data.product.brands,
      category: data.product.categories?.split(",")[0]?.trim(),
      image_url: data.product.image_url,
      description: data.product.generic_name,
    };
  } catch (error) {
    console.error("Error fetching from Open Food Facts:", error);
    return null;
  }
}

async function searchUPCItemDB(barcode: string): Promise<{
  name: string;
  brand?: string;
  category?: string;
  image_url?: string;
  description?: string;
} | null> {
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items?.[0]) {
      return null;
    }

    const item = data.items[0];
    return {
      name: item.title || item.brand,
      brand: item.brand,
      category: item.category,
      image_url: item.images?.[0],
      description: item.description,
    };
  } catch (error) {
    console.error("Error fetching from UPC Item DB:", error);
    return null;
  }
}

async function searchEANDB(barcode: string): Promise<{
  name: string;
  brand?: string;
  category?: string;
  image_url?: string;
  description?: string;
} | null> {
  try {
    const response = await fetch(
      `https://ean-db.com/api/v1/product/${barcode}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.product?.name) {
      return null;
    }

    return {
      name: data.product.name,
      brand: data.product.brand,
      category: data.product.category?.name,
      image_url: data.product.image,
      description: data.product.description,
    };
  } catch (error) {
    console.error("Error fetching from EAN-DB:", error);
    return null;
  }
}

async function searchUPCDatabase(barcode: string): Promise<{
  name: string;
  brand?: string;
  category?: string;
  image_url?: string;
  description?: string;
} | null> {
  try {
    const response = await fetch(
      `https://api.upcdatabase.org/product/${barcode}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.title) {
      return null;
    }

    return {
      name: data.title,
      brand: data.brand,
      category: data.category,
      image_url: data.images?.[0],
      description: data.description,
    };
  } catch (error) {
    console.error("Error fetching from UPC Database:", error);
    return null;
  }
}

async function saveToGlobalProducts(
  barcode: string,
  productData: {
    name: string;
    brand?: string;
    category?: string;
    image_url?: string;
    description?: string;
  },
  source: string,
  confidence: number = 0.7
): Promise<GlobalProduct | null> {
  const { data, error } = await supabase
    .from("global_products")
    .insert({
      barcode,
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      image_url: productData.image_url,
      description: productData.description,
      average_price: 0,
      currency: "MXN",
      source,
      source_confidence: confidence,
      lookup_count: 1,
      last_verified_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving to global products:", error);
    return null;
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barcode, userId } = body;

    if (!barcode || typeof barcode !== "string") {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      );
    }

    const cleanBarcode = barcode.trim();

    const tenantProduct = await searchTenantProducts(cleanBarcode, userId);
    if (tenantProduct) {
      const result: BarcodeLookupResult = {
        source: "tenant",
        product: {
          barcode: tenantProduct.barcode || tenantProduct.sku,
          name: tenantProduct.name,
          price: tenantProduct.price,
          currency: tenantProduct.currency,
          category: tenantProduct.category?.name,
          description: tenantProduct.description,
          image_url: tenantProduct.image_url,
          confidence: 1.0,
        },
        message: "Producto encontrado en tu inventario",
      };
      return NextResponse.json(result);
    }

    const globalProduct = await searchGlobalProducts(cleanBarcode);
    if (globalProduct) {
      const result: BarcodeLookupResult = {
        source: "global",
        product: {
          barcode: globalProduct.barcode,
          name: globalProduct.name,
          price: globalProduct.average_price,
          currency: globalProduct.currency,
          category: globalProduct.category,
          brand: globalProduct.brand,
          description: globalProduct.description,
          image_url: globalProduct.image_url,
          confidence: globalProduct.source_confidence,
        },
        message: "Producto encontrado en base de datos global",
      };
      return NextResponse.json(result);
    }

    console.log(`[Barcode Lookup] Searching external APIs for: ${cleanBarcode}`);
    
    let externalProduct = await searchOpenFoodFacts(cleanBarcode);
    let source = "open_food_facts";
    let sourceName = "Open Food Facts";
    let confidence = 0.8;

    if (!externalProduct) {
      console.log("[Barcode Lookup] Not found in Open Food Facts, trying UPC Item DB...");
      externalProduct = await searchUPCItemDB(cleanBarcode);
      source = "upc_item_db";
      sourceName = "UPC Item DB";
      confidence = 0.7;
    }

    if (!externalProduct) {
      console.log("[Barcode Lookup] Not found in UPC Item DB, trying EAN-DB...");
      externalProduct = await searchEANDB(cleanBarcode);
      source = "ean_db";
      sourceName = "EAN Database";
      confidence = 0.75;
    }

    if (!externalProduct) {
      console.log("[Barcode Lookup] Not found in EAN-DB, trying UPC Database...");
      externalProduct = await searchUPCDatabase(cleanBarcode);
      source = "upc_database";
      sourceName = "UPC Database";
      confidence = 0.7;
    }

    if (externalProduct) {
      console.log(`[Barcode Lookup] Found in ${sourceName}:`, externalProduct.name);
      
      const savedProduct = await saveToGlobalProducts(
        cleanBarcode,
        externalProduct,
        source,
        confidence
      );

      const result: BarcodeLookupResult = {
        source: "external",
        product: {
          barcode: cleanBarcode,
          name: externalProduct.name,
          price: 0,
          currency: "MXN",
          category: externalProduct.category,
          brand: externalProduct.brand,
          description: externalProduct.description,
          image_url: externalProduct.image_url,
          confidence,
        },
        message: `Producto encontrado en ${sourceName}. Guardado para futuras búsquedas.`,
      };
      return NextResponse.json(result);
    }
    
    console.log("[Barcode Lookup] Product not found in any external API");

    const result: BarcodeLookupResult = {
      source: "not_found",
      message: "Producto no encontrado. Puedes agregarlo manualmente.",
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in barcode lookup:", error);
    return NextResponse.json(
      { error: "Error al buscar código de barras" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const barcode = searchParams.get("barcode");
  const userId = searchParams.get("userId");

  if (!barcode) {
    return NextResponse.json(
      { error: "Barcode is required" },
      { status: 400 }
    );
  }

  const mockRequest = new NextRequest(request.url, {
    method: "POST",
    body: JSON.stringify({ barcode, userId }),
  });

  return POST(mockRequest);
}
