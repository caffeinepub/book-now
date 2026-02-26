import { useState } from "react";
import {
  useGetPlatformStats,
  useGetAllEvents,
  useGetVendorApprovalQueue,
  useGetFraudQueue,
  useGetAuditLogs,
  useApproveVendor,
  useRejectVendor,
  useReviewFraudBooking,
  useIsStripeConfigured,
  useSetStripeConfiguration,
  useDeleteEvent,
} from "@/hooks/useQueries";
import { CURRENCIES, EXCHANGE_RATES, SUPPORTED_CURRENCIES } from "@/utils/currency";
import { ActionType, Booking, Event, VendorApprovalStatus } from "@/backend";
import { formatCurrency, formatDateTime, exportToCSV } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShieldCheck, Users, Calendar, DollarSign, BarChart3,
  AlertTriangle, FileText, Settings, Check, X, Download,
  Loader2, Store, Eye, Trash2,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/utils/mockData";

const FRAUD_SCORE_CLASS = (score: bigint) => {
  const n = Number(score);
  if (n >= 70) return "text-destructive";
  if (n >= 30) return "text-[#fbbf24]";
  return "text-green-400";
};

export default function AdminDashboard() {
  const [auditStart, setAuditStart] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [auditEnd, setAuditEnd] = useState<string>(new Date().toISOString().slice(0, 16));
  const [auditActionType, setAuditActionType] = useState<ActionType | "all">("all");
  const [stripeKey, setStripeKey] = useState("");
  const [stripeCountries, setStripeCountries] = useState("US,CA,GB,IN,SG,AE,DE");
  const [savingStripe, setSavingStripe] = useState(false);
  const [multiCurrencyDefault, setMultiCurrencyDefault] = useState<boolean>(() => {
    try {
      return localStorage.getItem("booknow_multi_currency_default") !== "false";
    } catch {
      return true;
    }
  });

  const { data: stats } = useGetPlatformStats();
  const { data: allEvents = [], isLoading: eventsLoading } = useGetAllEvents();
  const { data: vendorQueue = [], isLoading: vendorsLoading } = useGetVendorApprovalQueue();
  const { data: fraudQueue = [], isLoading: fraudLoading } = useGetFraudQueue();
  const { data: stripeConfigured } = useIsStripeConfigured();

  const startTime = BigInt(new Date(auditStart).getTime()) * 1_000_000n;
  const endTime = BigInt(new Date(auditEnd).getTime()) * 1_000_000n;
  const { data: auditLogs = [], isLoading: auditLoading } = useGetAuditLogs(
    startTime,
    endTime,
    auditActionType === "all" ? null : auditActionType
  );

  const approveVendor = useApproveVendor();
  const rejectVendor = useRejectVendor();
  const reviewFraud = useReviewFraudBooking();
  const setStripeConfig = useSetStripeConfiguration();
  const deleteEvent = useDeleteEvent();

  const handleApprove = async (vendorId: string) => {
    try {
      await approveVendor.mutateAsync(vendorId);
      toast.success("Vendor approved successfully.");
    } catch {
      toast.error("Failed to approve vendor.");
    }
  };

  const handleReject = async (vendorId: string) => {
    try {
      await rejectVendor.mutateAsync(vendorId);
      toast.success("Vendor rejected.");
    } catch {
      toast.error("Failed to reject vendor.");
    }
  };

  const handleFraudReview = async (bookingId: string, approve: boolean) => {
    try {
      await reviewFraud.mutateAsync({ bookingId, approve });
      toast.success(approve ? "Booking approved." : "Booking rejected.");
    } catch {
      toast.error("Failed to review booking.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event deleted.");
    } catch {
      toast.error("Failed to delete event.");
    }
  };

  const handleSaveStripe = async () => {
    if (!stripeKey) {
      toast.error("Please enter a Stripe secret key.");
      return;
    }
    setSavingStripe(true);
    try {
      await setStripeConfig.mutateAsync({
        secretKey: stripeKey,
        allowedCountries: stripeCountries.split(",").map((c) => c.trim()).filter(Boolean),
      });
      toast.success("Stripe configuration saved.");
    } catch {
      toast.error("Failed to save Stripe configuration.");
    } finally {
      setSavingStripe(false);
    }
  };

  const handleExportAudit = () => {
    const data = (auditLogs as Array<{ actionType: string; actorId: string; timestamp: bigint; details: string; targetId: string }>).map((log) => ({
      timestamp: formatDateTime(log.timestamp),
      actionType: log.actionType,
      actorId: log.actorId,
      targetId: log.targetId,
      details: log.details,
    }));
    exportToCSV(data, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const KPI_CARDS = [
    {
      label: "Total Users",
      value: stats ? stats.totalUsers.toString() : "—",
      icon: <Users className="h-5 w-5 text-primary" />,
      color: "text-primary",
    },
    {
      label: "Approved Vendors",
      value: stats ? stats.totalVendors.toString() : "—",
      icon: <Store className="h-5 w-5 text-[#a78bfa]" />,
      color: "text-[#a78bfa]",
    },
    {
      label: "Active Events",
      value: stats ? stats.activeEvents.toString() : "—",
      icon: <Calendar className="h-5 w-5 text-green-400" />,
      color: "text-green-400",
    },
    {
      label: "Confirmed Bookings",
      value: stats ? stats.confirmedBookings.toString() : "—",
      icon: <BarChart3 className="h-5 w-5 text-[#fbbf24]" />,
      color: "text-[#fbbf24]",
    },
    {
      label: "Total Revenue",
      value: stats ? formatCurrency(stats.totalRevenue) : "—",
      icon: <DollarSign className="h-5 w-5 text-green-400" />,
      color: "text-green-400",
    },
  ];

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Super Dashboard</h1>
            <p className="text-sm text-muted-foreground">Platform oversight and management</p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary/40 border border-border mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-1.5 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1.5 text-xs sm:text-sm">
              <Store className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="fraud" className="gap-1.5 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              Fraud Queue
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {KPI_CARDS.map((card) => (
                <div key={card.label} className="stat-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {card.icon}
                    </div>
                  </div>
                  <p className={`font-display text-xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {!stripeConfigured && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] mb-4">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  Stripe is not configured. Go to Settings to enable payments.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            {eventsLoading ? (
              <Skeleton className="h-64 w-full bg-secondary/40 rounded-xl" />
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">Title</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Category</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Currency</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Date</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {(allEvents as Event[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No events yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        (allEvents as Event[]).map((evt) => {
                          const curInfo = CURRENCIES[evt.baseCurrency ?? "INR"];
                          return (
                            <TableRow key={evt.id} className="border-border hover:bg-secondary/20">
                              <TableCell className="font-medium text-foreground text-sm max-w-40 truncate">
                                {evt.title}
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_LABELS[evt.category as string] ?? "badge-conference"}`}>
                                  {CATEGORY_LABELS[evt.category as string] ?? evt.category}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <span>{curInfo?.flag ?? "🌐"}</span>
                                  <span>{evt.baseCurrency ?? "INR"}</span>
                                  {evt.multiCurrencyEnabled && (
                                    <span className="text-[9px] text-primary/70 border border-primary/20 rounded px-1">multi</span>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    evt.status === "published"
                                      ? "border-green-500/30 text-green-400 bg-green-500/10"
                                      : "border-border text-muted-foreground"
                                  }`}
                                >
                                  {evt.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatDateTime(evt.eventDate)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="p-1.5 rounded text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
                                    title="View"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEvent(evt.id)}
                                    className="p-1.5 rounded text-destructive hover:text-destructive/80 bg-transparent border-none cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            {vendorsLoading ? (
              <Skeleton className="h-64 w-full bg-secondary/40 rounded-xl" />
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">Business Name</TableHead>
                        <TableHead className="text-muted-foreground text-xs">User ID</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Registered</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorQueue.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No vendors pending review
                          </TableCell>
                        </TableRow>
                      ) : (
                        vendorQueue.map((vendor) => (
                          <TableRow key={vendor.userId} className="border-border hover:bg-secondary/20">
                            <TableCell className="font-medium text-foreground text-sm">
                              {vendor.businessName}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {vendor.userId.slice(0, 16)}…
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  vendor.approvalStatus === VendorApprovalStatus.approved
                                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                                    : vendor.approvalStatus === VendorApprovalStatus.rejected
                                    ? "border-destructive/30 text-destructive bg-destructive/10"
                                    : "border-[#fbbf24]/30 text-[#fbbf24] bg-[#fbbf24]/10"
                                }`}
                              >
                                {vendor.approvalStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {formatDateTime(vendor.createdAt)}
                            </TableCell>
                            <TableCell>
                              {vendor.approvalStatus === VendorApprovalStatus.pending && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(vendor.userId)}
                                    disabled={approveVendor.isPending}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all disabled:opacity-50 cursor-pointer"
                                  >
                                    <Check className="h-3 w-3" />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(vendor.userId)}
                                    disabled={rejectVendor.isPending}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs hover:bg-destructive/20 transition-all disabled:opacity-50 cursor-pointer"
                                  >
                                    <X className="h-3 w-3" />
                                    Reject
                                  </button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Fraud Queue Tab */}
          <TabsContent value="fraud">
            {fraudLoading ? (
              <Skeleton className="h-64 w-full bg-secondary/40 rounded-xl" />
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">Booking ID</TableHead>
                        <TableHead className="text-muted-foreground text-xs">User</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Amount</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Fraud Score</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(fraudQueue as Booking[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No fraud flags — all clear ✓
                          </TableCell>
                        </TableRow>
                      ) : (
                        (fraudQueue as Booking[]).map((booking) => (
                          <TableRow key={booking.id} className="border-border hover:bg-secondary/20">
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {booking.id.slice(0, 12)}…
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {booking.userId.slice(0, 12)}…
                            </TableCell>
                            <TableCell className="text-foreground text-sm font-medium">
                              {formatCurrency(booking.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <span className={`font-bold text-sm ${FRAUD_SCORE_CLASS(booking.fraudScore)}`}>
                                {booking.fraudScore.toString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  booking.status === "confirmed"
                                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                                    : booking.status === "cancelled"
                                    ? "border-destructive/30 text-destructive bg-destructive/10"
                                    : "border-[#fbbf24]/30 text-[#fbbf24] bg-[#fbbf24]/10"
                                }`}
                              >
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleFraudReview(booking.id, true)}
                                  disabled={reviewFraud.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFraudReview(booking.id, false)}
                                  disabled={reviewFraud.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs hover:bg-destructive/20 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                  Reject
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                <Input
                  type="datetime-local"
                  value={auditStart}
                  onChange={(e) => setAuditStart(e.target.value)}
                  className="bg-secondary/50 border-border h-8 text-xs w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                <Input
                  type="datetime-local"
                  value={auditEnd}
                  onChange={(e) => setAuditEnd(e.target.value)}
                  className="bg-secondary/50 border-border h-8 text-xs w-48"
                />
              </div>
              <Select
                value={auditActionType}
                onValueChange={(v) => setAuditActionType(v as ActionType | "all")}
              >
                <SelectTrigger className="bg-secondary/50 border-border h-8 text-xs w-44">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.values(ActionType).map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportAudit}
                variant="outline"
                size="sm"
                className="border-border gap-2 h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>

            {auditLoading ? (
              <Skeleton className="h-64 w-full bg-secondary/40 rounded-xl" />
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs">Timestamp</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Action</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Actor</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Target</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No audit logs found for this period
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log, i) => (
                          <TableRow key={`${log.actorId}-${i}`} className="border-border hover:bg-secondary/20">
                            <TableCell className="text-muted-foreground text-xs">
                              {formatDateTime(log.timestamp)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
                                {log.actionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {log.actorId.slice(0, 12)}…
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {log.targetId.slice(0, 12)}…
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs max-w-48 truncate">
                              {log.details}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-w-lg space-y-6">
              {/* Stripe Config */}
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-foreground text-lg">Stripe Configuration</h2>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      stripeConfigured
                        ? "border-green-500/30 text-green-400 bg-green-500/10"
                        : "border-[#fbbf24]/30 text-[#fbbf24] bg-[#fbbf24]/10"
                    }`}
                  >
                    {stripeConfigured ? "Configured" : "Not Configured"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Stripe Secret Key (sk_live_… or sk_test_…)
                    </Label>
                    <Input
                      type="password"
                      value={stripeKey}
                      onChange={(e) => setStripeKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="bg-secondary/50 border-border focus:border-primary/60 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Allowed Countries (comma-separated ISO codes)
                    </Label>
                    <Input
                      value={stripeCountries}
                      onChange={(e) => setStripeCountries(e.target.value)}
                      placeholder="US,CA,GB,IN"
                      className="bg-secondary/50 border-border focus:border-primary/60 font-mono"
                    />
                  </div>
                  <Button
                    onClick={handleSaveStripe}
                    disabled={savingStripe || !stripeKey}
                    className="w-full btn-glow"
                  >
                    {savingStripe ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Stripe Configuration"
                    )}
                  </Button>
                </div>
              </div>

              {/* Currency Configuration */}
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-bold text-foreground text-lg">Currency Configuration</h2>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Platform Currency Model:</strong> All prices are stored in INR (₹) as the base currency.
                  Multi-currency conversion happens at display level — no permanent conversions in the database.
                  Stripe charges in the user-selected currency when supported.
                </div>

                {/* Exchange Rates Reference */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                    Current Indicative Exchange Rates (INR base)
                  </p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Currency</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Symbol</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Rate vs INR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SUPPORTED_CURRENCIES.map((code) => {
                          const info = CURRENCIES[code];
                          const rate = EXCHANGE_RATES[code] ?? 1;
                          return (
                            <tr key={code} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                              <td className="px-3 py-2 text-foreground font-medium">
                                <span className="mr-1.5">{info.flag}</span>
                                {code} — {info.name}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground font-mono">{info.symbol}</td>
                              <td className="px-3 py-2 text-right text-primary font-mono">
                                {code === "INR" ? "1.0000 (base)" : `1 ₹ = ${rate.toFixed(4)} ${code}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Multi-currency default toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable multi-currency for new events</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Default setting applied when vendors create events</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !multiCurrencyDefault;
                      setMultiCurrencyDefault(next);
                      try { localStorage.setItem("booknow_multi_currency_default", String(next)); } catch { /* noop */ }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-none shrink-0 ${multiCurrencyDefault ? "bg-primary" : "bg-secondary"}`}
                    role="switch"
                    aria-checked={multiCurrencyDefault}
                    aria-label="Enable multi-currency for new events"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${multiCurrencyDefault ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
