import { CurrencyCode } from "@/contexts/language-context";

// Exchange rates relative to MXN (Mexican Peso)
// These are fallback rates - real-time rates are fetched from Banco de México API
export const FALLBACK_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  MXN: 1,        // Base currency
  USD: 0.053,    // 1 MXN = 0.053 USD (approx 19 MXN per USD)
  BRL: 0.30,     // 1 MXN = 0.30 BRL (approx 3.33 MXN per BRL)
  EUR: 0.049,    // 1 MXN = 0.049 EUR (approx 20.4 MXN per EUR)
  JPY: 7.95,     // 1 MXN = 7.95 JPY (approx 0.126 MXN per JPY)
};

// Current exchange rates (updated from API)
let EXCHANGE_RATES: Record<CurrencyCode, number> = { ...FALLBACK_EXCHANGE_RATES };

// Last update timestamp
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 3600000; // 1 hour in milliseconds

export interface PriceDisplay {
  amount: number;
  currency: CurrencyCode;
  symbol: string;
  formatted: string;
}

/**
 * Updates exchange rates from the API
 * This is called automatically by the currency hook on the client
 */
export async function updateExchangeRates(): Promise<boolean> {
  // Check if we need to update (throttle to 1 hour)
  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL) {
    return false; // No update needed
  }

  try {
    const response = await fetch("/api/exchange-rates");
    const data = await response.json();

    if (data.success && data.rates) {
      EXCHANGE_RATES = data.rates;
      lastUpdateTime = now;
      console.log("Exchange rates updated from Banco de México", data.rates);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to update exchange rates:", error);
    return false;
  }
}

/**
 * Gets the current exchange rates
 */
export function getExchangeRates(): Record<CurrencyCode, number> {
  return { ...EXCHANGE_RATES };
}

/**
 * Gets the last update time
 */
export function getLastUpdateTime(): number {
  return lastUpdateTime;
}

/**
 * Convert a price from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) return amount;

  // Convert to MXN first (base currency)
  const amountInMXN = amount / EXCHANGE_RATES[fromCurrency];

  // Then convert to target currency
  const convertedAmount = amountInMXN * EXCHANGE_RATES[toCurrency];

  return convertedAmount;
}

/**
 * Format a price with proper decimals for the currency
 */
export function formatPrice(amount: number, currency: CurrencyCode): string {
  // JPY doesn't use decimals
  const decimals = currency === "JPY" ? 0 : 2;
  return amount.toFixed(decimals);
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const symbols: Record<CurrencyCode, string> = {
    MXN: "$",
    USD: "$",
    BRL: "R$",
    EUR: "€",
    JPY: "¥",
  };
  return symbols[currency];
}

/**
 * Get full currency display (e.g., "125.50 MXN")
 */
export function getFullCurrencyDisplay(amount: number, currency: CurrencyCode): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = formatPrice(amount, currency);
  return `${symbol}${formatted} ${currency}`;
}

/**
 * Convert and format a price to multiple currencies
 */
export function convertToMultipleCurrencies(
  baseAmount: number,
  baseCurrency: CurrencyCode,
  targetCurrencies: CurrencyCode[]
): PriceDisplay[] {
  return targetCurrencies.map(targetCurrency => {
    const convertedAmount = convertCurrency(baseAmount, baseCurrency, targetCurrency);
    const symbol = getCurrencySymbol(targetCurrency);
    const formatted = formatPrice(convertedAmount, targetCurrency);

    return {
      amount: convertedAmount,
      currency: targetCurrency,
      symbol,
      formatted: `${symbol}${formatted} ${targetCurrency}`,
    };
  });
}

/**
 * Get primary, secondary, and local currency displays for a product
 */
export function getProductPriceDisplays(
  productPrice: number,
  productCurrency: CurrencyCode,
  localCurrency: CurrencyCode
): {
  primary: PriceDisplay;
  secondary: PriceDisplay;
  local?: PriceDisplay;
} {
  const allPrices = convertToMultipleCurrencies(
    productPrice,
    productCurrency,
    ["MXN", "USD", localCurrency]
  );

  const mxnPrice = allPrices.find(p => p.currency === "MXN")!;
  const usdPrice = allPrices.find(p => p.currency === "USD")!;
  const localPrice = allPrices.find(p => p.currency === localCurrency);

  // Primary is always the product's original currency
  const primary = allPrices.find(p => p.currency === productCurrency)!;

  // Secondary is the opposite of primary (MXN or USD)
  const secondary = productCurrency === "MXN" ? usdPrice : mxnPrice;

  // Local is shown only if it's different from both primary and secondary
  const local = localCurrency !== "MXN" && localCurrency !== "USD" && localPrice
    ? localPrice
    : undefined;

  return { primary, secondary, local };
}
