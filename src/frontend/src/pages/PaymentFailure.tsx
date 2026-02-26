import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentFailureProps {
  onHome: () => void;
}

export default function PaymentFailure({ onHome }: PaymentFailureProps) {
  return (
    <main className="min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payment Cancelled</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your payment was cancelled. Your seat lock has been released. You can try booking again anytime.
          </p>
        </div>
        <Button onClick={onHome} className="w-full btn-glow gap-2">
          <ArrowLeft className="h-4 w-4" />
          Return to Events
        </Button>
      </div>
    </main>
  );
}
