// ─── Currency Definitions ─────────────────────────────────────────────────────

export interface CurrencyInfo {
  symbol: string;
  flag: string;
  name: string;
  decimals: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { symbol: "₹", flag: "🇮🇳", name: "Indian Rupee", decimals: 2, locale: "en-IN" },
  USD: { symbol: "$", flag: "🇺🇸", name: "US Dollar", decimals: 2, locale: "en-US" },
  AED: { symbol: "AED", flag: "🇦🇪", name: "UAE Dirham", decimals: 2, locale: "en-AE" },
  EUR: { symbol: "€", flag: "🇪🇺", name: "Euro", decimals: 2, locale: "de-DE" },
  GBP: { symbol: "£", flag: "🇬🇧", name: "British Pound", decimals: 2, locale: "en-GB" },
};

export const SUPPORTED_CURRENCIES: string[] = ["INR", "USD", "AED", "EUR", "GBP"];

// ─── Exchange Rates (INR as base = 1.0) ──────────────────────────────────────

export const EXCHANGE_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 0.012,
  AED: 0.044,
  EUR: 0.011,
  GBP: 0.0095,
};

// ─── Locale-to-Currency Detection ─────────────────────────────────────────────

const EUROPEAN_LOCALES = ["DE", "FR", "IT", "ES", "NL", "AT", "BE", "FI", "PT", "IE"];

export function detectUserCurrency(): string {
  try {
    const lang = navigator.language ?? "en-US";
    const locale = lang.toUpperCase();

    // Check country from locale string (e.g., "en-IN" → "IN")
    const parts = lang.split("-");
    const country = parts.length >= 2 ? parts[parts.length - 1].toUpperCase() : "";

    if (locale.includes("IN") || country === "IN") return "INR";
    if (country === "US" || locale === "EN-US") return "USD";
    if (country === "AE") return "AED";
    if (country === "GB") return "GBP";
    if (EUROPEAN_LOCALES.includes(country)) return "EUR";

    return "USD";
  } catch {
    return "INR";
  }
}

// ─── Price Conversion ─────────────────────────────────────────────────────────

/**
 * Convert a price stored in smallest unit (paise/cents) from one currency to another.
 * @param amountInSmallestUnit - bigint in paise/cents (divide by 100 to get main unit)
 * @param fromCurrency - source currency code (e.g. 'INR')
 * @param toCurrency - target currency code (e.g. 'USD')
 * @returns display number in target currency
 */
export function convertPrice(
  amountInSmallestUnit: bigint,
  fromCurrency: string,
  toCurrency: string
): number {
  const baseAmount = Number(amountInSmallestUnit) / 100;

  if (fromCurrency === toCurrency) {
    return baseAmount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] ?? 1.0;
  const toRate = EXCHANGE_RATES[toCurrency] ?? 1.0;

  // Convert to INR first (base), then to target
  const inINR = baseAmount / fromRate;
  return inINR * toRate;
}

// ─── Price Formatting ─────────────────────────────────────────────────────────

/**
 * Format a display amount with proper locale formatting.
 * @param amount - number (already converted, in main unit not smallest)
 * @param currencyCode - ISO 4217 currency code
 * @returns formatted string like '₹1,500.00' or '$18.00'
 */
export function formatPrice(amount: number, currencyCode: string): string {
  const info = CURRENCIES[currencyCode];
  if (!info) return `${currencyCode} ${amount.toFixed(2)}`;

  try {
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(amount);
  } catch {
    return `${info.symbol}${amount.toFixed(info.decimals)}`;
  }
}
