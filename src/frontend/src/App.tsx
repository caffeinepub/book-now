import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "@/hooks/useQueries";
import { AppUserRole, Ticket, UserProfile, VendorApprovalStatus } from "@/backend";
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

// Simple path-based routing
function getInitialView(): string {
  const path = window.location.pathname;
  if (path === "/payment-success") return "payment-success";
  if (path === "/payment-failure") return "payment-failure";
  return "home";
}

export default function App() {
  const [view, setView] = useState<string>(getInitialView());
  const [selectedEvent, setSelectedEvent] = useState<AnyEvent | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  // Detect payment return paths
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/payment-success") {
      setView("payment-success");
    } else if (path === "/payment-failure") {
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
    if (newView.startsWith("category-")) {
      setView("home");
      return;
    }
    setView(newView);
    // Push to history to allow /payment-success etc to work
    if (newView !== "payment-success" && newView !== "payment-failure") {
      window.history.pushState({}, "", "/");
    }
  };

  const handleSelectEvent = (event: AnyEvent) => {
    setSelectedEvent(event);
    setView("event-detail");
  };

  const handleBookTicket = (event: AnyEvent, ticket: Ticket | null, qty: number) => {
    setSelectedEvent(event);
    setSelectedTicket(ticket);
    setSelectedQuantity(qty);
    setView("booking-flow");
  };

  const handleLoginRequired = () => {
    // User needs to be authenticated
  };

  const handleProfileSetupComplete = () => {
    // Just re-render; profile will be fetched
  };

  const getDashboardView = (): string => {
    if (!userProfile) return "customer-dashboard";
    if (userProfile.appRole === AppUserRole.superAdmin) return "admin-dashboard";
    if (userProfile.appRole === AppUserRole.vendor) return "vendor-dashboard";
    return "customer-dashboard";
  };

  const isDemo = (e: AnyEvent): e is MockEvent => "isDemo" in e && e.isDemo === true;

  const getVendorProfile = (): { businessName: string; approvalStatus: VendorApprovalStatus } | null => {
    return null; // Fetched internally in VendorDashboard if needed
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-label="Loading">
              <title>Loading</title>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Loading BOOK NOW…</p>
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

      {/* Navbar — shown on all views except payment pages */}
      {view !== "payment-success" && view !== "payment-failure" && (
        <Navbar
          currentView={view}
          onNavigate={navigate}
          userProfile={userProfile as UserProfile | null}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Route: Home / Marketplace */}
      {view === "home" && (
        <Marketplace
          onSelectEvent={handleSelectEvent}
          searchQuery={searchQuery}
          categoryFilter={undefined}
        />
      )}

      {/* Route: Event Detail */}
      {view === "event-detail" && selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onBack={() => setView("home")}
          onBook={handleBookTicket}
          isAuthenticated={isAuthenticated}
          onLoginRequired={handleLoginRequired}
        />
      )}

      {/* Route: Booking Flow */}
      {view === "booking-flow" && selectedEvent && selectedTicket && (
        <BookingFlow
          event={selectedEvent}
          ticket={selectedTicket}
          quantity={selectedQuantity}
          onBack={() => setView(isDemo(selectedEvent) ? "event-detail" : "event-detail")}
          userId={identity?.getPrincipal().toString() ?? ""}
        />
      )}

      {/* Route: Payment Success */}
      {view === "payment-success" && (
        <PaymentSuccess
          onHome={() => { navigate("home"); window.history.pushState({}, "", "/"); }}
          onBookings={() => {
            navigate(getDashboardView());
            window.history.pushState({}, "", "/");
          }}
        />
      )}

      {/* Route: Payment Failure */}
      {view === "payment-failure" && (
        <PaymentFailure
          onHome={() => { navigate("home"); window.history.pushState({}, "", "/"); }}
        />
      )}

      {/* Route: Customer Dashboard */}
      {view === "customer-dashboard" && isAuthenticated && userProfile && (
        <CustomerDashboard userProfile={userProfile as UserProfile} />
      )}

      {/* Route: Vendor Dashboard */}
      {view === "vendor-dashboard" && isAuthenticated && userProfile && (
        <VendorDashboard
          userProfile={userProfile as UserProfile}
          vendorProfile={getVendorProfile()}
        />
      )}

      {/* Route: Admin Dashboard */}
      {view === "admin-dashboard" && isAuthenticated && userProfile?.appRole === AppUserRole.superAdmin && (
        <AdminDashboard />
      )}

      {/* Access denied */}
      {view === "admin-dashboard" && isAuthenticated && userProfile && userProfile.appRole !== AppUserRole.superAdmin && (
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="text-center space-y-4 glass-card rounded-2xl p-10 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Access Denied">
                <title>Access Denied</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.929 19.071C3.732 17.874 3 16.023 3 14c0-4.418 3.582-8 8-8s8 3.582 8 8c0 2.023-.732 3.874-1.929 5.071" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have permission to access this area.</p>
          </div>
        </main>
      )}

      {/* Not authenticated + trying to access protected */}
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
            <p className="text-sm text-muted-foreground">Please sign in to access your dashboard.</p>
          </div>
        </main>
      )}
    </div>
  );
}
