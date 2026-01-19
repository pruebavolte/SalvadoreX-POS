import { NextRequest } from "next/server";
import { createProduct, getCategories, createCategory, createProductWithVariants, getOrCreateVariantType } from "@/lib/services/supabase";
import { Product, Category } from "@/types/database";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { supabaseAdmin } from "@/lib/supabase/server";

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
const IMAGE_GENERATION_MODEL = process.env.IMAGE_GENERATION_MODEL || "google/gemini-2.5-flash-image-preview";

// Pexels API configuration for web image search
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

// Supabase Storage configuration
const BUCKET_NAME = "product-images";

// Helper function to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, type: string, data: any) {
  const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

// Helper function to convert base64 data URL to Buffer
function base64ToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Helper function to search for food images on the web (Pexels API)
async function searchWebImage(
  productName: string,
  category?: string
): Promise<string | null> {
  console.log(`\n=== WEB IMAGE SEARCH DEBUG ===`);
  console.log(`Product: "${productName}", Category: "${category || 'N/A'}"`);

  // Create search queries - try product name first, then with category, then generic food terms
  const searchQueries = [
    `${productName} food`,
    `${productName} ${category || ''} dish`.trim(),
    `${productName} mexican food`,
    `${productName} restaurant`,
    category ? `${category} food` : 'delicious food',
  ];

  // Try with Pexels API if available
  if (PEXELS_API_KEY) {
    for (const query of searchQueries) {
      try {
        console.log(`Searching Pexels for: "${query}"`);
        
        const response = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
          {
            headers: {
              Authorization: PEXELS_API_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.photos && data.photos.length > 0) {
            // Return the first image's large size
            const imageUrl = data.photos[0].src.large;
            console.log(`Found image on Pexels: ${imageUrl.substring(0, 80)}...`);
            return imageUrl;
          }
        }
      } catch (error) {
        console.error(`Error searching Pexels for "${query}":`, error);
      }
    }
  }

  // Fallback: Use Unsplash Source (free, no API key required)
  // This service provides random images based on search terms
  try {
    const searchTerm = encodeURIComponent(`${productName} food`);
    const unsplashUrl = `https://source.unsplash.com/800x600/?${searchTerm}`;
    
    // Use GET with redirect follow to get the actual image URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(unsplashUrl, { 
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (response.ok && response.url) {
      console.log(`Using Unsplash fallback for: ${productName}`);
      return response.url; // Use the final redirected URL
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Unsplash request timeout for "${productName}"`);
    } else {
      console.error(`Unsplash fallback failed for "${productName}":`, error);
    }
  }

  console.log(`No web image found for: ${productName}`);
  return null;
}

// Helper function to generate product image using OpenRouter (Gemini)
async function generateProductImage(
  productName: string,
  description?: string,
  controller?: ReadableStreamDefaultController
): Promise<string | null> {
  console.log(`\n=== IMAGE GENERATION DEBUG ===`);
  console.log(`Product: "${productName}"`);
  console.log(`IMAGE_GENERATION_MODEL: ${IMAGE_GENERATION_MODEL}`);

  if (!OPENROUTER_API_KEY) {
    console.error(`❌ No OpenRouter API key configured, skipping image generation for "${productName}"`);
    return null;
  }

  try {
    console.log(`🎨 Starting image generation for: ${productName}`);

    const prompt = description
      ? `Create a professional, appetizing photo of ${productName}, ${description}. The image should show restaurant quality presentation, well-plated food, natural lighting, high resolution, professional food photography style. Make it look delicious and appealing.`
      : `Create a professional, appetizing photo of ${productName} dish. The image should show restaurant quality presentation, well-plated food, natural lighting, high resolution, professional food photography style. Make it look delicious and appealing.`;

    console.log(`📝 Prompt length: ${prompt.length} characters`);

    // Use chat completions with Gemini image generation model
    const requestBody = {
      model: IMAGE_GENERATION_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    };

    console.log(`📤 Sending request to OpenRouter...`);
    console.log(`Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://www.systeminternational.app",
        "X-Title": "MultiPOS - Menu Digital",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter image generation error for "${productName}":`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 500)
      });
      return null;
    }

    const data = await response.json();
    console.log(`📊 Response data structure:`, JSON.stringify(data, null, 2).substring(0, 1000));

    // Handle OpenAI-style images API response
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const imageData = data.data[0];
      console.log(`Image response format: ${imageData.url ? 'URL' : imageData.b64_json ? 'base64' : 'unknown'}`);

      if (imageData.url) {
        console.log(`✅ Successfully generated image for "${productName}"`);
        console.log(`Image URL: ${imageData.url.substring(0, 100)}...`);
        return imageData.url;
      } else if (imageData.b64_json) {
        const imageDataUrl = `data:image/png;base64,${imageData.b64_json}`;
        console.log(`✅ Successfully generated image for "${productName}" (base64)`);
        return imageDataUrl;
      }
    }

    // Fallback: Try the old chat completions format
    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;
      console.log(`Message has images: ${!!(message.images && message.images.length > 0)}`);

      if (message.images && message.images.length > 0) {
        const imageData = message.images[0];
        console.log(`Image data type: ${typeof imageData}`);
        console.log(`Image data preview:`, JSON.stringify(imageData).substring(0, 200));

        let imageDataUrl: string;
        if (typeof imageData === 'string') {
          imageDataUrl = imageData;
          console.log(`✓ Image is a string (data URL or URL)`);
        } else if (imageData && typeof imageData === 'object') {
          // Handle Gemini's response format: {type: "image_url", image_url: {url: "..."}}
          if ('image_url' in imageData && imageData.image_url && typeof imageData.image_url === 'object' && 'url' in imageData.image_url) {
            imageDataUrl = imageData.image_url.url as string;
            console.log(`✓ Extracted from image_url.url`);
          } else if ('url' in imageData) {
            imageDataUrl = imageData.url as string;
            console.log(`✓ Extracted from url`);
          } else if ('data' in imageData) {
            imageDataUrl = imageData.data as string;
            console.log(`✓ Extracted from data`);
          } else {
            console.error(`❌ Unexpected image format for "${productName}":`, JSON.stringify(imageData).substring(0, 200));
            return null;
          }
        } else {
          console.error(`❌ Unexpected image type for "${productName}":`, JSON.stringify(imageData).substring(0, 200));
          return null;
        }

        console.log(`✅ Successfully generated image for "${productName}"`);
        console.log(`Image URL preview: ${imageDataUrl.substring(0, 100)}...`);
        return imageDataUrl;
      } else {
        console.warn(`⚠️ No images in message for "${productName}"`);
      }
    } else {
      console.warn(`⚠️ No data or choices in response for "${productName}"`);
    }

    console.log(`❌ No image generated for "${productName}"`);
    return null;
  } catch (error) {
    console.error(`❌ Error generating image for "${productName}":`, error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack:`, error.stack);
    }
    return null;
  } finally {
    console.log(`=== END IMAGE GENERATION DEBUG ===\n`);
  }
}

// Helper function to upload image to Supabase
async function uploadImageToSupabase(
  imageUrl: string,
  productName: string
): Promise<string | null> {
  try {
    console.log(`📥 Processing image for "${productName}"...`);

    if (typeof imageUrl !== 'string') {
      console.error(`Invalid imageUrl type for "${productName}". Expected string, got ${typeof imageUrl}`);
      return null;
    }

    let buffer: Buffer;

    if (imageUrl.startsWith('data:image/')) {
      buffer = base64ToBuffer(imageUrl);
      console.log(`✓ Converted base64 image for "${productName}"`);
    } else {
      // Add timeout for external image downloads (15 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Failed to download image for "${productName}"`);
          return null;
        }

        // Check content length to avoid downloading very large images (max 10MB)
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
          console.error(`Image too large for "${productName}": ${contentLength} bytes`);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        console.log(`✓ Downloaded image for "${productName}"`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error(`Image download timeout for "${productName}"`);
        } else {
          console.error(`Error downloading image for "${productName}":`, fetchError);
        }
        return null;
      }
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedName = productName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `product-${sanitizedName}-${timestamp}-${randomString}.jpg`;
    const filePath = `products/${fileName}`;

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

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log(`✓ Image uploaded for "${productName}"`);
    return publicData.publicUrl;
  } catch (error) {
    console.error(`Error processing/uploading image for "${productName}":`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, 'start', { message: 'Iniciando procesamiento...' });

        // Get authenticated user (with dev mode bypass)
        let userData: { id: string; clerk_user_id?: string; [key: string]: any } | null = null;
        
        if (process.env.NODE_ENV === 'development') {
          // In development, try to get a dev user from the database
          const { data: devUser } = await supabaseAdmin
            .from("users")
            .select("*")
            .limit(1)
            .single();
          
          if (devUser) {
            userData = devUser as { id: string; clerk_user_id?: string; [key: string]: any };
            console.log('[Menu Digital] Development mode - using dev user:', userData.id);
          }
        }
        
        // If not in dev mode or no dev user, use normal auth
        if (!userData) {
          const { userId } = await auth();
          if (!userId) {
            sendEvent(controller, 'error', { message: 'No autenticado' });
            controller.close();
            return;
          }

          userData = await getUserByClerkId(userId);
          if (!userData) {
            sendEvent(controller, 'error', { message: 'Usuario no encontrado' });
            controller.close();
            return;
          }
        }

        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const generateAIImages = formData.get("generateAIImages") === "true";
        const searchWebImages = formData.get("searchWebImages") === "true";

        console.log(`Generate AI Images: ${generateAIImages}, Search Web Images: ${searchWebImages}`);

        if (!files || files.length === 0) {
          sendEvent(controller, 'error', { message: 'No se proporcionaron imágenes' });
          controller.close();
          return;
        }

        sendEvent(controller, 'analyzing', { message: 'Analizando menú con IA...' });

        // Process images with AI Vision
        const allProducts: any[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          try {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64 = buffer.toString("base64");

            const prompt = `Analiza esta imagen de un menú de restaurante y extrae TODOS los productos que veas, incluyendo sus variantes (tamaños, extras, toppings).

Para cada producto, proporciona la siguiente información en formato JSON:
- name: nombre del producto (string)
- description: descripción breve del producto (string, puede ser vacío)
- price: precio BASE del producto (número, el precio más bajo si hay variantes, si no está visible usa 0)
- category: categoría del producto como "Entradas", "Platos Principales", "Bebidas", "Postres", etc. (string)
- variants: array de variantes del producto (puede estar vacío)

Cada variante debe tener:
- type: tipo de variante ("Tamaño", "Topping", "Extra", "Porción", etc.)
- name: nombre de la variante ("1 litro", "1/2 litro", "Granola", "Nuez", etc.)
- price_modifier: diferencia de precio respecto al precio base (número, puede ser 0)
- is_absolute_price: true si el precio es el total, false si es un modificador adicional

EJEMPLOS DE VARIANTES:
1. "Licuado de plátano: 1/2 litro $60, 1 litro $100" →
   price: 60, variants: [
     {"type": "Tamaño", "name": "1/2 litro", "price_modifier": 0, "is_absolute_price": false},
     {"type": "Tamaño", "name": "1 litro", "price_modifier": 40, "is_absolute_price": false}
   ]

2. "Pizza Margarita $150. Extras: Queso +$20, Pepperoni +$25" →
   price: 150, variants: [
     {"type": "Extra", "name": "Queso", "price_modifier": 20, "is_absolute_price": false},
     {"type": "Extra", "name": "Pepperoni", "price_modifier": 25, "is_absolute_price": false}
   ]

3. "Café Americano: Chico $35, Mediano $45, Grande $55" →
   price: 35, variants: [
     {"type": "Tamaño", "name": "Chico", "price_modifier": 0, "is_absolute_price": false},
     {"type": "Tamaño", "name": "Mediano", "price_modifier": 10, "is_absolute_price": false},
     {"type": "Tamaño", "name": "Grande", "price_modifier": 20, "is_absolute_price": false}
   ]

IMPORTANTE:
- Extrae TODOS los productos que veas en la imagen
- Detecta variantes como tamaños, extras, toppings, porciones
- Si hay precios en la imagen, úsalos exactamente como aparecen
- Si NO hay precio visible, usa 0
- Si NO hay variantes, deja el array vacío: []
- Devuelve SOLO un array JSON válido, sin texto adicional

Responde ÚNICAMENTE con el array JSON, sin markdown, sin explicaciones adicionales.`;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "MultiPOS - Menu Digital",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: prompt },
                      {
                        type: "image_url",
                        image_url: { url: `data:${file.type};base64,${base64}` },
                      },
                    ],
                  },
                ],
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("OpenRouter API error:", errorData);
              continue;
            }

            const data = await response.json();
            let text = data.choices[0]?.message?.content || "";
            text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

            let products = [];
            try {
              products = JSON.parse(text);
            } catch (parseError) {
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                products = JSON.parse(jsonMatch[0]);
              }
            }

            if (Array.isArray(products)) {
              allProducts.push(...products);
            }
          } catch (error) {
            console.error("Error processing image:", error);
          }
        }

        sendEvent(controller, 'extracted', { count: allProducts.length });

        if (allProducts.length === 0) {
          sendEvent(controller, 'error', { message: 'No se pudieron extraer productos de las imágenes' });
          controller.close();
          return;
        }

        // Get categories
        const categoriesResponse = await getCategories();
        const existingCategories: Category[] = categoriesResponse.success
          ? (categoriesResponse.data || []).filter(cat => cat.user_id === userData.id)
          : [];

        const { data: existingProducts } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("user_id", userData.id);

        const userProducts = (existingProducts as Product[] | null) || [];

        const categoryMap = new Map<string, string>();
        const userIdForCategories = userData.id;

        async function getOrCreateCategory(categoryName: string): Promise<string | null> {
          if (categoryMap.has(categoryName)) {
            return categoryMap.get(categoryName)!;
          }

          const existingCategory = existingCategories.find(
            (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
          );

          if (existingCategory) {
            categoryMap.set(categoryName, existingCategory.id);
            return existingCategory.id;
          }

          try {
            const newCategoryResult = await createCategory({
              name: categoryName,
              active: true,
              user_id: userIdForCategories,
              available_in_pos: false,
              available_in_digital_menu: true,
            });

            if (newCategoryResult.success && newCategoryResult.data) {
              const newCategoryId = newCategoryResult.data.id;
              categoryMap.set(categoryName, newCategoryId);
              existingCategories.push(newCategoryResult.data);
              return newCategoryId;
            }
          } catch (error) {
            console.error(`Error creating category "${categoryName}":`, error);
          }

          if (existingCategories.length > 0) {
            const fallbackId = existingCategories[0].id;
            categoryMap.set(categoryName, fallbackId);
            return fallbackId;
          }

          return null;
        }

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

        // Save products
        let productsAdded = 0;
        let productsUpdated = 0;
        const errors: string[] = [];

        for (let i = 0; i < allProducts.length; i++) {
          const productData = allProducts[i];

          try {
            const categoryId = await getOrCreateCategory(
              productData.category || "Sin Categoría"
            );

            if (!categoryId) {
              errors.push(`No se pudo asignar categoría para "${productData.name}"`);
              continue;
            }

            const existingProduct = findExistingProduct(productData.name);

            if (existingProduct) {
              sendEvent(controller, 'product_saved', {
                productName: productData.name,
                current: i + 1,
                total: allProducts.length,
                type: 'updated'
              });

              const { error } = await supabaseAdmin
                .from("products")
                // @ts-expect-error - Type mismatch
                .update({
                  available_in_digital_menu: true,
                  price: parseFloat(productData.price) || existingProduct.price,
                  description: productData.description || existingProduct.description,
                  category_id: categoryId,
                  active: true,
                })
                .eq("id", existingProduct.id);

              if (error) {
                errors.push(`Error al actualizar "${productData.name}": ${error.message}`);
              } else {
                productsUpdated++;
              }
            } else {
              // Get image for product (web search or AI generation)
              let imageUrl: string | undefined = undefined;

              // Option 1: Search for images on the web (Pexels, Unsplash)
              if (searchWebImages && !imageUrl) {
                sendEvent(controller, 'searching_image', {
                  productName: productData.name,
                  current: i + 1,
                  total: allProducts.length
                });

                try {
                  const webImageUrl = await searchWebImage(
                    productData.name,
                    productData.category
                  );

                  if (webImageUrl) {
                    sendEvent(controller, 'image_found', {
                      productName: productData.name
                    });

                    // Upload the web image to Supabase for consistent storage
                    const uploadedImageUrl = await uploadImageToSupabase(webImageUrl, productData.name);
                    if (uploadedImageUrl) {
                      imageUrl = uploadedImageUrl;
                    } else {
                      // If upload fails, use the original URL
                      imageUrl = webImageUrl;
                    }
                  }
                } catch (imageError) {
                  console.error(`Error searching web image for "${productData.name}":`, imageError);
                }

                // If web search didn't find an image, notify the frontend
                if (!imageUrl) {
                  sendEvent(controller, 'image_not_found', {
                    productName: productData.name,
                    source: 'web'
                  });
                }
              }

              // Option 2: Generate with AI (fallback or if specifically enabled)
              if (generateAIImages && !imageUrl) {
                sendEvent(controller, 'generating_image', {
                  productName: productData.name,
                  current: i + 1,
                  total: allProducts.length
                });

                try {
                  const generatedImageUrl = await generateProductImage(
                    productData.name,
                    productData.description,
                    controller
                  );

                  if (generatedImageUrl) {
                    sendEvent(controller, 'image_generated', {
                      productName: productData.name
                    });

                    const uploadedImageUrl = await uploadImageToSupabase(generatedImageUrl, productData.name);
                    if (uploadedImageUrl) {
                      imageUrl = uploadedImageUrl;
                    }
                  }
                } catch (imageError) {
                  console.error(`Error generating/uploading image for "${productData.name}":`, imageError);
                }
              }

              const sku = `MENU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              const newProduct = {
                sku,
                name: productData.name || "Producto sin nombre",
                description: productData.description || "",
                category_id: categoryId,
                price: parseFloat(productData.price) || 0,
                cost: 0,
                stock: 100,
                min_stock: 10,
                max_stock: 1000,
                image_url: imageUrl,
                active: true,
                barcode: null,
                product_type: "simple", // Changed from "menu_digital" to pass constraint
                currency: "MXN",
                user_id: userData.id,
                available_in_pos: false,
                available_in_digital_menu: true,
                track_inventory: false,
              };

              // Check if product has variants
              const productVariants = productData.variants || [];

              if (productVariants.length > 0) {
                // Create product with variants using supabaseAdmin directly
                try {
                  // Create product first
                  const { data: createdProduct, error: productError } = await supabaseAdmin
                    .from("products")
                    // @ts-expect-error - Supabase types may not include all fields
                    .insert([{ ...newProduct, has_variants: true }])
                    .select()
                    .single();

                  if (productError) {
                    console.error(`Error creating product "${productData.name}":`, productError);
                    errors.push(`Error al crear "${productData.name}": ${productError.message}`);
                    continue;
                  }

                  console.log(`✓ Created product: ${productData.name} (ID: ${(createdProduct as any)?.id || 'unknown'})`);

                  // Create variants
                  for (const variant of productVariants) {
                    // Get or create variant type
                    const variantTypeResult = await getOrCreateVariantType(
                      variant.type || "Tamaño",
                      userData.id
                    );

                    if (!variantTypeResult.success || !variantTypeResult.data) {
                      console.error(`Error creating variant type for "${productData.name}":`, variantTypeResult.error);
                      continue;
                    }

                    // Create product variant
                    const { error: variantError } = await supabaseAdmin
                      .from("product_variants")
                      // @ts-expect-error - Supabase types may not include all fields
                      .insert([{
                        product_id: (createdProduct as any).id,
                        variant_type_id: variantTypeResult.data.id,
                        name: variant.name,
                        price_modifier: parseFloat(variant.price_modifier) || 0,
                        is_absolute_price: variant.is_absolute_price || false,
                        is_default: false,
                        active: true,
                        sort_order: 0,
                      }]);

                    if (variantError) {
                      console.error(`Error creating variant for "${productData.name}":`, variantError);
                    }
                  }

                  productsAdded++;
                  sendEvent(controller, 'variants_created', {
                    productName: productData.name,
                    variantCount: productVariants.length
                  });
                  sendEvent(controller, 'product_saved', {
                    productName: productData.name,
                    current: i + 1,
                    total: allProducts.length,
                    type: 'created'
                  });
                } catch (error) {
                  const errorMsg = `Error al crear "${productData.name}" con variantes: ${error}`;
                  console.error(errorMsg);
                  errors.push(errorMsg);
                }
              } else {
                // Create product without variants using supabaseAdmin directly
                try {
                  const { data: createdProduct, error: productError } = await supabaseAdmin
                    .from("products")
                    // @ts-expect-error - Supabase types may not include all fields
                    .insert([newProduct])
                    .select()
                    .single();

                  if (productError) {
                    console.error(`Error creating product "${productData.name}":`, productError);
                    errors.push(`Error al crear "${productData.name}": ${productError.message}`);
                  } else {
                    productsAdded++;
                    console.log(`✓ Created product: ${productData.name} (ID: ${(createdProduct as any)?.id || 'unknown'})`);
                    sendEvent(controller, 'product_saved', {
                      productName: productData.name,
                      current: i + 1,
                      total: allProducts.length,
                      type: 'created'
                    });
                  }
                } catch (error) {
                  const errorMsg = `Error al crear "${productData.name}": ${error}`;
                  console.error(errorMsg);
                  errors.push(errorMsg);
                }
              }
            }
          } catch (error) {
            errors.push(`Error al guardar producto: ${error}`);
          }
        }

        sendEvent(controller, 'complete', {
          result: {
            success: true,
            productsAdded,
            productsUpdated,
            totalExtracted: allProducts.length,
            errors: errors.length > 0 ? errors : undefined,
          }
        });

        controller.close();
      } catch (error) {
        console.error("Error in menu digitalization:", error);
        sendEvent(controller, 'error', {
          message: "Error al procesar el menú",
          details: error instanceof Error ? error.message : String(error),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
