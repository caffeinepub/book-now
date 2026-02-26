import Time "mo:core/Time";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

import Stripe "stripe/stripe";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import OutCall "http-outcalls/outcall";
import Migration "migration";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserRole = AccessControl.UserRole;
  public type StripeSessionStatus = Stripe.StripeSessionStatus;

  // Custom application roles
  public type AppUserRole = { #customer; #vendor; #superAdmin };
  public type UserStatus = { #active; #suspended };
  public type VendorApprovalStatus = { #pending; #approved; #rejected };

  // User Profile Types
  public type UserProfile = {
    id : Text;
    name : Text;
    email : Text;
    appRole : AppUserRole;
    status : UserStatus;
    createdAt : Time.Time;
  };

  public type VendorProfile = {
    userId : Text;
    businessName : Text;
    approvalStatus : VendorApprovalStatus;
    totalRevenue : Nat;
    createdAt : Time.Time;
  };

  // Event Types
  public type CurrencyConfig = {
    eventId : Text;
    baseCurrency : Text;
    supportedCurrencies : [Text];
    multiCurrencyEnabled : Bool;
    updatedAt : Time.Time;
  };

  public type EventStatus = { #draft; #published; #cancelled; #completed };
  public type EventCategory = { #concert; #sports; #conference; #workshop; #privateEvent };
  public type TicketType = {
    #numberedSeat;
    #generalAdmission;
    #timeSlot;
  };

  public type Event = {
    id : Text;
    title : Text;
    description : Text;
    category : EventCategory;
    venue : Text;
    city : Text;
    country : Text;
    eventDate : Time.Time;
    status : EventStatus;
    vendorId : Text;
    coverImage : Text;
    tags : [Text];
    baseCurrency : Text;
    supportedCurrencies : [Text];
    multiCurrencyEnabled : Bool;
    createdAt : Time.Time;
  };

  public type Ticket = {
    id : Text;
    eventId : Text;
    ticketType : TicketType;
    name : Text;
    price : Nat;
    totalQuantity : Nat;
    availableQuantity : Nat;
    baseCurrency : Text;
  };

  public type BookingStatus = { #pending; #confirmed; #cancelled; #refunded };

  public type Booking = {
    id : Text;
    userId : Text;
    eventId : Text;
    ticketTypeId : Text;
    quantity : Nat;
    seatNumbers : [Nat];
    timeSlot : ?Text;
    lockToken : Text;
    status : BookingStatus;
    totalAmount : Nat;
    stripeSessionId : Text;
    idempotencyKey : Text;
    fraudScore : Nat;
    notes : ?Text;
    createdAt : Time.Time;
  };

  public type RefundStatus = { #pending; #processed; #rejected };

  public type Refund = {
    id : Text;
    bookingId : Text;
    amount : Nat;
    status : RefundStatus;
    reason : Text;
    createdAt : Time.Time;
  };

  public type ActionType = {
    #userRegistered;
    #vendorApproved;
    #eventCreated;
    #eventPublished;
    #bookingCreated;
    #bookingConfirmed;
    #bookingCancelled;
    #paymentSucceeded;
    #paymentFailed;
    #refundInitiated;
    #fraudHold;
    #adminAction;
  };

  public type AuditLog = {
    actionType : ActionType;
    actorId : Text;
    targetId : Text;
    details : Text;
    timestamp : Time.Time;
  };

  // State
  let userProfiles = Map.empty<Principal, UserProfile>();
  let vendorProfiles = Map.empty<Text, VendorProfile>();
  let events = Map.empty<Text, Event>();
  let tickets = Map.empty<Text, Ticket>();
  let bookings = Map.empty<Text, Booking>();
  let refunds = Map.empty<Text, Refund>();
  let auditLogs = Map.empty<Nat, AuditLog>();
  var auditLogCounter : Nat = 0;

  // Helper functions
  func principalToText(p : Principal) : Text {
    p.toText();
  };

  func getUserProfile_(caller : Principal) : ?UserProfile {
    userProfiles.get(caller);
  };

  func requireUserProfile(caller : Principal) : UserProfile {
    switch (getUserProfile_(caller)) {
      case (null) { Runtime.trap("User profile not found. Please create a profile first.") };
      case (?profile) { profile };
    };
  };

  func isVendor(caller : Principal) : Bool {
    switch (getUserProfile_(caller)) {
      case (null) { false };
      case (?profile) {
        switch (profile.appRole) {
          case (#vendor) { true };
          case (_) { false };
        };
      };
    };
  };

  func isSuperAdmin(caller : Principal) : Bool {
    switch (getUserProfile_(caller)) {
      case (null) { false };
      case (?profile) {
        switch (profile.appRole) {
          case (#superAdmin) { true };
          case (_) { false };
        };
      };
    };
  };

  func isVendorApproved(vendorId : Text) : Bool {
    switch (vendorProfiles.get(vendorId)) {
      case (null) { false };
      case (?vendor) {
        switch (vendor.approvalStatus) {
          case (#approved) { true };
          case (_) { false };
        };
      };
    };
  };

  func isUserActive(caller : Principal) : Bool {
    switch (getUserProfile_(caller)) {
      case (null) { false };
      case (?profile) {
        switch (profile.status) {
          case (#active) { true };
          case (#suspended) { false };
        };
      };
    };
  };

  func logAudit(actionType : ActionType, actorId : Text, targetId : Text, details : Text) {
    let log : AuditLog = {
      actionType = actionType;
      actorId = actorId;
      targetId = targetId;
      details = details;
      timestamp = Time.now();
    };
    auditLogs.add(auditLogCounter, log);
    auditLogCounter += 1;
  };

  // User Profile Management (Required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    
    // Check if this is a new profile
    let isNew = switch (userProfiles.get(caller)) {
      case (null) { true };
      case (?_) { false };
    };

    userProfiles.add(caller, profile);

    if (isNew) {
      logAudit(#userRegistered, principalToText(caller), profile.id, "User registered");
    };
  };

  // Vendor Profile Management
  public shared ({ caller }) func createVendorProfile(businessName : Text) : async VendorProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create vendor profiles");
    };

    let userProfile = requireUserProfile(caller);
    
    // Check if user is a vendor
    switch (userProfile.appRole) {
      case (#vendor) {};
      case (_) { Runtime.trap("Unauthorized: Only vendors can create vendor profiles") };
    };

    let vendorId = userProfile.id;
    
    // Check if vendor profile already exists
    switch (vendorProfiles.get(vendorId)) {
      case (?_) { Runtime.trap("Vendor profile already exists") };
      case (null) {};
    };

    let newVendor : VendorProfile = {
      userId = vendorId;
      businessName = businessName;
      approvalStatus = #pending;
      totalRevenue = 0;
      createdAt = Time.now();
    };

    vendorProfiles.add(vendorId, newVendor);
    logAudit(#userRegistered, principalToText(caller), vendorId, "Vendor profile created");
    newVendor;
  };

  public query ({ caller }) func getVendorProfile(vendorId : Text) : async ?VendorProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view vendor profiles");
    };
    vendorProfiles.get(vendorId);
  };

  // Admin: Approve/Reject Vendor
  public shared ({ caller }) func approveVendor(vendorId : Text) : async () {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can approve vendors");
    };

    switch (vendorProfiles.get(vendorId)) {
      case (null) { Runtime.trap("Vendor not found") };
      case (?vendor) {
        let updatedVendor = {
          userId = vendor.userId;
          businessName = vendor.businessName;
          approvalStatus = #approved;
          totalRevenue = vendor.totalRevenue;
          createdAt = vendor.createdAt;
        };
        vendorProfiles.add(vendorId, updatedVendor);
        logAudit(#vendorApproved, principalToText(caller), vendorId, "Vendor approved");
      };
    };
  };

  public shared ({ caller }) func rejectVendor(vendorId : Text) : async () {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can reject vendors");
    };

    switch (vendorProfiles.get(vendorId)) {
      case (null) { Runtime.trap("Vendor not found") };
      case (?vendor) {
        let updatedVendor = {
          userId = vendor.userId;
          businessName = vendor.businessName;
          approvalStatus = #rejected;
          totalRevenue = vendor.totalRevenue;
          createdAt = vendor.createdAt;
        };
        vendorProfiles.add(vendorId, updatedVendor);
        logAudit(#adminAction, principalToText(caller), vendorId, "Vendor rejected");
      };
    };
  };

  // Event Management
  public type AddEventArgs = {
    id : Text;
    title : Text;
    description : Text;
    category : EventCategory;
    venue : Text;
    city : Text;
    country : Text;
    eventDate : Time.Time;
    vendorId : Text;
    coverImage : Text;
    tags : [Text];
    baseCurrency : Text;
    supportedCurrencies : [Text];
    multiCurrencyEnabled : Bool;
  };

  public type UpdateEventArgs = {
    id : Text;
    title : Text;
    description : Text;
    category : EventCategory;
    venue : Text;
    city : Text;
    country : Text;
    eventDate : Time.Time;
    vendorId : Text;
    coverImage : Text;
    tags : [Text];
    status : EventStatus;
    baseCurrency : Text;
    supportedCurrencies : [Text];
    multiCurrencyEnabled : Bool;
  };

  public shared ({ caller }) func addEvent(args : AddEventArgs) : async Event {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add events");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Only vendors can create events
    if (not isVendor(caller)) {
      Runtime.trap("Unauthorized: Only vendors can create events");
    };

    // Vendor must be approved
    if (not isVendorApproved(userProfile.id)) {
      Runtime.trap("Unauthorized: Vendor must be approved to create events");
    };

    // Vendor can only create events for themselves
    if (args.vendorId != userProfile.id) {
      Runtime.trap("Unauthorized: Vendors can only create events for themselves");
    };

    let newEvent : Event = {
      id = args.id;
      title = args.title;
      description = args.description;
      category = args.category;
      venue = args.venue;
      city = args.city;
      country = args.country;
      eventDate = args.eventDate;
      status = #draft;
      vendorId = args.vendorId;
      coverImage = args.coverImage;
      tags = args.tags;
      baseCurrency = if (args.baseCurrency == "") { "INR" } else { args.baseCurrency };
      supportedCurrencies = if (args.supportedCurrencies.size() == 0) {
        ["INR", "USD", "EUR", "GBP", "AED"];
      } else { args.supportedCurrencies };
      multiCurrencyEnabled = args.multiCurrencyEnabled;
      createdAt = Time.now();
    };

    events.add(args.id, newEvent);
    logAudit(#eventCreated, principalToText(caller), args.id, "Event created");
    newEvent;
  };

  public shared ({ caller }) func updateEvent(args : UpdateEventArgs) : async Event {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update events");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Get existing event
    let existingEvent = switch (events.get(args.id)) {
      case (null) { Runtime.trap("Event not found") };
      case (?e) { e };
    };

    // Vendors can only update their own events, admins can update any
    if (not isSuperAdmin(caller)) {
      if (existingEvent.vendorId != userProfile.id) {
        Runtime.trap("Unauthorized: Vendors can only update their own events");
      };
    };

    let updatedEvent : Event = {
      id = args.id;
      title = args.title;
      description = args.description;
      category = args.category;
      venue = args.venue;
      city = args.city;
      country = args.country;
      eventDate = args.eventDate;
      status = args.status;
      vendorId = args.vendorId;
      coverImage = args.coverImage;
      tags = args.tags;
      baseCurrency = if (args.baseCurrency == "") { "INR" } else { args.baseCurrency };
      supportedCurrencies = if (args.supportedCurrencies.size() == 0) {
        ["INR", "USD", "EUR", "GBP", "AED"];
      } else { args.supportedCurrencies };
      multiCurrencyEnabled = args.multiCurrencyEnabled;
      createdAt = existingEvent.createdAt;
    };

    events.add(args.id, updatedEvent);

    switch (args.status) {
      case (#published) {
        logAudit(#eventPublished, principalToText(caller), args.id, "Event published");
      };
      case (_) {};
    };

    updatedEvent;
  };

  public shared ({ caller }) func setCurrencyConfig(config : CurrencyConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set currency config");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Get the event first
    let existingEvent = switch (events.get(config.eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?e) { e };
    };

    // Authorization: Only the vendor who owns the event or superAdmin can modify currency config
    if (not isSuperAdmin(caller)) {
      // Must be a vendor
      if (not isVendor(caller)) {
        Runtime.trap("Unauthorized: Only vendors or super admins can set currency config");
      };
      // Must own the event
      if (existingEvent.vendorId != userProfile.id) {
        Runtime.trap("Unauthorized: Vendors can only modify currency config for their own events");
      };
    };

    let updatedEvent = {
      id = existingEvent.id;
      title = existingEvent.title;
      description = existingEvent.description;
      category = existingEvent.category;
      venue = existingEvent.venue;
      city = existingEvent.city;
      country = existingEvent.country;
      eventDate = existingEvent.eventDate;
      status = existingEvent.status;
      vendorId = existingEvent.vendorId;
      coverImage = existingEvent.coverImage;
      tags = existingEvent.tags;
      baseCurrency = config.baseCurrency;
      supportedCurrencies = config.supportedCurrencies;
      multiCurrencyEnabled = config.multiCurrencyEnabled;
      createdAt = existingEvent.createdAt;
    };

    events.add(config.eventId, updatedEvent);
    logAudit(#adminAction, principalToText(caller), config.eventId, "Currency config updated");
  };

  public query ({ caller }) func getCurrencyConfig(eventId : Text) : async ?CurrencyConfig {
    switch (events.get(eventId)) {
      case (null) { null };
      case (?event) {
        ?{
          eventId;
          baseCurrency = event.baseCurrency;
          supportedCurrencies = event.supportedCurrencies;
          multiCurrencyEnabled = event.multiCurrencyEnabled;
          updatedAt = event.createdAt;
        };
      };
    };
  };

  public query func getEventById(eventId : Text) : async ?Event {
    events.get(eventId);
  };

  public query func getAllEvents() : async [Event] {
    events.values().toArray();
  };

  public shared ({ caller }) func deleteEvent(eventId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete events");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Get existing event
    let existingEvent = switch (events.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?e) { e };
    };

    // Vendors can only delete their own events, admins can delete any
    if (not isSuperAdmin(caller)) {
      if (existingEvent.vendorId != userProfile.id) {
        Runtime.trap("Unauthorized: Vendors can only delete their own events");
      };
    };

    events.remove(eventId);
    logAudit(#adminAction, principalToText(caller), eventId, "Event deleted");
  };

  // Ticket Management
  public shared ({ caller }) func addTicket(ticket : Ticket) : async Ticket {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add tickets");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Get the event to verify ownership
    let event = switch (events.get(ticket.eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?e) { e };
    };

    // Vendors can only add tickets to their own events, admins can add to any
    if (not isSuperAdmin(caller)) {
      if (event.vendorId != userProfile.id) {
        Runtime.trap("Unauthorized: Vendors can only add tickets to their own events");
      };
    };

    tickets.add(ticket.id, ticket);
    ticket;
  };

  public query func getTicketById(ticketId : Text) : async ?Ticket {
    tickets.get(ticketId);
  };

  public query func getAllTickets() : async [Ticket] {
    tickets.values().toArray();
  };

  public shared ({ caller }) func updateTicket(ticket : Ticket) : async Ticket {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update tickets");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Get the event to verify ownership
    let event = switch (events.get(ticket.eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?e) { e };
    };

    // Vendors can only update tickets for their own events, admins can update any
    if (not isSuperAdmin(caller)) {
      if (event.vendorId != userProfile.id) {
        Runtime.trap("Unauthorized: Vendors can only update tickets for their own events");
      };
    };

    tickets.add(ticket.id, ticket);
    ticket;
  };

  public shared ({ caller }) func deleteTicket(ticketId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete tickets");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // Get the ticket to find the event
    let ticket = switch (tickets.get(ticketId)) {
      case (null) { Runtime.trap("Ticket not found") };
      case (?t) { t };
    };

    // Get the event to verify ownership
    let event = switch (events.get(ticket.eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?e) { e };
    };

    // Vendors can only delete tickets for their own events, admins can delete any
    if (not isSuperAdmin(caller)) {
      if (event.vendorId != userProfile.id) {
        Runtime.trap("Unauthorized: Vendors can only delete tickets for their own events");
      };
    };

    tickets.remove(ticketId);
  };

  // Booking Management
  public shared ({ caller }) func createBooking(booking : Booking) : async Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create bookings");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    // User can only create bookings for themselves
    if (booking.userId != userProfile.id) {
      Runtime.trap("Unauthorized: Users can only create bookings for themselves");
    };

    bookings.add(booking.id, booking);
    logAudit(#bookingCreated, principalToText(caller), booking.id, "Booking created");
    booking;
  };

  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookings");
    };

    let userProfile = switch (getUserProfile_(caller)) {
      case (null) { Runtime.trap("User profile not found") };
      case (?profile) { profile };
    };

    let allBookings = bookings.values().toArray();
    allBookings.filter<Booking>(func(b) { b.userId == userProfile.id });
  };

  public query ({ caller }) func getBookingById(bookingId : Text) : async ?Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookings");
    };

    let booking = switch (bookings.get(bookingId)) {
      case (null) { return null };
      case (?b) { b };
    };

    let userProfile = requireUserProfile(caller);

    // Users can only view their own bookings, vendors can view bookings for their events, admins can view all
    if (not isSuperAdmin(caller)) {
      if (booking.userId != userProfile.id) {
        // Check if caller is the vendor of the event
        let event = switch (events.get(booking.eventId)) {
          case (null) { Runtime.trap("Event not found") };
          case (?e) { e };
        };
        if (event.vendorId != userProfile.id) {
          Runtime.trap("Unauthorized: Can only view your own bookings or bookings for your events");
        };
      };
    };

    ?booking;
  };

  public shared ({ caller }) func cancelBooking(bookingId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can cancel bookings");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    let booking = switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?b) { b };
    };

    // Users can only cancel their own bookings
    if (booking.userId != userProfile.id) {
      Runtime.trap("Unauthorized: Users can only cancel their own bookings");
    };

    let updatedBooking = {
      id = booking.id;
      userId = booking.userId;
      eventId = booking.eventId;
      ticketTypeId = booking.ticketTypeId;
      quantity = booking.quantity;
      seatNumbers = booking.seatNumbers;
      timeSlot = booking.timeSlot;
      lockToken = booking.lockToken;
      status = #cancelled;
      totalAmount = booking.totalAmount;
      stripeSessionId = booking.stripeSessionId;
      idempotencyKey = booking.idempotencyKey;
      fraudScore = booking.fraudScore;
      notes = booking.notes;
      createdAt = booking.createdAt;
    };

    bookings.add(bookingId, updatedBooking);
    logAudit(#bookingCancelled, principalToText(caller), bookingId, "Booking cancelled by user");
  };

  // Refund Management
  public shared ({ caller }) func requestRefund(bookingId : Text, reason : Text) : async Refund {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can request refunds");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    let userProfile = requireUserProfile(caller);

    let booking = switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?b) { b };
    };

    // Users can only request refunds for their own bookings
    if (booking.userId != userProfile.id) {
      Runtime.trap("Unauthorized: Users can only request refunds for their own bookings");
    };

    let refundId = bookingId # "-refund-" # Time.now().toText();
    let newRefund : Refund = {
      id = refundId;
      bookingId = bookingId;
      amount = booking.totalAmount;
      status = #pending;
      reason = reason;
      createdAt = Time.now();
    };

    refunds.add(refundId, newRefund);
    logAudit(#refundInitiated, principalToText(caller), refundId, "Refund requested: " # reason);
    newRefund;
  };

  public shared ({ caller }) func processRefund(refundId : Text, approve : Bool) : async () {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can process refunds");
    };

    let refund = switch (refunds.get(refundId)) {
      case (null) { Runtime.trap("Refund not found") };
      case (?r) { r };
    };

    let newStatus = if (approve) { #processed } else { #rejected };

    let updatedRefund = {
      id = refund.id;
      bookingId = refund.bookingId;
      amount = refund.amount;
      status = newStatus;
      reason = refund.reason;
      createdAt = refund.createdAt;
    };

    refunds.add(refundId, updatedRefund);

    if (approve) {
      // Update booking status to refunded
      let booking = switch (bookings.get(refund.bookingId)) {
        case (null) { Runtime.trap("Booking not found") };
        case (?b) { b };
      };

      let updatedBooking = {
        id = booking.id;
        userId = booking.userId;
        eventId = booking.eventId;
        ticketTypeId = booking.ticketTypeId;
        quantity = booking.quantity;
        seatNumbers = booking.seatNumbers;
        timeSlot = booking.timeSlot;
        lockToken = booking.lockToken;
        status = #refunded;
        totalAmount = booking.totalAmount;
        stripeSessionId = booking.stripeSessionId;
        idempotencyKey = booking.idempotencyKey;
        fraudScore = booking.fraudScore;
        notes = booking.notes;
        createdAt = booking.createdAt;
      };

      bookings.add(refund.bookingId, updatedBooking);
    };

    logAudit(#adminAction, principalToText(caller), refundId, if (approve) { "Refund approved" } else { "Refund rejected" });
  };

  // Fraud Management
  public shared ({ caller }) func reviewFraudBooking(bookingId : Text, approve : Bool) : async () {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can review fraud bookings");
    };

    let booking = switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?b) { b };
    };

    let newStatus = if (approve) { #confirmed } else { #cancelled };

    let updatedBooking = {
      id = booking.id;
      userId = booking.userId;
      eventId = booking.eventId;
      ticketTypeId = booking.ticketTypeId;
      quantity = booking.quantity;
      seatNumbers = booking.seatNumbers;
      timeSlot = booking.timeSlot;
      lockToken = booking.lockToken;
      status = newStatus;
      totalAmount = booking.totalAmount;
      stripeSessionId = booking.stripeSessionId;
      idempotencyKey = booking.idempotencyKey;
      fraudScore = booking.fraudScore;
      notes = booking.notes;
      createdAt = booking.createdAt;
    };

    bookings.add(bookingId, updatedBooking);
    logAudit(#adminAction, principalToText(caller), bookingId, if (approve) { "Fraud booking approved" } else { "Fraud booking rejected" });
  };

  public query ({ caller }) func getFraudQueue() : async [Booking] {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can view fraud queue");
    };

    let allBookings = bookings.values().toArray();
    allBookings.filter<Booking>(func(b) { b.fraudScore >= 70 and b.status == #pending });
  };

  // Admin Dashboard
  public query ({ caller }) func getPlatformStats() : async {
    totalUsers : Nat;
    totalVendors : Nat;
    activeEvents : Nat;
    confirmedBookings : Nat;
    totalRevenue : Nat;
  } {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can view platform stats");
    };

    let allUsers = userProfiles.values().toArray();
    let allVendors = vendorProfiles.values().toArray();
    let allEvents = events.values().toArray();
    let allBookings = bookings.values().toArray();

    let activeEvents = allEvents.filter(func(e) {
      switch (e.status) {
        case (#published) { true };
        case (_) { false };
      };
    });

    let confirmedBookings = allBookings.filter(func(b) {
      switch (b.status) {
        case (#confirmed) { true };
        case (_) { false };
      };
    });

    var totalRevenue : Nat = 0;
    for (booking in confirmedBookings.vals()) {
      totalRevenue += booking.totalAmount;
    };

    {
      totalUsers = allUsers.size();
      totalVendors = allVendors.size();
      activeEvents = activeEvents.size();
      confirmedBookings = confirmedBookings.size();
      totalRevenue = totalRevenue;
    };
  };

  public query ({ caller }) func getVendorApprovalQueue() : async [VendorProfile] {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can view vendor approval queue");
    };

    let allVendors = vendorProfiles.values().toArray();
    allVendors.filter<VendorProfile>(func(v) {
      switch (v.approvalStatus) {
        case (#pending) { true };
        case (_) { false };
      };
    });
  };

  // Vendor Dashboard
  public query ({ caller }) func getMyVendorEvents() : async [Event] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view vendor events");
    };

    let userProfile = requireUserProfile(caller);

    if (not isVendor(caller)) {
      Runtime.trap("Unauthorized: Only vendors can view vendor events");
    };

    let allEvents = events.values().toArray();
    allEvents.filter<Event>(func(e) { e.vendorId == userProfile.id });
  };

  public query ({ caller }) func getMyVendorStats() : async {
    totalEvents : Nat;
    totalBookings : Nat;
    totalRevenue : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view vendor stats");
    };

    let userProfile = requireUserProfile(caller);

    if (not isVendor(caller)) {
      Runtime.trap("Unauthorized: Only vendors can view vendor stats");
    };

    let allEvents = events.values().toArray();
    let vendorEvents = allEvents.filter(func(e) { e.vendorId == userProfile.id });

    let allBookings = bookings.values().toArray();
    let vendorBookings = allBookings.filter(func(b) {
      let event = switch (events.get(b.eventId)) {
        case (null) { return false };
        case (?e) { e };
      };
      event.vendorId == userProfile.id and b.status == #confirmed;
    });

    var totalRevenue : Nat = 0;
    for (booking in vendorBookings.vals()) {
      totalRevenue += booking.totalAmount;
    };

    {
      totalEvents = vendorEvents.size();
      totalBookings = vendorBookings.size();
      totalRevenue = totalRevenue;
    };
  };

  // Audit Log
  public query ({ caller }) func getAuditLogs(startTime : Time.Time, endTime : Time.Time, actionType : ?ActionType) : async [AuditLog] {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can view audit logs");
    };

    let allLogs = auditLogs.values().toArray();
    allLogs.filter<AuditLog>(func(log) {
      let timeMatch = log.timestamp >= startTime and log.timestamp <= endTime;
      let typeMatch = switch (actionType) {
        case (null) { true };
        case (?t) { log.actionType == t };
      };
      timeMatch and typeMatch;
    });
  };

  // User Management (Admin)
  public shared ({ caller }) func suspendUser(userId : Principal) : async () {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can suspend users");
    };

    let userProfile = switch (userProfiles.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { profile };
    };

    let updatedProfile = {
      id = userProfile.id;
      name = userProfile.name;
      email = userProfile.email;
      appRole = userProfile.appRole;
      status = #suspended;
      createdAt = userProfile.createdAt;
    };

    userProfiles.add(userId, updatedProfile);
    logAudit(#adminAction, principalToText(caller), userProfile.id, "User suspended");
  };

  public shared ({ caller }) func activateUser(userId : Principal) : async () {
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Unauthorized: Only super admins can activate users");
    };

    let userProfile = switch (userProfiles.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) { profile };
    };

    let updatedProfile = {
      id = userProfile.id;
      name = userProfile.name;
      email = userProfile.email;
      appRole = userProfile.appRole;
      status = #active;
      createdAt = userProfile.createdAt;
    };

    userProfiles.add(userId, updatedProfile);
    logAudit(#adminAction, principalToText(caller), userProfile.id, "User activated");
  };

  // Stripe Integration
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  var stripeConfiguration : ?Stripe.StripeConfiguration = null;

  public query func isStripeConfigured() : async Bool {
    stripeConfiguration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfiguration := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Runtime.trap("Stripe configuration not found!") };
      case (?config) { config };
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };

    if (not isUserActive(caller)) {
      Runtime.trap("Unauthorized: User account is suspended");
    };

    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };
};
