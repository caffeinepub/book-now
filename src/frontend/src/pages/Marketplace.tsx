import { useState, useMemo } from "react";
import { useGetAllEvents, useGetAllTickets } from "@/hooks/useQueries";
import EventCard, { AnyEvent } from "@/components/EventCard";
import { DEMO_EVENTS } from "@/utils/mockData";
import { Event, EventCategory, EventStatus, Ticket } from "@/backend";
import { Search, Globe, Ticket as TicketIcon, Users, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketplaceProps {
  onSelectEvent: (event: AnyEvent) => void;
  searchQuery: string;
  categoryFilter?: string;
}

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Concert", value: "concert" },
  { label: "Sports", value: "sports" },
  { label: "Conference", value: "conference" },
  { label: "Workshop", value: "workshop" },
  { label: "Private", value: "privateEvent" },
];

const SORT_OPTIONS = [
  { label: "Date", value: "date" },
  { label: "Price", value: "price" },
  { label: "Name", value: "name" },
];

export default function Marketplace({ onSelectEvent, searchQuery, categoryFilter }: MarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter ?? "all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const { data: backendEvents = [], isLoading: eventsLoading } = useGetAllEvents();
  const { data: allTickets = [] } = useGetAllTickets();

  // Build price map per event
  const eventPriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    (allTickets as Ticket[]).forEach((t) => {
      const price = Number(t.price) / 100;
      if (!(t.eventId in map) || price < map[t.eventId]) {
        map[t.eventId] = price;
      }
    });
    return map;
  }, [allTickets]);

  const publishedBackend = (backendEvents as Event[]).filter(
    (e) => e.status === EventStatus.published
  );

  const query = localSearch || searchQuery;

  const combined: AnyEvent[] = useMemo(() => {
    const all: AnyEvent[] = [...publishedBackend, ...DEMO_EVENTS];

    let filtered = all.filter((e) => {
      const matchCategory =
        selectedCategory === "all" || e.category === selectedCategory;
      const matchSearch =
        !query ||
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.city.toLowerCase().includes(query.toLowerCase()) ||
        e.venue.toLowerCase().includes(query.toLowerCase());
      return matchCategory && matchSearch;
    });

    filtered = filtered.sort((a, b) => {
      if (sortBy === "date") {
        return Number(a.eventDate) - Number(b.eventDate);
      }
      if (sortBy === "price") {
        const priceA = "isDemo" in a ? a.fromPrice : (eventPriceMap[a.id] ?? 0);
        const priceB = "isDemo" in b ? b.fromPrice : (eventPriceMap[b.id] ?? 0);
        return priceA - priceB;
      }
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [publishedBackend, selectedCategory, query, sortBy, eventPriceMap]);

  const getFromPrice = (event: AnyEvent) => {
    if ("isDemo" in event) return event.fromPrice;
    return eventPriceMap[event.id] ?? 0;
  };

  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="hero-gradient noise-bg relative py-24 px-4 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Animated headline */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            World's Fastest Booking Platform
          </div>

          <h1 className="font-display font-extrabold leading-[0.92] tracking-tight mb-6">
            <span className="block text-[clamp(4rem,12vw,8rem)] text-foreground hero-headline-book">
              BOOK
            </span>
            <span className="block text-[clamp(4rem,12vw,8rem)] hero-headline-now">
              NOW
            </span>
          </h1>

          <p className="text-foreground/80 text-lg sm:text-xl mb-1 font-medium tracking-wide">
            2-Minute Guaranteed Seat Lock · Secure Payments · Global Events
          </p>
          <p className="mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] uppercase text-primary/70 border border-primary/20 rounded-full px-3 py-1 bg-primary/5">
              by DMT CREATOLOGY
            </span>
          </p>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events, artists, venues..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 text-sm transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 pr-10 py-4 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-all min-w-36 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-card">
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <button
              type="button"
              className="btn-glow bg-primary px-8 py-4 rounded-xl font-bold text-white text-sm shrink-0"
            >
              Search
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 flex items-center justify-center gap-3 mt-10 flex-wrap">
          {[
            { icon: <TicketIcon className="h-3.5 w-3.5" />, label: "10,000+ Events" },
            { icon: <Users className="h-3.5 w-3.5" />, label: "5M+ Tickets Sold" },
            { icon: <Globe className="h-3.5 w-3.5" />, label: "150+ Countries" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 text-sm font-medium text-foreground/70 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 backdrop-blur-sm"
            >
              <span className="text-primary">{stat.icon}</span>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-overlay opacity-30" />
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {selectedCategory === "all" ? "All Events" : CATEGORIES.find((c) => c.value === selectedCategory)?.label + " Events"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {combined.length} event{combined.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category chips */}
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`filter-chip px-3.5 py-1.5 rounded-full text-xs border ${
                    selectedCategory === cat.value
                      ? "filter-chip-active"
                      : "filter-chip-inactive border-border"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
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
        </div>

        {/* Grid */}
        {eventsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }, (_, i) => `skel-${i}`).map((sk) => (
              <div key={sk} className="glass-card rounded-xl overflow-hidden">
                <Skeleton className="h-44 w-full bg-secondary/40" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4 bg-secondary/40" />
                  <Skeleton className="h-3 w-1/2 bg-secondary/40" />
                  <Skeleton className="h-3 w-2/3 bg-secondary/40" />
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-16 bg-secondary/40" />
                    <Skeleton className="h-8 w-24 bg-secondary/40 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : combined.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">No events found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or category filter
            </p>
            <button
              type="button"
              onClick={() => { setSelectedCategory("all"); setLocalSearch(""); }}
              className="mt-4 text-primary text-sm hover:underline bg-transparent border-none cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {combined.map((event, i) => (
              <div
                key={event.id}
                className="page-enter"
                style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}
              >
                <EventCard
                  event={event}
                  onBook={onSelectEvent}
                  fromPrice={getFromPrice(event)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026. Built with{" "}
            <span className="text-red-400">♥</span>{" "}
            using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
