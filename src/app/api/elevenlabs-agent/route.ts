import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_AGENT_ID = "agent_5201kahzqda2fgpas8jhsep7xnvc";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId = DEFAULT_AGENT_ID, products = [], language = "es" } = body;

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Create the product list for the agent's context
    const productListForAgent = products
      .map(
        (p: any, index: number) =>
          `${index + 1}. ${p.name} - $${p.price?.toFixed(2) || p.price} ${p.currency || "MXN"}${p.description ? ` (${p.description})` : ""}`
      )
      .join("\n");

    const productNames = products.map((p: any) => p.name).join(", ");

    // Get a signed URL from Eleven Labs for the conversation
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Eleven Labs signed URL error:", errorText);
      return NextResponse.json(
        { error: `Failed to get signed URL: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId,
      context: {
        menu_completo: productListForAgent,
        productos_disponibles: productNames,
        numero_productos: products.length.toString(),
        idioma: language === "es" ? "español" : "english",
        moneda: products[0]?.currency || "MXN",
      },
    });
  } catch (error: any) {
    console.error("Error getting signed URL:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
