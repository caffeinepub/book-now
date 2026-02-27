import { useState, useMemo, useRef, useEffect } from "react";
import { useListPublishedEvents, useGetPlatformStats } from "@/hooks/useQueries";
import EventCard, { AnyEvent } from "@/components/EventCard";
import {
  DEMO_EVENTS,
  MockEvent,
  MOCK_ARTISTS,
  MOCK_LUXURY_SERVICES,
  MockArtist,
} from "@/utils/mockData";
import { EventCategory, EventStatus } from "@/types";
import type { Event } from "../backend.d";
import {
  Search,
  Globe,
  Ticket as TicketIcon,
  Users,
  ChevronDown,
  Music2,
  Mic2,
  Star,
  Trophy,
  Briefcase,
  BookOpen,
  Lock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Flame,
  Crown,
  ThumbsUp,
  Plane,
  Car,
  Hotel,
  Anchor,
  Gem,
  Sparkles,
  Heart,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPrice } from "@/utils/currency";

interface MarketplaceProps {
  onSelectEvent: (event: AnyEvent) => void;
  searchQuery: string;
  categoryFilter?: string;
}

const CATEGORIES = [
  { label: "All Events", value: "all", icon: <Globe className="h-3.5 w-3.5" /> },
  { label: "Music Festival", value: "musicFestival", icon: <Music2 className="h-3.5 w-3.5" /> },
  { label: "Concert", value: "concert", icon: <Mic2 className="h-3.5 w-3.5" /> },
  { label: "DJ", value: "dj", icon: <Star className="h-3.5 w-3.5" /> },
  { label: "Sports", value: "sports", icon: <Trophy className="h-3.5 w-3.5" /> },
  { label: "Conference", value: "conference", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { label: "Workshop", value: "workshop", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { label: "Private", value: "privateEvent", icon: <Lock className="h-3.5 w-3.5" /> },
  { label: "Luxury Party", value: "luxuryParty", icon: <Crown className="h-3.5 w-3.5" /> },
];

const SORT_OPTIONS = [
  { label: "Date", value: "date" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Name", value: "name" },
];

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, started]);
  return count;
}

// ── Horizontal scroll row component ──────────────────────────────────────────
function ScrollRow({ children, title, badge, accentColor = "bg-primary" }: {
  children: React.ReactNode;
  title: React.ReactNode;
  badge?: React.ReactNode;
  accentColor?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-8 rounded-full ${accentColor}`} />
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">{title}</h2>
            {badge}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full bg-secondary/60 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full bg-secondary/60 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Card skeleton ─────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Skeleton className="h-48 w-full bg-secondary/40" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 bg-secondary/40" />
        <Skeleton className="h-3 w-1/2 bg-secondary/40" />
        <Skeleton className="h-3 w-2/3 bg-secondary/40" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-6 w-16 bg-secondary/40" />
          <Skeleton className="h-8 w-24 bg-secondary/40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Artist card ───────────────────────────────────────────────────────────────
function ArtistCard({ artist }: { artist: MockArtist }) {
  const { currency } = useCurrency();
  const displayFee = formatPrice((artist.bookingFeeMin / 100) * (
    currency === "USD" ? 0.012 :
    currency === "EUR" ? 0.011 :
    currency === "AED" ? 0.044 :
    currency === "GBP" ? 0.0095 : 1
  ), currency);

  const initials = artist.name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const GENRE_GRADIENTS: Record<string, string> = {
    "Progressive House": "from-cyan-900 to-blue-900",
    "Hardstyle / Big Room": "from-orange-900 to-red-900",
    "Progressive / Big Room": "from-violet-900 to-purple-900",
    "Bollywood / Pop": "from-pink-900 to-rose-900",
    "Hip-Hop / Rap": "from-yellow-900 to-orange-900",
    "Pop / Electronic": "from-fuchsia-900 to-pink-900",
    "R&B / Pop": "from-purple-900 to-indigo-900",
    "Electronic / Trap": "from-green-900 to-teal-900",
    "Bollywood": "from-amber-900 to-yellow-900",
    "House / Electronic": "from-teal-900 to-cyan-900",
  };
  const gradient = GENRE_GRADIENTS[artist.genre ?? ""] ?? "from-blue-900 to-indigo-900";

  return (
    <div className="glass-card rounded-xl overflow-hidden shrink-0 w-56 group cursor-pointer hover:scale-[1.02] transition-transform duration-200">
      {/* Artist visual */}
      <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-white">{initials}</span>
        </div>
        <div className="absolute top-2 left-2">
          <span className="text-base">{artist.flag}</span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-black/60 border border-white/20 text-white backdrop-blur-sm">
            {artist.category}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="font-display font-bold text-white text-sm leading-tight">{artist.name}</p>
          {artist.genre && <p className="text-white/60 text-xs mt-0.5 truncate">{artist.genre}</p>}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="h-3 w-3 text-primary" />
            <span className="text-xs text-muted-foreground">{(artist.voteCount / 1000).toFixed(1)}k votes</span>
          </div>
          <div className="text-xs text-muted-foreground">{artist.nationality}</div>
        </div>
        <div className="text-xs text-muted-foreground mb-2.5">
          From <span className="font-bold text-foreground">{displayFee}</span>
        </div>
        <button
          type="button"
          className="w-full py-1.5 rounded-lg text-xs font-bold bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all"
        >
          Book Artist
        </button>
      </div>
    </div>
  );
}

// ── Luxury service card ───────────────────────────────────────────────────────
function LuxuryCard({ service }: { service: typeof MOCK_LUXURY_SERVICES[0] }) {
  const { currency } = useCurrency();
  const priceInUnit = service.fromPrice / 100;
  const rate = currency === "USD" ? 0.012 : currency === "EUR" ? 0.011 : currency === "AED" ? 0.044 : currency === "GBP" ? 0.0095 : 1;
  const displayPrice = formatPrice(priceInUnit * rate, currency);

  const ICON_COMPONENTS: Record<string, React.ReactNode> = {
    "✈️": <Plane className="h-8 w-8" />,
    "🚗": <Car className="h-8 w-8" />,
    "🏨": <Hotel className="h-8 w-8" />,
    "🛥️": <Anchor className="h-8 w-8" />,
    "👑": <Crown className="h-8 w-8" />,
    "💎": <Gem className="h-8 w-8" />,
  };

  const CARD_COLORS = [
    "from-blue-900/50 to-cyan-900/30 border-blue-500/20",
    "from-purple-900/50 to-indigo-900/30 border-purple-500/20",
    "from-amber-900/50 to-orange-900/30 border-amber-500/20",
    "from-teal-900/50 to-green-900/30 border-teal-500/20",
    "from-fuchsia-900/50 to-pink-900/30 border-fuchsia-500/20",
    "from-rose-900/50 to-red-900/30 border-rose-500/20",
  ];
  const serviceIdx = MOCK_LUXURY_SERVICES.findIndex(s => s.id === service.id);
  const colorClass = CARD_COLORS[serviceIdx % CARD_COLORS.length];

  const ICON_COLORS = [
    "text-cyan-400", "text-purple-400", "text-amber-400",
    "text-teal-400", "text-fuchsia-400", "text-rose-400",
  ];
  const iconColor = ICON_COLORS[serviceIdx % ICON_COLORS.length];

  return (
    <div className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${colorClass} border group hover:scale-[1.02] transition-all duration-200 cursor-pointer`}>
      <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 ${iconColor} group-hover:scale-110 transition-transform`}>
        {ICON_COMPONENTS[service.icon] ?? <Sparkles className="h-8 w-8" />}
      </div>
      <h3 className="font-display font-bold text-foreground text-base mb-1">{service.name}</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{service.description}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.15em]">From</p>
          <p className="text-sm font-extrabold text-foreground">{displayPrice}</p>
        </div>
        <button
          type="button"
          className={`px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all`}
        >
          Enquire
        </button>
      </div>
    </div>
  );
}

// ── Voting Section ────────────────────────────────────────────────────────────
function VotingSection() {
  const [activeTab, setActiveTab] = useState<"global" | "india">("global");
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEMO_EVENTS.forEach(e => { if (e.voteCount) initial[e.id] = e.voteCount; });
    MOCK_ARTISTS.forEach(a => { initial[a.id] = a.voteCount; });
    return initial;
  });
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const globalItems = DEMO_EVENTS
    .filter(e => e.isGlobal100)
    .sort((a, b) => (a.globalRank ?? 99) - (b.globalRank ?? 99))
    .slice(0, 10);

  const indiaItems = DEMO_EVENTS
    .filter(e => e.isIndia100)
    .sort((a, b) => (a.indiaRank ?? 99) - (b.indiaRank ?? 99))
    .slice(0, 10);

  const items = activeTab === "global" ? globalItems : indiaItems;

  const handleVote = (id: string) => {
    if (voted.has(id)) return;
    setVotes(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setVoted(prev => new Set(prev).add(id));
  };

  const RANK_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-8 rounded-full bg-yellow-500" />
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            Live Rankings — Vote Now
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Updated in real-time · Cast your vote below</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
            activeTab === "global"
              ? "bg-primary/20 border-primary/50 text-primary"
              : "bg-transparent border-border text-muted-foreground hover:border-primary/30"
          }`}
        >
          🌍 Global
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("india")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
            activeTab === "india"
              ? "bg-green-500/20 border-green-500/50 text-green-400"
              : "bg-transparent border-border text-muted-foreground hover:border-green-500/30"
          }`}
        >
          🇮🇳 India
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {items.map((event, idx) => {
          const voteCount = votes[event.id] ?? 0;
          const hasVoted = voted.has(event.id);
          const rank = idx + 1;
          const rankColor = RANK_COLORS[idx] ?? "text-muted-foreground";

          return (
            <div
              key={event.id}
              className="flex items-center gap-4 p-4 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
            >
              {/* Rank */}
              <div className={`font-display font-extrabold text-lg w-7 text-center shrink-0 ${rankColor}`}>
                {rank <= 3 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉") : `#${rank}`}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{event.city}, {event.country}</p>
              </div>

              {/* Vote count */}
              <div className="text-xs text-muted-foreground shrink-0 text-right">
                <span className="font-bold text-foreground">{(voteCount / 1000).toFixed(1)}k</span>
                <span className="text-[10px] block">votes</span>
              </div>

              {/* Vote button */}
              <button
                type="button"
                onClick={() => handleVote(event.id)}
                disabled={hasVoted}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  hasVoted
                    ? "bg-green-500/10 border-green-500/30 text-green-400 cursor-default"
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-white cursor-pointer"
                }`}
              >
                <ThumbsUp className="h-3 w-3" />
                {hasVoted ? "Voted" : "Vote"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Marketplace component ─────────────────────────────────────────────────
export default function Marketplace({ onSelectEvent, searchQuery, categoryFilter }: MarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter ?? "all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [heroVisible, setHeroVisible] = useState(false);

  const heroRef = useRef<HTMLElement>(null);

  const { data: backendEvents = [], isLoading: eventsLoading } = useListPublishedEvents();
  const { data: platformStats } = useGetPlatformStats();

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const eventsCount = useCountUp(50000, 2200, heroVisible);
  const bookingsCount = useCountUp(2000000, 2500, heroVisible);
  const countriesCount = useCountUp(120, 1500, heroVisible);

  // Backend events are already published (listPublishedEvents only returns published ones)
  const publishedBackend = backendEvents as Event[];

  const eventPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    publishedBackend.forEach((e) => {
      map[String(e.id)] = Number(e.basePriceINR);
    });
    return map;
  }, [publishedBackend]);

  const query = localSearch || searchQuery;

  const combined: AnyEvent[] = useMemo(() => {
    const all: AnyEvent[] = [...publishedBackend, ...DEMO_EVENTS];
    let filtered = all.filter((e) => {
      const isDemo = "isDemo" in e;
      const category = isDemo ? e.category : (e as Event).eventType;
      const matchCategory = selectedCategory === "all" || category === selectedCategory;
      const locationStr = isDemo
        ? `${e.city} ${e.venue} ${e.country}`
        : (e as Event).location;
      const matchSearch =
        !query ||
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        locationStr.toLowerCase().includes(query.toLowerCase());
      return matchCategory && matchSearch;
    });

    filtered = filtered.sort((a, b) => {
      const isADemo = "isDemo" in a;
      const isBDemo = "isDemo" in b;
      if (sortBy === "date") {
        const dateA = isADemo ? Number(a.eventDate) : Number((a as Event).startDate);
        const dateB = isBDemo ? Number(b.eventDate) : Number((b as Event).startDate);
        return dateA - dateB;
      }
      if (sortBy === "price-asc" || sortBy === "price-desc") {
        const priceA = isADemo ? a.fromPrice : (eventPriceMap[String((a as Event).id)] ?? 0);
        const priceB = isBDemo ? b.fromPrice : (eventPriceMap[String((b as Event).id)] ?? 0);
        return sortBy === "price-asc" ? priceA - priceB : priceB - priceA;
      }
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [publishedBackend, selectedCategory, query, sortBy, eventPriceMap]);

  const getFromPrice = (event: AnyEvent): number => {
    if ("isDemo" in event) return event.fromPrice;
    return eventPriceMap[String((event as Event).id)] ?? 0;
  };

  const globalTop100 = DEMO_EVENTS
    .filter(e => e.isGlobal100)
    .sort((a, b) => (a.globalRank ?? 99) - (b.globalRank ?? 99));

  const india100 = DEMO_EVENTS
    .filter(e => e.isIndia100)
    .sort((a, b) => (a.indiaRank ?? 99) - (b.indiaRank ?? 99));

  const otherEvents = publishedBackend.filter((e) => {
    const matchCategory = selectedCategory === "all" || (e as Event).eventType === selectedCategory;
    const matchSearch =
      !query ||
      e.title.toLowerCase().includes(query.toLowerCase()) ||
      (e as Event).location.toLowerCase().includes(query.toLowerCase());
    return matchCategory && matchSearch;
  });

  const showSections = !query && selectedCategory === "all";

  const totalEventsDisplay = eventsLoading
    ? "..."
    : (platformStats?.totalEvents ?? BigInt(DEMO_EVENTS.length)).toString();

  return (
    <main className="min-h-screen pt-16">
      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="hero-gradient noise-bg relative py-24 md:py-36 px-4 text-center overflow-hidden"
      >
        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full bg-blue-600/6 blur-3xl pointer-events-none" style={{ animationDelay: "2s" }} />

        <div className={`relative z-10 max-w-5xl mx-auto transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            World's Fastest Booking Platform
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold leading-[0.88] tracking-tight mb-6">
            <span className="block text-[clamp(3.5rem,11vw,7.5rem)] text-foreground hero-headline-book">
              BOOK
            </span>
            <span className="block text-[clamp(3.5rem,11vw,7.5rem)] hero-headline-now">
              NOW
            </span>
          </h1>

          <p className="text-foreground/80 text-base sm:text-xl mb-2 font-medium tracking-wide max-w-2xl mx-auto">
            2-Minute Guaranteed Seat Lock · Secure Escrow Payments · Global Events
          </p>
          <div className="mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.25em] uppercase text-primary/70 border border-primary/20 rounded-full px-4 py-1.5 bg-primary/5 backdrop-blur-sm">
              by DMT CREATOLOGY
            </span>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events, artists, venues, cities..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm transition-all"
              />
            </div>
            <button
              type="button"
              className="btn-glow bg-primary px-8 py-4 rounded-xl font-bold text-white text-sm shrink-0 whitespace-nowrap flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Search
            </button>
          </div>

          {/* Live stats */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { icon: <TicketIcon className="h-3.5 w-3.5" />, label: `${eventsCount.toLocaleString()}+`, sublabel: "Active Events" },
              { icon: <Users className="h-3.5 w-3.5" />, label: `${(bookingsCount / 1000000).toFixed(1)}M+`, sublabel: "Bookings Made" },
              { icon: <Globe className="h-3.5 w-3.5" />, label: `${countriesCount}+`, sublabel: "Countries" },
            ].map((stat) => (
              <div
                key={stat.sublabel}
                className="flex items-center gap-2 text-sm font-medium text-foreground/70 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 backdrop-blur-sm"
              >
                <span className="text-primary">{stat.icon}</span>
                <span className="font-bold text-foreground">{stat.label}</span>
                <span>{stat.sublabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-overlay opacity-25 pointer-events-none" />
      </section>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Category chips */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`filter-chip flex items-center gap-1.5 px-4 py-2 rounded-full text-xs border ${
                  selectedCategory === cat.value
                    ? "filter-chip-active"
                    : "filter-chip-inactive border-border"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort + count row */}
          {(query || selectedCategory !== "all") && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{combined.length}</span> event{combined.length !== 1 ? "s" : ""} found
                {query && <span> for "<span className="text-primary">{query}</span>"</span>}
              </p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg px-3 pr-8 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/60 cursor-pointer"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-card">
                      Sort: {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }, (_, i) => `skel-${i}`).map((sk) => (
              <CardSkeleton key={sk} />
            ))}
          </div>
        ) : !showSections ? (
          /* Search / filter results — flat grid */
          combined.length === 0 ? (
            <div className="text-center py-32">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">No events found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                Try adjusting your search or category filter to discover amazing events.
              </p>
              <button
                type="button"
                onClick={() => { setSelectedCategory("all"); setLocalSearch(""); }}
                className="text-primary text-sm hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1.5 mx-auto"
              >
                Clear all filters →
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 rounded-full bg-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  {selectedCategory !== "all"
                    ? `${CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? selectedCategory} Events`
                    : "All Events"}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {combined.map((event, i) => (
                  <div key={event.id} className="page-enter" style={{ animationDelay: `${i * 0.04}s`, opacity: 0, animationFillMode: "forwards" }}>
                    <EventCard event={event} onBook={onSelectEvent} fromPrice={getFromPrice(event)} />
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          /* Sectioned homepage layout */
          <div className="space-y-16">

            {/* ── Global Top 100 ── */}
            {globalTop100.length > 0 && (
              <ScrollRow
                title={<>🌍 Global Top 100</>}
                badge={
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs text-muted-foreground">Live Rankings · Updated Daily</p>
                  </div>
                }
                accentColor="bg-primary"
              >
                {globalTop100.map((event, i) => (
                  <div key={event.id} className="shrink-0 w-72 page-enter" style={{ animationDelay: `${i * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}>
                    <div className="relative">
                      {event.globalRank && event.globalRank <= 3 && (
                        <div className="absolute -top-2 -left-1 z-10">
                          <span className="font-display font-extrabold text-lg">
                            {event.globalRank === 1 ? "🥇" : event.globalRank === 2 ? "🥈" : "🥉"}
                          </span>
                        </div>
                      )}
                      {event.globalRank && event.globalRank > 3 && (
                        <div className="absolute -top-1 -left-1 z-10">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/80 border border-primary/50 text-[10px] font-bold text-primary">
                            #{event.globalRank}
                          </span>
                        </div>
                      )}
                      <EventCard event={event} onBook={onSelectEvent} fromPrice={getFromPrice(event)} />
                    </div>
                  </div>
                ))}
              </ScrollRow>
            )}

            {/* ── India Top 100 ── */}
            {india100.length > 0 && (
              <ScrollRow
                title={<>🇮🇳 India Top 100</>}
                badge={
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <p className="text-xs text-muted-foreground">Best events across India</p>
                  </div>
                }
                accentColor="bg-green-500"
              >
                {india100.map((event, i) => (
                  <div key={event.id} className="shrink-0 w-72 page-enter" style={{ animationDelay: `${i * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}>
                    <div className="relative">
                      {event.indiaRank && event.indiaRank <= 3 && (
                        <div className="absolute -top-2 -left-1 z-10">
                          <span className="font-display font-extrabold text-lg">
                            {event.indiaRank === 1 ? "🥇" : event.indiaRank === 2 ? "🥈" : "🥉"}
                          </span>
                        </div>
                      )}
                      {event.indiaRank && event.indiaRank > 3 && (
                        <div className="absolute -top-1 -left-1 z-10">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/80 border border-green-500/50 text-[10px] font-bold text-green-400">
                            #{event.indiaRank}
                          </span>
                        </div>
                      )}
                      <EventCard event={event} onBook={onSelectEvent} fromPrice={getFromPrice(event)} />
                    </div>
                  </div>
                ))}
              </ScrollRow>
            )}

            {/* ── Live Voting ── */}
            <VotingSection />

            {/* ── Luxury Services ── */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 rounded-full bg-amber-500" />
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-400" />
                    Luxury Experiences
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Curated by DMT CREATOLOGY · Premium worldwide services</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_LUXURY_SERVICES.map((service) => (
                  <LuxuryCard key={service.id} service={service} />
                ))}
              </div>
            </div>

            {/* ── Top Artists ── */}
            <ScrollRow
              title="Top Artists & DJs"
              badge={
                <p className="text-xs text-muted-foreground mt-0.5">Book direct · AI concierge assisted</p>
              }
              accentColor="bg-fuchsia-500"
            >
              {MOCK_ARTISTS.map((artist, i) => (
                <div key={artist.id} className="page-enter" style={{ animationDelay: `${i * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}>
                  <ArtistCard artist={artist} />
                </div>
              ))}
            </ScrollRow>

            {/* ── More Events ── */}
            {otherEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 rounded-full bg-accent" />
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">More Events</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{otherEvents.length} live event{otherEvents.length !== 1 ? "s" : ""} on platform</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {otherEvents.map((event, i) => (
                    <div key={event.id} className="page-enter" style={{ animationDelay: `${i * 0.05}s`, opacity: 0, animationFillMode: "forwards" }}>
                      <EventCard event={event} onBook={onSelectEvent} fromPrice={getFromPrice(event)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 mt-16">
        {/* Main footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-display font-extrabold text-xl">
                  <span className="text-foreground">BOOK</span>
                  <span className="hero-headline-now ml-1">NOW</span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase mb-3">by DMT CREATOLOGY</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                World's fastest event booking platform. Secure escrow payments. Global events.
              </p>
            </div>

            {/* Events */}
            <div>
              <h4 className="font-display font-bold text-foreground text-sm mb-3">Events</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {["Music Festivals", "DJ Events", "Celebrities", "Sports Events", "Private Events"].map(l => (
                  <li key={l}><span className="hover:text-primary transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-display font-bold text-foreground text-sm mb-3">Luxury Services</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {["Private Jets", "Luxury Cars", "5-Star Hotels", "Yacht Charter", "VIP Packages"].map(l => (
                  <li key={l}><span className="hover:text-primary transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display font-bold text-foreground text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {["About DMT CREATOLOGY", "Contact Us", "Privacy Policy", "Terms of Service", "Vendor Portal"].map(l => (
                  <li key={l}><span className="hover:text-primary transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30 py-4">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>© 2026 DMT CREATOLOGY. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span>⚡</span>
                Powered by Internet Computer (ICP)
              </span>
              <span>·</span>
              <span>
                Built with{" "}
                <Heart className="h-3 w-3 text-red-400 inline" />{" "}
                using{" "}
                <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  caffeine.ai
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
