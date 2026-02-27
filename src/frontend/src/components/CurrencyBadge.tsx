import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCIES, convertPrice, formatPrice } from "@/utils/currency";
import type { Event } from "@/types";

interface CurrencyBadgeProps {
  priceInSmallestUnit: bigint;
  baseCurrency?: string;
  event?: Event;
  className?: string;
}

/**
 * Displays a price with the appropriate currency symbol and flag emoji.
 * Respects event-level multi-currency settings and falls back gracefully.
 */
export default function CurrencyBadge({
  priceInSmallestUnit,
  baseCurrency = "INR",
  event,
  className,
}: CurrencyBadgeProps) {
  const { currency: userCurrency } = useCurrency();

  // Determine which currency to display in
  let displayCurrency: string;

  if (event) {
    // If multi-currency is disabled, always show in base currency
    if (!event.multiCurrencyEnabled) {
      displayCurrency = event.baseCurrency ?? baseCurrency;
    } else if (
      event.supportedCurrencies &&
      event.supportedCurrencies.includes(userCurrency)
    ) {
      // User's currency is supported
      displayCurrency = userCurrency;
    } else {
      // Fallback to event's base currency
      displayCurrency = event.baseCurrency ?? baseCurrency;
    }
  } else {
    // No event context: use user currency with baseCurrency as source
    displayCurrency = userCurrency;
  }

  const effectiveBase = event?.baseCurrency ?? baseCurrency;
  const amount = convertPrice(priceInSmallestUnit, effectiveBase, displayCurrency);
  const formatted = formatPrice(amount, displayCurrency);
  const currencyInfo = CURRENCIES[displayCurrency];
  const flag = currencyInfo?.flag ?? "";

  return (
    <span className={`inline-flex items-center gap-1 font-tabular whitespace-nowrap ${className ?? ""}`}>
      <span className="text-[0.85em] leading-none">{flag}</span>
      <span>{formatted}</span>
    </span>
  );
}
