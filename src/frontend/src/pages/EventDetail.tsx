import { useState } from "react";
import type { Event as BackendEvent } from "../backend.d";
import { Ticket, TicketType } from "@/types";
import { MockEvent, CATEGORY_COLORS, CATEGORY_LABELS, CATEGORY_GRADIENTS } from "@/utils/mockData";
import { formatDateTime } from "@/utils/format";
import { useCurrency } from "@/hooks/useCurrency";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Tag,
  Minus,
  Plus,
  Shield,
  Clock,
  Lock,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AnyEvent } from "@/components/EventCard";

interface EventDetailProps {
  event: AnyEvent;
  onBack: () => void;
  onBook: (event: AnyEvent, ticket: Ticket | null, quantity: number) => void;
  isAuthenticated: boolean;
  onLoginRequired: () => void;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  numberedSeat: "🪑 Numbered Seat",
  generalAdmission: "🎟 General Admission",
  timeSlot: "⏰ Time Slot",
  vipPackage: "👑 VIP Package",
};

const MOCK_TICKETS: Ticket[] = [
  {
    id: "mock-ticket-ga",
    eventId: "mock",
    name: "General Admission",
    ticketType: TicketType.generalAdmission,
    price: 490000n,   // ₹4900 in paise
    availableQuantity: 500n,
    totalQuantity: 1000n,
    baseCurrency: "INR",
  },
  {
    id: "mock-ticket-vip",
    eventId: "mock",
    name: "VIP Access",
    ticketType: TicketType.numberedSeat,
    price: 1490000n,  // ₹14900 in paise
    availableQuantity: 50n,
    totalQuantity: 100n,
    baseCurrency: "INR",
  },
];

function isDemo(e: AnyEvent): e is MockEvent {
  return "isDemo" in e && (e as MockEvent).isDemo === true;
}

// Normalise fields that differ between backend Event and MockEvent
function getEventFields(e: AnyEvent) {
  if (isDemo(e)) {
    return {
      coverImage: e.coverImage || "",
      eventDate: e.eventDate,
      locationStr: `${e.venue}, ${e.city}, ${e.country}`,
      category: e.category as string,
      description: e.description,
      tags: e.tags ?? [],
    };
  }
  const be = e as BackendEvent;
  return {
    coverImage: be.bannerUrl || "",
    eventDate: be.startDate,
    locationStr: be.location,
    category: be.eventType as string,
    description: be.description,
    tags: be.tags ?? [],
  };
}

// Build a Ticket stub from backend Event for booking flow
function backendEventToTicket(e: BackendEvent): Ticket {
  return {
    id: `event-${String(e.id)}`,
    eventId: String(e.id),
    name: TICKET_TYPE_LABELS[e.ticketType as string] ?? "General Admission",
    ticketType: e.ticketType as unknown as TicketType,
    price: e.basePriceINR,
    availableQuantity: e.availableSeats,
    totalQuantity: e.totalSeats,
    baseCurrency: e.baseCurrency ?? "INR",
  };
}

export default function EventDetail({ event, onBack, onBook, isAuthenticated, onLoginRequired }: EventDetailProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [seatLock, _setSeatLock] = useState<{ ticketId: string; expiresAt: number } | null>(null);

  const { currency, currencies, formatPrice, convertPrice } = useCurrency();
  const currInfo = currencies[currency];
  const demo = isDemo(event);

  const fields = getEventFields(event);
  const { category, coverImage, eventDate, locationStr, description, tags } = fields;

  // For backend events, build a synthetic ticket from the event data
  const tickets: Ticket[] = demo
    ? MOCK_TICKETS
    : [backendEventToTicket(event as BackendEvent)];

  const gradientClass = CATEGORY_GRADIENTS[category] ?? "from-blue-900/80 via-blue-800/60 to-indigo-900/80";
  const badgeClass = CATEGORY_COLORS[category] ?? "badge-conference";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  const getQuantity = (ticketId: string) => quantities[ticketId] ?? 1;

  const setQuantity = (ticketId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[ticketId] ?? 1;
      const next = Math.max(1, Math.min(10, current + delta));
      return { ...prev, [ticketId]: next };
    });
  };

  const handleBook = (ticket: Ticket) => {
    if (!isAuthenticated) {
      onLoginRequired();
      toast.error("Please sign in to book tickets.");
      return;
    }
    onBook(event, ticket, getQuantity(ticket.id));
  };

  const getLockTimeLeft = () => {
    if (!seatLock) return null;
    const remaining = Math.max(0, seatLock.expiresAt - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTicketPrice = (ticket: Ticket) => {
    const converted = convertPrice(ticket.price, ticket.baseCurrency ?? "INR");
    return formatPrice(converted, currency);
  };

  const lockTimeLeft = getLockTimeLeft();

  return (
    <main className="min-h-screen pt-16 pb-16 page-enter">
      {/* Hero with gradient + back button */}
      <section className={`relative bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        <div className="absolute inset-0">
          {coverImage ? (
            <img src={coverImage} alt={event.title} className="w-full h-full object-cover opacity-40" />
          ) : (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground bg-black/30 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 mb-10 transition-all hover:bg-black/50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </button>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-1 space-y-4">
              {/* Category badge */}
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                <Tag className="h-3 w-3" />
                {categoryLabel}
              </span>

              {/* Title */}
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                {event.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-col sm:flex-row gap-3 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <span>{formatDateTime(eventDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{locationStr}</span>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seat lock countdown */}
            {lockTimeLeft && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <Clock className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Seat Reserved — Complete Booking</p>
                  <p className="text-xs text-destructive/80 mt-0.5">Expires in <span className="font-mono font-bold">{lockTimeLeft}</span></p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="font-display font-bold text-foreground text-lg mb-4">About This Event</h2>
              <p className="text-foreground/80 text-sm leading-relaxed">{description}</p>
            </div>

            {/* Trust badge */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Secured by DMT CREATOLOGY</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your payment is held in escrow until event completion. 100% secure.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Tickets */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-foreground text-base">Select Tickets</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{currInfo?.flag}</span>
                  <span className="font-medium">{currency}</span>
                </div>
              </div>

              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const qty = getQuantity(ticket.id);
                  const available = Number(ticket.availableQuantity);
                  const isSoldOut = available === 0;

                  return (
                    <div
                      key={ticket.id}
                      className={`border rounded-xl p-4 space-y-3 transition-all ${
                        isSoldOut ? "opacity-50 border-border/30" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{ticket.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {TICKET_TYPE_LABELS[ticket.ticketType as string] ?? ticket.ticketType}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-foreground text-base">{formatTicketPrice(ticket)}</p>
                          <p className="text-xs text-muted-foreground">per ticket</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSoldOut ? "bg-destructive" : "bg-green-400"}`} />
                          {isSoldOut ? "Sold Out" : `${available.toLocaleString()} left`}
                        </div>

                        {!isSoldOut && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQuantity(ticket.id, -1)}
                              className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center border border-border hover:border-primary/40 transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-bold text-foreground w-4 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(ticket.id, 1)}
                              className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center border border-border hover:border-primary/40 transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {!isSoldOut && (
                        <Button
                          onClick={() => handleBook(ticket)}
                          className="w-full btn-glow gap-2 text-sm"
                        >
                          <Zap className="h-4 w-4" />
                          Book {qty} Ticket{qty !== 1 ? "s" : ""} · {formatPrice(convertPrice(ticket.price, ticket.baseCurrency ?? "INR") * qty)}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {!isAuthenticated && (
                <div className="mt-4 p-3 rounded-xl bg-secondary/40 border border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    <button type="button" onClick={onLoginRequired} className="text-primary hover:underline cursor-pointer bg-transparent border-none font-medium">
                      Sign in
                    </button>{" "}
                    to book tickets
                  </p>
                </div>
              )}
            </div>

            {/* 2-min booking badge */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Booking in 2 Minutes</p>
                <p className="text-[11px] text-muted-foreground">Fastest seat reservation guaranteed</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Escrow Protected</p>
                <p className="text-[11px] text-muted-foreground">Funds held by DMT CREATOLOGY</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
