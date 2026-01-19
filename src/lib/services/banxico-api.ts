/**
 * Servicio de integración con la API del Banco de México (SIE API)
 * Documentación: https://www.banxico.org.mx/SieAPIRest/service/v1/
 */

import { CurrencyCode } from "@/contexts/language-context";

// Series de tiempo del Banco de México para tipos de cambio
const BANXICO_SERIES = {
  USD_MXN: "SF43718", // Tipo de cambio FIX USD/MXN
  EUR_MXN: "SF46410", // Tipo de cambio EUR/MXN
  JPY_MXN: "SF17908", // Tipo de cambio JPY/MXN (100 yenes por peso)
  // Nota: BRL no está disponible directamente en Banxico, usaremos conversión cruzada
} as const;

interface BanxicoDataPoint {
  fecha: string;
  dato: string;
}

interface BanxicoSerie {
  idSerie: string;
  titulo: string;
  datos: BanxicoDataPoint[];
}

interface BanxicoResponse {
  bmx: {
    series: BanxicoSerie[];
  };
}

export interface ExchangeRate {
  currency: CurrencyCode;
  rate: number; // Precio en MXN
  date: string;
  source: "banxico" | "calculated";
}

/**
 * Obtiene el tipo de cambio más reciente de una serie de Banxico
 */
async function fetchBanxicoSeries(serieId: string, token: string): Promise<BanxicoDataPoint | null> {
  try {
    const response = await fetch(
      `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${serieId}/datos/oportuno`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Bmx-Token": token,
          "Accept-Encoding": "gzip",
        },
        // Cache for 1 hour (Banxico updates once per day)
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.error(`Error fetching Banxico series ${serieId}: ${response.status}`);
      return null;
    }

    const data: BanxicoResponse = await response.json();

    if (data.bmx?.series?.[0]?.datos?.[0]) {
      return data.bmx.series[0].datos[0];
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Banxico series ${serieId}:`, error);
    return null;
  }
}

/**
 * Obtiene todos los tipos de cambio desde la API de Banxico
 */
export async function fetchExchangeRates(token: string): Promise<ExchangeRate[]> {
  try {
    // Obtener tipos de cambio en paralelo
    const [usdData, eurData, jpyData] = await Promise.all([
      fetchBanxicoSeries(BANXICO_SERIES.USD_MXN, token),
      fetchBanxicoSeries(BANXICO_SERIES.EUR_MXN, token),
      fetchBanxicoSeries(BANXICO_SERIES.JPY_MXN, token),
    ]);

    const rates: ExchangeRate[] = [
      // MXN es la base (1 MXN = 1 MXN)
      {
        currency: "MXN",
        rate: 1,
        date: new Date().toISOString(),
        source: "banxico",
      },
    ];

    // USD/MXN
    if (usdData) {
      rates.push({
        currency: "USD",
        rate: parseFloat(usdData.dato),
        date: usdData.fecha,
        source: "banxico",
      });
    }

    // EUR/MXN
    if (eurData) {
      rates.push({
        currency: "EUR",
        rate: parseFloat(eurData.dato),
        date: eurData.fecha,
        source: "banxico",
      });
    }

    // JPY/MXN (100 yenes por peso, necesitamos convertir)
    if (jpyData) {
      const jpyPer100 = parseFloat(jpyData.dato);
      // 100 JPY = X MXN -> 1 JPY = X/100 MXN
      // Pero necesitamos 1 MXN = Y JPY -> Y = 100/X
      const mxnToJpy = 100 / jpyPer100;
      rates.push({
        currency: "JPY",
        rate: mxnToJpy,
        date: jpyData.fecha,
        source: "banxico",
      });
    }

    // BRL calculado usando conversión cruzada (USD como referencia)
    // 1 USD ≈ 5.5 BRL (aproximado)
    // Si tenemos USD/MXN, podemos calcular BRL/MXN
    if (usdData) {
      const usdMxn = parseFloat(usdData.dato);
      const usdBrl = 5.5; // Tasa aproximada USD/BRL
      const brlMxn = usdMxn / usdBrl;
      rates.push({
        currency: "BRL",
        rate: brlMxn,
        date: usdData.fecha,
        source: "calculated",
      });
    }

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates from Banxico:", error);
    return [];
  }
}

/**
 * Convierte los tipos de cambio de Banxico al formato usado en el sistema
 * Banxico da: 1 USD = X MXN
 * Necesitamos: 1 MXN = Y USD (inverso)
 */
export function convertBanxicoRatesToSystem(
  banxicoRates: ExchangeRate[]
): Record<CurrencyCode, number> {
  const systemRates: Record<string, number> = {
    MXN: 1, // Base currency
  };

  for (const rate of banxicoRates) {
    if (rate.currency === "MXN") continue;

    // Banxico da: 1 USD = 20 MXN
    // Sistema necesita: 1 MXN = 0.05 USD
    if (rate.currency === "JPY") {
      // JPY ya está convertido correctamente
      systemRates[rate.currency] = rate.rate;
    } else {
      // Para otras divisas, invertir la tasa
      systemRates[rate.currency] = 1 / rate.rate;
    }
  }

  return systemRates as Record<CurrencyCode, number>;
}

/**
 * Obtiene las tasas de cambio con fallback a valores estáticos
 */
export async function getExchangeRatesWithFallback(
  token?: string
): Promise<Record<CurrencyCode, number>> {
  // Tasas de respaldo (estáticas)
  const fallbackRates: Record<CurrencyCode, number> = {
    MXN: 1,
    USD: 0.053,
    BRL: 0.30,
    EUR: 0.049,
    JPY: 7.95,
  };

  if (!token) {
    console.warn("No Banxico token provided, using fallback rates");
    return fallbackRates;
  }

  try {
    const banxicoRates = await fetchExchangeRates(token);

    if (banxicoRates.length === 0) {
      console.warn("Failed to fetch Banxico rates, using fallback");
      return fallbackRates;
    }

    const systemRates = convertBanxicoRatesToSystem(banxicoRates);

    // Completar con tasas de respaldo si falta alguna
    return {
      ...fallbackRates,
      ...systemRates,
    };
  } catch (error) {
    console.error("Error getting exchange rates:", error);
    return fallbackRates;
  }
}
