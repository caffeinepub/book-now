import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type {
  User,
  Event,
  Booking,
  EscrowPayout,
  AuditLog,
  FraudLog,
  AIItineraryLog,
  PreloadedEventProfile,
  VotingEntry,
  ExchangeRates,
  ShoppingItem,
  StripeConfiguration,
} from "../backend.d";
import type { UserRole, EventType, TicketType } from "../backend.d";
import type { backendInterface } from "../backend.d";
import { AppUserRole, UserProfile } from "../types";

// Helper to cast actor to full backend interface
function toBackend(actor: unknown): backendInterface {
  return actor as unknown as backendInterface;
}

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const user = await toBackend(actor).getCallerUserProfile();
      if (!user) return null;
      return mapUserToProfile(user);
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

function mapUserToProfile(user: User): UserProfile {
  const roleMap: Record<string, AppUserRole> = {
    customer: AppUserRole.customer,
    vendor: AppUserRole.vendor,
    admin: AppUserRole.superAdmin,
    superAdmin: AppUserRole.superAdmin,
  };
  return {
    id: user.principal.toString(),
    name: user.name,
    email: user.email,
    appRole: roleMap[user.role] ?? AppUserRole.customer,
    status: "active" as AppUserRole,
    createdAt: user.createdAt,
  };
}

export function useRegisterUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, email, role }: { name: string; email: string; role: UserRole }) => {
      if (!actor) throw new Error("Actor not available");
      await toBackend(actor).registerUser(name, email, role);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      if (!actor) throw new Error("Actor not available");
      await toBackend(actor).saveCallerUserProfile(name, email);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function useListPublishedEvents(
  eventType: EventType | null = null,
  location: string | null = null,
  minPrice: bigint | null = null,
  maxPrice: bigint | null = null,
  isTop100Global: boolean | null = null,
  isTop100India: boolean | null = null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<Event[]>({
    queryKey: ["publishedEvents", String(eventType), String(location), String(minPrice), String(maxPrice), String(isTop100Global), String(isTop100India)],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listPublishedEvents(eventType, location, minPrice, maxPrice, isTop100Global, isTop100India);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEvent(eventId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Event | null>({
    queryKey: ["event", String(eventId)],
    queryFn: async () => {
      if (!actor || !eventId) return null;
      return toBackend(actor).getEvent(eventId);
    },
    enabled: !!actor && !isFetching && !!eventId,
  });
}

export function useCreateEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      description: string;
      eventType: EventType;
      location: string;
      startDate: bigint;
      endDate: bigint;
      basePriceINR: bigint;
      supportedCurrencies: string[];
      multiCurrencyEnabled: boolean;
      totalSeats: bigint;
      ticketType: TicketType;
      bannerUrl: string;
      promoVideoUrl: string;
      tags: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).createEvent(
        args.title, args.description, args.eventType, args.location,
        args.startDate, args.endDate, args.basePriceINR, args.supportedCurrencies,
        args.multiCurrencyEnabled, args.totalSeats, args.ticketType,
        args.bannerUrl, args.promoVideoUrl, args.tags
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publishedEvents"] });
    },
  });
}

export function useUpdateEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      eventId: bigint;
      title: string;
      description: string;
      location: string;
      basePriceINR: bigint;
      bannerUrl: string;
      promoVideoUrl: string;
      tags: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).updateEvent(
        args.eventId, args.title, args.description, args.location,
        args.basePriceINR, args.bannerUrl, args.promoVideoUrl, args.tags
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publishedEvents"] });
    },
  });
}

export function useDeleteEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).deleteEvent(eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publishedEvents"] });
    },
  });
}

export function usePublishEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).publishEvent(eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publishedEvents"] });
    },
  });
}

export function useUnpublishEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).unpublishEvent(eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publishedEvents"] });
    },
  });
}

export function useSetEventTop100() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      eventId: bigint;
      isTop100Global: boolean;
      isTop100India: boolean;
      globalRank: bigint | null;
      indiaRank: bigint | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).setEventTop100(args.eventId, args.isTop100Global, args.isTop100India, args.globalRank, args.indiaRank);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["publishedEvents"] });
    },
  });
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export function useListMyBookings() {
  const { actor, isFetching } = useActor();
  return useQuery<Booking[]>({
    queryKey: ["myBookings"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listMyBookings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListAllBookings() {
  const { actor, isFetching } = useActor();
  return useQuery<Booking[]>({
    queryKey: ["allBookings"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listAllBookings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useLockSeat() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ eventId, seatNumber }: { eventId: bigint; seatNumber: string | null }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).lockSeat(eventId, seatNumber);
    },
  });
}

export function useCreateBooking() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, seatLockId, quantity, currency }: {
      eventId: bigint;
      seatLockId: bigint;
      quantity: bigint;
      currency: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).createBooking(eventId, seatLockId, quantity, currency);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}

export function useConfirmBooking() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, stripeSessionId }: { bookingId: bigint; stripeSessionId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).confirmBooking(bookingId, stripeSessionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}

export function useCancelBooking() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).cancelBooking(bookingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}

// ─── Checkout / Stripe ────────────────────────────────────────────────────────

export function useCreateCheckoutSession() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ items, successUrl, cancelUrl }: {
      items: ShoppingItem[];
      successUrl: string;
      cancelUrl: string;
    }): Promise<string> => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).createCheckoutSession(items, successUrl, cancelUrl);
    },
  });
}

export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return toBackend(actor).isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetStripeConfiguration() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).setStripeConfiguration(config);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripeConfigured"] });
    },
  });
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export function useGetPlatformStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["platformStats"],
    queryFn: async () => {
      if (!actor) return null;
      return toBackend(actor).getPlatformStats();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetVendorStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["vendorStats"],
    queryFn: async () => {
      if (!actor) return null;
      return toBackend(actor).getVendorStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveVendor() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: import("@icp-sdk/core/principal").Principal) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).approveVendor(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });
}

export function useListFraudLogs() {
  const { actor, isFetching } = useActor();
  return useQuery<FraudLog[]>({
    queryKey: ["fraudLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listFraudLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReviewFraudFlag() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fraudLogId, clearFlag }: { fraudLogId: bigint; clearFlag: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).reviewFraudFlag(fraudLogId, clearFlag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraudLogs"] });
    },
  });
}

export function useListEscrowPayouts() {
  const { actor, isFetching } = useActor();
  return useQuery<EscrowPayout[]>({
    queryKey: ["escrowPayouts"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listEscrowPayouts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReleaseEscrowPayout() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payoutId, adminNote }: { payoutId: bigint; adminNote: string }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).releaseEscrowPayout(payoutId, adminNote);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escrowPayouts"] });
    },
  });
}

export function useRejectEscrowPayout() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payoutId, adminNote }: { payoutId: bigint; adminNote: string }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).rejectEscrowPayout(payoutId, adminNote);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escrowPayouts"] });
    },
  });
}

export function useRequestEscrowPayout() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).requestEscrowPayout(eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["escrowPayouts"] });
    },
  });
}

export function useListAuditLogs(
  userActor: import("@icp-sdk/core/principal").Principal | null = null,
  action: string | null = null,
  startTime: bigint | null = null,
  endTime: bigint | null = null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<AuditLog[]>({
    queryKey: ["auditLogs", String(userActor), String(action), String(startTime), String(endTime)],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listAuditLogs(userActor, action, startTime, endTime);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetExchangeRates() {
  const { actor, isFetching } = useActor();
  return useQuery<ExchangeRates>({
    queryKey: ["exchangeRates"],
    queryFn: async () => {
      if (!actor) return { inrToUsd: 0.012, inrToEur: 0.011, inrToAed: 0.044, inrToGbp: 0.0095 };
      return toBackend(actor).getExchangeRates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetExchangeRates() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inrToUsd, inrToEur, inrToAed, inrToGbp }: {
      inrToUsd: number; inrToEur: number; inrToAed: number; inrToGbp: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).setExchangeRates(inrToUsd, inrToEur, inrToAed, inrToGbp);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchangeRates"] });
    },
  });
}

// ─── AI Concierge ──────────────────────────────────────────────────────────────

export function useCreateItinerary() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, destination, travelDates, services }: {
      eventId: string | null;
      destination: string;
      travelDates: string;
      services: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).createItinerary(eventId, destination, travelDates, services);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myItineraries"] });
    },
  });
}

export function useListMyItineraries() {
  const { actor, isFetching } = useActor();
  return useQuery<AIItineraryLog[]>({
    queryKey: ["myItineraries"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listMyItineraries();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Voting ────────────────────────────────────────────────────────────────────

export function useVoteForArtist() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ artistName, category, region }: {
      artistName: string;
      category: string;
      region: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).voteForArtist(artistName, category, region);
    },
  });
}

export function useGetLeaderboard(
  region: string | null = null,
  category: string | null = null,
  limit: bigint = 100n,
) {
  const { actor, isFetching } = useActor();
  return useQuery<VotingEntry[]>({
    queryKey: ["leaderboard", String(region), String(category), String(limit)],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).getLeaderboard(region, category, limit);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
  });
}

// ─── Preloaded Profiles ───────────────────────────────────────────────────────

export function useListPreloadedProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery<PreloadedEventProfile[]>({
    queryKey: ["preloadedProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return toBackend(actor).listPreloadedProfiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePreloadedProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      eventId: string | null;
      title: string;
      eventType: EventType;
      location: string;
      basePriceINR: bigint;
      bannerUrl: string;
      promoVideoUrl: string;
      isTop100Global: boolean;
      isTop100India: boolean;
      globalRank: bigint | null;
      indiaRank: bigint | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return toBackend(actor).createPreloadedProfile(
        args.eventId, args.title, args.eventType, args.location,
        args.basePriceINR, args.bannerUrl, args.promoVideoUrl,
        args.isTop100Global, args.isTop100India, args.globalRank, args.indiaRank
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preloadedProfiles"] });
    },
  });
}

// ─── Stripe Session Status ────────────────────────────────────────────────────
export function useGetStripeSessionStatus(sessionId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stripeSessionStatus", sessionId],
    queryFn: async () => {
      if (!actor || !sessionId) return null;
      return toBackend(actor).getStripeSessionStatus(sessionId);
    },
    enabled: !!actor && !isFetching && !!sessionId,
    retry: 3,
    retryDelay: 1500,
  });
}

// ─── Legacy compat (keep for any old imports still around) ────────────────────
export { useGetCallerUserProfile as useGetCallerProfile };
