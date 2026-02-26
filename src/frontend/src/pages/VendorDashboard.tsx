import { useState } from "react";
import {
  useGetMyVendorEvents,
  useGetMyVendorStats,
  useAddEvent,
  useAddTicket,
  useUpdateEvent,
  useDeleteEvent,
  useSetCurrencyConfig,
} from "@/hooks/useQueries";
import { Event, EventCategory, EventStatus, TicketType, VendorApprovalStatus, UserProfile, Ticket } from "@/backend";
import { SUPPORTED_CURRENCIES, CURRENCIES } from "@/utils/currency";
import { formatShortDate, formatCurrency, generateId, toICPTimestamp } from "@/utils/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit, Eye, EyeOff, AlertTriangle, BarChart3,
  Calendar, MapPin, Loader2, Store, ChevronRight, CheckCircle,
  Globe, X,
} from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/utils/mockData";

interface TicketForm {
  id: string;
  name: string;
  ticketType: TicketType;
  price: string;
  quantity: string;
}

interface EventForm {
  title: string;
  description: string;
  category: EventCategory;
  coverImage: string;
  tags: string;
  venue: string;
  city: string;
  country: string;
  eventDate: string;
}

const DEFAULT_EVENT_FORM: EventForm = {
  title: "",
  description: "",
  category: EventCategory.concert,
  coverImage: "",
  tags: "",
  venue: "",
  city: "",
  country: "",
  eventDate: "",
};

const DEFAULT_TICKET: TicketForm = {
  id: "",
  name: "",
  ticketType: TicketType.generalAdmission,
  price: "",
  quantity: "",
};

interface VendorDashboardProps {
  userProfile: UserProfile;
  vendorProfile: { businessName: string; approvalStatus: VendorApprovalStatus } | null;
}

type CreateStep = 1 | 2 | 3 | 4;

export default function VendorDashboard({ userProfile, vendorProfile }: VendorDashboardProps) {
  const [step, setStep] = useState<CreateStep>(1);
  const [eventForm, setEventForm] = useState<EventForm>(DEFAULT_EVENT_FORM);
  const [tickets, setTickets] = useState<TicketForm[]>([{ ...DEFAULT_TICKET, id: generateId() }]);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [currencyPanelEventId, setCurrencyPanelEventId] = useState<string | null>(null);
  const [currencyPanelBase, setCurrencyPanelBase] = useState<string>("INR");
  const [currencyPanelEnabled, setCurrencyPanelEnabled] = useState<boolean>(true);
  const [savingCurrency, setSavingCurrency] = useState(false);

  const { data: myEvents = [], isLoading: eventsLoading } = useGetMyVendorEvents();
  const { data: stats } = useGetMyVendorStats();
  const addEvent = useAddEvent();
  const addTicket = useAddTicket();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const setCurrencyConfig = useSetCurrencyConfig();

  const approvalStatus = vendorProfile?.approvalStatus;

  const handleAddTicket = () => {
    setTickets((prev) => [...prev, { ...DEFAULT_TICKET, id: generateId() }]);
  };

  const handleRemoveTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTicketChange = (id: string, field: keyof TicketForm, value: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleEventFormChange = (field: keyof EventForm, value: string) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitEvent = async () => {
    const eventId = generateId();
    try {
      await addEvent.mutateAsync({
        id: eventId,
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        coverImage: eventForm.coverImage,
        tags: eventForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        venue: eventForm.venue,
        city: eventForm.city,
        country: eventForm.country,
        eventDate: toICPTimestamp(
          eventForm.eventDate ? new Date(eventForm.eventDate).getTime() : Date.now()
        ),
        vendorId: userProfile.id,
        baseCurrency: "INR",
        supportedCurrencies: ["INR", "USD", "EUR", "GBP", "AED"],
        multiCurrencyEnabled: true,
      });

      // Create tickets
      for (const ticket of tickets) {
        if (!ticket.name) continue;
        const ticketId = generateId();
        await addTicket.mutateAsync({
          id: ticketId,
          eventId,
          name: ticket.name,
          ticketType: ticket.ticketType,
          price: BigInt(Math.round(parseFloat(ticket.price || "0") * 100)),
          availableQuantity: BigInt(parseInt(ticket.quantity || "0")),
          totalQuantity: BigInt(parseInt(ticket.quantity || "0")),
          baseCurrency: "INR",
        } as Ticket);
      }

      setCreatedEventId(eventId);
      toast.success("Event created successfully!");
      setStep(4);
    } catch {
      toast.error("Failed to create event. Please try again.");
    }
  };

  const handleTogglePublish = async (event: Event) => {
    try {
      const newStatus =
        event.status === EventStatus.published ? EventStatus.draft : EventStatus.published;
      await updateEvent.mutateAsync({
        ...event,
        status: newStatus,
        tags: event.tags ?? [],
        baseCurrency: event.baseCurrency ?? "INR",
        supportedCurrencies: event.supportedCurrencies ?? ["INR", "USD", "EUR", "GBP", "AED"],
        multiCurrencyEnabled: event.multiCurrencyEnabled ?? true,
      });
      toast.success(newStatus === EventStatus.published ? "Event published!" : "Event unpublished.");
    } catch {
      toast.error("Failed to update event status.");
    }
  };

  const handleOpenCurrencyPanel = (evt: Event) => {
    setCurrencyPanelEventId(evt.id);
    setCurrencyPanelBase(evt.baseCurrency ?? "INR");
    setCurrencyPanelEnabled(evt.multiCurrencyEnabled ?? true);
  };

  const handleSaveCurrencyConfig = async () => {
    if (!currencyPanelEventId) return;
    setSavingCurrency(true);
    try {
      await setCurrencyConfig.mutateAsync({
        eventId: currencyPanelEventId,
        baseCurrency: currencyPanelBase,
        multiCurrencyEnabled: currencyPanelEnabled,
        supportedCurrencies: ["INR", "USD", "EUR", "GBP", "AED"],
        updatedAt: BigInt(Date.now()) * 1_000_000n,
      });
      toast.success("Currency settings saved.");
      setCurrencyPanelEventId(null);
    } catch {
      toast.error("Failed to save currency settings.");
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event deleted.");
    } catch {
      toast.error("Failed to delete event.");
    }
  };

  const resetForm = () => {
    setStep(1);
    setEventForm(DEFAULT_EVENT_FORM);
    setTickets([{ ...DEFAULT_TICKET, id: generateId() }]);
    setCreatedEventId(null);
  };

  const STEPS = ["Basic Info", "Location & Time", "Tickets", "Review"];

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Vendor Dashboard</h1>
            <p className="text-sm text-muted-foreground">{vendorProfile?.businessName ?? "Your Business"}</p>
          </div>
        </div>

        {/* Approval Banner */}
        {approvalStatus === VendorApprovalStatus.pending && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 text-[#fbbf24] mb-6">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Your vendor account is pending approval. Events will be visible after approval.
            </p>
          </div>
        )}
        {approvalStatus === VendorApprovalStatus.rejected && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive mb-6">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Your vendor account has been rejected. Please contact support.
            </p>
          </div>
        )}

        <Tabs defaultValue="events">
          <TabsList className="bg-secondary/40 border border-border mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              My Events
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events">
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-secondary/40 rounded-xl" />
                ))}
              </div>
            ) : (myEvents as Event[]).length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">No events yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Create your first event to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(myEvents as Event[]).map((evt) => (
                  <div key={evt.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{evt.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[evt.category as string] ?? "badge-conference"}`}>
                            {CATEGORY_LABELS[evt.category as string] ?? evt.category}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatShortDate(evt.eventDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          evt.status === EventStatus.published
                            ? "status-confirmed"
                            : evt.status === EventStatus.draft
                            ? "status-pending"
                            : "status-cancelled"
                        }`}
                      >
                        {evt.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(evt)}
                        className="p-1.5 rounded-lg border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all bg-transparent cursor-pointer"
                        title={evt.status === EventStatus.published ? "Unpublish" : "Publish"}
                      >
                        {evt.status === EventStatus.published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCurrencyPanel(evt)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 hover:bg-primary/10 text-primary text-xs transition-all bg-transparent cursor-pointer"
                        title="Currency settings"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Currency
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-1.5 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive transition-all bg-transparent cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Currency Panel (inline) */}
                    {currencyPanelEventId === evt.id && (
                      <div className="w-full mt-3 border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                            Currency Settings
                          </p>
                          <button
                            type="button"
                            onClick={() => setCurrencyPanelEventId(null)}
                            className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`base-cur-${evt.id}`} className="text-[10px] text-muted-foreground block mb-1">Base Currency</label>
                            <select
                              id={`base-cur-${evt.id}`}
                              value={currencyPanelBase}
                              onChange={(e) => setCurrencyPanelBase(e.target.value)}
                              className="w-full appearance-none bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/60 cursor-pointer"
                            >
                              {SUPPORTED_CURRENCIES.map((code) => (
                                <option key={code} value={code}>
                                  {CURRENCIES[code].flag} {code} — {CURRENCIES[code].name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col justify-end">
                            <p className="text-[10px] text-muted-foreground mb-1">Multi-Currency</p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setCurrencyPanelEnabled(!currencyPanelEnabled)}
                                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border-none ${currencyPanelEnabled ? "bg-primary" : "bg-secondary"}`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${currencyPanelEnabled ? "translate-x-4" : "translate-x-0"}`}
                                />
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {currencyPanelEnabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveCurrencyConfig}
                          disabled={savingCurrency}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer border-none"
                        >
                          {savingCurrency ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save Currency Config"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Create Event Tab */}
          <TabsContent value="create">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step > i + 1
                          ? "bg-green-500 text-white"
                          : step === i + 1
                          ? "bg-primary text-white shadow-glow"
                          : "bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-6 max-w-2xl">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="font-display font-bold text-foreground text-lg">Basic Information</h2>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Event Title *</Label>
                      <Input
                        value={eventForm.title}
                        onChange={(e) => handleEventFormChange("title", e.target.value)}
                        placeholder="e.g., Summer Music Festival 2026"
                        className="bg-secondary/50 border-border focus:border-primary/60"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Description *</Label>
                      <Textarea
                        value={eventForm.description}
                        onChange={(e) => handleEventFormChange("description", e.target.value)}
                        placeholder="Describe your event..."
                        className="bg-secondary/50 border-border focus:border-primary/60 min-h-28 resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Category *</Label>
                      <Select
                        value={eventForm.category}
                        onValueChange={(v) => handleEventFormChange("category", v)}
                      >
                        <SelectTrigger className="bg-secondary/50 border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value={EventCategory.concert}>Concert</SelectItem>
                          <SelectItem value={EventCategory.sports}>Sports</SelectItem>
                          <SelectItem value={EventCategory.conference}>Conference</SelectItem>
                          <SelectItem value={EventCategory.workshop}>Workshop</SelectItem>
                          <SelectItem value={EventCategory.privateEvent}>Private Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Cover Image URL</Label>
                      <Input
                        value={eventForm.coverImage}
                        onChange={(e) => handleEventFormChange("coverImage", e.target.value)}
                        placeholder="https://..."
                        className="bg-secondary/50 border-border focus:border-primary/60"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Tags (comma-separated)</Label>
                      <Input
                        value={eventForm.tags}
                        onChange={(e) => handleEventFormChange("tags", e.target.value)}
                        placeholder="Music, Live, Family"
                        className="bg-secondary/50 border-border focus:border-primary/60"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!eventForm.title || !eventForm.description}
                      className="btn-glow gap-2"
                    >
                      Next: Location <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Location & Time */}
              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="font-display font-bold text-foreground text-lg">Location & Time</h2>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Venue *</Label>
                      <Input
                        value={eventForm.venue}
                        onChange={(e) => handleEventFormChange("venue", e.target.value)}
                        placeholder="e.g., Madison Square Garden"
                        className="bg-secondary/50 border-border focus:border-primary/60"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs mb-1.5 block">City *</Label>
                        <Input
                          value={eventForm.city}
                          onChange={(e) => handleEventFormChange("city", e.target.value)}
                          placeholder="City"
                          className="bg-secondary/50 border-border focus:border-primary/60"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs mb-1.5 block">Country *</Label>
                        <Input
                          value={eventForm.country}
                          onChange={(e) => handleEventFormChange("country", e.target.value)}
                          placeholder="Country"
                          className="bg-secondary/50 border-border focus:border-primary/60"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1.5 block">Event Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        value={eventForm.eventDate}
                        onChange={(e) => handleEventFormChange("eventDate", e.target.value)}
                        className="bg-secondary/50 border-border focus:border-primary/60"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="border-border">
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!eventForm.venue || !eventForm.city || !eventForm.country || !eventForm.eventDate}
                      className="btn-glow gap-2"
                    >
                      Next: Tickets <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Tickets */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-bold text-foreground text-lg">Ticket Types</h2>
                    <button
                      type="button"
                      onClick={handleAddTicket}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 bg-transparent border-none cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Ticket Type
                    </button>
                  </div>

                  <div className="space-y-4">
                    {tickets.map((ticket, idx) => (
                      <div key={ticket.id} className="border border-border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase">
                            Ticket Type #{idx + 1}
                          </span>
                          {tickets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTicket(ticket.id)}
                              className="p-1 text-destructive hover:text-destructive/80 bg-transparent border-none cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-muted-foreground text-xs mb-1 block">Name</Label>
                            <Input
                              value={ticket.name}
                              onChange={(e) => handleTicketChange(ticket.id, "name", e.target.value)}
                              placeholder="e.g., VIP, General"
                              className="bg-secondary/50 border-border focus:border-primary/60 h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs mb-1 block">Type</Label>
                            <Select
                              value={ticket.ticketType}
                              onValueChange={(v) => handleTicketChange(ticket.id, "ticketType", v)}
                            >
                              <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value={TicketType.generalAdmission}>General</SelectItem>
                                <SelectItem value={TicketType.numberedSeat}>Numbered Seat</SelectItem>
                                <SelectItem value={TicketType.timeSlot}>Time Slot</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs mb-1 block">Price (₹ INR)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">₹</span>
                              <Input
                                type="number"
                                value={ticket.price}
                                onChange={(e) => handleTicketChange(ticket.id, "price", e.target.value)}
                                placeholder="0.00"
                                className="bg-secondary/50 border-border focus:border-primary/60 h-9 text-sm pl-7"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-muted-foreground text-xs mb-1 block">Available Quantity</Label>
                            <Input
                              type="number"
                              value={ticket.quantity}
                              onChange={(e) => handleTicketChange(ticket.id, "quantity", e.target.value)}
                              placeholder="100"
                              className="bg-secondary/50 border-border focus:border-primary/60 h-9 text-sm"
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} className="border-border">
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(4)}
                      disabled={tickets.every((t) => !t.name)}
                      className="btn-glow gap-2"
                    >
                      Review & Submit <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && !createdEventId && (
                <div className="space-y-5">
                  <h2 className="font-display font-bold text-foreground text-lg">Review & Submit</h2>

                  <div className="space-y-3 text-sm">
                    <div className="border border-border rounded-xl p-4 space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Event</p>
                      <p className="font-semibold text-foreground">{eventForm.title}</p>
                      <p className="text-muted-foreground text-xs">{eventForm.description.slice(0, 100)}…</p>
                    </div>
                    <div className="border border-border rounded-xl p-4 space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Location</p>
                      <div className="flex items-center gap-2 text-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{eventForm.venue}, {eventForm.city}, {eventForm.country}</span>
                      </div>
                    </div>
                    <div className="border border-border rounded-xl p-4 space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">
                        Tickets ({tickets.filter((t) => t.name).length})
                      </p>
                      {tickets.filter((t) => t.name).map((t) => (
                        <div key={t.id} className="flex justify-between text-sm">
                          <span className="text-foreground">{t.name}</span>
                          <span className="text-muted-foreground">₹{t.price} · {t.quantity} qty</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(3)} className="border-border">
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmitEvent}
                      disabled={addEvent.isPending || addTicket.isPending}
                      className="btn-glow gap-2"
                    >
                      {addEvent.isPending || addTicket.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create Event"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && createdEventId && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground text-xl">Event Created!</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your event has been created as a draft. Publish it when ready.
                    </p>
                  </div>
                  <Button onClick={resetForm} className="btn-glow">
                    Create Another Event
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "Total Events",
                  value: stats ? stats.totalEvents.toString() : "—",
                  icon: <Calendar className="h-5 w-5 text-primary" />,
                },
                {
                  label: "Total Bookings",
                  value: stats ? stats.totalBookings.toString() : "—",
                  icon: <Edit className="h-5 w-5 text-primary" />,
                },
                {
                  label: "Total Revenue",
                  value: stats ? formatCurrency(stats.totalRevenue) : "—",
                  icon: <Globe className="h-5 w-5 text-primary" />,
                },
              ].map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      {stat.icon}
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
