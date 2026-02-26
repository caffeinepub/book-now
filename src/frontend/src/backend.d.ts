import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AuditLog {
    actionType: ActionType;
    actorId: string;
    timestamp: Time;
    details: string;
    targetId: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface Refund {
    id: string;
    status: RefundStatus;
    bookingId: string;
    createdAt: Time;
    amount: bigint;
    reason: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Booking {
    id: string;
    status: BookingStatus;
    eventId: string;
    seatNumbers: Array<bigint>;
    idempotencyKey: string;
    ticketTypeId: string;
    userId: string;
    fraudScore: bigint;
    createdAt: Time;
    lockToken: string;
    totalAmount: bigint;
    notes?: string;
    quantity: bigint;
    stripeSessionId: string;
    timeSlot?: string;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface AddEventArgs {
    id: string;
    baseCurrency: string;
    title: string;
    country: string;
    venue: string;
    city: string;
    tags: Array<string>;
    description: string;
    multiCurrencyEnabled: boolean;
    coverImage: string;
    vendorId: string;
    category: EventCategory;
    eventDate: Time;
    supportedCurrencies: Array<string>;
}
export interface CurrencyConfig {
    eventId: string;
    baseCurrency: string;
    multiCurrencyEnabled: boolean;
    updatedAt: Time;
    supportedCurrencies: Array<string>;
}
export interface Event {
    id: string;
    status: EventStatus;
    baseCurrency: string;
    title: string;
    country: string;
    venue: string;
    city: string;
    createdAt: Time;
    tags: Array<string>;
    description: string;
    multiCurrencyEnabled: boolean;
    coverImage: string;
    vendorId: string;
    category: EventCategory;
    eventDate: Time;
    supportedCurrencies: Array<string>;
}
export interface UpdateEventArgs {
    id: string;
    status: EventStatus;
    baseCurrency: string;
    title: string;
    country: string;
    venue: string;
    city: string;
    tags: Array<string>;
    description: string;
    multiCurrencyEnabled: boolean;
    coverImage: string;
    vendorId: string;
    category: EventCategory;
    eventDate: Time;
    supportedCurrencies: Array<string>;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface Ticket {
    id: string;
    eventId: string;
    baseCurrency: string;
    availableQuantity: bigint;
    name: string;
    ticketType: TicketType;
    price: bigint;
    totalQuantity: bigint;
}
export interface VendorProfile {
    userId: string;
    createdAt: Time;
    businessName: string;
    approvalStatus: VendorApprovalStatus;
    totalRevenue: bigint;
}
export interface UserProfile {
    id: string;
    status: UserStatus;
    appRole: AppUserRole;
    name: string;
    createdAt: Time;
    email: string;
}
export enum ActionType {
    eventPublished = "eventPublished",
    refundInitiated = "refundInitiated",
    paymentSucceeded = "paymentSucceeded",
    adminAction = "adminAction",
    bookingCreated = "bookingCreated",
    bookingConfirmed = "bookingConfirmed",
    userRegistered = "userRegistered",
    vendorApproved = "vendorApproved",
    eventCreated = "eventCreated",
    fraudHold = "fraudHold",
    bookingCancelled = "bookingCancelled",
    paymentFailed = "paymentFailed"
}
export enum AppUserRole {
    customer = "customer",
    superAdmin = "superAdmin",
    vendor = "vendor"
}
export enum BookingStatus {
    cancelled = "cancelled",
    pending = "pending",
    refunded = "refunded",
    confirmed = "confirmed"
}
export enum EventCategory {
    concert = "concert",
    workshop = "workshop",
    privateEvent = "privateEvent",
    conference = "conference",
    sports = "sports"
}
export enum EventStatus {
    cancelled = "cancelled",
    published = "published",
    completed = "completed",
    draft = "draft"
}
export enum RefundStatus {
    pending = "pending",
    rejected = "rejected",
    processed = "processed"
}
export enum TicketType {
    numberedSeat = "numberedSeat",
    generalAdmission = "generalAdmission",
    timeSlot = "timeSlot"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserStatus {
    active = "active",
    suspended = "suspended"
}
export enum VendorApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    activateUser(userId: Principal): Promise<void>;
    addEvent(args: AddEventArgs): Promise<Event>;
    addTicket(ticket: Ticket): Promise<Ticket>;
    approveVendor(vendorId: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelBooking(bookingId: string): Promise<void>;
    createBooking(booking: Booking): Promise<Booking>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createVendorProfile(businessName: string): Promise<VendorProfile>;
    deleteEvent(eventId: string): Promise<void>;
    deleteTicket(ticketId: string): Promise<void>;
    getAllEvents(): Promise<Array<Event>>;
    getAllTickets(): Promise<Array<Ticket>>;
    getAuditLogs(startTime: Time, endTime: Time, actionType: ActionType | null): Promise<Array<AuditLog>>;
    getBookingById(bookingId: string): Promise<Booking | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrencyConfig(eventId: string): Promise<CurrencyConfig | null>;
    getEventById(eventId: string): Promise<Event | null>;
    getFraudQueue(): Promise<Array<Booking>>;
    getMyBookings(): Promise<Array<Booking>>;
    getMyVendorEvents(): Promise<Array<Event>>;
    getMyVendorStats(): Promise<{
        totalEvents: bigint;
        totalBookings: bigint;
        totalRevenue: bigint;
    }>;
    getPlatformStats(): Promise<{
        confirmedBookings: bigint;
        totalUsers: bigint;
        totalRevenue: bigint;
        totalVendors: bigint;
        activeEvents: bigint;
    }>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTicketById(ticketId: string): Promise<Ticket | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVendorApprovalQueue(): Promise<Array<VendorProfile>>;
    getVendorProfile(vendorId: string): Promise<VendorProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    processRefund(refundId: string, approve: boolean): Promise<void>;
    rejectVendor(vendorId: string): Promise<void>;
    requestRefund(bookingId: string, reason: string): Promise<Refund>;
    reviewFraudBooking(bookingId: string, approve: boolean): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCurrencyConfig(config: CurrencyConfig): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    suspendUser(userId: Principal): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateEvent(args: UpdateEventArgs): Promise<Event>;
    updateTicket(ticket: Ticket): Promise<Ticket>;
}
