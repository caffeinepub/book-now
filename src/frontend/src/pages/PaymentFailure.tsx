import { XCircle, ArrowLeft, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentFailureProps {
  onHome: () => void;
  onRetry?: () => void;
}

export default function PaymentFailure({ onHome, onRetry }: PaymentFailureProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background page-enter">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        {/* Error icon */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-destructive/10 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            Payment Failed
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payment Unsuccessful</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">
            Your payment was not completed. Your seat lock has been released. No charges were made.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {onRetry && (
            <Button onClick={onRetry} className="w-full btn-glow gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button onClick={onHome} variant="outline" className="w-full border-border gap-2">
            <Home className="h-4 w-4" />
            Return to Events
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <span className="text-primary cursor-pointer hover:underline">Contact DMT CREATOLOGY Support</span>
        </p>
      </div>
    </main>
  );
}
