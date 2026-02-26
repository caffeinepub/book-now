import { useEffect, useState } from "react";
import { useGetStripeSessionStatus } from "@/hooks/useQueries";
import { CheckCircle, XCircle, Loader2, Ticket, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentSuccessProps {
  onHome: () => void;
  onBookings: () => void;
}

export default function PaymentSuccess({ onHome, onBookings }: PaymentSuccessProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    setSessionId(sid);
  }, []);

  const { data: sessionStatus, isLoading } = useGetStripeSessionStatus(sessionId);

  const isSuccess = sessionStatus?.__kind__ === "completed";
  const isFailed = sessionStatus?.__kind__ === "failed";

  if (isLoading || (!sessionStatus && sessionId)) {
    return (
      <main className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Confirming your payment…</p>
        </div>
      </main>
    );
  }

  if (isFailed) {
    return (
      <main className="min-h-screen pt-16 flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Payment Failed</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Payment failed. Your seat lock has been released. Please try booking again.
            </p>
            {sessionStatus?.__kind__ === "failed" && sessionStatus.failed.error && (
              <p className="text-destructive/80 text-xs mt-2 font-mono bg-destructive/10 rounded p-2">
                {sessionStatus.failed.error}
              </p>
            )}
          </div>
          <Button onClick={onHome} className="w-full btn-glow">
            Browse Events
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        {/* Success animation */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Payment Successful
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Booking Confirmed!</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your booking is confirmed. Check your dashboard for ticket details.
          </p>
        </div>

        {isSuccess && sessionStatus.__kind__ === "completed" && sessionStatus.completed.userPrincipal && (
          <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Booking Reference</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">
              {sessionId ?? "—"}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={onBookings} className="flex-1 btn-glow gap-2">
            <Ticket className="h-4 w-4" />
            My Bookings
          </Button>
          <Button onClick={onHome} variant="outline" className="flex-1 gap-2 border-border">
            <Zap className="h-4 w-4" />
            More Events
          </Button>
        </div>
      </div>
    </main>
  );
}
