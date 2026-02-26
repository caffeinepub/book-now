import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { UserProfile, AppUserRole } from "@/backend";
import {
  Zap,
  Search,
  Menu,
  X,
  ChevronDown,
  User,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
} from "lucide-react";
import CurrencySelector from "@/components/CurrencySelector";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userProfile: UserProfile | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const CATEGORIES = [
  { label: "Concerts", value: "concert" },
  { label: "Sports", value: "sports" },
  { label: "Conferences", value: "conference" },
  { label: "Workshops", value: "workshop" },
  { label: "Private Events", value: "privateEvent" },
];

export default function Navbar({
  currentView: _currentView,
  onNavigate,
  userProfile,
  searchQuery,
  onSearchChange,
}: NavbarProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      qc.clear();
      onNavigate("home");
    } else {
      try {
        await login();
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const getDashboardLabel = () => {
    if (!userProfile) return "Dashboard";
    if (userProfile.appRole === AppUserRole.superAdmin) return "Admin Dashboard";
    if (userProfile.appRole === AppUserRole.vendor) return "Vendor Dashboard";
    return "My Bookings";
  };

  const getDashboardView = () => {
    if (!userProfile) return "customer-dashboard";
    if (userProfile.appRole === AppUserRole.superAdmin) return "admin-dashboard";
    if (userProfile.appRole === AppUserRole.vendor) return "vendor-dashboard";
    return "customer-dashboard";
  };

  const getDashboardIcon = () => {
    if (!userProfile) return <LayoutDashboard className="h-4 w-4" />;
    if (userProfile.appRole === AppUserRole.superAdmin) return <ShieldCheck className="h-4 w-4" />;
    if (userProfile.appRole === AppUserRole.vendor) return <Store className="h-4 w-4" />;
    return <LayoutDashboard className="h-4 w-4" />;
  };

  const initials = userProfile?.name
    ? userProfile.name.slice(0, 2).toUpperCase()
    : "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex flex-col items-start group cursor-pointer bg-transparent border-none p-0"
          >
            <div className="flex items-center gap-1.5">
              <Zap
                className="h-5 w-5 text-primary fill-current drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              />
              <span className="font-display text-[1.15rem] font-extrabold tracking-[-0.03em] leading-none">
                <span className="text-foreground">BOOK</span>
                <span
                  className="ml-1"
                  style={{
                    background: "linear-gradient(130deg,#3b82f6,#06b6d4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))",
                  }}
                >
                  NOW
                </span>
              </span>
            </div>
            <span className="text-[8px] text-muted-foreground/60 font-body tracking-[0.18em] uppercase -mt-0.5 pl-[26px]">
              by DMT CREATOLOGY
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
            >
              Events
            </button>

            {/* Categories Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCatOpen(!catOpen)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
              >
                Categories
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`}
                />
              </button>
              {catOpen && (
                <div
                  role="menu"
                  className="absolute top-full mt-2 left-0 w-48 rounded-lg border border-border bg-popover shadow-xl z-50 py-1"
                  onMouseLeave={() => setCatOpen(false)}
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        onNavigate(`category-${cat.value}`);
                        setCatOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors bg-transparent border-none cursor-pointer"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events, artists, venues..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-secondary/80 transition-all"
              />
            </div>
          </div>

          {/* Auth / User */}
          <div className="hidden md:flex items-center gap-3">
            <CurrencySelector />
            {isAuthenticated && userProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-border hover:border-primary/40 hover:bg-secondary/50 transition-all group bg-transparent cursor-pointer"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground max-w-24 truncate">
                      {userProfile.name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-popover border-border">
                  <DropdownMenuItem
                    onClick={() => onNavigate(getDashboardView())}
                    className="gap-2 cursor-pointer"
                  >
                    {getDashboardIcon()}
                    {getDashboardLabel()}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNavigate("profile")}
                    className="gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleAuth}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleAuth}
                disabled={isLoggingIn}
                className="btn-glow text-sm font-semibold"
                size="sm"
              >
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-background/95 border-b border-border px-4 pb-4 pt-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => { onNavigate("home"); setMenuOpen(false); }}
              className="text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded-lg transition-colors bg-transparent border-none cursor-pointer w-full"
            >
              All Events
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => { onNavigate(`category-${cat.value}`); setMenuOpen(false); }}
                className="text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded-lg transition-colors bg-transparent border-none cursor-pointer w-full"
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-1.5 px-1">Currency</p>
            <CurrencySelector className="w-full" />
          </div>
          {isAuthenticated && userProfile ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => { onNavigate(getDashboardView()); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/20 rounded-lg transition-colors bg-transparent border-none cursor-pointer w-full"
              >
                {getDashboardIcon()}
                {getDashboardLabel()}
              </button>
              <button
                type="button"
                onClick={() => { void handleAuth(); setMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors bg-transparent border-none cursor-pointer w-full"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <Button
              onClick={handleAuth}
              disabled={isLoggingIn}
              className="w-full btn-glow"
              size="sm"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
