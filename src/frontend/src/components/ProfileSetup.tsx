import { useState } from "react";
import { useSaveCallerUserProfile, useCreateVendorProfile } from "@/hooks/useQueries";
import { AppUserRole, UserStatus } from "@/backend";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { generateId, toICPTimestamp } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, User, Store, Loader2, ShieldCheck } from "lucide-react";

const ADMIN_SECRET_CODE = "BOOKNOW-ADMIN-2024";

interface ProfileSetupProps {
  onComplete: () => void;
}

type SetupStep = "name" | "role" | "vendor-name" | "admin-code";

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState<SetupStep>("name");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppUserRole>(AppUserRole.customer);
  const [businessName, setBusinessName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { identity } = useInternetIdentity();
  const saveProfile = useSaveCallerUserProfile();
  const createVendor = useCreateVendorProfile();

  const handleNameNext = () => {
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setStep("role");
  };

  const handleRoleSelect = async (role: AppUserRole) => {
    setSelectedRole(role);
    if (role === AppUserRole.vendor) {
      setStep("vendor-name");
    } else if (role === AppUserRole.superAdmin) {
      setStep("admin-code");
    } else {
      await submitProfile(role, "");
    }
  };

  const handleAdminCodeSubmit = async () => {
    if (adminCode.trim() !== ADMIN_SECRET_CODE) {
      toast.error("Invalid admin access code.");
      return;
    }
    await submitProfile(AppUserRole.superAdmin, "");
  };

  const handleVendorSubmit = async () => {
    if (!businessName.trim()) {
      toast.error("Please enter your business name.");
      return;
    }
    await submitProfile(AppUserRole.vendor, businessName);
  };

  const submitProfile = async (role: AppUserRole, bizName: string) => {
    if (!identity) return;
    setIsSubmitting(true);
    try {
      const userId = identity.getPrincipal().toString();
      await saveProfile.mutateAsync({
        id: userId,
        name: name.trim(),
        email: "",
        appRole: role,
        status: UserStatus.active,
        createdAt: toICPTimestamp(),
      });

      if (role === AppUserRole.vendor && bizName) {
        await createVendor.mutateAsync(bizName.trim());
      }

      toast.success("Profile created successfully!");
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
        <div className="flex items-center gap-2 justify-center">
          <Zap className="h-6 w-6 text-primary fill-current" />
          <span className="font-display text-2xl font-bold text-primary">BOOK NOW</span>
        </div>

        {step === "name" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">Welcome aboard!</h2>
              <p className="text-sm text-muted-foreground mt-1">Let's set up your profile</p>
            </div>
            <div className="space-y-3">
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
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">How will you use BOOK NOW?</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose your account type</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect(AppUserRole.customer)}
                disabled={isSubmitting}
                className={`p-5 rounded-xl border transition-all cursor-pointer bg-transparent text-left space-y-2 ${
                  selectedRole === AppUserRole.customer
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-secondary/30"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Customer</p>
                  <p className="text-xs text-muted-foreground">Browse and book events</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect(AppUserRole.vendor)}
                disabled={isSubmitting}
                className={`p-5 rounded-xl border transition-all cursor-pointer bg-transparent text-left space-y-2 ${
                  selectedRole === AppUserRole.vendor
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-secondary/30"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/20 flex items-center justify-center">
                  <Store className="h-5 w-5 text-[#a78bfa]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Vendor</p>
                  <p className="text-xs text-muted-foreground">Create and sell tickets</p>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleRoleSelect(AppUserRole.superAdmin)}
              disabled={isSubmitting}
              className="w-full p-4 rounded-xl border border-border hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer bg-transparent text-left flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Super Admin</p>
                <p className="text-xs text-muted-foreground">Platform administration (requires access code)</p>
              </div>
            </button>
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
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="h-6 w-6 text-red-400" />
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
                className="bg-secondary/50 border-border focus:border-red-500/60 h-11"
                onKeyDown={(e) => e.key === "Enter" && handleAdminCodeSubmit()}
                autoFocus
              />
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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

        {step === "vendor-name" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">Business Details</h2>
              <p className="text-sm text-muted-foreground mt-1">Tell us about your business</p>
            </div>
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground block">Business Name *</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Sound Wave Productions"
                className="bg-secondary/50 border-border focus:border-primary/60 h-11"
                onKeyDown={(e) => e.key === "Enter" && handleVendorSubmit()}
                autoFocus
              />
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
                onClick={handleVendorSubmit}
                disabled={isSubmitting || !businessName.trim()}
                className="flex-1 btn-glow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
