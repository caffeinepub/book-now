import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "@/hooks/useQueries";
import { AppUserRole, UserProfile } from "@/types";
import Navbar from "@/components/Navbar";
import ProfileSetup from "@/components/ProfileSetup";
import Marketplace from "@/pages/Marketplace";
import EventDetail from "@/pages/EventDetail";
import BookingFlow from "@/pages/BookingFlow";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import CustomerDashboard from "@/pages/CustomerDashboard";
import VendorDashboard from "@/pages/VendorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import { AnyEvent } from "@/components/EventCard";
import { MockEvent } from "@/utils/mockData";

// ─── Simple view-based routing ──────────────────────────────────────────────
function getInitialView(): string {
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") return "payment-success";
  if (params.get("payment") === "cancelled") return "payment-failure";
  const path = window.location.pathname;
  if (path === "/payment-success") return "payment-success";
  if (path === "/payment-failure") return "payment-failure";
  return "home";
}

// Derive ticket stub from event for BookingFlow
type TicketStub = {
  id: string;
  name: string;
  ticketType: string;
  price: bigint;
  availableQuantity: bigint;
  totalQuantity: bigint;
  baseCurrency: string;
  eventId: string;
};

export default function App() {
  const [view, setView] = useState<string>(getInitialView());
  const [selectedEvent, setSelectedEvent] = useState<AnyEvent | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketStub | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
    refetch: refetchProfile,
  } = useGetCallerUserProfile();

  // Handle payment return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      setView("payment-success");
    } else if (payment === "cancelled") {
      setView("payment-failure");
    }
  }, []);

  const showProfileSetup =
    isAuthenticated &&
    !isInitializing &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  const navigate = (newView: string) => {
    setView(newView);
    if (newView !== "payment-success" && newView !== "payment-failure") {
      window.history.pushState({}, "", "/");
    }
  };

  const handleSelectEvent = (event: AnyEvent) => {
    setSelectedEvent(event);
    setView("event-detail");
  };

  const handleBookTicket = (event: AnyEvent, ticket: TicketStub | null, qty: number) => {
    setSelectedEvent(event);
    setSelectedTicket(ticket);
    setSelectedQuantity(qty);
    setView("booking-flow");
  };

  const handleProfileSetupComplete = () => {
    refetchProfile();
  };

  const getDashboardView = (): string => {
    if (!userProfile) return "customer-dashboard";
    if (
      userProfile.appRole === AppUserRole.superAdmin ||
      userProfile.appRole === AppUserRole.admin
    ) return "admin-dashboard";
    if (userProfile.appRole === AppUserRole.vendor) return "vendor-dashboard";
    return "customer-dashboard";
  };

  const isDemo = (e: AnyEvent): e is MockEvent => "isDemo" in e && (e as MockEvent).isDemo === true;

  const isAdmin =
    userProfile?.appRole === AppUserRole.superAdmin ||
    userProfile?.appRole === AppUserRole.admin;

  // ── Loading splash ──────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,102,255,0.4)] animate-pulse">
              <svg className="h-7 w-7 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-label="Loading">
                <title>Loading</title>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="font-display font-bold text-foreground text-lg">BOOK NOW</p>
            <p className="text-muted-foreground text-xs mt-1">by DMT CREATOLOGY</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.14 0.018 265)",
            border: "1px solid oklch(0.22 0.04 255)",
            color: "oklch(0.97 0 0)",
          },
        }}
      />

      {/* Profile Setup Modal */}
      {showProfileSetup && (
        <ProfileSetup onComplete={handleProfileSetupComplete} />
      )}

      {/* Navbar */}
      {view !== "payment-success" && view !== "payment-failure" && (
        <Navbar
          currentView={view}
          onNavigate={navigate}
          userProfile={userProfile as UserProfile | null}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Home / Marketplace */}
      {view === "home" && (
        <Marketplace
          onSelectEvent={handleSelectEvent}
          searchQuery={searchQuery}
          categoryFilter={undefined}
        />
      )}

      {/* Event Detail */}
      {view === "event-detail" && selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onBack={() => setView("home")}
          onBook={(event, ticket, qty) => handleBookTicket(event, ticket as TicketStub | null, qty)}
          isAuthenticated={isAuthenticated}
          onLoginRequired={() => {}}
        />
      )}

      {/* Booking Flow */}
      {view === "booking-flow" && selectedEvent && selectedTicket && (
        <BookingFlow
          event={selectedEvent}
          ticket={selectedTicket as Parameters<typeof BookingFlow>[0]["ticket"]}
          quantity={selectedQuantity}
          onBack={() => setView(isDemo(selectedEvent) ? "event-detail" : "event-detail")}
          userId={identity?.getPrincipal().toString() ?? ""}
        />
      )}

      {/* Payment Success */}
      {view === "payment-success" && (
        <PaymentSuccess
          onHome={() => { navigate("home"); window.history.pushState({}, "", "/"); }}
          onBookings={() => {
            navigate(getDashboardView());
            window.history.pushState({}, "", "/");
          }}
        />
      )}

      {/* Payment Failure */}
      {view === "payment-failure" && (
        <PaymentFailure
          onHome={() => { navigate("home"); window.history.pushState({}, "", "/"); }}
        />
      )}

      {/* Customer Dashboard */}
      {view === "customer-dashboard" && isAuthenticated && userProfile && (
        <CustomerDashboard userProfile={userProfile as UserProfile} />
      )}

      {/* Vendor Dashboard */}
      {view === "vendor-dashboard" && isAuthenticated && userProfile && (
        <VendorDashboard
          userProfile={userProfile as UserProfile}
          vendorProfile={null}
        />
      )}

      {/* Admin Dashboard */}
      {view === "admin-dashboard" && isAuthenticated && isAdmin && (
        <AdminDashboard />
      )}

      {/* Access denied */}
      {view === "admin-dashboard" && isAuthenticated && userProfile && !isAdmin && (
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="text-center space-y-4 glass-card rounded-2xl p-10 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Access Denied">
                <title>Access Denied</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.929 19.071C3.732 17.874 3 16.023 3 14c0-4.418 3.582-8 8-8s8 3.582 8 8c0 2.023-.732 3.874-1.929 5.071" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have permission to access the admin area.</p>
          </div>
        </main>
      )}

      {/* Not authenticated + trying protected page */}
      {(view === "customer-dashboard" || view === "vendor-dashboard" || view === "admin-dashboard") && !isAuthenticated && (
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="text-center space-y-4 glass-card rounded-2xl p-10 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Sign In Required">
                <title>Sign In Required</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Sign In Required</h2>
            <p className="text-sm text-muted-foreground">Please sign in with Internet Identity to access your dashboard.</p>
          </div>
        </main>
      )}
    </div>
  );
}
