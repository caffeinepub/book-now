import { Event } from "@/backend";
import { MockEvent, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_GRADIENTS } from "@/utils/mockData";
import { formatShortDate } from "@/utils/format";
import { MapPin, Calendar, Zap, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AnyEvent = Event | MockEvent;

interface EventCardProps {
  event: AnyEvent;
  onBook: (event: AnyEvent) => void;
  fromPrice?: number;
}

function isDemo(e: AnyEvent): e is MockEvent {
  return "isDemo" in e && e.isDemo === true;
}

export type { AnyEvent };

export default function EventCard({ event, onBook, fromPrice }: EventCardProps) {
  const category = event.category as string;
  const gradientClass = CATEGORY_GRADIENTS[category] ?? "from-blue-900/80 via-blue-800/60 to-indigo-900/80";
  const badgeClass = CATEGORY_COLORS[category] ?? "badge-conference";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const price = isDemo(event) ? event.fromPrice : (fromPrice ?? 0);
  const demo = isDemo(event);

  return (
    <div className="glass-card rounded-xl overflow-hidden group">
      {/* Cover Image / Gradient */}
      <div className={`relative h-44 bg-gradient-to-br ${gradientClass} flex items-end p-4 overflow-hidden`}>
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-32 h-32 rounded-full border-4 border-white/30" />
            <div className="absolute w-20 h-20 rounded-full border-2 border-white/20" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Badges row */}
        <div className="relative flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
            <Tag className="h-2.5 w-2.5" />
            {categoryLabel}
          </span>
          {demo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/40 text-yellow-400/80 bg-yellow-500/10">
              DEMO
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-display font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          <span>{formatShortDate(event.eventDate)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          <span className="truncate">
            {event.venue}, {event.city}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div>
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.12em] font-medium">From</p>
            <p className="text-xl font-black text-foreground leading-tight">${price}</p>
          </div>
          <button
            type="button"
            onClick={() => onBook(event)}
            className="card-book-btn flex items-center gap-1.5 px-4 py-2 rounded-lg btn-glow text-xs font-bold text-white bg-primary"
          >
            <Zap className="h-3.5 w-3.5" />
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}
