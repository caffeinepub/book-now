import { useState } from "react";
import { useRegisterUser } from "@/hooks/useQueries";
import { AppUserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, User, Store, Loader2, ShieldCheck, Crown } from "lucide-react";
import type { UserRole } from "@/backend.d";

const ADMIN_SECRET_CODE = "BOOKNOW-ADMIN-2024";
const SUPER_ADMIN_SECRET_CODE = "SUPERADMIN-DMT-2024";

interface ProfileSetupProps {
  onComplete: () => void;
}

type SetupStep = "name" | "role" | "admin-code";

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState<SetupStep>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppUserRole>(AppUserRole.customer);
  const [adminCode, setAdminCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerUser = useRegisterUser();

  const handleNameNext = () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setStep("role");
  };

  const handleRoleSelect = async (role: AppUserRole) => {
    setSelectedRole(role);
    if (role === AppUserRole.superAdmin || role === AppUserRole.admin) {
      setStep("admin-code");
    } else {
      await submitProfile(role);
    }
  };

  const handleAdminCodeSubmit = async () => {
    if (adminCode.trim() === SUPER_ADMIN_SECRET_CODE) {
      await submitProfile(AppUserRole.superAdmin);
    } else if (adminCode.trim() === ADMIN_SECRET_CODE) {
      await submitProfile(AppUserRole.admin);
    } else {
      toast.error("Invalid admin access code.");
    }
  };

  const submitProfile = async (role: AppUserRole) => {
    setIsSubmitting(true);
    try {
      const backendRole = role as unknown as UserRole;
      await registerUser.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        role: backendRole,
      });
      toast.success("Profile created! Welcome to BOOK NOW.");
      onComplete();
    } catch {
      toast.error("Failed to create profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary fill-current" />
            <span className="font-display text-2xl font-bold text-primary">BOOK NOW</span>
          </div>
          <span className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">by DMT CREATOLOGY</span>
        </div>

        {step === "name" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">Welcome aboard!</h2>
              <p className="text-sm text-muted-foreground mt-1">Let's set up your profile</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground block">Your Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className="bg-secondary/50 border-border focus:border-primary/60 h-11"
                  onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground block">Email (optional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., alex@example.com"
                  className="bg-secondary/50 border-border focus:border-primary/60 h-11"
                  onKeyDown={(e) => e.key === "Enter" && handleNameNext()}
                />
              </div>
            </div>
            <Button
              onClick={handleNameNext}
              disabled={!name.trim()}
              className="w-full btn-glow h-11 font-bold"
            >
              Continue
            </Button>
          </div>
        )}

        {step === "role" && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">How will you use BOOK NOW?</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose your account type</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {/* Customer */}
              <button
                type="button"
                onClick={() => handleRoleSelect(AppUserRole.customer)}
                disabled={isSubmitting}
                className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer bg-transparent text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Customer</p>
                  <p className="text-xs text-muted-foreground">Browse events, book tickets, use AI concierge</p>
                </div>
              </button>

              {/* Vendor */}
              <button
                type="button"
                onClick={() => handleRoleSelect(AppUserRole.vendor)}
                disabled={isSubmitting}
                className="p-4 rounded-xl border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer bg-transparent text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Store className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Vendor / Organizer</p>
                  <p className="text-xs text-muted-foreground">Create and manage events (internal worker role)</p>
                </div>
              </button>

              {/* Admin */}
              <button
                type="button"
                onClick={() => handleRoleSelect(AppUserRole.superAdmin)}
                disabled={isSubmitting}
                className="p-4 rounded-xl border border-border hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer bg-transparent text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Super Admin</p>
                  <p className="text-xs text-muted-foreground">Master platform control (requires access code)</p>
                </div>
              </button>

              {/* Platform Admin */}
              <button
                type="button"
                onClick={() => handleRoleSelect(AppUserRole.admin)}
                disabled={isSubmitting}
                className="p-4 rounded-xl border border-border hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer bg-transparent text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Admin</p>
                  <p className="text-xs text-muted-foreground">Platform administration (requires access code)</p>
                </div>
              </button>
            </div>
            {isSubmitting && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Setting up your account…
              </div>
            )}
          </div>
        )}

        {step === "admin-code" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Admin Access</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your admin access code to continue</p>
            </div>
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground block">Admin Access Code *</Label>
              <Input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter access code"
                className="bg-secondary/50 border-border focus:border-amber-500/60 h-11"
                onKeyDown={(e) => e.key === "Enter" && handleAdminCodeSubmit()}
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground/60">
                Use <code className="text-primary/70">BOOKNOW-ADMIN-2024</code> for Admin or <code className="text-amber-400/70">SUPERADMIN-DMT-2024</code> for Super Admin
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("role")}
                className="flex-1 border-border"
              >
                Back
              </Button>
              <Button
                onClick={handleAdminCodeSubmit}
                disabled={isSubmitting || !adminCode.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Access Admin"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
