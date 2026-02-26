import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldEvent = {
    id : Text;
    title : Text;
    description : Text;
    category : { #concert; #sports; #conference; #workshop; #privateEvent };
    venue : Text;
    city : Text;
    country : Text;
    eventDate : Time.Time;
    status : { #draft; #published; #cancelled; #completed };
    vendorId : Text;
    coverImage : Text;
    tags : [Text];
    createdAt : Time.Time;
  };

  type OldTicket = {
    id : Text;
    eventId : Text;
    ticketType : { #numberedSeat; #generalAdmission; #timeSlot };
    name : Text;
    price : Nat;
    totalQuantity : Nat;
    availableQuantity : Nat;
  };

  type OldActor = {
    events : Map.Map<Text, OldEvent>;
    tickets : Map.Map<Text, OldTicket>;
    userProfiles : Map.Map<Principal, { id : Text; name : Text; email : Text; appRole : { #customer; #vendor; #superAdmin }; status : { #active; #suspended }; createdAt : Time.Time }>;
    vendorProfiles : Map.Map<Text, { userId : Text; businessName : Text; approvalStatus : { #pending; #approved; #rejected }; totalRevenue : Nat; createdAt : Time.Time }>;
    bookings : Map.Map<Text, { id : Text; userId : Text; eventId : Text; ticketTypeId : Text; quantity : Nat; seatNumbers : [Nat]; timeSlot : ?Text; lockToken : Text; status : { #pending; #confirmed; #cancelled; #refunded }; totalAmount : Nat; stripeSessionId : Text; idempotencyKey : Text; fraudScore : Nat; notes : ?Text; createdAt : Time.Time }>;
    refunds : Map.Map<Text, { id : Text; bookingId : Text; amount : Nat; status : { #pending; #processed; #rejected }; reason : Text; createdAt : Time.Time }>;
    auditLogs : Map.Map<Nat, { actionType : { #userRegistered; #vendorApproved; #eventCreated; #eventPublished; #bookingCreated; #bookingConfirmed; #bookingCancelled; #paymentSucceeded; #paymentFailed; #refundInitiated; #fraudHold; #adminAction }; actorId : Text; targetId : Text; details : Text; timestamp : Time.Time }>;
    auditLogCounter : Nat;
    stripeConfiguration : ?{ secretKey : Text; allowedCountries : [Text] };
  };

  type NewEvent = {
    id : Text;
    title : Text;
    description : Text;
    category : { #concert; #sports; #conference; #workshop; #privateEvent };
    venue : Text;
    city : Text;
    country : Text;
    eventDate : Time.Time;
    status : { #draft; #published; #cancelled; #completed };
    vendorId : Text;
    coverImage : Text;
    tags : [Text];
    baseCurrency : Text;
    supportedCurrencies : [Text];
    multiCurrencyEnabled : Bool;
    createdAt : Time.Time;
  };

  type NewTicket = {
    id : Text;
    eventId : Text;
    ticketType : { #numberedSeat; #generalAdmission; #timeSlot };
    name : Text;
    price : Nat;
    totalQuantity : Nat;
    availableQuantity : Nat;
    baseCurrency : Text;
  };

  type NewActor = {
    events : Map.Map<Text, NewEvent>;
    tickets : Map.Map<Text, NewTicket>;
    userProfiles : Map.Map<Principal, { id : Text; name : Text; email : Text; appRole : { #customer; #vendor; #superAdmin }; status : { #active; #suspended }; createdAt : Time.Time }>;
    vendorProfiles : Map.Map<Text, { userId : Text; businessName : Text; approvalStatus : { #pending; #approved; #rejected }; totalRevenue : Nat; createdAt : Time.Time }>;
    bookings : Map.Map<Text, { id : Text; userId : Text; eventId : Text; ticketTypeId : Text; quantity : Nat; seatNumbers : [Nat]; timeSlot : ?Text; lockToken : Text; status : { #pending; #confirmed; #cancelled; #refunded }; totalAmount : Nat; stripeSessionId : Text; idempotencyKey : Text; fraudScore : Nat; notes : ?Text; createdAt : Time.Time }>;
    refunds : Map.Map<Text, { id : Text; bookingId : Text; amount : Nat; status : { #pending; #processed; #rejected }; reason : Text; createdAt : Time.Time }>;
    auditLogs : Map.Map<Nat, { actionType : { #userRegistered; #vendorApproved; #eventCreated; #eventPublished; #bookingCreated; #bookingConfirmed; #bookingCancelled; #paymentSucceeded; #paymentFailed; #refundInitiated; #fraudHold; #adminAction }; actorId : Text; targetId : Text; details : Text; timestamp : Time.Time }>;
    auditLogCounter : Nat;
    stripeConfiguration : ?{ secretKey : Text; allowedCountries : [Text] };
  };

  public func run(old : OldActor) : NewActor {
    let newEvents = old.events.map<Text, OldEvent, NewEvent>(
      func(_id, oldEvent) {
        {
          oldEvent with
          baseCurrency = "INR";
          supportedCurrencies = ["INR", "USD", "EUR", "GBP", "AED"];
          multiCurrencyEnabled = true;
        };
      }
    );

    let newTickets = old.tickets.map<Text, OldTicket, NewTicket>(
      func(_id, oldTicket) {
        { oldTicket with baseCurrency = "INR" };
      }
    );

    {
      old with
      events = newEvents;
      tickets = newTickets;
    };
  };
};
