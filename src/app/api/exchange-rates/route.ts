import { NextRequest, NextResponse } from "next/server";
import { getExchangeRatesWithFallback, fetchExchangeRates } from "@/lib/services/banxico-api";

/**
 * GET /api/exchange-rates
 * Obtiene los tipos de cambio actualizados desde la API del Banco de México
 *
 * Los tipos de cambio se cachean por 1 hora ya que Banxico actualiza una vez al día
 */
export async function GET(req: NextRequest) {
  try {
    const token = process.env.BANXICO_API_TOKEN;

    if (!token) {
      console.warn("BANXICO_API_TOKEN not configured, using fallback rates");
    }

    // Obtener tipos de cambio (con fallback automático)
    const rates = await getExchangeRatesWithFallback(token);

    // Si tenemos el token, también traer los detalles completos
    let details = null;
    if (token) {
      try {
        details = await fetchExchangeRates(token);
      } catch (error) {
        console.error("Error fetching detailed rates:", error);
      }
    }

    return NextResponse.json({
      success: true,
      rates,
      details,
      source: token ? "banxico" : "fallback",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in exchange-rates API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch exchange rates",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Configuración de revalidación (1 hora)
export const revalidate = 3600;
