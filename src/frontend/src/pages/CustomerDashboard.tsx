import { useState } from "react";
import { useGetMyBookings, useRequestRefund } from "@/hooks/useQueries";
import { Booking, BookingStatus, UserProfile } from "@/backend";
import { formatDateTime, formatCurrency } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Ticket,
  Calendar,
  RefreshCw,
  User,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface CustomerDashboardProps {
  userProfile: UserProfile;
}

const STATUS_CLASSES: Record<BookingStatus, string> = {
  [BookingStatus.pending]: "status-pending",
  [BookingStatus.confirmed]: "status-confirmed",
  [BookingStatus.cancelled]: "status-cancelled",
  [BookingStatus.refunded]: "status-refunded",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.pending]: "Pending",
  [BookingStatus.confirmed]: "Confirmed",
  [BookingStatus.cancelled]: "Cancelled",
  [BookingStatus.refunded]: "Refunded",
};

export default function CustomerDashboard({ userProfile }: CustomerDashboardProps) {
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const { data: bookings = [], isLoading } = useGetMyBookings();
  const requestRefund = useRequestRefund();

  const handleRefundSubmit = async () => {
    if (!refundBooking || !refundReason.trim()) {
      toast.error("Please provide a reason for the refund.");
      return;
    }
    try {
      await requestRefund.mutateAsync({
        bookingId: refundBooking.id,
        reason: refundReason,
      });
      toast.success("Refund request submitted successfully.");
      setRefundBooking(null);
      setRefundReason("");
    } catch {
      toast.error("Failed to submit refund request. Please try again.");
    }
  };

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Welcome back, {userProfile.name}
              </h1>
              <p className="text-sm text-muted-foreground">Manage your bookings and profile</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="bg-secondary/40 border border-border mb-6">
            <TabsTrigger value="bookings" className="gap-2">
              <Ticket className="h-4 w-4" />
              My Bookings
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full bg-secondary/40 rounded-xl" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">No bookings yet</h3>
                <p className="text-muted-foreground text-sm">
                  Book your first event to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(bookings as Booking[]).map((booking) => (
                  <div key={booking.id} className="glass-card rounded-xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Ticket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            Booking #{booking.id.slice(0, 8).toUpperCase()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(booking.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              Qty: {booking.quantity.toString()}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {formatCurrency(booking.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[booking.status] ?? "status-pending"}`}
                        >
                          {STATUS_LABELS[booking.status] ?? booking.status}
                        </span>

                        {booking.status === BookingStatus.confirmed && (
                          <button
                            type="button"
                            onClick={() => setRefundBooking(booking)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all bg-transparent cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Refund
                          </button>
                        )}
                      </div>
                    </div>

                    {Number(booking.fraudScore) >= 70 && (
                      <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        This booking is under review
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="glass-card rounded-2xl p-6 max-w-lg space-y-6">
              <h2 className="font-display font-bold text-foreground text-lg">Profile Details</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <span className="font-display text-xl font-bold text-primary">
                      {userProfile.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{userProfile.name}</p>
                    <p className="text-xs text-muted-foreground">{userProfile.email || "No email set"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                    <p className="text-xs text-muted-foreground">Role</p>
                    <Badge variant="outline" className="mt-1 text-primary border-primary/30">
                      Customer
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className="mt-1 text-green-400 border-green-500/30 bg-green-500/10">
                      Active
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border col-span-2">
                    <p className="text-xs text-muted-foreground">Total Bookings</p>
                    <p className="font-bold text-foreground mt-1">{(bookings as Booking[]).length}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Refund Dialog */}
      <Dialog open={!!refundBooking} onOpenChange={(open) => !open && setRefundBooking(null)}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Request Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for your refund request.
            </p>
            <Textarea
              placeholder="Why are you requesting a refund?"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="bg-secondary/50 border-border min-h-24 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{refundReason.length}/500</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRefundBooking(null)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefundSubmit}
              disabled={requestRefund.isPending || !refundReason.trim()}
              className="btn-glow"
            >
              {requestRefund.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
