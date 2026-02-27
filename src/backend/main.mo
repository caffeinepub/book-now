import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import OutCall "http-outcalls/outcall";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserRole = {
    #customer;
    #vendor;
    #admin;
    #superAdmin;
  };

  public type User = {
    principal : Principal;
    name : Text;
    email : Text;
    role : UserRole;
    createdAt : Time.Time;
    isApproved : Bool;
  };

  public type EventType = {
    #musicFestival;
    #dj;
    #celebrity;
    #sports;
    #conference;
    #workshop;
    #privateEvent;
    #luxuryParty;
    #modelingAssignment;
  };

  public type TicketType = {
    #numberedSeat;
    #generalAdmission;
    #timeSlot;
    #vipPackage;
  };

  public type Event = {
    id : Nat;
    title : Text;
    description : Text;
    eventType : EventType;
    location : Text;
    startDate : Time.Time;
    endDate : Time.Time;
    basePriceINR : Nat;
    baseCurrency : Text;
    supportedCurrencies : [Text];
    multiCurrencyEnabled : Bool;
    totalSeats : Nat;
    availableSeats : Nat;
    ticketType : TicketType;
    vendorId : Principal;
    isPublished : Bool;
    isTop100Global : Bool;
    isTop100India : Bool;
    globalRank : ?Nat;
    indiaRank : ?Nat;
    bannerUrl : Text;
    promoVideoUrl : Text;
    tags : [Text];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type SeatLock = {
    id : Nat;
    eventId : Nat;
    userId : Principal;
    seatNumber : ?Text;
    lockedAt : Int;
    expiresAt : Int;
    bookingToken : Text;
    isActive : Bool;
  };

  public type BookingStatus = {
    #pending;
    #confirmed;
    #cancelled;
    #refunded;
    #onHold;
  };

  public type Booking = {
    id : Nat;
    eventId : Nat;
    userId : Principal;
    seatLockId : Nat;
    ticketType : TicketType;
    quantity : Nat;
    totalAmountINR : Nat;
    currency : Text;
    status : BookingStatus;
    bookingToken : Text;
    stripeSessionId : ?Text;
    createdAt : Time.Time;
    confirmedAt : ?Int;
    cancelledAt : ?Int;
  };

  public type PaymentStatus = {
    #pending;
    #succeeded;
    #failed;
    #refunded;
  };

  public type Payment = {
    id : Nat;
    bookingId : Nat;
    userId : Principal;
    amountINR : Nat;
    currency : Text;
    stripeSessionId : Text;
    stripePaymentIntentId : ?Text;
    status : PaymentStatus;
    escrowFlag : Bool;
    escrowReleasedAt : ?Int;
    idempotencyKey : Text;
    createdAt : Time.Time;
  };

  public type EscrowPayoutStatus = {
    #pending;
    #released;
    #rejected;
  };

  public type EscrowPayout = {
    id : Nat;
    vendorId : Principal;
    eventId : Nat;
    amountINR : Nat;
    status : EscrowPayoutStatus;
    requestedAt : Int;
    processedAt : ?Int;
    adminNote : ?Text;
  };

  public type FraudStatus = {
    #flagged;
    #cleared;
    #autoHeld;
  };

  public type FraudLog = {
    id : Nat;
    bookingId : Nat;
    userId : Principal;
    riskScore : Nat;
    flags : [Text];
    status : FraudStatus;
    createdAt : Time.Time;
  };

  public type AuditLog = {
    id : Nat;
    userActor : Principal;
    action : Text;
    entityType : Text;
    entityId : Text;
    details : Text;
    timestamp : Int;
  };

  public type AIItineraryStatus = {
    #draft;
    #confirmed;
    #cancelled;
  };

  public type AIItineraryLog = {
    id : Nat;
    userId : Principal;
    eventId : ?Text;
    destination : Text;
    travelDates : Text;
    services : [Text];
    itineraryData : Text;
    status : AIItineraryStatus;
    createdAt : Time.Time;
  };

  public type PreloadedEventProfile = {
    id : Nat;
    eventId : ?Text;
    title : Text;
    eventType : EventType;
    location : Text;
    basePriceINR : Nat;
    bannerUrl : Text;
    promoVideoUrl : Text;
    isTop100Global : Bool;
    isTop100India : Bool;
    globalRank : ?Nat;
    indiaRank : ?Nat;
    isActive : Bool;
  };

  public type VotingEntry = {
    id : Nat;
    artistName : Text;
    category : Text;
    region : Text;
    voteCount : Nat;
    createdAt : Time.Time;
  };

  public type ExchangeRates = {
    inrToUsd : Float;
    inrToEur : Float;
    inrToAed : Float;
    inrToGbp : Float;
  };

  // State variables
  let users = Map.empty<Principal, User>();
  var nextEventId : Nat = 1;
  let events = Map.empty<Nat, Event>();
  var nextSeatLockId : Nat = 1;
  let seatLocks = Map.empty<Nat, SeatLock>();
  var nextBookingId : Nat = 1;
  let bookings = Map.empty<Nat, Booking>();
  var nextPaymentId : Nat = 1;
  let payments = Map.empty<Nat, Payment>();
  var nextEscrowPayoutId : Nat = 1;
  let escrowPayouts = Map.empty<Nat, EscrowPayout>();
  var nextFraudLogId : Nat = 1;
  let fraudLogs = Map.empty<Nat, FraudLog>();
  var nextAuditLogId : Nat = 1;
  let auditLogs = Map.empty<Nat, AuditLog>();
  var nextItineraryId : Nat = 1;
  let itineraries = Map.empty<Nat, AIItineraryLog>();
  var nextPreloadedProfileId : Nat = 1;
  let preloadedProfiles = Map.empty<Nat, PreloadedEventProfile>();
  var nextVotingEntryId : Nat = 1;
  let votingEntries = Map.empty<Nat, VotingEntry>();
  var exchangeRates : ExchangeRates = {
    inrToUsd = 0.012;
    inrToEur = 0.011;
    inrToAed = 0.044;
    inrToGbp = 0.0095;
  };
  var stripeConfiguration : ?Stripe.StripeConfiguration = null;

  func isAdmin(caller : Principal) : Bool {
    switch (users.get(caller)) {
      case (?user) {
        switch (user.role) {
          case (#admin or #superAdmin) { true };
          case _ { false };
        };
      };
      case null { false };
    };
  };

  func isVendor(caller : Principal) : Bool {
    switch (users.get(caller)) {
      case (?user) {
        switch (user.role) {
          case (#vendor) { user.isApproved };
          case _ { false };
        };
      };
      case null { false };
    };
  };

  func isApprovedVendor(caller : Principal) : Bool {
    switch (users.get(caller)) {
      case (?user) {
        switch (user.role) {
          case (#vendor) { user.isApproved };
          case _ { false };
        };
      };
      case null { false };
    };
  };

  func logAudit(userActor : Principal, action : Text, entityType : Text, entityId : Text, details : Text) {
    let log : AuditLog = {
      id = nextAuditLogId;
      userActor;
      action;
      entityType;
      entityId;
      details;
      timestamp = Time.now();
    };
    auditLogs.add(nextAuditLogId, log);
    nextAuditLogId += 1;
  };

  // User Management
  public shared ({ caller }) func registerUser(name : Text, email : Text, role : UserRole) : async () {
    if (users.containsKey(caller)) {
      Runtime.trap("Already registered user");
    };
    let user : User = {
      principal = caller;
      name;
      email;
      role;
      createdAt = Time.now();
      isApproved = switch (role) {
        case (#customer or #admin or #superAdmin) { true };
        case (#vendor) { false };
      };
    };
    users.add(caller, user);
    logAudit(caller, "USER_REGISTERED", "User", caller.toText(), "Role: " # debug_show(role));
  };

  public query ({ caller }) func getCallerUserProfile() : async ?User {
    users.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(name : Text, email : Text) : async () {
    switch (users.get(caller)) {
      case (?user) {
        let updated = {
          user with
          name = name;
          email = email;
        };
        users.add(caller, updated);
      };
      case null {
        Runtime.trap("User not found");
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?User {
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    users.get(user);
  };

  public query ({ caller }) func listAllUsers() : async [User] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list all users");
    };
    users.values().toArray();
  };

  public shared ({ caller }) func approveVendor(vendorPrincipal : Principal) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can approve vendors");
    };
    switch (users.get(vendorPrincipal)) {
      case (?user) {
        switch (user.role) {
          case (#vendor) {
            let updated = { user with isApproved = true };
            users.add(vendorPrincipal, updated);
            logAudit(caller, "VENDOR_APPROVED", "User", vendorPrincipal.toText(), "Vendor approved");
          };
          case _ {
            Runtime.trap("User is not a vendor");
          };
        };
      };
      case null {
        Runtime.trap("User not found");
      };
    };
  };

  // Event Management
  public shared ({ caller }) func createEvent(
    title : Text,
    description : Text,
    eventType : EventType,
    location : Text,
    startDate : Time.Time,
    endDate : Time.Time,
    basePriceINR : Nat,
    supportedCurrencies : [Text],
    multiCurrencyEnabled : Bool,
    totalSeats : Nat,
    ticketType : TicketType,
    bannerUrl : Text,
    promoVideoUrl : Text,
    tags : [Text],
  ) : async Nat {
    if (not (isAdmin(caller) or isApprovedVendor(caller))) {
      Runtime.trap("Unauthorized: Only approved vendors or admins can create events");
    };

    let event : Event = {
      id = nextEventId;
      title;
      description;
      eventType;
      location;
      startDate;
      endDate;
      basePriceINR;
      baseCurrency = "INR";
      supportedCurrencies;
      multiCurrencyEnabled;
      totalSeats;
      availableSeats = totalSeats;
      ticketType;
      vendorId = caller;
      isPublished = false;
      isTop100Global = false;
      isTop100India = false;
      globalRank = null;
      indiaRank = null;
      bannerUrl;
      promoVideoUrl;
      tags;
      createdAt = Time.now();
      updatedAt = Time.now();
    };
    events.add(nextEventId, event);
    logAudit(caller, "EVENT_CREATED", "Event", nextEventId.toText(), title);
    nextEventId += 1;
    event.id;
  };

  public shared ({ caller }) func updateEvent(
    eventId : Nat,
    title : Text,
    description : Text,
    location : Text,
    basePriceINR : Nat,
    bannerUrl : Text,
    promoVideoUrl : Text,
    tags : [Text],
  ) : async () {
    switch (events.get(eventId)) {
      case (?event) {
        if (not (isAdmin(caller) or (event.vendorId == caller and isApprovedVendor(caller)))) {
          Runtime.trap("Unauthorized: Only event owner or admin can update event");
        };
        let updated = {
          event with
          title = title;
          description = description;
          location = location;
          basePriceINR = basePriceINR;
          bannerUrl = bannerUrl;
          promoVideoUrl = promoVideoUrl;
          tags = tags;
          updatedAt = Time.now();
        };
        events.add(eventId, updated);
        logAudit(caller, "EVENT_UPDATED", "Event", eventId.toText(), title);
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  public shared ({ caller }) func deleteEvent(eventId : Nat) : async () {
    switch (events.get(eventId)) {
      case (?event) {
        if (not (isAdmin(caller) or (event.vendorId == caller and isApprovedVendor(caller)))) {
          Runtime.trap("Unauthorized: Only event owner or admin can delete event");
        };
        events.remove(eventId);
        logAudit(caller, "EVENT_DELETED", "Event", eventId.toText(), event.title);
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  public shared ({ caller }) func publishEvent(eventId : Nat) : async () {
    switch (events.get(eventId)) {
      case (?event) {
        if (not (isAdmin(caller) or (event.vendorId == caller and isApprovedVendor(caller)))) {
          Runtime.trap("Unauthorized: Only event owner or admin can publish event");
        };
        let updated = { event with isPublished = true; updatedAt = Time.now() };
        events.add(eventId, updated);
        logAudit(caller, "EVENT_PUBLISHED", "Event", eventId.toText(), event.title);
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  public shared ({ caller }) func unpublishEvent(eventId : Nat) : async () {
    switch (events.get(eventId)) {
      case (?event) {
        if (not (isAdmin(caller) or (event.vendorId == caller and isApprovedVendor(caller)))) {
          Runtime.trap("Unauthorized: Only event owner or admin can unpublish event");
        };
        let updated = { event with isPublished = false; updatedAt = Time.now() };
        events.add(eventId, updated);
        logAudit(caller, "EVENT_UNPUBLISHED", "Event", eventId.toText(), event.title);
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  public shared ({ caller }) func setEventTop100(
    eventId : Nat,
    isTop100Global : Bool,
    isTop100India : Bool,
    globalRank : ?Nat,
    indiaRank : ?Nat,
  ) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can set Top100 flags");
    };
    switch (events.get(eventId)) {
      case (?event) {
        let updated = {
          event with
          isTop100Global = isTop100Global;
          isTop100India = isTop100India;
          globalRank = globalRank;
          indiaRank = indiaRank;
          updatedAt = Time.now();
        };
        events.add(eventId, updated);
        logAudit(caller, "EVENT_TOP100_SET", "Event", eventId.toText(), event.title);
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  public query func listPublishedEvents(
    eventType : ?EventType,
    location : ?Text,
    minPrice : ?Nat,
    maxPrice : ?Nat,
    isTop100Global : ?Bool,
    isTop100India : ?Bool,
  ) : async [Event] {
    let filtered = events.filter(func(_id, event) {
      var match = event.isPublished;
      switch (eventType) {
        case (?et) { match := match and event.eventType == et };
        case null {};
      };
      switch (location) {
        case (?loc) { match := match and event.location == loc };
        case null {};
      };
      switch (minPrice) {
        case (?min) { match := match and event.basePriceINR >= min };
        case null {};
      };
      switch (maxPrice) {
        case (?max) { match := match and event.basePriceINR <= max };
        case null {};
      };
      switch (isTop100Global) {
        case (?flag) { match := match and event.isTop100Global == flag };
        case null {};
      };
      switch (isTop100India) {
        case (?flag) { match := match and event.isTop100India == flag };
        case null {};
      };
      match;
    });
    filtered.values().toArray();
  };

  public query func getEvent(eventId : Nat) : async ?Event {
    events.get(eventId);
  };

  // Preloaded Event Profiles
  public shared ({ caller }) func createPreloadedProfile(
    eventId : ?Text,
    title : Text,
    eventType : EventType,
    location : Text,
    basePriceINR : Nat,
    bannerUrl : Text,
    promoVideoUrl : Text,
    isTop100Global : Bool,
    isTop100India : Bool,
    globalRank : ?Nat,
    indiaRank : ?Nat,
  ) : async Nat {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can create preloaded profiles");
    };
    let profile : PreloadedEventProfile = {
      id = nextPreloadedProfileId;
      eventId;
      title;
      eventType;
      location;
      basePriceINR;
      bannerUrl;
      promoVideoUrl;
      isTop100Global;
      isTop100India;
      globalRank;
      indiaRank;
      isActive = true;
    };
    preloadedProfiles.add(nextPreloadedProfileId, profile);
    nextPreloadedProfileId += 1;
    profile.id;
  };

  public query func listPreloadedProfiles() : async [PreloadedEventProfile] {
    let filtered = preloadedProfiles.filter(func(_id, profile) { profile.isActive });
    filtered.values().toArray();
  };

  // Booking Engine
  public shared ({ caller }) func lockSeat(eventId : Nat, seatNumber : ?Text) : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can lock seats");
    };

    switch (events.get(eventId)) {
      case (?event) {
        if (event.availableSeats == 0) {
          Runtime.trap("No seats available");
        };

        // Release expired locks first
        releaseExpiredLocksForEvent(eventId);

        let now = Time.now();
        let expiresAt = now + 120_000_000_000; // 2 minutes in nanoseconds
        let bookingToken = caller.toText() # "-" # nextSeatLockId.toText() # "-" # now.toText();

        let lock : SeatLock = {
          id = nextSeatLockId;
          eventId;
          userId = caller;
          seatNumber;
          lockedAt = now;
          expiresAt;
          bookingToken;
          isActive = true;
        };
        seatLocks.add(nextSeatLockId, lock);
        nextSeatLockId += 1;

        // Decrease available seats
        let updatedEvent = { event with availableSeats = event.availableSeats - 1 };
        events.add(eventId, updatedEvent);

        bookingToken;
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  func releaseExpiredLocksForEvent(eventId : Nat) {
    let now = Time.now();
    for ((lockId, lock) in seatLocks.entries()) {
      if (lock.eventId == eventId and lock.isActive and lock.expiresAt < now) {
        let deactivated = { lock with isActive = false };
        seatLocks.add(lockId, deactivated);

        // Restore seat
        switch (events.get(eventId)) {
          case (?event) {
            let updated = { event with availableSeats = event.availableSeats + 1 };
            events.add(eventId, updated);
          };
          case null {};
        };
      };
    };
  };

  public shared ({ caller }) func createBooking(
    eventId : Nat,
    seatLockId : Nat,
    quantity : Nat,
    currency : Text,
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create bookings");
    };

    switch (seatLocks.get(seatLockId)) {
      case (?lock) {
        if (lock.userId != caller) {
          Runtime.trap("Seat lock does not belong to caller");
        };
        if (not lock.isActive) {
          Runtime.trap("Seat lock is not active");
        };
        if (lock.expiresAt < Time.now()) {
          Runtime.trap("Seat lock has expired");
        };

        switch (events.get(eventId)) {
          case (?event) {
            let booking : Booking = {
              id = nextBookingId;
              eventId;
              userId = caller;
              seatLockId;
              ticketType = event.ticketType;
              quantity;
              totalAmountINR = event.basePriceINR * quantity;
              currency;
              status = #pending;
              bookingToken = lock.bookingToken;
              stripeSessionId = null;
              createdAt = Time.now();
              confirmedAt = null;
              cancelledAt = null;
            };
            bookings.add(nextBookingId, booking);
            logAudit(caller, "BOOKING_CREATED", "Booking", nextBookingId.toText(), "Event: " # eventId.toText());

            // Calculate fraud risk
            let riskScore = calculateRiskScore(caller, booking.totalAmountINR);
            if (riskScore > 70) {
              let fraudLog : FraudLog = {
                id = nextFraudLogId;
                bookingId = nextBookingId;
                userId = caller;
                riskScore;
                flags = ["HIGH_RISK_SCORE"];
                status = #autoHeld;
                createdAt = Time.now();
              };
              fraudLogs.add(nextFraudLogId, fraudLog);
              nextFraudLogId += 1;

              let heldBooking = { booking with status = #onHold };
              bookings.add(nextBookingId, heldBooking);
              logAudit(caller, "FRAUD_FLAGGED", "Booking", nextBookingId.toText(), "Risk score: " # riskScore.toText());
            };

            nextBookingId += 1;
            booking.id;
          };
          case null {
            Runtime.trap("Event not found");
          };
        };
      };
      case null {
        Runtime.trap("Seat lock not found");
      };
    };
  };

  func calculateRiskScore(userId : Principal, amount : Nat) : Nat {
    var score : Nat = 0;

    // Check for multiple bookings in short time
    let now = Time.now();
    let recentBookings = bookings.filter(func(_id, booking) {
      booking.userId == userId and (now - booking.createdAt) < 3600_000_000_000 // 1 hour
    });
    let recentCount = recentBookings.size();
    if (recentCount > 3) {
      score += 30;
    };

    // High-value booking
    if (amount > 100000) {
      score += 25;
    };

    // New account
    switch (users.get(userId)) {
      case (?user) {
        if ((now - user.createdAt) < 86400_000_000_000) { // 24 hours
          score += 20;
        };
      };
      case null {};
    };

    score;
  };

  public shared ({ caller }) func confirmBooking(bookingId : Nat, stripeSessionId : Text) : async () {
    switch (bookings.get(bookingId)) {
      case (?booking) {
        if (booking.userId != caller and not isAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only confirm your own booking");
        };
        if (booking.status != #pending) {
          Runtime.trap("Booking is not in pending status");
        };

        let confirmed = {
          booking with
          status = #confirmed;
          stripeSessionId = ?stripeSessionId;
          confirmedAt = ?Time.now();
        };
        bookings.add(bookingId, confirmed);

        // Create payment record
        let payment : Payment = {
          id = nextPaymentId;
          bookingId;
          userId = booking.userId;
          amountINR = booking.totalAmountINR;
          currency = booking.currency;
          stripeSessionId;
          stripePaymentIntentId = null;
          status = #succeeded;
          escrowFlag = true;
          escrowReleasedAt = null;
          idempotencyKey = stripeSessionId;
          createdAt = Time.now();
        };
        payments.add(nextPaymentId, payment);
        nextPaymentId += 1;

        logAudit(caller, "BOOKING_CONFIRMED", "Booking", bookingId.toText(), "Payment: " # stripeSessionId);
      };
      case null {
        Runtime.trap("Booking not found");
      };
    };
  };

  public shared ({ caller }) func cancelBooking(bookingId : Nat) : async () {
    switch (bookings.get(bookingId)) {
      case (?booking) {
        if (booking.userId != caller and not isAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only cancel your own booking or be admin");
        };

        let cancelled = {
          booking with
          status = #cancelled;
          cancelledAt = ?Time.now();
        };
        bookings.add(bookingId, cancelled);

        // Restore seat
        switch (events.get(booking.eventId)) {
          case (?event) {
            let updated = { event with availableSeats = event.availableSeats + booking.quantity };
            events.add(booking.eventId, updated);
          };
          case null {};
        };

        logAudit(caller, "BOOKING_CANCELLED", "Booking", bookingId.toText(), "");
      };
      case null {
        Runtime.trap("Booking not found");
      };
    };
  };

  public query ({ caller }) func listMyBookings() : async [Booking] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list bookings");
    };
    let filtered = bookings.filter(func(_id, booking) { booking.userId == caller });
    filtered.values().toArray();
  };

  public query ({ caller }) func listAllBookings() : async [Booking] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list all bookings");
    };
    bookings.values().toArray();
  };

  // Escrow & Payouts
  public shared ({ caller }) func requestEscrowPayout(eventId : Nat) : async Nat {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can request escrow payouts");
    };

    switch (events.get(eventId)) {
      case (?event) {
        let payout : EscrowPayout = {
          id = nextEscrowPayoutId;
          vendorId = event.vendorId;
          eventId;
          amountINR = 0; // Calculate from payments
          status = #pending;
          requestedAt = Time.now();
          processedAt = null;
          adminNote = null;
        };
        escrowPayouts.add(nextEscrowPayoutId, payout);
        logAudit(caller, "ESCROW_PAYOUT_REQUESTED", "EscrowPayout", nextEscrowPayoutId.toText(), "Event: " # eventId.toText());
        nextEscrowPayoutId += 1;
        payout.id;
      };
      case null {
        Runtime.trap("Event not found");
      };
    };
  };

  public shared ({ caller }) func releaseEscrowPayout(payoutId : Nat, adminNote : Text) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can release escrow payouts");
    };

    switch (escrowPayouts.get(payoutId)) {
      case (?payout) {
        let released = {
          payout with
          status = #released;
          processedAt = ?Time.now();
          adminNote = ?adminNote;
        };
        escrowPayouts.add(payoutId, released);
        logAudit(caller, "ESCROW_RELEASED", "EscrowPayout", payoutId.toText(), adminNote);
      };
      case null {
        Runtime.trap("Payout not found");
      };
    };
  };

  public shared ({ caller }) func rejectEscrowPayout(payoutId : Nat, adminNote : Text) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can reject escrow payouts");
    };

    switch (escrowPayouts.get(payoutId)) {
      case (?payout) {
        let rejected = {
          payout with
          status = #rejected;
          processedAt = ?Time.now();
          adminNote = ?adminNote;
        };
        escrowPayouts.add(payoutId, rejected);
        logAudit(caller, "ESCROW_REJECTED", "EscrowPayout", payoutId.toText(), adminNote);
      };
      case null {
        Runtime.trap("Payout not found");
      };
    };
  };

  public query ({ caller }) func listEscrowPayouts() : async [EscrowPayout] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list escrow payouts");
    };
    escrowPayouts.values().toArray();
  };

  // Fraud Detection
  public query ({ caller }) func listFraudLogs() : async [FraudLog] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list fraud logs");
    };
    fraudLogs.values().toArray();
  };

  public shared ({ caller }) func reviewFraudFlag(fraudLogId : Nat, clearFlag : Bool) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can review fraud flags");
    };

    switch (fraudLogs.get(fraudLogId)) {
      case (?log) {
        let updated = {
          log with
          status = if (clearFlag) { #cleared } else { #flagged };
        };
        fraudLogs.add(fraudLogId, updated);

        // Update booking status
        switch (bookings.get(log.bookingId)) {
          case (?booking) {
            if (clearFlag and booking.status == #onHold) {
              let released = { booking with status = #pending };
              bookings.add(log.bookingId, released);
            };
          };
          case null {};
        };

        logAudit(caller, "FRAUD_REVIEWED", "FraudLog", fraudLogId.toText(), if (clearFlag) { "Cleared" } else { "Confirmed" });
      };
      case null {
        Runtime.trap("Fraud log not found");
      };
    };
  };

  // Audit Logs
  public query ({ caller }) func listAuditLogs(
    userActor : ?Principal,
    action : ?Text,
    startTime : ?Int,
    endTime : ?Int,
  ) : async [AuditLog] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list audit logs");
    };

    let filtered = auditLogs.filter(func(_id, log) {
      var match = true;
      switch (userActor) {
        case (?userActor) { match := match and log.userActor == userActor };
        case null {};
      };
      switch (action) {
        case (?act) { match := match and log.action == act };
        case null {};
      };
      switch (startTime) {
        case (?st) { match := match and log.timestamp >= st };
        case null {};
      };
      switch (endTime) {
        case (?et) { match := match and log.timestamp <= et };
        case null {};
      };
      match;
    });
    filtered.values().toArray();
  };

  // AI Concierge
  public shared ({ caller }) func createItinerary(
    eventId : ?Text,
    destination : Text,
    travelDates : Text,
    services : [Text],
  ) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create itineraries");
    };

    let itinerary : AIItineraryLog = {
      id = nextItineraryId;
      userId = caller;
      eventId;
      destination;
      travelDates;
      services;
      itineraryData = "Generated itinerary data";
      status = #draft;
      createdAt = Time.now();
    };
    itineraries.add(nextItineraryId, itinerary);
    nextItineraryId += 1;
    itinerary.id;
  };

  public query ({ caller }) func getItinerary(itineraryId : Nat) : async ?AIItineraryLog {
    switch (itineraries.get(itineraryId)) {
      case (?itinerary) {
        if (itinerary.userId != caller and not isAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only view your own itinerary");
        };
        ?itinerary;
      };
      case null { null };
    };
  };

  public query ({ caller }) func listMyItineraries() : async [AIItineraryLog] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list itineraries");
    };
    let filtered = itineraries.filter(func(_id, itinerary) { itinerary.userId == caller });
    filtered.values().toArray();
  };

  // Voting Engine
  public shared ({ caller }) func voteForArtist(artistName : Text, category : Text, region : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can vote");
    };

    // Find existing entry
    var found = false;
    for ((id, entry) in votingEntries.entries()) {
      if (entry.artistName == artistName and entry.category == category and entry.region == region) {
        let updated = { entry with voteCount = entry.voteCount + 1 };
        votingEntries.add(id, updated);
        found := true;
      };
    };

    if (not found) {
      let newEntry : VotingEntry = {
        id = nextVotingEntryId;
        artistName;
        category;
        region;
        voteCount = 1;
        createdAt = Time.now();
      };
      votingEntries.add(nextVotingEntryId, newEntry);
      nextVotingEntryId += 1;
    };
  };

  public query func getLeaderboard(region : ?Text, category : ?Text, limit : Nat) : async [VotingEntry] {
    let filtered = votingEntries.filter(func(_id, entry) {
      var match = true;
      switch (region) {
        case (?r) { match := match and entry.region == r };
        case null {};
      };
      switch (category) {
        case (?c) { match := match and entry.category == c };
        case null {};
      };
      match;
    });
    let arr = filtered.values().toArray();
    // Sort by voteCount descending (simplified)
    arr;
  };

  // Currency & Config
  public shared ({ caller }) func setExchangeRates(
    inrToUsd : Float,
    inrToEur : Float,
    inrToAed : Float,
    inrToGbp : Float,
  ) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can set exchange rates");
    };
    exchangeRates := { inrToUsd; inrToEur; inrToAed; inrToGbp };
  };

  public query func getExchangeRates() : async ExchangeRates {
    exchangeRates;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can set Stripe configuration");
    };
    stripeConfiguration := ?config;
  };

  public query func isStripeConfigured() : async Bool {
    stripeConfiguration != null;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Runtime.trap("Stripe configuration not found!") };
      case (?config) { config };
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Stats
  public query ({ caller }) func getPlatformStats() : async {
    totalUsers : Nat;
    totalVendors : Nat;
    totalEvents : Nat;
    totalBookings : Nat;
    totalRevenueINR : Nat;
    activeFraudAlerts : Nat;
    pendingEscrowPayouts : Nat;
  } {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can view platform stats");
    };

    let totalUsers = users.size();
    let totalVendors = users.filter(func(_p, u) {
      switch (u.role) {
        case (#vendor) { true };
        case _ { false };
      };
    }).size();
    let totalEvents = events.size();
    let totalBookings = bookings.size();
    var totalRevenueINR : Nat = 0;
    for ((_id, booking) in bookings.entries()) {
      if (booking.status == #confirmed) {
        totalRevenueINR += booking.totalAmountINR;
      };
    };
    let activeFraudAlerts = fraudLogs.filter(func(_id, log) {
      log.status == #flagged or log.status == #autoHeld;
    }).size();
    let pendingEscrowPayouts = escrowPayouts.filter(func(_id, payout) {
      payout.status == #pending;
    }).size();

    {
      totalUsers;
      totalVendors;
      totalEvents;
      totalBookings;
      totalRevenueINR;
      activeFraudAlerts;
      pendingEscrowPayouts;
    };
  };

  public query ({ caller }) func getVendorStats() : async {
    eventsCount : Nat;
    bookingsCount : Nat;
    revenueINR : Nat;
  } {
    if (not isApprovedVendor(caller)) {
      Runtime.trap("Unauthorized: Only approved vendors can view their stats");
    };

    let vendorEvents = events.filter(func(_id, event) { event.vendorId == caller });
    let eventsCount = vendorEvents.size();

    var bookingsCount : Nat = 0;
    var revenueINR : Nat = 0;
    for ((_id, booking) in bookings.entries()) {
      switch (events.get(booking.eventId)) {
        case (?event) {
          if (event.vendorId == caller and booking.status == #confirmed) {
            bookingsCount += 1;
            revenueINR += booking.totalAmountINR;
          };
        };
        case null {};
      };
    };

    { eventsCount; bookingsCount; revenueINR };
  };
};
