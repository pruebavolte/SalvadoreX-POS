import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// POST /api/recipes/suggest - AI-powered recipe suggestions
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { product_name, product_description, category } = body;

    if (!product_name) {
      return NextResponse.json(
        { error: "Product name is required", success: false },
        { status: 400 }
      );
    }

    // Build AI prompt
    const systemPrompt = `Eres un experto chef y consultor de restaurantes con amplia experiencia en gestión de inventarios y recetas.

Tu tarea es analizar un producto de un menú de restaurante y sugerir los ingredientes/insumos necesarios para prepararlo.

IMPORTANTE: Debes responder ÚNICAMENTE con un array JSON válido de ingredientes. No incluyas ningún texto adicional antes o después del JSON.

Cada ingrediente debe tener esta estructura:
{
  "name": "nombre del ingrediente",
  "quantity": cantidad numérica,
  "unit_type": "unit" | "weight" | "volume",
  "unit_name": "unidad específica (ej: kg, g, L, ml, pieza, unidad)",
  "category": "dairy" | "meat" | "vegetable" | "grain" | "spice" | "liquid" | "other",
  "estimated_cost": costo estimado por unidad en MXN
}

Considera:
1. Cantidades realistas para UNA PORCIÓN del producto
2. Ingredientes principales y secundarios necesarios
3. Categorías apropiadas para cada ingrediente
4. Unidades de medida prácticas (gramos para sólidos, ml para líquidos)
5. Costos estimados razonables en pesos mexicanos

Ejemplo de respuesta válida:
[
  {
    "name": "Pan de hamburguesa",
    "quantity": 1,
    "unit_type": "unit",
    "unit_name": "pieza",
    "category": "grain",
    "estimated_cost": 8
  },
  {
    "name": "Carne molida de res",
    "quantity": 150,
    "unit_type": "weight",
    "unit_name": "g",
    "category": "meat",
    "estimated_cost": 30
  }
]`;

    const userPrompt = `Producto: ${product_name}
${product_description ? `Descripción: ${product_description}` : ""}
${category ? `Categoría: ${category}` : ""}

Sugiere los ingredientes necesarios para preparar este producto.`;

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse AI response (should be a JSON array)
    let ingredients;
    try {
      // Clean the response in case there's any markdown or extra text
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in AI response");
      }
      ingredients = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Error parsing AI response:", aiResponse);
      return NextResponse.json(
        {
          error: "Failed to parse AI suggestions",
          success: false,
          raw_response: aiResponse,
        },
        { status: 500 }
      );
    }

    // Validate response format
    if (!Array.isArray(ingredients)) {
      return NextResponse.json(
        {
          error: "Invalid AI response format",
          success: false,
        },
        { status: 500 }
      );
    }

    // Calculate total estimated cost
    const totalEstimatedCost = ingredients.reduce(
      (sum: number, ing: any) => sum + (ing.estimated_cost || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ingredients,
        total_estimated_cost: totalEstimatedCost,
        product_name,
      },
      message: `Sugeridos ${ingredients.length} ingredientes para ${product_name}`,
    });
  } catch (error: any) {
    console.error("Error generating recipe suggestions:", error);
    return NextResponse.json(
      {
        error: "Failed to generate recipe suggestions",
        success: false,
        details: error.message,
      },
      { status: 500 }
    );
  }
}
