import { NextRequest, NextResponse } from "next/server";
import { createProduct, getCategories, createCategory, getOrCreateVariantType } from "@/lib/services/supabase";
import { Product, Category } from "@/types/database";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { supabaseAdmin } from "@/lib/supabase/server";

// Helper to insert product variants without type checking
async function insertProductVariant(data: Record<string, unknown>) {
  return await (supabaseAdmin as any)
    .from("product_variants")
    .insert([data]);
}

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
const IMAGE_GENERATION_MODEL = process.env.IMAGE_GENERATION_MODEL || "google/gemini-2.5-flash-image-preview";

// Supabase Storage configuration
const BUCKET_NAME = "product-images";

// Helper function to convert base64 data URL to Buffer
function base64ToBuffer(dataUrl: string): Buffer {
  // Remove data URL prefix (e.g., "data:image/png;base64,")
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Helper function to generate product image using OpenRouter (Gemini)
async function generateProductImage(productName: string, description?: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    console.log(`No OpenRouter API key configured, skipping image generation for "${productName}"`);
    return null;
  }

  try {
    console.log(`🎨 Generating image for: ${productName}`);

    // Create a detailed prompt for food image generation
    const prompt = description
      ? `Create a professional, appetizing photo of ${productName}, ${description}. The image should show restaurant quality presentation, well-plated food, natural lighting, high resolution, professional food photography style. Make it look delicious and appealing.`
      : `Create a professional, appetizing photo of ${productName} dish. The image should show restaurant quality presentation, well-plated food, natural lighting, high resolution, professional food photography style. Make it look delicious and appealing.`;

    // Call OpenRouter API for image generation using Gemini
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "MultiPOS - Menu Digital",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_GENERATION_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        // Enable image generation modality
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter image generation error for "${productName}":`, response.status);
      return null;
    }

    const data = await response.json();

    // Gemini returns images in the message content
    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;

      // Images are returned as base64-encoded data URLs
      if (message.images && message.images.length > 0) {
        const imageData = message.images[0];

        // Log the type and structure for debugging
        console.log(`Image data type: ${typeof imageData}`);

        // Handle different response formats
        let imageDataUrl: string;
        if (typeof imageData === 'string') {
          imageDataUrl = imageData;
        } else if (imageData && typeof imageData === 'object') {
          // Handle Gemini's response format: {type: "image_url", image_url: {url: "..."}}
          if ('image_url' in imageData && imageData.image_url && typeof imageData.image_url === 'object' && 'url' in imageData.image_url) {
            imageDataUrl = (imageData.image_url as any).url;
          } else if ('url' in imageData) {
            imageDataUrl = (imageData as any).url;
          } else if ('data' in imageData) {
            imageDataUrl = (imageData as any).data;
          } else {
            console.error(`Unexpected image format for "${productName}":`, JSON.stringify(imageData).substring(0, 200));
            return null;
          }
        } else {
          console.error(`Unexpected image format for "${productName}":`, JSON.stringify(imageData).substring(0, 200));
          return null;
        }

        console.log(`✓ Generated image for "${productName}" (${imageDataUrl.substring(0, 50)}...)`);
        return imageDataUrl;
      }
    }

    console.log(`No image generated for "${productName}". Response:`, JSON.stringify(data).substring(0, 500));
    return null;
  } catch (error) {
    console.error(`Error generating image for "${productName}":`, error);
    return null;
  }
}

// Helper function to download image and upload to Supabase (server-side compatible)
async function downloadAndUploadImage(imageUrl: string, productName: string, productId?: string): Promise<string | null> {
  try {
    console.log(`📥 Processing image for "${productName}"...`);

    // Validate that imageUrl is actually a string
    if (typeof imageUrl !== 'string') {
      console.error(`Invalid imageUrl type for "${productName}". Expected string, got ${typeof imageUrl}`);
      console.error(`ImageUrl value:`, JSON.stringify(imageUrl).substring(0, 200));
      return null;
    }

    let buffer: Buffer;

    // Check if it's a base64 data URL (from Gemini) or a regular URL
    if (imageUrl.startsWith('data:image/')) {
      // It's a base64 data URL, convert directly to buffer
      buffer = base64ToBuffer(imageUrl);
      console.log(`✓ Converted base64 image for "${productName}"`);
    } else {
      // It's a regular URL, download it
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`Failed to download image for "${productName}"`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log(`✓ Downloaded image for "${productName}"`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedName = productName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `product-${sanitizedName}-${timestamp}-${randomString}.jpg`;
    const filePath = `products/${fileName}`;

    // Upload directly to Supabase using supabaseAdmin
    console.log(`📤 Uploading image for "${productName}"...`);
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading image for "${productName}":`, error.message);
      return null;
    }

    // Get public URL
    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log(`✓ Image uploaded for "${productName}"`);
    return publicData.publicUrl;
  } catch (error) {
    console.error(`Error downloading/uploading image for "${productName}":`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Menu Digitalization Started ===");

    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Get user's UUID from Supabase
    const userData = await getUserByClerkId(userId);
    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const generateAIImages = formData.get("generateAIImages") === "true";

    console.log(`Generate AI Images: ${generateAIImages}`);

    if (!files || files.length === 0) {
      console.error("No files provided");
      return NextResponse.json(
        { error: "No se proporcionaron imágenes" },
        { status: 400 }
      );
    }

    console.log(`Processing ${files.length} image(s)`);

    // Process each image with AI Vision
    const allProducts: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");

        // Create the prompt for menu extraction with variants detection
        const prompt = `Analiza esta imagen de un menú de restaurante y extrae TODOS los productos que veas, incluyendo sus VARIANTES (tamaños, porciones, toppings, extras, etc.).

Para cada producto, proporciona la siguiente información en formato JSON:
- name: nombre del producto base (string)
- description: descripción breve del producto (string, puede ser vacío)
- price: precio base del producto (número, si tiene variantes usa el precio de la variante por defecto)
- category: categoría del producto como "Entradas", "Platos Principales", "Bebidas", "Postres", etc. (string)
- variants: array de variantes del producto (opcional, solo si tiene variantes)

DETECCIÓN DE VARIANTES:
Si un producto tiene múltiples opciones de tamaño, porciones, o precios diferentes:

EJEMPLO 1 - Tamaños con precios absolutos:
"Licuado de plátano: 1 litro $100, 1/2 litro $60"
→ Crear variante tipo "Tamaño" con opciones:
  - "1 litro" (precio absoluto: 100, default: true)
  - "1/2 litro" (precio absoluto: 60, default: false)

EJEMPLO 2 - Toppings o extras con costo adicional:
"Pizza Margarita $150, extras: pepperoni +$20, champiñones +$15"
→ Crear variante tipo "Extra" con opciones:
  - "Pepperoni" (modificador: +20)
  - "Champiñones" (modificador: +15)

EJEMPLO 3 - Toppings sin costo:
"Smoothie $80, toppings: granola, chía, coco (gratis)"
→ Crear variante tipo "Topping" con opciones:
  - "Granola" (modificador: 0)
  - "Chía" (modificador: 0)
  - "Coco" (modificador: 0)

FORMATO JSON de variantes:
{
  "name": "Licuado de plátano",
  "description": "Licuado cremoso",
  "price": 100,
  "category": "Bebidas",
  "variants": [
    {
      "type": "Tamaño",
      "options": [
        {"name": "1 litro", "price": 100, "is_absolute": true, "is_default": true},
        {"name": "1/2 litro", "price": 60, "is_absolute": true, "is_default": false}
      ]
    },
    {
      "type": "Topping",
      "options": [
        {"name": "Granola", "price": 0, "is_absolute": false, "is_default": false},
        {"name": "Nuez", "price": 10, "is_absolute": false, "is_default": false}
      ]
    }
  ]
}

TIPOS DE VARIANTES COMUNES:
- "Tamaño" o "Porción": cuando hay diferentes tamaños (chico/mediano/grande, 1L/500ml, etc.)
- "Topping": ingredientes que se pueden agregar (granola, nuez, fruta, etc.)
- "Extra": complementos adicionales (queso extra, aguacate, etc.)
- "Preparación": forma de preparación (frito/asado, con/sin picante, etc.)

REGLAS IMPORTANTES:
1. Si una opción tiene precio ABSOLUTO (precio total del producto), usa is_absolute: true
2. Si una opción tiene MODIFICADOR (+$X o -$X), usa is_absolute: false
3. La primera opción de cada tipo de variante debe ser is_default: true
4. Si NO hay variantes, omite el campo "variants" (no incluyas array vacío)
5. Extrae TODOS los productos que veas en la imagen
6. Si hay precios en la imagen, úsalos exactamente como aparecen
7. Si NO hay precio visible, usa 0

Responde ÚNICAMENTE con un array JSON válido, sin markdown, sin explicaciones adicionales.`;

        // Call OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://www.systeminternational.app",
            "X-Title": "MultiPOS - Menu Digital",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${file.type};base64,${base64}`,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("OpenRouter API error:", errorData);
          throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        let text = data.choices[0]?.message?.content || "";

        // Clean the response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        // Parse the JSON response
        let products = [];
        try {
          products = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing JSON from OpenRouter:", text);
          console.error("Parse error:", parseError);
          // Try to extract JSON from the text
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            products = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No se pudo extraer JSON válido de la respuesta");
          }
        }

        if (Array.isArray(products)) {
          console.log(`Extracted ${products.length} products from image`);
          // No asignamos la imagen del menú completo, cada producto buscará su propia imagen
          allProducts.push(...products);
        }
      } catch (error) {
        console.error("Error processing image:", error);
        // Continue with next image even if one fails
      }
    }

    console.log(`Total products extracted: ${allProducts.length}`);

    if (allProducts.length === 0) {
      console.error("No products could be extracted");
      return NextResponse.json(
        { error: "No se pudieron extraer productos de las imágenes" },
        { status: 400 }
      );
    }

    // Get existing categories and products for this user
    const categoriesResponse = await getCategories();
    const existingCategories: Category[] = categoriesResponse.success
      ? (categoriesResponse.data || []).filter(cat => cat.user_id === userData.id)
      : [];

    // Get existing products for matching
    const { data: existingProducts } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("user_id", userData.id);

    const userProducts = (existingProducts as Product[] | null) || [];

    // Map to store category name -> category ID
    const categoryMap = new Map<string, string>();
    const userIdForCategories = userData.id; // Store user ID for use in nested function

    // Helper function to get or create category
    async function getOrCreateCategory(categoryName: string): Promise<string | null> {
      // Check if we already mapped this category
      if (categoryMap.has(categoryName)) {
        return categoryMap.get(categoryName)!;
      }

      // Try to find existing category (case-insensitive)
      const existingCategory = existingCategories.find(
        (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (existingCategory) {
        categoryMap.set(categoryName, existingCategory.id);
        return existingCategory.id;
      }

      // Create new category
      try {
        const newCategoryResult = await createCategory({
          name: categoryName,
          active: true,
          user_id: userIdForCategories, // Associate category with user
          available_in_pos: false, // Menu digital categories not in POS by default
          available_in_digital_menu: true, // Available in digital menu
        });

        if (newCategoryResult.success && newCategoryResult.data) {
          const newCategoryId = newCategoryResult.data.id;
          categoryMap.set(categoryName, newCategoryId);
          // Add to existing categories array for future lookups
          existingCategories.push(newCategoryResult.data);
          return newCategoryId;
        }
      } catch (error) {
        console.error(`Error creating category "${categoryName}":`, error);
      }

      // Fallback: use first available category or null
      if (existingCategories.length > 0) {
        const fallbackId = existingCategories[0].id;
        categoryMap.set(categoryName, fallbackId);
        return fallbackId;
      }

      return null;
    }

    // Helper function to find existing product by name (fuzzy match)
    function findExistingProduct(productName: string) {
      const normalizedName = productName.toLowerCase().trim();

      // Only match if names are very similar (>70% match or exact)
      const existingProduct = userProducts.find((p) => {
        const existingName = p.name.toLowerCase().trim();

        // Exact match
        if (existingName === normalizedName) {
          console.log(`🔄 Exact match found: "${productName}" = "${p.name}"`);
          return true;
        }

        // Only use 'includes' if the shorter name is at least 5 characters
        // This prevents short names like "té" from matching everything
        const minLength = Math.min(existingName.length, normalizedName.length);
        if (minLength >= 5) {
          if (existingName.includes(normalizedName) || normalizedName.includes(existingName)) {
            console.log(`🔄 Fuzzy match found: "${productName}" ~ "${p.name}"`);
            return true;
          }
        }

        return false;
      });

      if (!existingProduct) {
        console.log(`✨ New product: "${productName}"`);
      }

      return existingProduct;
    }

    // Save or update products in database
    let productsAdded = 0;
    let productsUpdated = 0;
    const errors: string[] = [];

    for (const productData of allProducts) {
      try {
        // Get or create category
        const categoryId = await getOrCreateCategory(
          productData.category || "Sin Categoría"
        );

        if (!categoryId) {
          errors.push(`No se pudo asignar categoría para "${productData.name}"`);
          continue;
        }

        // Check if product already exists
        const existingProduct = findExistingProduct(productData.name);

        if (existingProduct) {
          // Update existing product to be available in digital menu
          console.log(`📝 Updating existing product: ${productData.name}`);

          // Check if product has variants
          const hasVariants = productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0;

          const { error } = await supabaseAdmin
            .from("products")
            // @ts-expect-error - Type mismatch with Supabase generated types
            .update({
              available_in_digital_menu: true,
              price: parseFloat(productData.price) || existingProduct.price,
              description: productData.description || existingProduct.description,
              category_id: categoryId,
              active: true,
              has_variants: hasVariants,
            })
            .eq("id", existingProduct.id);

          if (error) {
            const errorMsg = `Error al actualizar "${productData.name}": ${error.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else {
            productsUpdated++;
            console.log(`✓ Updated product: ${productData.name}`);

            // Create variants if they exist and product doesn't have them yet
            if (hasVariants && existingProduct.id) {
              // First, check if variants already exist
              const { data: existingVariants } = await supabaseAdmin
                .from("product_variants")
                .select("id")
                .eq("product_id", existingProduct.id);

              if (!existingVariants || existingVariants.length === 0) {
                console.log(`🔧 Adding ${productData.variants.length} variant type(s) to existing product "${productData.name}"`);

                for (const variantGroup of productData.variants) {
                  try {
                    // Get or create variant type
                    const variantTypeResult = await getOrCreateVariantType(
                      variantGroup.type,
                      userData.id
                    );

                    if (!variantTypeResult.success || !variantTypeResult.data) {
                      console.error(`Error creating variant type "${variantGroup.type}":`, variantTypeResult.error);
                      continue;
                    }

                    const variantTypeId = variantTypeResult.data.id;

                    // Create each variant option
                    if (variantGroup.options && Array.isArray(variantGroup.options)) {
                      for (let i = 0; i < variantGroup.options.length; i++) {
                        const option = variantGroup.options[i];

                        const { error: variantError } = await supabaseAdmin
                          .from("product_variants")
                          // @ts-expect-error - Type mismatch with Supabase generated types
                          .insert([{
                            product_id: existingProduct.id,
                            variant_type_id: variantTypeId,
                            name: option.name,
                            price_modifier: parseFloat(option.price) || 0,
                            is_absolute_price: option.is_absolute || false,
                            is_default: option.is_default || false,
                            active: true,
                            sort_order: i,
                          }]);

                        if (variantError) {
                          console.error(`    ✗ Error creating variant "${option.name}":`, variantError.message);
                        } else {
                          console.log(`    ✓ Added variant: ${option.name}`);
                        }
                      }
                    }
                  } catch (variantError) {
                    console.error(`Error processing variant group "${variantGroup.type}":`, variantError);
                  }
                }
              } else {
                console.log(`  ℹ Product already has ${existingVariants.length} variant(s), skipping`);
              }
            }
          }
        } else {
          // Create new product
          console.log(`➕ Creating new product: ${productData.name}`);

          // Generate image for the product using OpenRouter only if enabled
          let imageUrl: string | undefined = undefined;

          if (generateAIImages) {
            try {
              const generatedImageUrl = await generateProductImage(productData.name, productData.description);
              if (generatedImageUrl) {
                // Download and upload the generated image
                const uploadedImageUrl = await downloadAndUploadImage(generatedImageUrl, productData.name);
                if (uploadedImageUrl) {
                  imageUrl = uploadedImageUrl;
                  console.log(`✓ Image generated and uploaded for "${productData.name}"`);
                }
              }
            } catch (imageError) {
              console.error(`Error generating/uploading image for "${productData.name}":`, imageError);
              // Continue without image
            }
          }

          // Generate a simple SKU
          const sku = `MENU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Check if product has variants
          const hasVariants = productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0;

          // Create product object with unified multi-channel system
          const newProduct = {
            sku,
            name: productData.name || "Producto sin nombre",
            description: productData.description || "",
            category_id: categoryId,
            price: parseFloat(productData.price) || 0,
            cost: 0, // Default cost
            stock: 100, // Default stock for menu items
            min_stock: 10,
            max_stock: 1000,
            image_url: imageUrl,
            active: true,
            barcode: null,
            product_type: "simple", // Changed from "menu_digital" to pass constraint
            currency: "MXN", // Default currency for digitalized products
            user_id: userData.id, // Associate product with user
            // Sistema unificado multi-canal
            available_in_pos: false, // Not available in POS by default
            available_in_digital_menu: true, // Available in digital menu
            track_inventory: false, // Don't track inventory for scanned menu items
            has_variants: hasVariants, // Flag to indicate if product has variants
          };

          // Save to database using supabaseAdmin directly
          const { data: createdProduct, error: productError } = await supabaseAdmin
            .from("products")
            // @ts-expect-error - Supabase types may not include all fields
            .insert([newProduct])
            .select()
            .single();

          if (productError) {
            const errorMsg = `Error al crear "${productData.name}": ${productError.message}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          } else {
            productsAdded++;
            const productId = (createdProduct as any)?.id;
            console.log(`✓ Created product: ${productData.name} (ID: ${productId || 'unknown'})${imageUrl ? " (with image)" : ""}`);

            // Create variants if they exist
            if (hasVariants && productId) {
              console.log(`🔧 Creating ${productData.variants.length} variant type(s) for "${productData.name}"`);

              for (const variantGroup of productData.variants) {
                try {
                  // Get or create variant type
                  const variantTypeResult = await getOrCreateVariantType(
                    variantGroup.type,
                    userData.id
                  );

                  if (!variantTypeResult.success || !variantTypeResult.data) {
                    console.error(`Error creating variant type "${variantGroup.type}":`, variantTypeResult.error);
                    continue;
                  }

                  const variantTypeId = variantTypeResult.data.id;
                  console.log(`  ✓ Variant type "${variantGroup.type}" ready (ID: ${variantTypeId})`);

                  // Create each variant option
                  if (variantGroup.options && Array.isArray(variantGroup.options)) {
                    for (let i = 0; i < variantGroup.options.length; i++) {
                      const option = variantGroup.options[i];

                      const { error: variantError } = await supabaseAdmin
                        .from("product_variants")
                        // @ts-expect-error - Type mismatch with Supabase generated types
                        .insert([{
                          product_id: productId,
                          variant_type_id: variantTypeId,
                          name: option.name,
                          price_modifier: parseFloat(option.price) || 0,
                          is_absolute_price: option.is_absolute || false,
                          is_default: option.is_default || false,
                          active: true,
                          sort_order: i,
                        }]);

                      if (variantError) {
                        console.error(`    ✗ Error creating variant "${option.name}":`, variantError.message);
                      } else {
                        console.log(`    ✓ Created variant: ${option.name} (${option.is_absolute ? `$${option.price}` : `${option.price >= 0 ? '+' : ''}$${option.price}`})`);
                      }
                    }
                  }
                } catch (variantError) {
                  console.error(`Error processing variant group "${variantGroup.type}":`, variantError);
                }
              }
            }
          }
        }
      } catch (error) {
        const errorMsg = `Error al guardar producto: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`=== Summary ===`);
    console.log(`Products extracted: ${allProducts.length}`);
    console.log(`Products added: ${productsAdded}`);
    console.log(`Products updated: ${productsUpdated}`);
    console.log(`Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.error("Error details:", errors);
    }

    return NextResponse.json({
      success: true,
      productsAdded,
      productsUpdated,
      totalExtracted: allProducts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error in menu digitalization:", error);
    return NextResponse.json(
      {
        error: "Error al procesar el menú",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
