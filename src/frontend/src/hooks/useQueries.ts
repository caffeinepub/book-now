import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import {
  AddEventArgs,
  Booking,
  CurrencyConfig,
  ShoppingItem,
  Ticket,
  UpdateEventArgs,
  UserProfile,
  ActionType,
  Time,
  StripeConfiguration,
} from "../backend";

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
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

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function useGetAllEvents() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allEvents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEventById(eventId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!actor || !eventId) return null;
      return actor.getEventById(eventId);
    },
    enabled: !!actor && !isFetching && !!eventId,
  });
}

export function useAddEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: AddEventArgs) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addEvent(args);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEvents"] });
      qc.invalidateQueries({ queryKey: ["myVendorEvents"] });
    },
  });
}

export function useUpdateEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: UpdateEventArgs) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateEvent(args);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEvents"] });
      qc.invalidateQueries({ queryKey: ["myVendorEvents"] });
    },
  });
}

export function useDeleteEvent() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteEvent(eventId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allEvents"] });
      qc.invalidateQueries({ queryKey: ["myVendorEvents"] });
    },
  });
}

export function useGetMyVendorEvents() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myVendorEvents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyVendorEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyVendorStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myVendorStats"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyVendorStats();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export function useGetAllTickets() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allTickets"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTickets();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTicket() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: Ticket) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addTicket(ticket);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allTickets"] });
    },
  });
}

export function useUpdateTicket() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: Ticket) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTicket(ticket);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allTickets"] });
    },
  });
}

export function useDeleteTicket() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTicket(ticketId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allTickets"] });
    },
  });
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export function useGetMyBookings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myBookings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyBookings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateBooking() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (booking: Booking) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createBooking(booking);
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
    mutationFn: async (bookingId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.cancelBooking(bookingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}

export function useRequestRefund() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestRefund(bookingId, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}

// ─── Checkout / Stripe ────────────────────────────────────────────────────────

export type CheckoutSession = { id: string; url: string };

export function useCreateCheckoutSession() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (items: ShoppingItem[]): Promise<CheckoutSession> => {
      if (!actor) throw new Error("Actor not available");
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-failure`;
      const result = await actor.createCheckoutSession(items, successUrl, cancelUrl);
      const session = JSON.parse(result) as CheckoutSession;
      if (!session?.url) throw new Error("Stripe session missing url");
      return session;
    },
  });
}

export function useGetStripeSessionStatus(sessionId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stripeSession", sessionId],
    queryFn: async () => {
      if (!actor || !sessionId) return null;
      return actor.getStripeSessionStatus(sessionId);
    },
    enabled: !!actor && !isFetching && !!sessionId,
  });
}

export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
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
      return actor.setStripeConfiguration(config);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripeConfigured"] });
    },
  });
}

// ─── Vendor ────────────────────────────────────────────────────────────────────

export function useCreateVendorProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (businessName: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createVendorProfile(businessName);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUserProfile"] });
      qc.invalidateQueries({ queryKey: ["myVendorProfile"] });
    },
  });
}

export function useGetVendorApprovalQueue() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["vendorApprovalQueue"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getVendorApprovalQueue();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveVendor() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveVendor(vendorId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorApprovalQueue"] });
    },
  });
}

export function useRejectVendor() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendorId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.rejectVendor(vendorId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorApprovalQueue"] });
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
      return actor.getPlatformStats();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetFraudQueue() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["fraudQueue"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFraudQueue();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReviewFraudBooking() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, approve }: { bookingId: string; approve: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.reviewFraudBooking(bookingId, approve);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraudQueue"] });
    },
  });
}

export function useGetAuditLogs(startTime: Time, endTime: Time, actionType: ActionType | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["auditLogs", startTime.toString(), endTime.toString(), actionType],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAuditLogs(startTime, endTime, actionType);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useProcessRefund() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ refundId, approve }: { refundId: string; approve: boolean }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.processRefund(refundId, approve);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myBookings"] });
    },
  });
}

// ─── Currency Config ──────────────────────────────────────────────────────────

export function useGetCurrencyConfig(eventId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["currencyConfig", eventId],
    queryFn: async () => {
      if (!actor || !eventId) return null;
      return actor.getCurrencyConfig(eventId);
    },
    enabled: !!actor && !isFetching && !!eventId,
  });
}

export function useSetCurrencyConfig() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: CurrencyConfig) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setCurrencyConfig(config);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["currencyConfig", variables.eventId] });
      qc.invalidateQueries({ queryKey: ["allEvents"] });
      qc.invalidateQueries({ queryKey: ["myVendorEvents"] });
    },
  });
}
