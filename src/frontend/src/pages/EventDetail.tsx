import { useGetAllTickets } from "@/hooks/useQueries";
import { Event, Ticket, TicketType } from "@/backend";
import { MockEvent, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_GRADIENTS } from "@/utils/mockData";
import { formatDateTime } from "@/utils/format";
import CurrencyBadge from "@/components/CurrencyBadge";
import { useCurrency } from "@/hooks/useCurrency";
import { convertPrice, formatPrice } from "@/utils/currency";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Tag,
  Users,
  Clock,
  Share2,
  Check,
  Minus,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AnyEvent = Event | MockEvent;

interface EventDetailProps {
  event: AnyEvent;
  onBack: () => void;
  onBook: (event: AnyEvent, ticket: Ticket | null, quantity: number) => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  numberedSeat: "Numbered Seat",
  generalAdmission: "General Admission",
  timeSlot: "Time Slot",
};

const MOCK_TICKETS: Ticket[] = [
  {
    id: "mock-ticket-ga",
    eventId: "mock",
    name: "General Admission",
    ticketType: TicketType.generalAdmission,
    price: 4900n,
    availableQuantity: 500n,
    totalQuantity: 1000n,
    baseCurrency: "INR",
  },
  {
    id: "mock-ticket-vip",
    eventId: "mock",
    name: "VIP",
    ticketType: TicketType.numberedSeat,
    price: 14900n,
    availableQuantity: 50n,
    totalQuantity: 100n,
    baseCurrency: "INR",
  },
];

export default function EventDetail({
  event,
  onBack,
  onBook,
  isAuthenticated,
  onLoginRequired,
}: EventDetailProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const { currency } = useCurrency();
  const { data: allTickets = [] } = useGetAllTickets();

  const isDemo = "isDemo" in event;
  const category = event.category as string;
  const gradientClass = CATEGORY_GRADIENTS[category] ?? "from-blue-900/80 via-blue-800/60 to-indigo-900/80";
  const badgeClass = CATEGORY_COLORS[category] ?? "badge-conference";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  const tickets: Ticket[] = isDemo
    ? MOCK_TICKETS.map((t) => ({ ...t, eventId: event.id }))
    : (allTickets as Ticket[]).filter((t) => t.eventId === event.id);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBook = (ticket: Ticket) => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    const qty = quantities[ticket.id] ?? 1;
    onBook(event, ticket, qty);
  };

  const adjustQty = (ticketId: string, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[ticketId] ?? 1;
      return { ...prev, [ticketId]: Math.max(1, Math.min(10, cur + delta)) };
    });
  };

  return (
    <main className="min-h-screen pt-16 pb-16">
      {/* Back */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </button>
      </div>

      {/* Hero */}
      <div className={`relative h-64 sm:h-80 bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-white/10 opacity-20" />
            <div className="absolute w-32 h-32 rounded-full border border-white/10 opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
              <Tag className="h-2.5 w-2.5" />
              {categoryLabel}
            </span>
            {isDemo && (
              <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-400/80 bg-yellow-500/10">
                DEMO EVENT
              </Badge>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event info */}
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="font-display font-bold text-lg text-foreground">Event Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="text-sm font-medium text-foreground">{formatDateTime(event.eventDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Venue</p>
                    <p className="text-sm font-medium text-foreground">{event.venue}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">
                      {event.city}, {event.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tags</p>
                    <p className="text-sm font-medium text-foreground">
                      {event.tags.join(", ") || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-display font-bold text-lg text-foreground mb-4">About This Event</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {event.description || "No description available."}
              </p>
            </div>
          </div>

          {/* Tickets sidebar */}
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5">
              <h2 className="font-display font-bold text-base text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Ticket Options
              </h2>

              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tickets available yet
                </p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const qty = quantities[ticket.id] ?? 1;
                    const available = Number(ticket.availableQuantity);
                    const isSoldOut = available <= 0;
                    return (
                      <div
                        key={ticket.id}
                        className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{ticket.name}</p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary mt-1">
                              <Clock className="h-2.5 w-2.5" />
                              {TICKET_TYPE_LABELS[ticket.ticketType as string] ?? ticket.ticketType}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              <CurrencyBadge
                                priceInSmallestUnit={ticket.price}
                                baseCurrency={ticket.baseCurrency ?? "INR"}
                                event={isDemo ? undefined : (event as Event)}
                              />
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {isSoldOut ? "SOLD OUT" : `${available} left`}
                            </p>
                          </div>
                        </div>

                        {!isSoldOut && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 border border-border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => adjustQty(ticket.id, -1)}
                                className="p-1.5 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-bold text-foreground min-w-8 text-center">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => adjustQty(ticket.id, 1)}
                                className="p-1.5 hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <Button
                              onClick={() => handleBook(ticket)}
                              className="flex-1 btn-glow text-xs font-bold h-8"
                              size="sm"
                            >
                              Reserve · {formatPrice(
                                convertPrice(ticket.price * BigInt(qty), ticket.baseCurrency ?? "INR", currency),
                                currency
                              )}
                            </Button>
                          </div>
                        )}

                        {isSoldOut && (
                          <Button disabled className="w-full h-8 text-xs">
                            Sold Out
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-all bg-transparent cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Link Copied!" : "Share Event"}
            </button>

            {!isAuthenticated && (
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  Sign in to book tickets and manage your orders
                </p>
                <Button onClick={onLoginRequired} className="btn-glow w-full text-sm" size="sm">
                  Sign In to Book
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
