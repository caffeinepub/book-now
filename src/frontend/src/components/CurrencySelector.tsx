import { useCurrency } from "@/hooks/useCurrency";
import { SUPPORTED_CURRENCIES, CURRENCIES } from "@/utils/currency";

interface CurrencySelectorProps {
  className?: string;
}

export default function CurrencySelector({ className }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrency();

  const info = CURRENCIES[currency];

  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      <div className="relative">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="appearance-none bg-secondary/40 border border-border rounded-lg pl-2 pr-6 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-secondary/60 focus:outline-none focus:border-primary/60 transition-all cursor-pointer"
          aria-label="Select currency"
        >
          {SUPPORTED_CURRENCIES.map((code) => {
            const c = CURRENCIES[code];
            return (
              <option key={code} value={code} className="bg-popover text-foreground">
                {c.flag} {code}
              </option>
            );
          })}
        </select>
        {/* Custom arrow */}
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[9px] leading-none">
          ▼
        </span>
      </div>
      <span className="text-[9px] text-muted-foreground/50 text-center leading-none pl-0.5">
        {info?.flag} {info?.name} · indicative rates
      </span>
    </div>
  );
}
