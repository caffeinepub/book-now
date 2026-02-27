import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface VotingEntry {
    id: bigint;
    region: string;
    voteCount: bigint;
    createdAt: Time;
    category: string;
    artistName: string;
}
export interface AuditLog {
    id: bigint;
    action: string;
    entityId: string;
    timestamp: bigint;
    details: string;
    entityType: string;
    userActor: Principal;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface User {
    isApproved: boolean;
    principal: Principal;
    name: string;
    createdAt: Time;
    role: UserRole;
    email: string;
}
export interface Event {
    id: bigint;
    baseCurrency: string;
    title: string;
    endDate: Time;
    isPublished: boolean;
    basePriceINR: bigint;
    globalRank?: bigint;
    createdAt: Time;
    tags: Array<string>;
    isTop100India: boolean;
    description: string;
    multiCurrencyEnabled: boolean;
    indiaRank?: bigint;
    totalSeats: bigint;
    updatedAt: Time;
    isTop100Global: boolean;
    ticketType: TicketType;
    availableSeats: bigint;
    vendorId: Principal;
    promoVideoUrl: string;
    bannerUrl: string;
    location: string;
    startDate: Time;
    supportedCurrencies: Array<string>;
    eventType: EventType;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ExchangeRates {
    inrToAed: number;
    inrToEur: number;
    inrToGbp: number;
    inrToUsd: number;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface AIItineraryLog {
    id: bigint;
    status: AIItineraryStatus;
    eventId?: string;
    destination: string;
    userId: Principal;
    createdAt: Time;
    travelDates: string;
    itineraryData: string;
    services: Array<string>;
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
export interface PreloadedEventProfile {
    id: bigint;
    eventId?: string;
    title: string;
    basePriceINR: bigint;
    globalRank?: bigint;
    isTop100India: boolean;
    indiaRank?: bigint;
    isActive: boolean;
    isTop100Global: boolean;
    promoVideoUrl: string;
    bannerUrl: string;
    location: string;
    eventType: EventType;
}
export interface FraudLog {
    id: bigint;
    flags: Array<string>;
    status: FraudStatus;
    bookingId: bigint;
    userId: Principal;
    createdAt: Time;
    riskScore: bigint;
}
export interface EscrowPayout {
    id: bigint;
    status: EscrowPayoutStatus;
    eventId: bigint;
    processedAt?: bigint;
    adminNote?: string;
    vendorId: Principal;
    amountINR: bigint;
    requestedAt: bigint;
}
export interface Booking {
    id: bigint;
    status: BookingStatus;
    eventId: bigint;
    userId: Principal;
    createdAt: Time;
    confirmedAt?: bigint;
    cancelledAt?: bigint;
    ticketType: TicketType;
    totalAmountINR: bigint;
    currency: string;
    quantity: bigint;
    seatLockId: bigint;
    bookingToken: string;
    stripeSessionId?: string;
}
export enum AIItineraryStatus {
    cancelled = "cancelled",
    confirmed = "confirmed",
    draft = "draft"
}
export enum BookingStatus {
    cancelled = "cancelled",
    pending = "pending",
    refunded = "refunded",
    confirmed = "confirmed",
    onHold = "onHold"
}
export enum EscrowPayoutStatus {
    pending = "pending",
    released = "released",
    rejected = "rejected"
}
export enum EventType {
    dj = "dj",
    workshop = "workshop",
    modelingAssignment = "modelingAssignment",
    musicFestival = "musicFestival",
    privateEvent = "privateEvent",
    conference = "conference",
    luxuryParty = "luxuryParty",
    sports = "sports",
    celebrity = "celebrity"
}
export enum FraudStatus {
    autoHeld = "autoHeld",
    cleared = "cleared",
    flagged = "flagged"
}
export enum TicketType {
    numberedSeat = "numberedSeat",
    vipPackage = "vipPackage",
    generalAdmission = "generalAdmission",
    timeSlot = "timeSlot"
}
export enum UserRole {
    admin = "admin",
    customer = "customer",
    superAdmin = "superAdmin",
    vendor = "vendor"
}
export enum UserRole__1 {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    approveVendor(vendorPrincipal: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole__1): Promise<void>;
    cancelBooking(bookingId: bigint): Promise<void>;
    confirmBooking(bookingId: bigint, stripeSessionId: string): Promise<void>;
    createBooking(eventId: bigint, seatLockId: bigint, quantity: bigint, currency: string): Promise<bigint>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createEvent(title: string, description: string, eventType: EventType, location: string, startDate: Time, endDate: Time, basePriceINR: bigint, supportedCurrencies: Array<string>, multiCurrencyEnabled: boolean, totalSeats: bigint, ticketType: TicketType, bannerUrl: string, promoVideoUrl: string, tags: Array<string>): Promise<bigint>;
    createItinerary(eventId: string | null, destination: string, travelDates: string, services: Array<string>): Promise<bigint>;
    createPreloadedProfile(eventId: string | null, title: string, eventType: EventType, location: string, basePriceINR: bigint, bannerUrl: string, promoVideoUrl: string, isTop100Global: boolean, isTop100India: boolean, globalRank: bigint | null, indiaRank: bigint | null): Promise<bigint>;
    deleteEvent(eventId: bigint): Promise<void>;
    getCallerUserProfile(): Promise<User | null>;
    getCallerUserRole(): Promise<UserRole__1>;
    getEvent(eventId: bigint): Promise<Event | null>;
    getExchangeRates(): Promise<ExchangeRates>;
    getItinerary(itineraryId: bigint): Promise<AIItineraryLog | null>;
    getLeaderboard(region: string | null, category: string | null, limit: bigint): Promise<Array<VotingEntry>>;
    getPlatformStats(): Promise<{
        totalRevenueINR: bigint;
        totalEvents: bigint;
        totalBookings: bigint;
        pendingEscrowPayouts: bigint;
        totalUsers: bigint;
        activeFraudAlerts: bigint;
        totalVendors: bigint;
    }>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<User | null>;
    getVendorStats(): Promise<{
        bookingsCount: bigint;
        revenueINR: bigint;
        eventsCount: bigint;
    }>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    listAllBookings(): Promise<Array<Booking>>;
    listAllUsers(): Promise<Array<User>>;
    listAuditLogs(userActor: Principal | null, action: string | null, startTime: bigint | null, endTime: bigint | null): Promise<Array<AuditLog>>;
    listEscrowPayouts(): Promise<Array<EscrowPayout>>;
    listFraudLogs(): Promise<Array<FraudLog>>;
    listMyBookings(): Promise<Array<Booking>>;
    listMyItineraries(): Promise<Array<AIItineraryLog>>;
    listPreloadedProfiles(): Promise<Array<PreloadedEventProfile>>;
    listPublishedEvents(eventType: EventType | null, location: string | null, minPrice: bigint | null, maxPrice: bigint | null, isTop100Global: boolean | null, isTop100India: boolean | null): Promise<Array<Event>>;
    lockSeat(eventId: bigint, seatNumber: string | null): Promise<string>;
    publishEvent(eventId: bigint): Promise<void>;
    registerUser(name: string, email: string, role: UserRole): Promise<void>;
    rejectEscrowPayout(payoutId: bigint, adminNote: string): Promise<void>;
    releaseEscrowPayout(payoutId: bigint, adminNote: string): Promise<void>;
    requestEscrowPayout(eventId: bigint): Promise<bigint>;
    reviewFraudFlag(fraudLogId: bigint, clearFlag: boolean): Promise<void>;
    saveCallerUserProfile(name: string, email: string): Promise<void>;
    setEventTop100(eventId: bigint, isTop100Global: boolean, isTop100India: boolean, globalRank: bigint | null, indiaRank: bigint | null): Promise<void>;
    setExchangeRates(inrToUsd: number, inrToEur: number, inrToAed: number, inrToGbp: number): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unpublishEvent(eventId: bigint): Promise<void>;
    updateEvent(eventId: bigint, title: string, description: string, location: string, basePriceINR: bigint, bannerUrl: string, promoVideoUrl: string, tags: Array<string>): Promise<void>;
    voteForArtist(artistName: string, category: string, region: string): Promise<void>;
}
