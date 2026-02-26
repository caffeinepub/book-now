import { useState, useEffect, useCallback } from "react";
import { useCreateBooking, useCreateCheckoutSession } from "@/hooks/useQueries";
import { Event, Ticket, BookingStatus } from "@/backend";
import { MockEvent } from "@/utils/mockData";
import { formatDateTime, generateId, toICPTimestamp } from "@/utils/format";
import { Clock, ArrowLeft, Lock, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import CurrencyBadge from "@/components/CurrencyBadge";

type AnyEvent = Event | MockEvent;

interface BookingFlowProps {
  event: AnyEvent;
  ticket: Ticket;
  quantity: number;
  onBack: () => void;
  userId: string;
}

const LOCK_DURATION = 120; // 2 minutes

export default function BookingFlow({
  event,
  ticket,
  quantity,
  onBack,
  userId,
}: BookingFlowProps) {
  const [step, setStep] = useState<"lock" | "processing">("lock");
  const [timeLeft, setTimeLeft] = useState(LOCK_DURATION);
  const [expired, setExpired] = useState(false);

  const createBooking = useCreateBooking();
  const createCheckout = useCreateCheckoutSession();
  const { currency } = useCurrency();

  // Countdown timer
  useEffect(() => {
    if (step !== "lock") return;
    if (timeLeft <= 0) {
      setExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleProceed = useCallback(async () => {
    if (expired) {
      toast.error("Seat lock has expired. Please try again.");
      onBack();
      return;
    }

    setStep("processing");

    const isDemo = "isDemo" in event;
    const bookingId = generateId();
    const now = toICPTimestamp();

    // Determine Stripe currency: use user's currency if event supports it, else base currency
    const realEvent = !isDemo ? (event as Event) : null;
    const baseCurrency = ticket.baseCurrency ?? "INR";
    let stripeCurrency: string;

    if (
      realEvent?.multiCurrencyEnabled &&
      realEvent.supportedCurrencies &&
      realEvent.supportedCurrencies.includes(currency)
    ) {
      stripeCurrency = currency.toLowerCase();
    } else {
      stripeCurrency = (realEvent?.baseCurrency ?? baseCurrency).toLowerCase();
    }

    try {
      if (!isDemo) {
        // Create booking record
        await createBooking.mutateAsync({
          id: bookingId,
          status: BookingStatus.pending,
          eventId: event.id,
          ticketTypeId: ticket.id,
          userId,
          quantity: BigInt(quantity),
          totalAmount: ticket.price * BigInt(quantity),
          seatNumbers: [],
          idempotencyKey: generateId(),
          lockToken: generateId(),
          fraudScore: 0n,
          createdAt: now,
          stripeSessionId: "",
        });
      }

      // Create Stripe checkout session
      const items = [
        {
          productName: `${event.title} — ${ticket.name}`,
          productDescription: `${formatDateTime(event.eventDate)} · ${event.venue}, ${event.city}`,
          currency: stripeCurrency,
          quantity: BigInt(quantity),
          priceInCents: ticket.price,
        },
      ];

      const session = await createCheckout.mutateAsync(items);
      if (!session?.url) throw new Error("Stripe session missing url");
      window.location.href = session.url;
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Booking failed. Please try again.");
      setStep("lock");
    }
  }, [expired, event, ticket, quantity, userId, createBooking, createCheckout, onBack, currency]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isCritical = timeLeft <= 30;
  const realEvent = !("isDemo" in event) ? (event as Event) : undefined;

  return (
    <main className="min-h-screen pt-16 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event
        </button>

        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 border-b border-border px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-foreground text-lg">Secure Seat Lock</h1>
                <p className="text-xs text-muted-foreground">Your seat is reserved for 2 minutes</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {step === "lock" && (
              <>
                {/* Countdown Timer */}
                <div className="text-center py-4">
                  <div className={`text-5xl font-display font-bold tabular-nums ${isCritical ? "countdown-critical" : "text-foreground"}`}>
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </div>
                  <p className={`text-sm mt-2 ${isCritical ? "text-destructive" : "text-muted-foreground"}`}>
                    {isCritical ? "⚠ Expiring soon!" : "Time remaining to complete booking"}
                  </p>
                </div>

                {expired && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">Seat lock has expired. Please go back and try again.</p>
                  </div>
                )}

                {/* Order Summary */}
                <div className="space-y-3">
                  <h2 className="font-display font-bold text-sm text-foreground uppercase tracking-wider">
                    Order Summary
                  </h2>

                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(event.eventDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">{event.venue}, {event.city}</p>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ticket: {ticket.name}</span>
                        <CurrencyBadge
                          priceInSmallestUnit={ticket.price}
                          baseCurrency={ticket.baseCurrency ?? "INR"}
                          event={realEvent}
                        />
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Quantity</span>
                        <span>× {quantity}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between font-bold text-foreground">
                        <span>Total</span>
                        <span className="text-primary">
                          <CurrencyBadge
                            priceInSmallestUnit={ticket.price * BigInt(quantity)}
                            baseCurrency={ticket.baseCurrency ?? "INR"}
                            event={realEvent}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleProceed}
                  disabled={expired}
                  className="w-full btn-glow h-12 text-base font-bold gap-2"
                >
                  <CreditCard className="h-5 w-5" />
                  Proceed to Payment
                </Button>
              </>
            )}

            {step === "processing" && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground text-lg">Processing…</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Creating your booking and redirecting to Stripe…
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Secured by Stripe · PCI DSS Compliant</span>
        </div>
      </div>
    </main>
  );
}
