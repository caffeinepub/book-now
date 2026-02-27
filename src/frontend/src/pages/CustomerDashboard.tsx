import { useState } from "react";
import { useListMyBookings, useCancelBooking, useSaveCallerUserProfile } from "@/hooks/useQueries";
import { UserProfile } from "@/types";
import type { Booking } from "../backend.d";
import { BookingStatus as BackendBookingStatus } from "../backend.d";
import { formatDateTime } from "@/utils/format";
import { useCurrency } from "@/hooks/useCurrency";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useActor } from "@/hooks/useActor";
import {
  Ticket,
  Calendar,
  RefreshCw,
  User,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  BarChart3,
  Edit3,
  Save,
  X,
  Shield,
  Star,
  Sparkles,
  Plane,
  Hotel,
  Car,
  Crown,
  ChevronRight,
  ChevronLeft,
  Gem,
  MapPin,
  Users,
  FileText,
  Check,
  Zap,
} from "lucide-react";
import { formatPrice, CURRENCIES } from "@/utils/currency";

interface CustomerDashboardProps {
  userProfile: UserProfile;
}

// ── Status helpers using backend BookingStatus ──────────────────────────────
const STATUS_CLASSES: Record<string, string> = {
  pending: "status-pending",
  confirmed: "status-confirmed",
  cancelled: "status-cancelled",
  refunded: "status-refunded",
  onHold: "status-pending",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  onHold: "On Hold",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  confirmed: <CheckCircle className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
  refunded: <RefreshCw className="h-3.5 w-3.5" />,
  onHold: <AlertTriangle className="h-3.5 w-3.5" />,
};

function getStatusKey(status: BackendBookingStatus): string {
  if (status === BackendBookingStatus.confirmed) return "confirmed";
  if (status === BackendBookingStatus.cancelled) return "cancelled";
  if (status === BackendBookingStatus.refunded) return "refunded";
  if (status === BackendBookingStatus.onHold) return "onHold";
  return "pending";
}

// ── Currency formatting helper ─────────────────────────────────────────────
function formatINRAmount(amountINR: bigint): string {
  return `₹${Number(amountINR).toLocaleString("en-IN")}`;
}

// ── AI Concierge types ──────────────────────────────────────────────────────
interface Itinerary {
  id: string;
  destination: string;
  eventName: string;
  travelDates: { from: string; to: string };
  travelers: number;
  preferences: string[];
  budget: number;
  status: "draft" | "confirmed" | "cancelled";
  flights: { airline: string; class: string; pricePerPerson: number };
  hotel: { name: string; stars: number; nights: number; pricePerNight: number };
  transport: { type: string; description: string; price: number };
  tickets: { eventName: string; ticketType: string; seats: number; price: number };
  vipAddons: string[];
  totalCost: number;
  createdAt: string;
}

const POPULAR_DESTINATIONS = [
  { name: "Tomorrowland, Belgium", flag: "🇧🇪", event: "Tomorrowland 2026" },
  { name: "Coachella, California USA", flag: "🇺🇸", event: "Coachella Valley Music & Arts" },
  { name: "Goa, India", flag: "🇮🇳", event: "Sunburn Goa Festival 2026" },
  { name: "Miami, Florida USA", flag: "🇺🇸", event: "Ultra Music Festival Miami" },
  { name: "Mumbai, India", flag: "🇮🇳", event: "Lollapalooza India 2026" },
  { name: "Amsterdam, Netherlands", flag: "🇳🇱", event: "ADE Amsterdam Dance Event" },
];

const PREFERENCE_OPTIONS = [
  { id: "vip", label: "VIP Experience", icon: <Crown className="h-3.5 w-3.5" /> },
  { id: "luxury_hotel", label: "Luxury Hotels", icon: <Hotel className="h-3.5 w-3.5" /> },
  { id: "business_class", label: "Business Class Flights", icon: <Plane className="h-3.5 w-3.5" /> },
  { id: "artist_meet", label: "Artist Meet & Greet", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "luxury_car", label: "Luxury Car Transfer", icon: <Car className="h-3.5 w-3.5" /> },
  { id: "private_jet", label: "Private Jet", icon: <Plane className="h-3.5 w-3.5" /> },
  { id: "yacht", label: "Yacht Charter", icon: <Gem className="h-3.5 w-3.5" /> },
  { id: "companion", label: "Model/Companion Service", icon: <Users className="h-3.5 w-3.5" /> },
];

function generateItinerary(
  destination: string,
  eventName: string,
  fromDate: string,
  toDate: string,
  travelers: number,
  preferences: string[],
  budget: number
): Itinerary {
  const isVIP = preferences.includes("vip");
  const isBusinessClass = preferences.includes("business_class");
  const isLuxuryHotel = preferences.includes("luxury_hotel");
  const isPrivateJet = preferences.includes("private_jet");

  const nights = Math.max(
    1,
    Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  const flightPrice = isPrivateJet ? 500000 : isBusinessClass ? 85000 : 35000;
  const hotelStars = isLuxuryHotel ? 5 : isVIP ? 4 : 3;
  const hotelPrice = hotelStars === 5 ? 45000 : hotelStars === 4 ? 20000 : 8000;
  const ticketPrice = isVIP ? 25000 : 8000;
  const transportPrice = preferences.includes("luxury_car") ? 8000 : 2500;

  const totalCost =
    flightPrice * travelers +
    hotelPrice * nights +
    ticketPrice * travelers +
    transportPrice +
    (preferences.includes("artist_meet") ? 15000 * travelers : 0) +
    (preferences.includes("yacht") ? 50000 : 0);

  return {
    id: `itin-${Date.now()}`,
    destination,
    eventName,
    travelDates: { from: fromDate, to: toDate },
    travelers,
    preferences,
    budget,
    status: "draft",
    flights: {
      airline: isPrivateJet ? "Private Charter" : isBusinessClass ? "Emirates Business" : "Air India Economy",
      class: isPrivateJet ? "Private Jet" : isBusinessClass ? "Business Class" : "Economy",
      pricePerPerson: flightPrice,
    },
    hotel: {
      name: hotelStars === 5 ? "The Ritz-Carlton" : hotelStars === 4 ? "Marriott Premium" : "Holiday Inn Express",
      stars: hotelStars,
      nights,
      pricePerNight: hotelPrice,
    },
    transport: {
      type: preferences.includes("luxury_car") ? "Luxury Car" : "Standard Transfer",
      description: preferences.includes("luxury_car") ? "Mercedes S-Class airport pickup" : "Economy cab transfer",
      price: transportPrice,
    },
    tickets: {
      eventName,
      ticketType: isVIP ? "VIP Pass" : "General Admission",
      seats: travelers,
      price: ticketPrice,
    },
    vipAddons: [
      ...(preferences.includes("artist_meet") ? ["Artist Meet & Greet (₹" + (15000).toLocaleString("en-IN") + "/person)"] : []),
      ...(preferences.includes("vip") ? ["VIP Lounge Access", "Priority Entry"] : []),
      ...(preferences.includes("yacht") ? ["Yacht Charter (1 day)"] : []),
    ],
    totalCost,
    createdAt: new Date().toISOString(),
  };
}

// ── AI Concierge component ──────────────────────────────────────────────────
function AIConcierge() {
  const { actor } = useActor();
  const { currency } = useCurrency();
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [travelers, setTravelers] = useState(1);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [budget, setBudget] = useState(500000);
  const [specialRequests, setSpecialRequests] = useState("");
  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBookingAll, setIsBookingAll] = useState(false);

  const rate = currency === "USD" ? 0.012 : currency === "EUR" ? 0.011 : currency === "AED" ? 0.044 : currency === "GBP" ? 0.0095 : 1;

  const convertAndFormat = (inrAmount: number) =>
    formatPrice(inrAmount * rate, currency);

  const togglePreference = (id: string) => {
    setPreferences(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!destination || !fromDate || !toDate) {
      toast.error("Please fill in destination and travel dates.");
      return;
    }
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 1800));
    const itin = generateItinerary(destination, selectedEvent || destination, fromDate, toDate, travelers, preferences, budget);
    setGeneratedItinerary(itin);
    setStep(4);
    setIsGenerating(false);
  };

  const handleConfirmBook = async () => {
    if (!generatedItinerary || !actor) {
      toast.error("Please log in to complete booking.");
      return;
    }
    setIsBookingAll(true);
    try {
      const items = [
        {
          productName: `${generatedItinerary.eventName} — VIP Package`,
          currency: "INR",
          quantity: BigInt(generatedItinerary.travelers),
          priceInCents: BigInt(Math.round(generatedItinerary.totalCost * 100)),
          productDescription: `AI Concierge Itinerary: ${generatedItinerary.destination}`,
        },
      ];
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const sessionJson = await actor.createCheckoutSession(items, `${baseUrl}/?payment=success`, `${baseUrl}/?payment=cancelled`);
      let redirectUrl: string | null = null;
      try {
        const parsed = JSON.parse(sessionJson) as { url?: string };
        redirectUrl = parsed.url ?? null;
      } catch {
        redirectUrl = sessionJson;
      }
      if (redirectUrl) {
        setSavedItineraries(prev => [...prev, { ...generatedItinerary, status: "confirmed" }]);
        window.location.href = redirectUrl;
      }
    } catch {
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setIsBookingAll(false);
    }
  };

  const handleSaveItinerary = () => {
    if (!generatedItinerary) return;
    setSavedItineraries(prev => [...prev, generatedItinerary]);
    toast.success("Itinerary saved to My Itineraries!");
  };

  const STEP_LABELS = [
    { num: 1, label: "Destination" },
    { num: 2, label: "Travel Dates" },
    { num: 3, label: "Preferences" },
    { num: 4, label: "Itinerary" },
  ];

  return (
    <div className="space-y-6">
      {/* AI Concierge header */}
      <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground text-lg">AI Travel Concierge</h2>
            <p className="text-xs text-muted-foreground">Powered by DMT CREATOLOGY · 24x7 luxury planning</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Let our AI plan your complete event experience — flights, hotels, transport, VIP packages, and more.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between px-2">
        {STEP_LABELS.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step === s.num
                  ? "bg-primary border-primary text-white shadow-[0_0_12px_rgba(0,102,255,0.5)]"
                  : step > s.num
                  ? "bg-green-500/20 border-green-500/60 text-green-400"
                  : "bg-secondary/40 border-border text-muted-foreground"
              }`}>
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${step === s.num ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className={`h-px flex-1 mx-2 mb-5 ${step > s.num ? "bg-green-500/40" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Destination */}
      {step === 1 && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">Where do you want to go?</h3>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Destination *</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Goa, India or Boom, Belgium"
              className="bg-secondary/50 border-border focus:border-primary/60 h-10"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-3 block">Popular Destinations</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POPULAR_DESTINATIONS.map(dest => (
                <button
                  key={dest.name}
                  type="button"
                  onClick={() => {
                    setDestination(dest.name);
                    setSelectedEvent(dest.event);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    destination === dest.name
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <span className="text-xl">{dest.flag}</span>
                  <div>
                    <p className="text-xs font-semibold">{dest.name}</p>
                    <p className="text-[10px] opacity-70">{dest.event}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            disabled={!destination}
            className="btn-glow w-full gap-2"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Travel Dates */}
      {step === 2 && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">Travel Dates & Group Size</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Departure Date *</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary/60 h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Return Date *</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary/60 h-10"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Number of Travelers</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTravelers(Math.max(1, travelers - 1))}
                className="w-9 h-9 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-all"
              >
                —
              </button>
              <span className="font-display font-bold text-2xl text-foreground w-8 text-center">{travelers}</span>
              <button
                type="button"
                onClick={() => setTravelers(Math.min(20, travelers + 1))}
                className="w-9 h-9 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-foreground hover:border-primary/40 transition-all"
              >
                +
              </button>
              <span className="text-xs text-muted-foreground">person{travelers > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="border-border gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!fromDate || !toDate}
              className="btn-glow flex-1 gap-2"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preferences */}
      {step === 3 && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h3 className="font-display font-bold text-foreground">Preferences & Add-ons</h3>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-3 block">Select your preferences</Label>
            <div className="grid grid-cols-2 gap-2">
              {PREFERENCE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => togglePreference(opt.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                    preferences.includes(opt.id)
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {preferences.includes(opt.id) ? (
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : opt.icon}
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Budget Range</Label>
              <span className="text-sm font-bold text-foreground">{convertAndFormat(budget)}</span>
            </div>
            <Slider
              value={[budget]}
              onValueChange={([v]) => setBudget(v)}
              min={50000}
              max={5000000}
              step={50000}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{convertAndFormat(50000)}</span>
              <span>{convertAndFormat(5000000)}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Special Requests (optional)</Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requirements, dietary needs, accessibility, etc..."
              className="bg-secondary/50 border-border min-h-20 resize-none text-sm"
              maxLength={500}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="border-border gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-glow flex-1 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Itinerary...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI Itinerary
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Generated Itinerary */}
      {step === 4 && generatedItinerary && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Itinerary Generated</span>
            </div>
            <h3 className="font-display font-bold text-foreground text-lg">{generatedItinerary.destination}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {generatedItinerary.travelDates.from} → {generatedItinerary.travelDates.to} · {generatedItinerary.travelers} person{generatedItinerary.travelers > 1 ? "s" : ""}
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3"><Plane className="h-4 w-4 text-blue-400" /><h4 className="font-semibold text-foreground text-sm">✈️ Flights</h4></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{generatedItinerary.flights.airline}</p>
                <p className="text-xs text-muted-foreground">{generatedItinerary.flights.class}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{convertAndFormat(generatedItinerary.flights.pricePerPerson)}</p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3"><Hotel className="h-4 w-4 text-amber-400" /><h4 className="font-semibold text-foreground text-sm">🏨 Hotel</h4></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{generatedItinerary.hotel.name}</p>
                <p className="text-xs text-muted-foreground">{"⭐".repeat(generatedItinerary.hotel.stars)} · {generatedItinerary.hotel.nights} night{generatedItinerary.hotel.nights > 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{convertAndFormat(generatedItinerary.hotel.pricePerNight)}</p>
                <p className="text-xs text-muted-foreground">per night</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3"><Car className="h-4 w-4 text-green-400" /><h4 className="font-semibold text-foreground text-sm">🚗 Transport</h4></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{generatedItinerary.transport.type}</p>
                <p className="text-xs text-muted-foreground">{generatedItinerary.transport.description}</p>
              </div>
              <p className="text-sm font-bold text-foreground">{convertAndFormat(generatedItinerary.transport.price)}</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3"><Ticket className="h-4 w-4 text-fuchsia-400" /><h4 className="font-semibold text-foreground text-sm">🎫 Event Tickets</h4></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{generatedItinerary.tickets.eventName}</p>
                <p className="text-xs text-muted-foreground">{generatedItinerary.tickets.ticketType} · {generatedItinerary.tickets.seats} seat{generatedItinerary.tickets.seats > 1 ? "s" : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{convertAndFormat(generatedItinerary.tickets.price)}</p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>
          </div>

          {generatedItinerary.vipAddons.length > 0 && (
            <div className="glass-card rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3"><Crown className="h-4 w-4 text-amber-400" /><h4 className="font-semibold text-foreground text-sm">👑 VIP Add-ons</h4></div>
              <ul className="space-y-1.5">
                {generatedItinerary.vipAddons.map((addon) => (
                  <li key={addon} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-amber-400 shrink-0" />
                    {addon}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-blue-900/20 border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Estimated Cost</p>
                <p className="font-display text-3xl font-extrabold text-foreground">{convertAndFormat(generatedItinerary.totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">For {generatedItinerary.travelers} traveler{generatedItinerary.travelers > 1 ? "s" : ""} · {generatedItinerary.hotel.nights} nights</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/10">
                  <Shield className="h-3 w-3 mr-1" />
                  Escrow Protected
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setStep(3)} className="border-border gap-2 flex-1">
              <ChevronLeft className="h-4 w-4" />
              Modify
            </Button>
            <Button variant="outline" onClick={handleSaveItinerary} className="border-primary/30 text-primary hover:bg-primary/10 gap-2">
              <FileText className="h-4 w-4" />
              Save
            </Button>
            <Button onClick={handleConfirmBook} disabled={isBookingAll || !actor} className="btn-glow flex-1 gap-2">
              {isBookingAll ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
              ) : (
                <><Zap className="h-4 w-4" />Confirm & Book All</>
              )}
            </Button>
          </div>

          {!actor && (
            <p className="text-xs text-muted-foreground text-center">Sign in to complete booking</p>
          )}
        </div>
      )}

      {savedItineraries.length > 0 && step !== 4 && (
        <div>
          <h3 className="font-display font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            My Itineraries
          </h3>
          <div className="space-y-2">
            {savedItineraries.map(itin => (
              <div key={itin.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{itin.destination}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{itin.travelDates.from} · {itin.travelers} travelers</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{convertAndFormat(itin.totalCost)}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      itin.status === "confirmed"
                        ? "border-green-500/30 text-green-400 bg-green-500/10"
                        : itin.status === "cancelled"
                        ? "border-destructive/30 text-destructive bg-destructive/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {itin.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CustomerDashboard ──────────────────────────────────────────────────
export default function CustomerDashboard({ userProfile }: CustomerDashboardProps) {
  const [cancelBookingTarget, setCancelBookingTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email ?? "");

  const { data: bookings = [], isLoading } = useListMyBookings();
  const cancelBookingMutation = useCancelBooking();
  const saveProfile = useSaveCallerUserProfile();

  const typedBookings = bookings as Booking[];
  const totalBookings = typedBookings.length;
  const confirmedCount = typedBookings.filter(b => b.status === BackendBookingStatus.confirmed).length;
  const cancelledCount = typedBookings.filter(b => b.status === BackendBookingStatus.cancelled).length;
  const refundedCount = typedBookings.filter(b => b.status === BackendBookingStatus.refunded).length;
  const totalSpent = typedBookings.reduce((sum, b) => sum + b.totalAmountINR, 0n);

  const now = Date.now();
  const thisMonthStart = new Date(now);
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const thisMonthStartNs = BigInt(thisMonthStart.getTime()) * 1_000_000n;
  const bookingsThisMonth = typedBookings.filter(b => b.createdAt >= thisMonthStartNs).length;

  const upcomingBookings = typedBookings.filter(b => b.status === BackendBookingStatus.confirmed);
  const pastBookings = typedBookings.filter(b => b.status !== BackendBookingStatus.confirmed);

  const initials = userProfile.name
    ? userProfile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleCancelSubmit = async () => {
    if (!cancelBookingTarget) return;
    try {
      await cancelBookingMutation.mutateAsync(cancelBookingTarget.id);
      toast.success("Booking cancelled successfully.");
      setCancelBookingTarget(null);
      setCancelReason("");
    } catch {
      toast.error("Failed to cancel booking. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    try {
      await saveProfile.mutateAsync({
        name: editName.trim() || userProfile.name,
        email: editEmail.trim() || userProfile.email,
      });
      toast.success("Profile updated.");
      setIsEditingProfile(false);
    } catch {
      toast.error("Failed to update profile.");
    }
  };

  return (
    <main className="min-h-screen pt-16 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Customer Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,102,255,0.2)]">
                <span className="font-display text-lg font-bold text-primary">{initials}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-background flex items-center justify-center">
                <span className="text-[8px] text-black font-bold">✓</span>
              </span>
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Welcome back, <span className="text-primary">{userProfile.name.split(" ")[0]}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{userProfile.email || "Manage your bookings and profile"}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total Bookings",
              value: totalBookings.toString(),
              icon: <Ticket className="h-4 w-4 text-primary" />,
              color: "text-primary",
              bg: "bg-primary/10 border-primary/30",
            },
            {
              label: "Confirmed",
              value: confirmedCount.toString(),
              icon: <CheckCircle className="h-4 w-4 text-green-400" />,
              color: "text-green-400",
              bg: "bg-green-500/10 border-green-500/30",
            },
            {
              label: "Total Spent",
              value: formatINRAmount(totalSpent),
              icon: <DollarSign className="h-4 w-4 text-[#fbbf24]" />,
              color: "text-[#fbbf24]",
              bg: "bg-[#fbbf24]/10 border-[#fbbf24]/30",
            },
            {
              label: "Refunds",
              value: refundedCount.toString(),
              icon: <RefreshCw className="h-4 w-4 text-[#a78bfa]" />,
              color: "text-[#a78bfa]",
              bg: "bg-[#a78bfa]/10 border-[#a78bfa]/30",
            },
          ].map((item) => (
            <div key={item.label} className={`glass-card rounded-xl p-4 border ${item.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                {item.icon}
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
              </div>
              <p className={`font-display text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="bg-secondary/40 border border-border mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="bookings" className="gap-2 text-xs sm:text-sm">
              <Ticket className="h-4 w-4" />
              My Bookings
              {totalBookings > 0 && (
                <span className="ml-1 bg-primary/20 text-primary rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {totalBookings}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="concierge" className="gap-2 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4" />
              AI Concierge
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="page-enter">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full bg-secondary/40 rounded-xl" />
                ))}
              </div>
            ) : totalBookings === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Ticket className="h-8 w-8 text-primary/50" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">No bookings yet</h3>
                <p className="text-muted-foreground text-sm">Book your first event to see it here</p>
              </div>
            ) : (
              <div className="space-y-5">
                {upcomingBookings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full bg-green-400" />
                      <h2 className="font-display font-semibold text-foreground text-sm">
                        Upcoming
                        <span className="ml-2 text-xs text-muted-foreground font-normal">({upcomingBookings.length})</span>
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {upcomingBookings.map((booking) => (
                        <BookingCard key={String(booking.id)} booking={booking} onCancel={setCancelBookingTarget} />
                      ))}
                    </div>
                  </div>
                )}

                {pastBookings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
                      <h2 className="font-display font-semibold text-foreground text-sm">
                        Past & Other
                        <span className="ml-2 text-xs text-muted-foreground font-normal">({pastBookings.length})</span>
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {pastBookings.map((booking) => (
                        <BookingCard key={String(booking.id)} booking={booking} onCancel={setCancelBookingTarget} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* AI Concierge Tab */}
          <TabsContent value="concierge" className="page-enter">
            <AIConcierge />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="page-enter">
            <div className="max-w-lg space-y-4">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,102,255,0.2)]">
                      <span className="font-display text-2xl font-bold text-primary">{initials}</span>
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground text-lg">{userProfile.name}</p>
                      <p className="text-xs text-muted-foreground">{userProfile.email || "No email set"}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10 gap-1">
                          <Star className="h-2.5 w-2.5" />
                          Customer
                        </Badge>
                        <Badge variant="outline" className="text-xs text-green-400 border-green-500/30 bg-green-500/10">
                          ✓ Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(!isEditingProfile);
                      setEditName(userProfile.name);
                      setEditEmail(userProfile.email ?? "");
                    }}
                    className="p-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all bg-transparent cursor-pointer"
                    title="Edit profile"
                  >
                    {isEditingProfile ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  </button>
                </div>

                {isEditingProfile && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Display Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your name"
                        className="bg-secondary/50 border-border focus:border-primary/60 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Email Address</Label>
                      <Input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        className="bg-secondary/50 border-border focus:border-primary/60 h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saveProfile.isPending}
                        className="btn-glow gap-2 h-8 text-xs flex-1"
                        size="sm"
                      >
                        {saveProfile.isPending ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
                        ) : (
                          <><Save className="h-3 w-3" />Save Changes</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingProfile(false)}
                        className="border-border h-8 text-xs"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card rounded-2xl p-5">
                <h2 className="font-display font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Account Summary
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Bookings", value: totalBookings.toString(), color: "text-primary" },
                    { label: "Total Spent", value: formatINRAmount(totalSpent), color: "text-[#fbbf24]" },
                    { label: "Confirmed", value: confirmedCount.toString(), color: "text-green-400" },
                    { label: "Refunds", value: refundedCount.toString(), color: "text-[#a78bfa]" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-xl bg-secondary/40 border border-border">
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      <p className={`font-display text-base font-bold ${item.color} mt-0.5`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Account Security
                </h2>
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Internet Identity Connected</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30 bg-green-500/10">
                    Verified
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="page-enter">
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Spending Summary
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Total Spent (All Time)",
                      value: formatINRAmount(totalSpent),
                      icon: <DollarSign className="h-5 w-5 text-[#fbbf24]" />,
                      color: "text-[#fbbf24]",
                      bg: "bg-[#fbbf24]/10 border-[#fbbf24]/30",
                    },
                    {
                      label: "Bookings This Month",
                      value: bookingsThisMonth.toString(),
                      icon: <Calendar className="h-5 w-5 text-primary" />,
                      color: "text-primary",
                      bg: "bg-primary/10 border-primary/30",
                    },
                    {
                      label: "Confirmed Bookings",
                      value: confirmedCount.toString(),
                      icon: <CheckCircle className="h-5 w-5 text-green-400" />,
                      color: "text-green-400",
                      bg: "bg-green-500/10 border-green-500/30",
                    },
                    {
                      label: "Refunds Requested",
                      value: refundedCount.toString(),
                      icon: <RefreshCw className="h-5 w-5 text-[#a78bfa]" />,
                      color: "text-[#a78bfa]",
                      bg: "bg-[#a78bfa]/10 border-[#a78bfa]/30",
                    },
                  ].map((item) => (
                    <div key={item.label} className={`stat-card border ${item.bg}`}>
                      <div className={`w-9 h-9 rounded-xl ${item.bg} border flex items-center justify-center mb-3`}>
                        {item.icon}
                      </div>
                      <p className={`font-display text-xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <h2 className="font-display font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Booking Status Breakdown
                </h2>
                {totalBookings === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { key: "confirmed", label: "Confirmed", color: "bg-green-400", count: confirmedCount },
                      { key: "pending", label: "Pending", color: "bg-[#fbbf24]", count: typedBookings.filter(b => b.status === BackendBookingStatus.pending).length },
                      { key: "cancelled", label: "Cancelled", color: "bg-muted-foreground", count: cancelledCount },
                      { key: "refunded", label: "Refunded", color: "bg-primary", count: refundedCount },
                    ].map((item) => (
                      <div key={item.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{item.count}</span>
                            <span className="text-[11px] text-muted-foreground">
                              ({totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: totalBookings > 0 ? `${(item.count / totalBookings) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalBookings > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h2 className="font-display font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Spending Insight
                  </h2>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Average per booking",
                        value: totalBookings > 0 ? formatINRAmount(totalSpent / BigInt(totalBookings)) : "—",
                      },
                      {
                        label: "This month's activity",
                        value: `${bookingsThisMonth} bookings`,
                        highlight: true,
                      },
                      {
                        label: "Cancellation rate",
                        value: `${totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0}%`,
                        warn: cancelledCount > 0,
                      },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className={`text-sm font-bold ${item.highlight ? "text-primary" : item.warn ? "text-[#fbbf24]" : "text-foreground"}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelBookingTarget} onOpenChange={(open) => !open && setCancelBookingTarget(null)}>
        <DialogContent className="bg-popover border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Cancel Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {cancelBookingTarget && (
              <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground">Booking ID</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  #{String(cancelBookingTarget.id).padStart(8, "0")}
                </p>
                <p className="text-xs text-[#fbbf24] font-medium mt-0.5">
                  {formatINRAmount(cancelBookingTarget.totalAmountINR)}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Reason for cancellation (optional)
              </Label>
              <Textarea
                placeholder="Why are you cancelling?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-secondary/50 border-border min-h-24 resize-none"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelBookingTarget(null)}
              className="border-border"
            >
              Keep Booking
            </Button>
            <Button
              onClick={handleCancelSubmit}
              disabled={cancelBookingMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {cancelBookingMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling…</>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ── Booking Card Component ──────────────────────────────────────────────────
interface BookingCardProps {
  booking: Booking;
  onCancel: (booking: Booking) => void;
}

function BookingCard({ booking, onCancel }: BookingCardProps) {
  const statusKey = getStatusKey(booking.status);

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground text-sm">
                #BK{String(booking.id).padStart(8, "0")}
              </p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[statusKey] ?? "status-pending"}`}>
                {STATUS_ICONS[statusKey]}
                {STATUS_LABELS[statusKey] ?? statusKey}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatDateTime(booking.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Qty: <span className="text-foreground font-medium">{booking.quantity.toString()}</span>
              </span>
              <span className="text-sm font-bold text-[#fbbf24]">
                {formatINRAmount(booking.totalAmountINR)}
              </span>
              <span className="text-xs text-muted-foreground">
                {booking.ticketType as string}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          {booking.status === BackendBookingStatus.confirmed && (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:border-destructive/30 hover:text-destructive transition-all bg-transparent cursor-pointer"
            >
              <XCircle className="h-3 w-3" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
