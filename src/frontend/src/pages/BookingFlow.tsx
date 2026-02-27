import { useState, useEffect, useCallback } from "react";
import { useCreateCheckoutSession } from "@/hooks/useQueries";
import { Ticket } from "@/types";
import { MockEvent } from "@/utils/mockData";
import { formatDateTime } from "@/utils/format";
import type { Event as BackendEvent } from "../backend.d";
import { Clock, ArrowLeft, Lock, CreditCard, AlertTriangle, Loader2, ShieldCheck, ChevronRight, Zap, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import type { AnyEvent } from "@/components/EventCard";

interface BookingFlowProps {
  event: AnyEvent;
  ticket: Ticket;
  quantity: number;
  onBack: () => void;
  userId: string;
}

const LOCK_DURATION = 120; // 2 minutes

type FlowStep = "review" | "escrow" | "processing";

function isDemo(e: AnyEvent): e is MockEvent {
  return "isDemo" in e && (e as MockEvent).isDemo === true;
}

function getEventDisplayFields(e: AnyEvent) {
  if (isDemo(e)) {
    return {
      eventDate: e.eventDate,
      venue: e.venue,
      city: e.city,
      country: e.country,
      locationStr: `${e.venue}, ${e.city}, ${e.country}`,
      multiCurrencyEnabled: false,
      supportedCurrencies: [] as string[],
      baseCurrency: "INR",
    };
  }
  const be = e as BackendEvent;
  return {
    eventDate: be.startDate,
    venue: be.location,
    city: "",
    country: "",
    locationStr: be.location,
    multiCurrencyEnabled: be.multiCurrencyEnabled,
    supportedCurrencies: be.supportedCurrencies ?? [],
    baseCurrency: be.baseCurrency ?? "INR",
  };
}

export default function BookingFlow({ event, ticket, quantity: initialQty, onBack, userId: _userId }: BookingFlowProps) {
  const [step, setStep] = useState<FlowStep>("review");
  const [qty, setQty] = useState(initialQty);
  const [timeLeft, setTimeLeft] = useState(LOCK_DURATION);
  const [expired, setExpired] = useState(false);

  const createCheckout = useCreateCheckoutSession();
  const { currency, formatPrice, convertPrice } = useCurrency();

  const eventFields = getEventDisplayFields(event);

  // Countdown timer — runs from review step
  useEffect(() => {
    if (step === "processing") return;
    if (timeLeft <= 0) { setExpired(true); return; }
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setExpired(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleProceedToEscrow = () => {
    if (expired) { toast.error("Seat lock expired. Please try again."); onBack(); return; }
    setStep("escrow");
  };

  const handleProceedToPayment = useCallback(async () => {
    if (expired) { toast.error("Seat lock expired. Please try again."); onBack(); return; }
    setStep("processing");

    const baseCurrency = ticket.baseCurrency ?? "INR";
    let stripeCurrency: string;

    if (eventFields.multiCurrencyEnabled && eventFields.supportedCurrencies.includes(currency)) {
      stripeCurrency = currency.toLowerCase();
    } else {
      stripeCurrency = baseCurrency.toLowerCase();
    }

    try {
      const items = [
        {
          productName: `${ticket.name} — ${event.title}`,
          productDescription: `${formatDateTime(eventFields.eventDate)} · ${eventFields.locationStr}`,
          currency: stripeCurrency,
          quantity: BigInt(qty),
          priceInCents: ticket.price,
        },
      ];

      const sessionJson = await createCheckout.mutateAsync({
        items,
        successUrl: `${window.location.protocol}//${window.location.host}/?payment=success`,
        cancelUrl: `${window.location.protocol}//${window.location.host}/?payment=cancelled`,
      });

      let redirectUrl: string | null = null;
      try {
        const parsed = JSON.parse(sessionJson) as { url?: string };
        redirectUrl = parsed.url ?? null;
      } catch {
        redirectUrl = sessionJson;
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("Stripe session missing url");
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Booking failed. Please try again.");
      setStep("escrow");
    }
  }, [expired, event, ticket, qty, createCheckout, onBack, currency, eventFields]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isCritical = timeLeft <= 30;

  const ticketPrice = convertPrice(ticket.price, ticket.baseCurrency ?? "INR");
  const totalPrice = ticketPrice * qty;

  return (
    <main className="min-h-screen pt-16 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-lg page-enter">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 bg-transparent border-none cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(["review", "escrow", "processing"] as FlowStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                step === s ? "bg-primary text-white shadow-glow" :
                ["review", "escrow", "processing"].indexOf(step) > i ? "bg-green-500 text-white" :
                "bg-secondary text-muted-foreground"
              }`}>
                {["review", "escrow", "processing"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s === "review" ? "Review Order" : s === "escrow" ? "Secure Payment" : "Processing"}
              </span>
              {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Header with countdown */}
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" />
                    Booking in 2 Minutes
                  </p>
                  <p className="text-[10px] text-muted-foreground">Seat locked · Complete before expiry</p>
                </div>
              </div>
              {/* Countdown */}
              <div className={`font-mono font-bold text-lg tabular-nums ${isCritical ? "text-destructive animate-pulse" : "text-primary"}`}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Step 1: Review Order */}
            {step === "review" && (
              <>
                {expired && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">Seat lock expired. Please go back and try again.</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Order Summary</p>
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(eventFields.eventDate)}</p>
                      <p className="text-xs text-muted-foreground">{eventFields.locationStr}</p>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ticket Type</span>
                        <span className="font-medium text-foreground">{ticket.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Quantity</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-bold text-foreground w-4 text-center">{qty}</span>
                          <button type="button" onClick={() => setQty(q => Math.min(10, q + 1))} className="w-6 h-6 rounded bg-secondary border border-border flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Unit Price</span>
                        <span>{formatPrice(ticketPrice)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between font-bold text-foreground text-base">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleProceedToEscrow} disabled={expired} className="w-full btn-glow h-12 text-sm font-bold gap-2">
                  Continue to Payment
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Step 2: Escrow Notice */}
            {step === "escrow" && (
              <>
                <div className="text-center py-2">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-display font-bold text-foreground text-xl mb-1">Secure Escrow Payment</h2>
                  <p className="text-sm text-muted-foreground">Your money is protected at every step.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { step: "1", title: "You Pay", desc: "Funds go directly to DMT CREATOLOGY secure escrow — never to the vendor." },
                    { step: "2", title: "Event Happens", desc: "Attend your event. Your money stays protected throughout." },
                    { step: "3", title: "Admin Releases Funds", desc: "Only after event completion with zero complaints, DMT CREATOLOGY releases payment." },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border border-border rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total to Pay</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(totalPrice)}</span>
                </div>

                <Button
                  onClick={handleProceedToPayment}
                  disabled={expired || createCheckout.isPending}
                  className="w-full btn-glow h-12 text-sm font-bold gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Securely via Stripe
                </Button>

                <button type="button" onClick={() => setStep("review")} className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none py-1">
                  ← Back to Order Review
                </button>
              </>
            )}

            {/* Step 3: Processing */}
            {step === "processing" && (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-foreground text-lg">Processing…</h2>
                  <p className="text-sm text-muted-foreground mt-1">Preparing your secure checkout with Stripe…</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Secured by Stripe · PCI DSS Compliant · DMT CREATOLOGY Escrow</span>
        </div>
      </div>
    </main>
  );
}
