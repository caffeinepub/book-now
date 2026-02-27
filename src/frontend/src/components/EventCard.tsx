import type { Event as BackendEvent } from "../backend.d";
import { MockEvent, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_GRADIENTS } from "@/utils/mockData";
import { formatShortDate } from "@/utils/format";
import { useCurrency } from "@/hooks/useCurrency";
import { MapPin, Calendar, Zap } from "lucide-react";

type AnyEvent = BackendEvent | MockEvent;

interface EventCardProps {
  event: AnyEvent;
  onBook: (event: AnyEvent) => void;
  fromPrice?: number;
}

function isDemo(e: AnyEvent): e is MockEvent {
  return "isDemo" in e && (e as MockEvent).isDemo === true;
}

// Normalise fields that differ between MockEvent and BackendEvent
function getDisplayFields(e: AnyEvent) {
  if (isDemo(e)) {
    return {
      coverImage: e.coverImage || "",
      eventDate: e.eventDate,
      locationStr: `${e.venue}, ${e.city}`,
      category: e.category as string,
      isGlobal: e.isGlobal100 === true,
      isIndia: e.isIndia100 === true,
    };
  }
  const be = e as BackendEvent;
  return {
    coverImage: be.bannerUrl || "",
    eventDate: be.startDate,
    locationStr: be.location,
    category: be.eventType as string,
    isGlobal: be.isTop100Global,
    isIndia: be.isTop100India,
  };
}

export type { AnyEvent };

export default function EventCard({ event, onBook, fromPrice }: EventCardProps) {
  const display = getDisplayFields(event);
  const { category, coverImage, eventDate, locationStr, isGlobal, isIndia } = display;

  const gradientClass = CATEGORY_GRADIENTS[category] ?? "from-blue-900/80 via-blue-800/60 to-indigo-900/80";
  const badgeClass = CATEGORY_COLORS[category] ?? "badge-conference";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  // Price display
  const { currency, currencies, formatPrice } = useCurrency();
  const currInfo = currencies[currency];

  const rawPrice = isDemo(event)
    ? event.fromPrice
    : fromPrice ?? Number((event as BackendEvent).basePriceINR);

  // For demo events fromPrice is in paise (divide by 100 for main INR unit)
  // For backend events basePriceINR is already in main INR unit (rupees)
  const displayPrice = isDemo(event)
    ? formatPrice(rawPrice / 100, currency)
    : formatPrice(rawPrice, currency);

  return (
    <div className="glass-card rounded-xl overflow-hidden group">
      {/* Cover Image / Gradient */}
      <div className={`relative h-48 bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        {coverImage ? (
          <img
            src={coverImage}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-white/30 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/20 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Category badge top-left */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
            {categoryLabel}
          </span>
        </div>

        {/* Top-100 badge top-right */}
        {(isGlobal || isIndia) && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-black/60 border border-white/20 text-white backdrop-blur-sm">
              {isGlobal ? "🌍 Global Top 100" : "🇮🇳 India Top 100"}
            </span>
          </div>
        )}

        {/* Currency flag bottom-right */}
        <div className="absolute bottom-3 right-3">
          <span className="text-base">{currInfo?.flag ?? "🌐"}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2.5">
        <h3 className="font-display font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0 text-primary/60" />
          <span>{formatShortDate(eventDate)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
          <span className="truncate">{locationStr}</span>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
          <div>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em] font-medium">From</p>
            <p className="text-base font-extrabold text-foreground leading-tight">{displayPrice}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBook(event); }}
            className="card-book-btn flex items-center gap-1 px-3.5 py-2 rounded-lg btn-glow text-xs font-bold text-white bg-primary"
          >
            <Zap className="h-3 w-3" />
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}
