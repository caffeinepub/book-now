import { useState } from "react";
import {
  useGetPlatformStats,
  useListPublishedEvents,
  useListAllUsers,
  useListFraudLogs,
  useReviewFraudFlag,
  useListEscrowPayouts,
  useReleaseEscrowPayout,
  useRejectEscrowPayout,
  useListAuditLogs,
  useIsStripeConfigured,
  useSetStripeConfiguration,
  useDeleteEvent,
  usePublishEvent,
  useUnpublishEvent,
  useSetEventTop100,
  useGetExchangeRates,
  useSetExchangeRates,
  useListMyItineraries,
  useCreatePreloadedProfile,
  useListPreloadedProfiles,
  useListAllBookings,
} from "@/hooks/useQueries";
import { formatDateTime, exportToCSV } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Event, FraudLog, EscrowPayout, AuditLog, VotingEntry, AIItineraryLog } from "@/backend.d";
import type { User } from "@/backend.d";
import {
  ShieldCheck, Users, Calendar, DollarSign, BarChart3,
  AlertTriangle, FileText, Settings, Check, X, Download,
  Loader2, Store, Eye, Trash2, Activity, Globe, TrendingUp,
  CreditCard, Search, RefreshCw, Clock, Zap, Shield, Banknote,
  Sparkles, Crown, ChevronDown,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatINR(amount: bigint): string {
  const val = Number(amount) / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

function formatINRDirect(amount: bigint): string {
  const val = Number(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

const FRAUD_COLOR = (score: bigint) => {
  const n = Number(score);
  if (n >= 70) return "text-red-400";
  if (n >= 30) return "text-yellow-400";
  return "text-green-400";
};
const FRAUD_BG = (score: bigint) => {
  const n = Number(score);
  if (n >= 70) return "bg-red-500/10 border-red-500/30";
  if (n >= 30) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-green-500/10 border-green-500/30";
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  musicFestival: "Music Festival",
  dj: "DJ",
  celebrity: "Celebrity",
  sports: "Sports",
  conference: "Conference",
  workshop: "Workshop",
  privateEvent: "Private Event",
  luxuryParty: "Luxury Party",
  modelingAssignment: "Modeling",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [eventSearch, setEventSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | string>("all");
  const [auditAction, setAuditAction] = useState<string>("all");
  const [auditStart, setAuditStart] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [auditEnd, setAuditEnd] = useState<string>(new Date().toISOString().slice(0, 16));
  const [stripeKey, setStripeKey] = useState("");
  const [stripeCountries, setStripeCountries] = useState("US,CA,GB,IN,SG,AE,DE");
  const [savingStripe, setSavingStripe] = useState(false);
  const [rateUSD, setRateUSD] = useState("0.012");
  const [rateEUR, setRateEUR] = useState("0.011");
  const [rateAED, setRateAED] = useState("0.044");
  const [rateGBP, setRateGBP] = useState("0.0095");
  const [savingRates, setSavingRates] = useState(false);
  const [payoutNote, setPayoutNote] = useState<Record<string, string>>({});

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: stats } = useGetPlatformStats();
  const { data: events = [], isLoading: eventsLoading } = useListPublishedEvents();
  const { data: allUsers = [], isLoading: usersLoading } = useListAllUsers();
  const { data: fraudLogs = [], isLoading: fraudLoading } = useListFraudLogs();
  const { data: escrowPayouts = [], isLoading: escrowLoading } = useListEscrowPayouts();
  const { data: allBookings = [] } = useListAllBookings();
  const { data: stripeConfigured } = useIsStripeConfigured();
  const { data: exchangeRates } = useGetExchangeRates();
  const { data: itineraries = [] } = useListMyItineraries();
  const { data: preloadedProfiles = [] } = useListPreloadedProfiles();
  const createProfile = useCreatePreloadedProfile();

  const startTime = BigInt(new Date(auditStart).getTime()) * 1_000_000n;
  const endTime = BigInt(new Date(auditEnd).getTime()) * 1_000_000n;
  const { data: auditLogs = [], isLoading: auditLoading } = useListAuditLogs(
    null,
    auditAction === "all" ? null : auditAction,
    startTime,
    endTime,
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const setStripeConfig = useSetStripeConfiguration();
  const deleteEvent = useDeleteEvent();
  const publishEvent = usePublishEvent();
  const unpublishEvent = useUnpublishEvent();
  const setTop100 = useSetEventTop100();
  const reviewFraud = useReviewFraudFlag();
  const releasePayout = useReleaseEscrowPayout();
  const rejectPayout = useRejectEscrowPayout();
  const setRates = useSetExchangeRates();

  // Update exchange rate inputs when data loads
  if (exchangeRates) {
    if (rateUSD === "0.012" && exchangeRates.inrToUsd !== 0.012) setRateUSD(String(exchangeRates.inrToUsd));
    if (rateEUR === "0.011" && exchangeRates.inrToEur !== 0.011) setRateEUR(String(exchangeRates.inrToEur));
    if (rateAED === "0.044" && exchangeRates.inrToAed !== 0.044) setRateAED(String(exchangeRates.inrToAed));
    if (rateGBP === "0.0095" && exchangeRates.inrToGbp !== 0.0095) setRateGBP(String(exchangeRates.inrToGbp));
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const vendors = (allUsers as User[]).filter(u => u.role === "vendor");
  const pendingVendors = vendors.filter(u => !u.isApproved);
  const fraudAlertCount = (fraudLogs as FraudLog[]).filter(f => f.status === "flagged" || f.status === "autoHeld").length;

  const filteredEvents = (events as Event[]).filter(evt =>
    evt.title.toLowerCase().includes(eventSearch.toLowerCase())
  );
  const filteredUsers = (allUsers as User[]).filter(u => {
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchSearch = !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  const refundBookings = (allBookings as Array<{ id: bigint; status: string; totalAmountINR: bigint; createdAt: bigint; userId: { toString(): string } }>)
    .filter(b => b.status === "refunded" || b.status === "cancelled");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDeleteEvent = async (eventId: bigint) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event deleted.");
    } catch { toast.error("Failed to delete event."); }
  };

  const handleTogglePublish = async (event: Event) => {
    try {
      if (event.isPublished) {
        await unpublishEvent.mutateAsync(event.id);
        toast.success("Event unpublished.");
      } else {
        await publishEvent.mutateAsync(event.id);
        toast.success("Event published.");
      }
    } catch { toast.error("Failed to update event."); }
  };

  const handleSetTop100 = async (event: Event, isGlobal: boolean, isIndia: boolean) => {
    try {
      await setTop100.mutateAsync({
        eventId: event.id,
        isTop100Global: isGlobal,
        isTop100India: isIndia,
        globalRank: null,
        indiaRank: null,
      });
      toast.success("Top 100 status updated.");
    } catch { toast.error("Failed to update Top 100."); }
  };

  const handleSaveStripe = async () => {
    if (!stripeKey) { toast.error("Please enter a Stripe secret key."); return; }
    setSavingStripe(true);
    try {
      await setStripeConfig.mutateAsync({
        secretKey: stripeKey,
        allowedCountries: stripeCountries.split(",").map(c => c.trim()).filter(Boolean),
      });
      toast.success("Stripe configuration saved.");
    } catch { toast.error("Failed to save Stripe configuration."); }
    finally { setSavingStripe(false); }
  };

  const handleSaveRates = async () => {
    setSavingRates(true);
    try {
      await setRates.mutateAsync({
        inrToUsd: parseFloat(rateUSD) || 0.012,
        inrToEur: parseFloat(rateEUR) || 0.011,
        inrToAed: parseFloat(rateAED) || 0.044,
        inrToGbp: parseFloat(rateGBP) || 0.0095,
      });
      toast.success("Exchange rates updated.");
    } catch { toast.error("Failed to save exchange rates."); }
    finally { setSavingRates(false); }
  };

  const handleFraudReview = async (fraudLogId: bigint, clearFlag: boolean) => {
    try {
      await reviewFraud.mutateAsync({ fraudLogId, clearFlag });
      toast.success(clearFlag ? "Fraud flag cleared." : "Booking held.");
    } catch { toast.error("Failed to review fraud flag."); }
  };

  const handleReleasePayout = async (payoutId: bigint) => {
    const note = payoutNote[payoutId.toString()] ?? "";
    try {
      await releasePayout.mutateAsync({ payoutId, adminNote: note || "Released by admin." });
      toast.success("Payout released.");
    } catch { toast.error("Failed to release payout."); }
  };

  const handleRejectPayout = async (payoutId: bigint) => {
    const note = payoutNote[payoutId.toString()] ?? "";
    try {
      await rejectPayout.mutateAsync({ payoutId, adminNote: note || "Rejected by admin." });
      toast.success("Payout rejected.");
    } catch { toast.error("Failed to reject payout."); }
  };

  const handleExportAudit = () => {
    const data = (auditLogs as AuditLog[]).map(log => ({
      timestamp: formatDateTime(log.timestamp),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actor: log.userActor.toString(),
      details: log.details,
    }));
    exportToCSV(data, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Audit log exported to CSV.");
  };

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  const KPI_CARDS = [
    { label: "Total Users", value: stats ? stats.totalUsers.toString() : "—", icon: <Users className="h-5 w-5" />, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
    { label: "Vendors", value: stats ? stats.totalVendors.toString() : "—", icon: <Store className="h-5 w-5" />, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    { label: "Events", value: stats ? stats.totalEvents.toString() : "—", icon: <Calendar className="h-5 w-5" />, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
    { label: "Bookings", value: stats ? stats.totalBookings.toString() : "—", icon: <TrendingUp className="h-5 w-5" />, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    { label: "Revenue (₹)", value: stats ? formatINRDirect(stats.totalRevenueINR) : "—", icon: <DollarSign className="h-5 w-5" />, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    { label: "Fraud Alerts", value: stats ? stats.activeFraudAlerts.toString() : fraudAlertCount.toString(), icon: <Shield className="h-5 w-5" />, color: fraudAlertCount > 0 ? "text-red-400" : "text-green-400", bg: fraudAlertCount > 0 ? "bg-red-500/10" : "bg-green-500/10", border: fraudAlertCount > 0 ? "border-red-500/30" : "border-green-500/30" },
  ];

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,102,255,0.3)]">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Admin Master Control
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Activity className="h-3.5 w-3.5 text-green-400" />
                DMT CREATOLOGY · All systems operational
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs gap-1.5 px-3 py-1 ${stripeConfigured ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
              <CreditCard className="h-3 w-3" />
              Stripe {stripeConfigured ? "Active" : "Inactive"}
            </Badge>
            {pendingVendors.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1 border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                <Clock className="h-3 w-3" />
                {pendingVendors.length} Pending
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-6">
            <TabsList className="bg-secondary/40 border border-border flex-nowrap h-auto gap-1 p-1 min-w-max">
              {[
                { value: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
                { value: "events", label: "Events", icon: <Calendar className="h-4 w-4" /> },
                { value: "vendors", label: "Vendors", icon: <Store className="h-4 w-4" />, badge: pendingVendors.length },
                { value: "refunds", label: "Refunds", icon: <RefreshCw className="h-4 w-4" /> },
                { value: "fraud", label: "Fraud Queue", icon: <AlertTriangle className="h-4 w-4" />, badge: fraudAlertCount, badgeRed: true },
                { value: "escrow", label: "Escrow Payouts", icon: <Banknote className="h-4 w-4" /> },
                { value: "concierge", label: "AI Concierge", icon: <Sparkles className="h-4 w-4" /> },
                { value: "audit", label: "Audit Log", icon: <FileText className="h-4 w-4" /> },
                { value: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                  {tab.icon}
                  {tab.label}
                  {tab.badge && tab.badge > 0 ? (
                    <span className={`ml-1 rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center ${tab.badgeRed ? "bg-red-500 text-white" : "bg-yellow-500 text-black"}`}>
                      {tab.badge}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── 1. Overview ─────────────────────────────────────────── */}
          <TabsContent value="overview" className="page-enter space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {KPI_CARDS.map((card, i) => (
                <div key={card.label} className={`stat-card stagger-${i + 1} page-enter`} style={{ animationFillMode: "both" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                      <span className={card.color}>{card.icon}</span>
                    </div>
                  </div>
                  <p className={`font-display text-xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{card.label}</p>
                </div>
              ))}
            </div>

            {/* 3-col health panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-primary" />
                  <h2 className="font-display font-semibold text-foreground text-sm">System Health</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Booking Engine", status: "Operational", ok: true },
                    { label: "Payment Gateway", status: stripeConfigured ? "Active" : "Needs Setup", ok: !!stripeConfigured },
                    { label: "Fraud Detection", status: "Active (0–100 scoring)", ok: true },
                    { label: "ICP Canister", status: "Live", ok: true },
                    { label: "Escrow Payouts", status: stats ? `${stats.pendingEscrowPayouts} pending` : "—", ok: stats ? stats.pendingEscrowPayouts === 0n : true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${item.ok ? "text-green-400" : "text-yellow-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? "bg-green-400" : "bg-yellow-400"}`} />
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-primary" />
                  <h2 className="font-display font-semibold text-foreground text-sm">Platform Breakdown</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Published Events", value: (events as Event[]).filter(e => e.isPublished).length.toString(), color: "text-green-400" },
                    { label: "Unpublished Events", value: (events as Event[]).filter(e => !e.isPublished).length.toString(), color: "text-yellow-400" },
                    { label: "Approved Vendors", value: vendors.filter(u => u.isApproved).length.toString(), color: "text-primary" },
                    { label: "Pending Vendors", value: pendingVendors.length.toString(), color: pendingVendors.length > 0 ? "text-yellow-400" : "text-green-400" },
                    { label: "Fraud Logs", value: (fraudLogs as FraudLog[]).length.toString(), color: (fraudLogs as FraudLog[]).length > 0 ? "text-red-400" : "text-green-400" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <h2 className="font-display font-semibold text-foreground text-sm">Active Alerts</h2>
                </div>
                <div className="space-y-2">
                  {!stripeConfigured && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <CreditCard className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-400">Stripe not configured — payments disabled</p>
                    </div>
                  )}
                  {pendingVendors.length > 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Store className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-400">{pendingVendors.length} vendor{pendingVendors.length > 1 ? "s" : ""} awaiting approval</p>
                    </div>
                  )}
                  {fraudAlertCount > 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <Shield className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{fraudAlertCount} booking{fraudAlertCount > 1 ? "s" : ""} flagged for fraud review</p>
                    </div>
                  )}
                  {stripeConfigured && pendingVendors.length === 0 && fraudAlertCount === 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                      <Check className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-green-400">All systems clear — no active alerts</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent audit */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="font-display font-semibold text-foreground text-sm">Recent Audit Activity</h2>
                </div>
                <button type="button" onClick={() => setActiveTab("audit")} className="text-xs text-primary hover:text-primary/80 bg-transparent border-none cursor-pointer flex items-center gap-1">
                  View all <Eye className="h-3 w-3" />
                </button>
              </div>
              {auditLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full bg-secondary/40 rounded-lg" />)}</div>
              ) : (auditLogs as AuditLog[]).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent audit activity</p>
              ) : (
                <div className="space-y-1">
                  {(auditLogs as AuditLog[]).slice(0, 5).map((log, i) => (
                    <div key={`${log.entityId}-${i}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 py-0 px-1.5">{log.action}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">{log.userActor.toString().slice(0, 12)}…</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(log.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── 2. Events ────────────────────────────────────────────── */}
          <TabsContent value="events" className="page-enter space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search events…" value={eventSearch} onChange={e => setEventSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border h-9 text-sm" />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{filteredEvents.length} of {(events as Event[]).length} events</span>
            </div>

            {eventsLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full bg-secondary/40 rounded-xl" />)}</div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs font-semibold">Title</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Location</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Price ₹</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Top 100</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-8 w-8 text-muted-foreground/30" />
                              <p>{eventSearch ? "No events match your search" : "No events yet"}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredEvents.map(evt => (
                        <TableRow key={evt.id.toString()} className="border-border hover:bg-secondary/20">
                          <TableCell className="font-medium text-foreground text-sm max-w-40">
                            <span className="truncate block" title={evt.title}>{evt.title}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[evt.eventType] ?? evt.eventType}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{evt.location}</TableCell>
                          <TableCell className="text-foreground text-sm font-medium">{formatINRDirect(evt.basePriceINR)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${evt.isPublished ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"}`}>
                              {evt.isPublished ? "Published" : "Unpublished"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {evt.isTop100Global && <span className="text-xs">🌍</span>}
                              {evt.isTop100India && <span className="text-xs">🇮🇳</span>}
                              {!evt.isTop100Global && !evt.isTop100India && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end flex-wrap">
                              <button type="button" onClick={() => handleTogglePublish(evt)} className={`px-2 py-1 rounded text-xs border transition-all cursor-pointer bg-transparent ${evt.isPublished ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" : "border-green-500/30 text-green-400 hover:bg-green-500/10"}`}>
                                {evt.isPublished ? "Unpublish" : "Publish"}
                              </button>
                              <button type="button" onClick={() => handleSetTop100(evt, !evt.isTop100Global, evt.isTop100India)} className="px-2 py-1 rounded text-xs border border-primary/30 text-primary hover:bg-primary/10 transition-all cursor-pointer bg-transparent">
                                🌍 {evt.isTop100Global ? "Remove" : "Add"}
                              </button>
                              <button type="button" onClick={() => handleDeleteEvent(evt.id)} className="p-1.5 rounded text-red-400 hover:bg-red-500/10 border border-transparent cursor-pointer bg-transparent">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Preloaded profiles */}
            {(preloadedProfiles as unknown[]).length > 0 && (
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <h3 className="font-display font-semibold text-foreground text-sm">Preloaded Event Profiles</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(preloadedProfiles as Array<{ id: bigint; title: string; location: string; eventType: string; basePriceINR: bigint; isTop100Global: boolean; isTop100India: boolean }>).map(p => (
                    <div key={p.id.toString()} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <p className="font-semibold text-foreground text-xs truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.location}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] py-0">{EVENT_TYPE_LABELS[p.eventType] ?? p.eventType}</Badge>
                        {p.isTop100Global && <span className="text-xs">🌍</span>}
                        {p.isTop100India && <span className="text-xs">🇮🇳</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── 3. Vendors / Users ───────────────────────────────────── */}
          <TabsContent value="vendors" className="page-enter space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border h-9 text-sm" />
              </div>
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger className="bg-secondary/50 border-border h-9 text-xs w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="vendor">Vendors</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superAdmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full bg-secondary/40 rounded-xl" />)}</div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs font-semibold">Name</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Email</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Role</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Principal</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p>No users found</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.map(user => (
                        <TableRow key={user.principal.toString()} className="border-border hover:bg-secondary/20">
                          <TableCell className="font-semibold text-foreground text-sm">{user.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{user.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${user.role === "vendor" ? "border-purple-500/30 text-purple-400 bg-purple-500/10" : user.role === "admin" || user.role === "superAdmin" ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-primary/30 text-primary bg-primary/10"}`}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${user.isApproved ? "text-green-400" : "text-yellow-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.isApproved ? "bg-green-400" : "bg-yellow-400"}`} />
                              {user.isApproved ? "Approved" : "Pending"}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{user.principal.toString().slice(0, 14)}…</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateTime(user.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── 4. Refunds ───────────────────────────────────────────── */}
          <TabsContent value="refunds" className="page-enter space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0" />
              Showing cancelled and refunded bookings. All funds held in DMT CREATOLOGY escrow.
            </div>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs font-semibold">Booking ID</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">User</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Amount ₹</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <RefreshCw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p>No refunded or cancelled bookings</p>
                        </TableCell>
                      </TableRow>
                    ) : refundBookings.map(booking => (
                      <TableRow key={booking.id.toString()} className="border-border hover:bg-secondary/20">
                        <TableCell className="text-muted-foreground text-xs font-mono">#{booking.id.toString().slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">{booking.userId.toString().slice(0, 12)}…</TableCell>
                        <TableCell className="text-foreground text-sm font-medium">{formatINRDirect(booking.totalAmountINR)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${booking.status === "refunded" ? "border-primary/30 text-primary bg-primary/10" : "border-muted-foreground/30 text-muted-foreground"}`}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDateTime(booking.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── 5. Fraud Queue ───────────────────────────────────────── */}
          <TabsContent value="fraud" className="page-enter space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              Risk score ≥ 70 = auto-hold. Score 30–70 = monitor. Below 30 = clear. Review all flagged bookings.
            </div>

            {fraudLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full bg-secondary/40 rounded-xl" />)}</div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs font-semibold">Booking ID</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">User</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Risk Score</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Flags</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(fraudLogs as FraudLog[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                            <Check className="h-8 w-8 text-green-400/50 mx-auto mb-2" />
                            <p className="text-green-400">No fraud flags — all clear ✓</p>
                          </TableCell>
                        </TableRow>
                      ) : (fraudLogs as FraudLog[]).map(log => (
                        <TableRow key={log.id.toString()} className="border-border hover:bg-secondary/20">
                          <TableCell className="text-muted-foreground text-xs font-mono">#{log.bookingId.toString().slice(0, 8)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{log.userId.toString().slice(0, 12)}…</TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${FRAUD_BG(log.riskScore)} ${FRAUD_COLOR(log.riskScore)}`}>
                              <Shield className="h-3 w-3" />
                              {log.riskScore.toString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap max-w-40">
                              {log.flags.map((f) => (
                                <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{f}</span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${log.status === "cleared" ? "border-green-500/30 text-green-400 bg-green-500/10" : log.status === "autoHeld" ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => handleFraudReview(log.id, true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all cursor-pointer">
                                <Check className="h-3 w-3" /> Clear
                              </button>
                              <button type="button" onClick={() => handleFraudReview(log.id, false)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-all cursor-pointer">
                                <X className="h-3 w-3" /> Hold
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── 6. Escrow Payouts ────────────────────────────────────── */}
          <TabsContent value="escrow" className="page-enter space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              All customer funds are held in DMT CREATOLOGY escrow until admin approval. Release only after successful event completion.
            </div>

            {escrowLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full bg-secondary/40 rounded-xl" />)}</div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs font-semibold">Payout ID</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Vendor</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Event ID</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Amount ₹</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Requested</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Note</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(escrowPayouts as EscrowPayout[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                            <Banknote className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p>No escrow payout requests</p>
                          </TableCell>
                        </TableRow>
                      ) : (escrowPayouts as EscrowPayout[]).map(payout => (
                        <TableRow key={payout.id.toString()} className="border-border hover:bg-secondary/20">
                          <TableCell className="text-muted-foreground text-xs font-mono">#{payout.id.toString().slice(0, 8)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{payout.vendorId.toString().slice(0, 12)}…</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">#{payout.eventId.toString()}</TableCell>
                          <TableCell className="text-foreground text-sm font-medium">{formatINRDirect(payout.amountINR)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${payout.status === "released" ? "border-green-500/30 text-green-400 bg-green-500/10" : payout.status === "rejected" ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
                              {payout.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateTime(payout.requestedAt)}</TableCell>
                          <TableCell>
                            <Input
                              value={payoutNote[payout.id.toString()] ?? ""}
                              onChange={e => setPayoutNote(prev => ({ ...prev, [payout.id.toString()]: e.target.value }))}
                              placeholder="Admin note…"
                              className="h-7 text-xs bg-secondary/50 border-border w-32"
                            />
                          </TableCell>
                          <TableCell>
                            {payout.status === "pending" && (
                              <div className="flex gap-1 justify-end">
                                <button type="button" onClick={() => handleReleasePayout(payout.id)} disabled={releasePayout.isPending} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all disabled:opacity-50 cursor-pointer">
                                  <Check className="h-3 w-3" /> Release
                                </button>
                                <button type="button" onClick={() => handleRejectPayout(payout.id)} disabled={rejectPayout.isPending} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer">
                                  <X className="h-3 w-3" /> Reject
                                </button>
                              </div>
                            )}
                            {payout.status !== "pending" && (
                              <span className="text-xs text-muted-foreground">{payout.adminNote ?? "—"}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── 7. AI Concierge Monitor ──────────────────────────────── */}
          <TabsContent value="concierge" className="page-enter space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              AI Concierge itinerary logs — monitor all customer travel & VIP booking requests.
            </div>
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs font-semibold">ID</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">User</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Destination</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Dates</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Services</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itineraries as AIItineraryLog[]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p>No itinerary requests yet</p>
                        </TableCell>
                      </TableRow>
                    ) : (itineraries as AIItineraryLog[]).map(it => (
                      <TableRow key={it.id.toString()} className="border-border hover:bg-secondary/20">
                        <TableCell className="text-muted-foreground text-xs font-mono">#{it.id.toString()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">{it.userId.toString().slice(0, 12)}…</TableCell>
                        <TableCell className="text-foreground text-sm">{it.destination}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{it.travelDates}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-32">
                            {it.services.slice(0, 3).map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">{s}</span>
                            ))}
                            {it.services.length > 3 && <span className="text-[10px] text-muted-foreground">+{it.services.length - 3}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${it.status === "confirmed" ? "border-green-500/30 text-green-400 bg-green-500/10" : it.status === "cancelled" ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDateTime(it.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── 8. Audit Log ────────────────────────────────────────── */}
          <TabsContent value="audit" className="page-enter space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                <Input type="datetime-local" value={auditStart} onChange={e => setAuditStart(e.target.value)} className="bg-secondary/50 border-border h-9 text-xs w-44" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                <Input type="datetime-local" value={auditEnd} onChange={e => setAuditEnd(e.target.value)} className="bg-secondary/50 border-border h-9 text-xs w-44" />
              </div>
              <Input placeholder="Filter by action…" value={auditAction === "all" ? "" : auditAction} onChange={e => setAuditAction(e.target.value || "all")} className="bg-secondary/50 border-border h-9 text-xs w-44" />
              <Button variant="outline" size="sm" onClick={handleExportAudit} className="flex items-center gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>

            {auditLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-secondary/40 rounded-xl" />)}</div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs font-semibold">Timestamp</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Action</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Entity Type</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Entity ID</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Actor</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(auditLogs as AuditLog[]).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p>No audit logs in selected time range</p>
                          </TableCell>
                        </TableRow>
                      ) : (auditLogs as AuditLog[]).map((log, i) => (
                        <TableRow key={`${log.entityId}-${i}`} className="border-border hover:bg-secondary/20">
                          <TableCell className="text-muted-foreground text-xs">{formatDateTime(log.timestamp)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 py-0">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{log.entityType}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{log.entityId.slice(0, 14)}…</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">{log.userActor.toString().slice(0, 12)}…</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-48 truncate">{log.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── 9. Settings ─────────────────────────────────────────── */}
          <TabsContent value="settings" className="page-enter space-y-6">
            {/* Stripe Config */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-sm">Stripe Payment Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Live-ready keys — connect your Stripe account to enable payments</p>
                </div>
                <div className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${stripeConfigured ? "text-green-400" : "text-yellow-400"}`}>
                  <span className={`w-2 h-2 rounded-full ${stripeConfigured ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`} />
                  {stripeConfigured ? "Active" : "Not Configured"}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Stripe Secret Key</Label>
                  <Input
                    type="password"
                    value={stripeKey}
                    onChange={e => setStripeKey(e.target.value)}
                    placeholder="sk_test_... or sk_live_..."
                    className="bg-secondary/50 border-border h-10 text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Get your keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.stripe.com</a></p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Allowed Countries (comma-separated)</Label>
                  <Input
                    value={stripeCountries}
                    onChange={e => setStripeCountries(e.target.value)}
                    placeholder="US,CA,GB,IN,SG,AE,DE"
                    className="bg-secondary/50 border-border h-10 text-sm"
                  />
                </div>
                <Button onClick={handleSaveStripe} disabled={savingStripe || !stripeKey} className="btn-glow">
                  {savingStripe ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Stripe Configuration"}
                </Button>
              </div>
            </div>

            {/* Exchange Rates */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-sm">Exchange Rates (INR Base)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">1 INR = ? (configure conversion rates for display)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "🇺🇸 INR → USD", value: rateUSD, onChange: setRateUSD },
                  { label: "🇪🇺 INR → EUR", value: rateEUR, onChange: setRateEUR },
                  { label: "🇦🇪 INR → AED", value: rateAED, onChange: setRateAED },
                  { label: "🇬🇧 INR → GBP", value: rateGBP, onChange: setRateGBP },
                ].map(r => (
                  <div key={r.label} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{r.label}</Label>
                    <Input value={r.value} onChange={e => r.onChange(e.target.value)} className="bg-secondary/50 border-border h-9 text-sm" />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveRates} disabled={savingRates} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                {savingRates ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Update Exchange Rates"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
