# BOOK NOW – DMT CREATOLOGY

## Current State
Platform has been partially built in prior versions with three dashboards, booking flow, currency system, Stripe integration, and fraud scoring. This rebuild starts clean from the current spec to ensure all modules are properly integrated and the UI matches the premium dark futuristic standard required.

## Requested Changes (Diff)

### Add
- Preloaded event profiles with banner images and promo video placeholders (editable in admin)
- World Top 100 + India Top 100 pinned sections on marketplace homepage and customer dashboard
- AI Concierge Engine UI: 4-step itinerary wizard (destination, travel dates, services selection, itinerary output)
  - Services: Flights, Buses, Luxury Cars, Hotels, Artist Booking, Shopping, VIP Passes
- Live Voting Engine: customers vote for top DJs, celebrities, artists (Global / India tabs)
- Luxury Services section: Private Jets, Luxury Cars, 5-Star Hotels, Yacht Charter, Models & Companions, VIP Experiences
- AIItineraryLog entity in backend
- PreloadedEventProfile entity in backend (pinned flag, banner URL, promo video URL, rank)
- Vendor dashboard: Banner & promo video management tab
- Admin dashboard: AI Concierge Monitor tab (active itineraries, bulk VIP lock panel)
- Super Admin role with master override capabilities
- VIP + Bundled Package ticket type
- Escrow payout management in admin (release / reject)

### Modify
- Event entity: add banners[], promoVideoUrl, isTop100Global, isTop100India, rank fields
- Marketplace hero: animated live counters + "World's Fastest Booking" tagline + DMT CREATOLOGY branding
- Customer dashboard: add AI Concierge tab, My Itineraries tab
- Admin dashboard: add Escrow Payouts tab, AI Concierge Monitor tab
- Vendor dashboard: add Media Management tab (banner upload, promo video URL)
- Fraud engine: auto-hold threshold at 70+, visible risk score badges in admin
- Currency system: flag emoji + symbol badge on all price displays

### Remove
- Nothing removed; this is a clean rebuild on top of existing architecture

## Implementation Plan

1. **Backend (Motoko):**
   - Entities: User, Event (with banners/promo/rank/top100 flags), Ticket, Booking, Payment, EscrowPayout, Vendor, AuditLog, FraudLog, AIItineraryLog, PreloadedEventProfile
   - RBAC: customer, vendor, admin, superAdmin roles
   - Booking engine: lockSeat (2-min TTL), createBooking, confirmBooking, cancelBooking
   - Payment engine: createStripeSession, handleWebhook, releaseEscrow, rejectEscrow
   - Event engine: createEvent, updateEvent, deleteEvent, listEvents, listTop100Global, listTop100India, preloadEvents
   - AI Concierge: createItinerary, getItinerary, listItineraries
   - Voting: voteForArtist, getVotingLeaderboard
   - Fraud: calculateRiskScore, holdBooking, reviewFraud
   - Audit: logAction, getAuditLog, exportAuditLog
   - Currency: setCurrencyConfig, getCurrencyConfig

2. **Frontend:**
   - Public Marketplace: hero, World Top 100 row, India Top 100 row, category grid, luxury services, live voting, top artists
   - Booking Flow: event detail → seat selection → AI concierge upsell → Stripe checkout
   - Admin Dashboard (9 tabs): Overview, Events, Vendors, Refunds, Fraud Queue, Escrow Payouts, AI Concierge Monitor, Audit Log, Settings
   - Vendor Dashboard (6 tabs): Overview, My Events, Create Event, Media Management, Analytics, My Bookings
   - Customer Dashboard (5 tabs): My Bookings, AI Concierge, My Itineraries, Profile, Stats
   - Currency selector in navbar (auto-detect + manual override)
   - Dark theme: bg-black, electric blue (#0066FF / cyan-400), futuristic typography

## UX Notes
- Dark background: #000000 / #0a0a0a
- Accent: Electric Blue #0066FF, Cyan #00D4FF
- Cards: dark glass morphism (bg-white/5 backdrop-blur border border-white/10)
- Typography: bold headings, clean sans-serif body
- All dashboards mobile-first, responsive
- World Top 100 / India Top 100 pinned with gold rank badges
- Currency badges show flag emoji + symbol + formatted amount
- AI Concierge displayed as a chat-style wizard with step indicators
