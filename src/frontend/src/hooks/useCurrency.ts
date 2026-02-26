import { useState, useCallback } from "react";
import {
  CURRENCIES,
  SUPPORTED_CURRENCIES,
  detectUserCurrency,
  convertPrice as convertPriceUtil,
  formatPrice as formatPriceUtil,
  type CurrencyInfo,
} from "@/utils/currency";

const STORAGE_KEY = "booknow_currency";

function getStoredCurrency(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_CURRENCIES.includes(stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return detectUserCurrency();
}

interface UseCurrencyReturn {
  currency: string;
  setCurrency: (code: string) => void;
  currencies: Record<string, CurrencyInfo>;
  convertPrice: (amountInSmallestUnit: bigint, fromCurrency?: string) => number;
  formatPrice: (amount: number, currencyCode?: string) => string;
}

export function useCurrency(): UseCurrencyReturn {
  const [currency, setCurrencyState] = useState<string>(getStoredCurrency);

  const setCurrency = useCallback((code: string) => {
    if (!SUPPORTED_CURRENCIES.includes(code)) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // localStorage unavailable
    }
    setCurrencyState(code);
  }, []);

  const convertPrice = useCallback(
    (amountInSmallestUnit: bigint, fromCurrency = "INR") => {
      return convertPriceUtil(amountInSmallestUnit, fromCurrency, currency);
    },
    [currency]
  );

  const formatPrice = useCallback(
    (amount: number, currencyCode?: string) => {
      return formatPriceUtil(amount, currencyCode ?? currency);
    },
    [currency]
  );

  return {
    currency,
    setCurrency,
    currencies: CURRENCIES,
    convertPrice,
    formatPrice,
  };
}
