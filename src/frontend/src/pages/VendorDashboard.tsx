import { useState } from "react";
import {
  useListPublishedEvents,
  useGetVendorStats,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  usePublishEvent,
  useUnpublishEvent,
  useRequestEscrowPayout,
  useListEscrowPayouts,
  useListAllBookings,
} from "@/hooks/useQueries";
import { UserProfile } from "@/types";
import { SUPPORTED_CURRENCIES, CURRENCIES } from "@/utils/currency";
import { formatDateTime } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Event } from "@/backend.d";
import { EventType, TicketType } from "@/backend.d";
import {
  Plus, Trash2, Eye, EyeOff, BarChart3, Calendar, MapPin,
  Loader2, Store, ChevronRight, CheckCircle, Globe, X,
  TrendingUp, DollarSign, Activity, Zap, ArrowRight, Banknote,
  Edit3, Video, Image as ImageIcon,
} from "lucide-react";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: EventType.musicFestival, label: "Music Festival" },
  { value: EventType.dj, label: "DJ Event" },
  { value: EventType.celebrity, label: "Celebrity" },
  { value: EventType.sports, label: "Sports" },
  { value: EventType.conference, label: "Conference" },
  { value: EventType.workshop, label: "Workshop" },
  { value: EventType.privateEvent, label: "Private Event" },
  { value: EventType.luxuryParty, label: "Luxury Party" },
  { value: EventType.modelingAssignment, label: "Modeling Assignment" },
];

const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: TicketType.generalAdmission, label: "General Admission" },
  { value: TicketType.numberedSeat, label: "Numbered Seat" },
  { value: TicketType.timeSlot, label: "Time Slot" },
  { value: TicketType.vipPackage, label: "VIP Package" },
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  musicFestival: "Music Festival", dj: "DJ", celebrity: "Celebrity",
  sports: "Sports", conference: "Conference", workshop: "Workshop",
  privateEvent: "Private Event", luxuryParty: "Luxury Party", modelingAssignment: "Modeling",
};

interface VendorDashboardProps {
  userProfile: UserProfile;
  vendorProfile: { businessName: string } | null;
}

type CreateStep = 1 | 2 | 3 | 4;

interface EventFormState {
  title: string;
  description: string;
  eventType: EventType;
  tags: string;
  location: string;
  startDate: string;
  endDate: string;
  basePriceINR: string;
  totalSeats: string;
  ticketType: TicketType;
  supportedCurrencies: string[];
  multiCurrencyEnabled: boolean;
  bannerUrl: string;
  promoVideoUrl: string;
}

const DEFAULT_FORM: EventFormState = {
  title: "",
  description: "",
  eventType: EventType.musicFestival,
  tags: "",
  location: "",
  startDate: "",
  endDate: "",
  basePriceINR: "",
  totalSeats: "",
  ticketType: TicketType.generalAdmission,
  supportedCurrencies: ["INR"],
  multiCurrencyEnabled: false,
  bannerUrl: "",
  promoVideoUrl: "",
};

function formatINRDirect(amount: bigint): string {
  const val = Number(amount);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

export default function VendorDashboard({ userProfile }: VendorDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [step, setStep] = useState<CreateStep>(1);
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editEventId, setEditEventId] = useState<bigint | null>(null);
  const [editBanner, setEditBanner] = useState("");
  const [editPromo, setEditPromo] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Queries
  const { data: events = [], isLoading: eventsLoading } = useListPublishedEvents();
  const { data: stats } = useGetVendorStats();
  const { data: allBookings = [] } = useListAllBookings();
  const { data: escrowPayouts = [] } = useListEscrowPayouts();

  // Mutations
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const publishEvent = usePublishEvent();
  const unpublishEvent = useUnpublishEvent();
  const requestPayout = useRequestEscrowPayout();

  const vendorEvents = (events as Event[]);

  const upd = (key: keyof EventFormState, val: string | boolean | string[]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleCreateSubmit = async () => {
    if (!form.title || !form.location || !form.startDate || !form.basePriceINR || !form.totalSeats) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const startMs = new Date(form.startDate).getTime();
      const endMs = form.endDate ? new Date(form.endDate).getTime() : startMs + 86400000;
      await createEvent.mutateAsync({
        title: form.title,
        description: form.description,
        eventType: form.eventType,
        location: form.location,
        startDate: BigInt(startMs) * 1_000_000n,
        endDate: BigInt(endMs) * 1_000_000n,
        basePriceINR: BigInt(Math.round(parseFloat(form.basePriceINR))),
        supportedCurrencies: form.supportedCurrencies,
        multiCurrencyEnabled: form.multiCurrencyEnabled,
        totalSeats: BigInt(parseInt(form.totalSeats) || 100),
        ticketType: form.ticketType,
        bannerUrl: form.bannerUrl,
        promoVideoUrl: form.promoVideoUrl,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      toast.success("Event created successfully!");
      setForm(DEFAULT_FORM);
      setStep(1);
      setActiveTab("my-events");
    } catch {
      toast.error("Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (event: Event) => {
    try {
      if (event.isPublished) {
        await unpublishEvent.mutateAsync(event.id);
        toast.success("Event unpublished.");
      } else {
        await publishEvent.mutateAsync(event.id);
        toast.success("Event published!");
      }
    } catch { toast.error("Failed to update event."); }
  };

  const handleDeleteEvent = async (eventId: bigint) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event deleted.");
    } catch { toast.error("Failed to delete event."); }
  };

  const handleRequestPayout = async (eventId: bigint) => {
    try {
      await requestPayout.mutateAsync(eventId);
      toast.success("Payout request submitted. Awaiting admin approval.");
    } catch { toast.error("Failed to request payout."); }
  };

  const handleSaveMedia = async (eventId: bigint) => {
    setSavingEdit(true);
    try {
      const event = vendorEvents.find(e => e.id === eventId);
      if (!event) return;
      await updateEvent.mutateAsync({
        eventId,
        title: editTitle || event.title,
        description: editDesc || event.description,
        location: editLocation || event.location,
        basePriceINR: editPrice ? BigInt(Math.round(parseFloat(editPrice))) : event.basePriceINR,
        bannerUrl: editBanner,
        promoVideoUrl: editPromo,
        tags: event.tags,
      });
      toast.success("Event updated.");
      setEditEventId(null);
    } catch { toast.error("Failed to update event."); }
    finally { setSavingEdit(false); }
  };

  const openEdit = (event: Event) => {
    setEditEventId(event.id);
    setEditBanner(event.bannerUrl);
    setEditPromo(event.promoVideoUrl);
    setEditTitle(event.title);
    setEditDesc(event.description);
    setEditLocation(event.location);
    setEditPrice(event.basePriceINR.toString());
  };

  const STAT_CARDS = [
    { label: "My Events", value: stats ? stats.eventsCount.toString() : vendorEvents.length.toString(), icon: <Calendar className="h-5 w-5" />, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
    { label: "Bookings", value: stats ? stats.bookingsCount.toString() : "—", icon: <TrendingUp className="h-5 w-5" />, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    { label: "Revenue ₹", value: stats ? formatINRDirect(stats.revenueINR) : "—", icon: <DollarSign className="h-5 w-5" />, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  ];

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Store className="h-6 w-6 text-purple-400" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Vendor Dashboard
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Activity className="h-3.5 w-3.5 text-green-400" />
              {userProfile.name} · Internal Worker Role
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-6">
            <TabsList className="bg-secondary/40 border border-border flex-nowrap h-auto gap-1 p-1 min-w-max">
              {[
                { value: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
                { value: "my-events", label: "My Events", icon: <Calendar className="h-4 w-4" /> },
                { value: "create", label: "Create Event", icon: <Plus className="h-4 w-4" /> },
                { value: "media", label: "Media Management", icon: <ImageIcon className="h-4 w-4" /> },
                { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
                { value: "payouts", label: "My Payouts", icon: <Banknote className="h-4 w-4" /> },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                  {tab.icon}{tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── 1. Overview ───────────────────────────────────────────── */}
          <TabsContent value="overview" className="page-enter space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STAT_CARDS.map((card, i) => (
                <div key={card.label} className={`stat-card stagger-${i + 1} page-enter`} style={{ animationFillMode: "both" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                      <span className={card.color}>{card.icon}</span>
                    </div>
                  </div>
                  <p className={`font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold text-foreground text-sm mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Create Event", icon: <Plus className="h-4 w-4" />, tab: "create", color: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20" },
                  { label: "Manage Events", icon: <Calendar className="h-4 w-4" />, tab: "my-events", color: "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20" },
                  { label: "Media Upload", icon: <Video className="h-4 w-4" />, tab: "media", color: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20" },
                  { label: "Analytics", icon: <BarChart3 className="h-4 w-4" />, tab: "analytics", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20" },
                ].map(action => (
                  <button key={action.label} type="button" onClick={() => setActiveTab(action.tab)} className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer bg-transparent transition-all ${action.color}`}>
                    {action.icon}{action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Events */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-foreground text-sm">Recent Events</h3>
                <button type="button" onClick={() => setActiveTab("my-events")} className="text-xs text-primary hover:text-primary/80 bg-transparent border-none cursor-pointer flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {eventsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full bg-secondary/40 rounded-lg" />)}</div>
              ) : vendorEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No events yet</p>
                  <button type="button" onClick={() => setActiveTab("create")} className="text-primary text-xs mt-2 bg-transparent border-none cursor-pointer hover:underline">Create your first event →</button>
                </div>
              ) : vendorEvents.slice(0, 5).map(event => (
                <div key={event.id.toString()} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-xs truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.location}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${event.isPublished ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"}`}>
                    {event.isPublished ? "Live" : "Draft"}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── 2. My Events ─────────────────────────────────────────── */}
          <TabsContent value="my-events" className="page-enter space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{vendorEvents.length} event{vendorEvents.length !== 1 ? "s" : ""}</p>
              <Button size="sm" onClick={() => setActiveTab("create")} className="btn-glow gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> New Event
              </Button>
            </div>

            {eventsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-secondary/40 rounded-xl" />)}</div>
            ) : vendorEvents.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-2xl">
                <Calendar className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-display font-bold text-foreground mb-2">No events yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first event to start selling tickets</p>
                <Button onClick={() => setActiveTab("create")} className="btn-glow">Create Event</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {vendorEvents.map(event => (
                  <div key={event.id.toString()} className="glass-card rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{event.title}</h3>
                          <Badge variant="outline" className="text-[10px]">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${event.isPublished ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-border text-muted-foreground"}`}>
                            {event.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{event.location}
                          </span>
                          <span className="text-xs text-foreground font-semibold">{formatINRDirect(event.basePriceINR)}</span>
                          <span className="text-xs text-muted-foreground">{event.availableSeats.toString()}/{event.totalSeats.toString()} seats</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={() => handleTogglePublish(event)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-transparent transition-all ${event.isPublished ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" : "border-green-500/30 text-green-400 hover:bg-green-500/10"}`}>
                          {event.isPublished ? <><EyeOff className="h-3 w-3" /> Unpublish</> : <><Eye className="h-3 w-3" /> Publish</>}
                        </button>
                        <button type="button" onClick={() => openEdit(event)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 cursor-pointer bg-transparent transition-all">
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                        {event.isPublished && (
                          <button type="button" onClick={() => handleRequestPayout(event.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-500/30 text-green-400 hover:bg-green-500/10 cursor-pointer bg-transparent transition-all">
                            <Banknote className="h-3 w-3" /> Request Payout
                          </button>
                        )}
                        <button type="button" onClick={() => handleDeleteEvent(event.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent cursor-pointer bg-transparent">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline edit panel */}
                    {editEventId === event.id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Title</Label>
                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-secondary/50 border-border h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Location</Label>
                            <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="bg-secondary/50 border-border h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Base Price ₹</Label>
                            <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} className="bg-secondary/50 border-border h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Banner Image URL</Label>
                            <Input value={editBanner} onChange={e => setEditBanner(e.target.value)} placeholder="https://…" className="bg-secondary/50 border-border h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Promo Video URL</Label>
                            <Input value={editPromo} onChange={e => setEditPromo(e.target.value)} placeholder="https://youtube.com/…" className="bg-secondary/50 border-border h-9 text-sm" />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-secondary/50 border-border text-sm h-20 resize-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveMedia(event.id)} disabled={savingEdit} className="btn-glow text-xs">
                            {savingEdit ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving…</> : <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Save Changes</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditEventId(null)} className="text-xs border-border">
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── 3. Create Event (4-step wizard) ──────────────────────── */}
          <TabsContent value="create" className="page-enter">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s ? "bg-primary text-white shadow-[0_0_12px_rgba(0,102,255,0.5)]" : step > s ? "bg-green-500/20 border border-green-500/50 text-green-400" : "bg-secondary/50 border border-border text-muted-foreground"}`}>
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  {s < 4 && <div className={`flex-1 h-0.5 w-8 rounded ${step > s ? "bg-green-500/50" : "bg-border"}`} />}
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {step === 1 ? "Basic Info" : step === 2 ? "Location & Dates" : step === 3 ? "Tickets & Pricing" : "Media & Review"}
              </span>
            </div>

            <div className="glass-card rounded-2xl p-6">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-foreground">Basic Information</h2>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Event Title *</Label>
                    <Input value={form.title} onChange={e => upd("title", e.target.value)} placeholder="e.g., Tomorrowland India 2026" className="bg-secondary/50 border-border h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea value={form.description} onChange={e => upd("description", e.target.value)} placeholder="Describe your event…" className="bg-secondary/50 border-border h-28 resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Event Type *</Label>
                    <Select value={form.eventType} onValueChange={val => upd("eventType", val)}>
                      <SelectTrigger className="bg-secondary/50 border-border h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
                    <Input value={form.tags} onChange={e => upd("tags", e.target.value)} placeholder="EDM, Festival, VIP" className="bg-secondary/50 border-border h-11" />
                  </div>
                  <Button onClick={() => setStep(2)} disabled={!form.title} className="w-full btn-glow h-11">
                    Next: Location & Dates <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Step 2: Location & Dates */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-foreground">Location & Dates</h2>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Location / Venue *</Label>
                    <Input value={form.location} onChange={e => upd("location", e.target.value)} placeholder="e.g., Vagator Beach, Goa, India" className="bg-secondary/50 border-border h-11" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Start Date *</Label>
                      <Input type="datetime-local" value={form.startDate} onChange={e => upd("startDate", e.target.value)} className="bg-secondary/50 border-border h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">End Date</Label>
                      <Input type="datetime-local" value={form.endDate} onChange={e => upd("endDate", e.target.value)} className="bg-secondary/50 border-border h-11" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-border">Back</Button>
                    <Button onClick={() => setStep(3)} disabled={!form.location || !form.startDate} className="flex-1 btn-glow">
                      Next: Tickets <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Tickets & Pricing */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-foreground">Tickets & Pricing</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Base Price (₹) *</Label>
                      <Input value={form.basePriceINR} onChange={e => upd("basePriceINR", e.target.value)} placeholder="e.g., 5000" type="number" min="0" className="bg-secondary/50 border-border h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Total Seats *</Label>
                      <Input value={form.totalSeats} onChange={e => upd("totalSeats", e.target.value)} placeholder="e.g., 1000" type="number" min="1" className="bg-secondary/50 border-border h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ticket Type</Label>
                    <Select value={form.ticketType} onValueChange={val => upd("ticketType", val)}>
                      <SelectTrigger className="bg-secondary/50 border-border h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {TICKET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Multi-Currency Support</Label>
                      <Switch checked={form.multiCurrencyEnabled} onCheckedChange={val => upd("multiCurrencyEnabled", val)} />
                    </div>
                    {form.multiCurrencyEnabled && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SUPPORTED_CURRENCIES.map(c => {
                          const info = CURRENCIES[c];
                          const selected = form.supportedCurrencies.includes(c);
                          return (
                            <button key={c} type="button" onClick={() => {
                              const next = selected
                                ? form.supportedCurrencies.filter(x => x !== c)
                                : [...form.supportedCurrencies, c];
                              upd("supportedCurrencies", next);
                            }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer bg-transparent ${selected ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                              {info.flag} {c}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-border">Back</Button>
                    <Button onClick={() => setStep(4)} disabled={!form.basePriceINR || !form.totalSeats} className="flex-1 btn-glow">
                      Next: Media & Review <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Media & Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-foreground">Media & Review</h2>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Banner Image URL</Label>
                    <Input value={form.bannerUrl} onChange={e => upd("bannerUrl", e.target.value)} placeholder="https://example.com/banner.jpg" className="bg-secondary/50 border-border h-11" />
                    <p className="text-[10px] text-muted-foreground">Enter a direct image URL for the event banner</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Promo Video URL</Label>
                    <Input value={form.promoVideoUrl} onChange={e => upd("promoVideoUrl", e.target.value)} placeholder="https://youtube.com/embed/…" className="bg-secondary/50 border-border h-11" />
                  </div>

                  {/* Review summary */}
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
                    <h3 className="font-semibold text-foreground text-xs mb-3">Review Summary</h3>
                    {[
                      { label: "Title", value: form.title },
                      { label: "Type", value: EVENT_TYPE_LABELS[form.eventType] ?? form.eventType },
                      { label: "Location", value: form.location },
                      { label: "Start", value: form.startDate ? new Date(form.startDate).toLocaleString() : "—" },
                      { label: "Base Price", value: form.basePriceINR ? `₹${Number(form.basePriceINR).toLocaleString("en-IN")}` : "—" },
                      { label: "Total Seats", value: form.totalSeats || "—" },
                      { label: "Ticket Type", value: TICKET_TYPES.find(t => t.value === form.ticketType)?.label ?? form.ticketType },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-border">Back</Button>
                    <Button onClick={handleCreateSubmit} disabled={isSubmitting} className="flex-1 btn-glow">
                      {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : <><Zap className="h-4 w-4 mr-2" /> Create Event</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── 4. Media Management ───────────────────────────────────── */}
          <TabsContent value="media" className="page-enter space-y-4">
            <p className="text-sm text-muted-foreground">Update banners and promo videos for your events.</p>
            {vendorEvents.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-2xl">
                <ImageIcon className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No events to manage</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vendorEvents.map(event => (
                  <div key={event.id.toString()} className="glass-card rounded-xl p-5">
                    <h3 className="font-semibold text-foreground text-sm mb-4">{event.title}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><ImageIcon className="h-3 w-3" /> Banner URL</Label>
                        <div className="flex gap-2">
                          <Input
                            defaultValue={event.bannerUrl}
                            id={`banner-${event.id}`}
                            placeholder="https://…"
                            className="bg-secondary/50 border-border h-9 text-sm"
                          />
                        </div>
                        {event.bannerUrl && (
                          <img src={event.bannerUrl} alt="Banner" className="w-full h-24 object-cover rounded-lg mt-1 opacity-70" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Video className="h-3 w-3" /> Promo Video URL</Label>
                        <Input
                          defaultValue={event.promoVideoUrl}
                          id={`promo-${event.id}`}
                          placeholder="https://youtube.com/embed/…"
                          className="bg-secondary/50 border-border h-9 text-sm"
                        />
                        {event.promoVideoUrl && (
                          <div className="mt-1 text-xs text-muted-foreground truncate">{event.promoVideoUrl}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 btn-glow text-xs"
                      onClick={async () => {
                        const bannerEl = document.getElementById(`banner-${event.id}`) as HTMLInputElement;
                        const promoEl = document.getElementById(`promo-${event.id}`) as HTMLInputElement;
                        try {
                          await updateEvent.mutateAsync({
                            eventId: event.id,
                            title: event.title,
                            description: event.description,
                            location: event.location,
                            basePriceINR: event.basePriceINR,
                            bannerUrl: bannerEl?.value ?? event.bannerUrl,
                            promoVideoUrl: promoEl?.value ?? event.promoVideoUrl,
                            tags: event.tags,
                          });
                          toast.success("Media updated.");
                        } catch { toast.error("Failed to update media."); }
                      }}
                    >
                      Save Media
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── 5. Analytics ─────────────────────────────────────────── */}
          <TabsContent value="analytics" className="page-enter space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STAT_CARDS.map(card => (
                <div key={card.label} className="stat-card">
                  <div className={`w-10 h-10 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center mb-3`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <p className={`font-display text-2xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Bar chart (CSS) */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="font-display font-semibold text-foreground text-sm mb-4">Events Performance</h3>
              {vendorEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No event data yet</p>
              ) : (
                <div className="space-y-3">
                  {vendorEvents.slice(0, 8).map((event, idx) => {
                    const pct = Math.max(5, 100 - idx * 12);
                    return (
                      <div key={event.id.toString()}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground truncate max-w-40">{event.title}</span>
                          <span className="text-xs font-semibold text-foreground">{formatINRDirect(event.basePriceINR)}</span>
                        </div>
                        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── 6. My Payouts ─────────────────────────────────────────── */}
          <TabsContent value="payouts" className="page-enter space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
              <Banknote className="h-3.5 w-3.5 shrink-0" />
              All earnings are held in DMT CREATOLOGY escrow. Request payout from "My Events" tab after your event completes.
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold">Payout ID</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold">Event ID</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold">Amount ₹</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-semibold">Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(escrowPayouts as Array<{ id: bigint; eventId: bigint; amountINR: bigint; status: string; requestedAt: bigint }>).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-muted-foreground py-12">
                          <Banknote className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p>No payout requests yet</p>
                        </td>
                      </tr>
                    ) : (escrowPayouts as Array<{ id: bigint; eventId: bigint; amountINR: bigint; status: string; requestedAt: bigint }>).map(p => (
                      <tr key={p.id.toString()} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground text-xs font-mono">#{p.id.toString().slice(0, 8)}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs font-mono">#{p.eventId.toString()}</td>
                        <td className="py-3 px-4 text-foreground font-semibold text-sm">{formatINRDirect(p.amountINR)}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={`text-xs ${p.status === "released" ? "border-green-500/30 text-green-400 bg-green-500/10" : p.status === "rejected" ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"}`}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{formatDateTime(p.requestedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
