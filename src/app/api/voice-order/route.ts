import { NextRequest, NextResponse } from "next/server";

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  productId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, text, products, language = "es" } = body;

    let transcript = text;

    // If audio is provided, transcribe it using Eleven Labs
    if (audio && !text) {
      try {
        // Check if API key is configured
        if (!process.env.ELEVENLABS_API_KEY) {
          throw new Error("ELEVENLABS_API_KEY not configured");
        }

        // Convert base64 to buffer
        const base64Data = audio.replace(/^data:audio\/\w+;base64,/, "");
        const audioBuffer = Buffer.from(base64Data, "base64");

        // Create FormData for Eleven Labs API
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });
        formData.append("file", audioBlob, "recording.webm");
        formData.append("model_id", "scribe_v1");
        if (language) {
          formData.append("language_code", language);
        }

        console.log("Calling Eleven Labs API for transcription...");

        // Use Eleven Labs speech-to-text
        const response = await fetch(
          "https://api.elevenlabs.io/v1/speech-to-text",
          {
            method: "POST",
            headers: {
              "xi-api-key": process.env.ELEVENLABS_API_KEY,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error("Eleven Labs API error status:", response.status);
          console.error("Eleven Labs API error:", errorData);
          throw new Error(`Eleven Labs API error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        console.log("Transcription result:", data);
        transcript = data.text;

        if (!transcript) {
          throw new Error("No transcript returned from Eleven Labs");
        }
      } catch (error: any) {
        console.error("Error transcribing audio:", error);
        return NextResponse.json(
          {
            error:
              language === "es"
                ? `Error al transcribir el audio: ${error.message}`
                : `Error transcribing audio: ${error.message}`,
          },
          { status: 500 }
        );
      }
    }

    if (!transcript) {
      return NextResponse.json(
        {
          error:
            language === "es"
              ? "No se proporcionó audio o texto"
              : "No audio or text provided",
        },
        { status: 400 }
      );
    }

    // Process the order using OpenRouter
    const productsInfo = products
      .map((p: Product) => `- ${p.name} (ID: ${p.id}, Precio: $${p.price})`)
      .join("\n");

    const systemMessage =
      language === "es"
        ? `Eres un asistente de pedidos en un restaurante. Tu tarea es:
1. Identificar qué productos quiere el cliente (usando el ID exacto del producto)
2. Determinar las cantidades
3. Responder de manera amigable confirmando el pedido

Productos disponibles:
${productsInfo}

Responde SOLO con un JSON en este formato (sin markdown, sin \`\`\`json):
{
  "items": [{"productId": "id-del-producto", "quantity": número}],
  "response": "Tu respuesta amigable al cliente confirmando lo que agregaste"
}

Si el cliente no menciona productos específicos o no está claro, responde con:
{
  "items": [],
  "response": "Disculpa, no entendí bien tu pedido. ¿Podrías decirme qué productos te gustaría ordenar?"
}`
        : `You are a restaurant order assistant. Your task is:
1. Identify which products the customer wants (using exact product ID)
2. Determine quantities
3. Respond in a friendly way confirming the order

Available products:
${productsInfo}

Respond ONLY with JSON in this format (no markdown, no \`\`\`json):
{
  "items": [{"productId": "product-id", "quantity": number}],
  "response": "Your friendly response to the customer confirming what you added"
}

If the customer doesn't mention specific products or it's unclear, respond with:
{
  "items": [],
  "response": "Sorry, I didn't quite understand your order. Could you tell me which products you'd like to order?"
}`;

    const userMessage =
      language === "es"
        ? `El cliente ha dicho: "${transcript}"`
        : `The customer said: "${transcript}"`;

    // Call OpenRouter API
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://www.systeminternational.app",
          "X-Title": "SalvadoreX Voice Orders",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "system",
              content: systemMessage,
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json();
      throw new Error(
        errorData.error?.message || "Error calling OpenRouter API"
      );
    }

    const openRouterData = await openRouterResponse.json();
    const responseText = openRouterData.choices[0]?.message?.content || "";

    // Parse the AI response
    let parsedResponse: { items: OrderItem[]; response: string };
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.log("AI response was:", responseText);
      parsedResponse = {
        items: [],
        response:
          language === "es"
            ? "Disculpa, tuve problemas procesando tu pedido. ¿Podrías intentar de nuevo?"
            : "Sorry, I had trouble processing your order. Could you try again?",
      };
    }

    return NextResponse.json({
      transcript,
      items: parsedResponse.items,
      response: parsedResponse.response,
    });
  } catch (error: any) {
    console.error("Error processing voice order:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
