# BOOK NOW - Currency System

## Current State

The platform is a fully functional event booking marketplace with:
- Three roles: Customer, Vendor, Super Admin
- Events, Tickets, Bookings, Refunds, Fraud scoring, Audit logs
- Stripe payment integration (single currency, no currency field)
- Backend `Event` and `Ticket` types store `price` as plain `Nat` with no currency metadata
- `ShoppingItem` has a `currency` field but it is hardcoded to a single value in practice
- No currency detection, conversion, or multi-currency display anywhere in the frontend

## Requested Changes (Diff)

### Add
- Backend: `CurrencyConfig` type per event: `baseCurrency`, `supportedCurrencies` array, `multiCurrencyEnabled` flag
- Backend: `basePrice` field on `Ticket` (replaces raw `price` semantically; still stored as Nat in smallest unit of base currency)
- Backend: `setCurrencyConfig` and `getCurrencyConfig` per-event endpoints (admin/vendor)
- Frontend: `useCurrency` hook — detects user locale/country from `navigator.language` and `Intl` API, maps to a display currency (INR, USD, AED, EUR, GBP)
- Frontend: Static exchange rate table (INR as base): INR→USD, INR→AED, INR→EUR, INR→GBP (rates hardcoded, labeled as indicative; future-ready for live rate API)
- Frontend: `CurrencyBadge` component — shows flag emoji + currency symbol + converted price
- Frontend: `CurrencySelector` dropdown — future-ready manual override, stored in localStorage
- Frontend: Stripe checkout passes currency code matching user's detected/selected currency when supported by event; otherwise falls back to base currency (INR)
- Admin Dashboard: Per-event currency config panel — set base currency, toggle multi-currency
- Vendor Dashboard: Pricing inputs default to INR; currency label shown next to price field

### Modify
- `Ticket` backend type: add `baseCurrency` field (Text, default "INR")
- `Event` backend type: add `baseCurrency` (Text), `supportedCurrencies` ([Text]), `multiCurrencyEnabled` (Bool)
- `AddEventArgs` / `UpdateEventArgs`: include new currency fields
- `ShoppingItem` currency field: passed dynamically from detected user currency
- Marketplace, EventDetail, BookingFlow pages: replace raw price display with `CurrencyBadge`
- Admin and Vendor dashboards: show currency-aware pricing, add currency config controls

### Remove
- Nothing removed; all existing functionality preserved

## Implementation Plan

1. Update Motoko backend: add currency fields to `Event`, `AddEventArgs`, `UpdateEventArgs`, `Ticket`; add `CurrencyConfig` type and `setCurrencyConfig` / `getCurrencyConfig` calls
2. Regenerate `backend.d.ts` via `generate_motoko_code`
3. Create `src/utils/currency.ts` — locale detection, exchange rate table, `formatPrice(amountInr, targetCurrency)`, `detectUserCurrency()`, `SUPPORTED_CURRENCIES` map
4. Create `src/hooks/useCurrency.ts` — React hook wrapping currency utils + localStorage override
5. Create `src/components/CurrencyBadge.tsx` — flag emoji + symbol + converted price display
6. Create `src/components/CurrencySelector.tsx` — dropdown for manual currency override
7. Update Marketplace, EventDetail, BookingFlow pages to use `CurrencyBadge` and `useCurrency`
8. Update BookingFlow Stripe checkout to pass dynamic currency
9. Update VendorDashboard event creation form: INR default, currency label
10. Update AdminDashboard: per-event currency config (base currency picker, multi-currency toggle)

## UX Notes

- Currency detection is silent — no prompt shown to user
- Flag emoji used as lightweight country indicator (no image assets required)
- Manual selector rendered as a small dropdown in the nav/header area, future-ready but visible
- Price always shown as: `[FLAG] [SYMBOL][AMOUNT] [CODE]` e.g. `🇮🇳 ₹1,500 INR`
- Conversion is display-only; database always stores INR amounts as Nat
- If event has `multiCurrencyEnabled = false`, always show base currency regardless of user locale
