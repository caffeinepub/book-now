/**
 * Application-level type definitions for BOOK NOW – DMT CREATOLOGY
 * These mirror the Motoko backend types from backend.d.ts
 */

// ─── Timestamp ─────────────────────────────────────────────────────────────────
export type Time = bigint;

// ─── User ──────────────────────────────────────────────────────────────────────
export enum AppUserRole {
  customer = "customer",
  vendor = "vendor",
  superAdmin = "superAdmin",
  admin = "admin",
}

export enum UserStatus {
  active = "active",
  suspended = "suspended",
  pending = "pending",
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  appRole: AppUserRole;
  status: AppUserRole | UserStatus;
  createdAt: Time;
}

// ─── Event ─────────────────────────────────────────────────────────────────────
export enum EventCategory {
  concert = "concert",
  musicFestival = "musicFestival",
  dj = "dj",
  celebrity = "celebrity",
  sports = "sports",
  conference = "conference",
  workshop = "workshop",
  privateEvent = "privateEvent",
  luxuryParty = "luxuryParty",
  modelingAssignment = "modelingAssignment",
}

export enum EventStatus {
  draft = "draft",
  published = "published",
  cancelled = "cancelled",
  completed = "completed",
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  venue: string;
  city: string;
  country: string;
  eventDate: Time;
  coverImage: string;
  tags: string[];
  vendorId: string;
  createdAt: Time;
  baseCurrency: string;
  multiCurrencyEnabled: boolean;
  supportedCurrencies: string[];
}

export interface AddEventArgs {
  id?: string;
  title: string;
  description: string;
  category: EventCategory;
  status?: EventStatus;
  venue: string;
  city: string;
  country: string;
  eventDate: Time;
  coverImage: string;
  tags: string[];
  vendorId?: string;
  baseCurrency: string;
  multiCurrencyEnabled: boolean;
  supportedCurrencies: string[];
}

export interface UpdateEventArgs {
  id: string;
  title?: string;
  description?: string;
  category?: EventCategory;
  status?: EventStatus;
  venue?: string;
  city?: string;
  country?: string;
  eventDate?: Time;
  coverImage?: string;
  tags?: string[];
  baseCurrency?: string;
  multiCurrencyEnabled?: boolean;
  supportedCurrencies?: string[];
}

// ─── Ticket ────────────────────────────────────────────────────────────────────
export enum TicketType {
  numberedSeat = "numberedSeat",
  generalAdmission = "generalAdmission",
  timeSlot = "timeSlot",
  vipPackage = "vipPackage",
}

export interface Ticket {
  id: string;
  eventId: string;
  name: string;
  ticketType: TicketType;
  price: bigint; // in smallest unit (paise for INR)
  availableQuantity: bigint;
  totalQuantity: bigint;
  baseCurrency: string;
}

// ─── Booking ───────────────────────────────────────────────────────────────────
export enum BookingStatus {
  pending = "pending",
  confirmed = "confirmed",
  cancelled = "cancelled",
  refunded = "refunded",
  onHold = "onHold",
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  ticketId: string;
  quantity: bigint;
  totalAmount: bigint;
  currency?: string;
  status: BookingStatus;
  bookingToken?: string;
  createdAt: Time;
  refundReason?: string;
  fraudScore?: bigint;
  seatNumbers?: string[];
  idempotencyKey?: string;
  lockToken?: string;
  stripeSessionId?: string;
}

// ─── Vendor ────────────────────────────────────────────────────────────────────
export enum VendorApprovalStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
}

export interface VendorProfile {
  userId: string;
  businessName: string;
  approvalStatus: VendorApprovalStatus;
  createdAt: Time;
  totalRevenue?: bigint;
}

// ─── Escrow / Payout ───────────────────────────────────────────────────────────
export enum EscrowPayoutStatus {
  pending = "pending",
  released = "released",
  rejected = "rejected",
}

export interface EscrowPayout {
  id: string;
  eventId: string;
  vendorId: string;
  amount: bigint;
  currency: string;
  status: EscrowPayoutStatus;
  adminNote?: string;
  createdAt: Time;
}

// ─── Audit ─────────────────────────────────────────────────────────────────────
export enum ActionType {
  bookingCreated = "bookingCreated",
  bookingCancelled = "bookingCancelled",
  bookingConfirmed = "bookingConfirmed",
  paymentReceived = "paymentReceived",
  refundRequested = "refundRequested",
  refundProcessed = "refundProcessed",
  vendorApproved = "vendorApproved",
  vendorRejected = "vendorRejected",
  eventCreated = "eventCreated",
  eventUpdated = "eventUpdated",
  eventDeleted = "eventDeleted",
  escrowReleased = "escrowReleased",
  escrowRejected = "escrowRejected",
  userRegistered = "userRegistered",
  fraudFlagged = "fraudFlagged",
}

export interface AuditLog {
  id: string;
  actionType: ActionType;
  actorId: string;
  targetId: string;
  details: string;
  timestamp: Time;
}

// ─── Fraud ─────────────────────────────────────────────────────────────────────
export interface FraudLog {
  id: string;
  bookingId: string;
  eventId: string;
  userId: string;
  riskScore: bigint;
  reason: string;
  status: "held" | "approved" | "rejected";
  createdAt: Time;
}

// ─── Currency Config ───────────────────────────────────────────────────────────
export interface CurrencyConfig {
  eventId: string;
  baseCurrency: string;
  multiCurrencyEnabled: boolean;
  supportedCurrencies: string[];
  updatedAt?: bigint;
}

// ─── Platform Stats ────────────────────────────────────────────────────────────
export interface PlatformStats {
  totalUsers: bigint;
  totalVendors: bigint;
  totalEvents: bigint;
  activeEvents: bigint;
  totalBookings: bigint;
  confirmedBookings: bigint;
  totalRevenue: bigint;
  fraudAlerts: bigint;
}

// ─── Vendor Stats ──────────────────────────────────────────────────────────────
export interface VendorStats {
  totalEvents: bigint;
  totalBookings: bigint;
  totalRevenue: bigint;
  pendingPayouts: bigint;
}
