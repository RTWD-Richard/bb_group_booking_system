# B&B Group Booking Management System

## Spec Provenance

**Source**: User-provided detailed requirements document for a 6-room B&B booking system with emphasis on group bookings, meal management, and operational reports.

**Key Requirements**:
- Manage bookings for exactly 6 pre-defined rooms
- Group/Event bookings as primary workflow (parent-child relationship)
- Meal add-ons with kitchen reporting
- Calendar view with group color-coding
- Housekeeping status tracking
- Multi-level discount system (per-room and per-group)
- Cross-platform support (iPhone, Android, Desktop)

## Spec Header

**Project Name**: B&B Group Booking Manager

**Smallest Acceptable Scope**: 
Full booking management system operational with:
- All 6 rooms pre-populated with Single/Double rates
- Groups/Events create multiple Room Bookings in one flow
- Pricing calculations (base rate + meals - discounts) automated
- Master Calendar showing room availability with group color-coding
- Kitchen Report generating daily meal prep lists
- Housekeeping status toggles per room
- Guest CRM with dietary requirements
- PWA installable on mobile devices with offline capability

**Non-Goals (Defer to Later)**:
- Payment processing integration (Stripe/Square)
- Automated email confirmations to guests
- Channel manager integration (Booking.com, Airbnb)
- Revenue reporting and analytics dashboard
- Multi-property management
- Staff scheduling or shift management
- Inventory tracking for breakfast supplies
- Guest portal for self-service booking modifications

## Paths to Supplementary Guidelines

**Tech Stack Reference**: 
https://raw.githubusercontent.com/memextech/templates/refs/heads/main/stack/fullstack_app.md

**Design System Reference**:
https://raw.githubusercontent.com/memextech/templates/refs/heads/main/design/minimalist-b2b-professional.md

## Decision Snapshot

| Decision Area | Choice | Rationale |
|--------------|--------|-----------|
| **Platform** | PWA (Next.js 15) | Installable on all devices, deploy once, instant updates, no app store friction |
| **Database** | Turso (SQLite) with Drizzle ORM | Relational model perfect for booking relationships, fast queries, PaaS-hosted |
| **Hosting** | Netlify | Zero-config deployment, edge functions, PWA support, free SSL |
| **Auth** | Email OTP via Resend | Passwordless, secure, staff-only access, no password management |
| **Design System** | Minimalist B2B Professional | Clean, accessible, mobile-responsive, confidence-inspiring for business use |
| **Calendar Library** | Custom Tailwind grid | Full control over group color-coding and room-based timeline layout |
| **Offline Strategy** | Service Worker caching | View bookings offline, sync updates when online |

## Architecture at a Glance

### Data Model

```
┌─────────────────┐
│  Rooms (6)      │ ← Pre-populated inventory
│  - Room Name    │
│  - Single Rate  │
│  - Double Rate  │
│  - Status       │
└────────┬────────┘
         │
         │ (Many Room Bookings → One Room)
         │
┌────────▼────────────────┐
│  Room Bookings          │ ← Child bookings
│  - Check-in/Check-out   │
│  - Occupancy (S/D)      │
│  - Base Price           │
│  - Meal Options         │
│  - Meal Cost            │
│  - Manual Discount      │
│  - Group ID (FK)        │
│  - Room ID (FK)         │
│  - Guest ID (FK)        │
└──────────┬──────────────┘
           │
           │ (Many Room Bookings → One Group)
           │
┌──────────▼──────────────┐
│  Groups / Events        │ ← Parent container
│  - Group Name           │
│  - Primary Contact (FK) │
│  - Group Discount       │
│  - Total Rooms (calc)   │
│  - Grand Total (calc)   │
│  - Notes                │
└─────────────────────────┘

┌─────────────────┐
│  Guests (CRM)   │
│  - Name         │
│  - Email/Phone  │
│  - Dietary Req  │
└─────────────────┘
```

### Key Formulas

**Room Booking Total**:
```
((Room Rate × Nights) + Meal Costs) - Manual Discount
```

**Group Grand Total**:
```
SUM(all linked Room Bookings) - Group Discount Amount
```

**Occupancy Logic**:
```
IF Occupancy = "Single" THEN Single Rate
IF Occupancy = "Double" THEN Double Rate
```

### Application Views

1. **Dashboard** (Landing after login)
   - Today's check-ins/check-outs
   - Rooms needing housekeeping
   - Tomorrow's breakfast summary

2. **Groups Master View**
   - List all Groups/Events
   - Expand Group → shows all Room Bookings
   - Display Grand Total and discount breakdown
   - Breakfast summary per group (e.g., "5 Cooked, 2 Continental")

3. **Master Calendar**
   - Rows = 6 Rooms
   - Columns = Dates
   - Bookings as colored bars (color per Group)
   - Click bar → view/edit Room Booking

4. **Kitchen Report**
   - Filter by date (default: tomorrow)
   - List occupied rooms with meal requirements
   - Summary totals: "4 Cooked Breakfasts, 2 Continental, 1 Packed Lunch"

5. **Housekeeping Dashboard**
   - Grid of 6 rooms with Clean/Dirty toggle
   - Filter: "Needs Cleaning" rooms only
   - Today's check-outs highlighted

6. **Guests (CRM)**
   - Searchable contact list
   - View guest history (past bookings)
   - Dietary requirements prominently displayed

## Implementation Plan

### Phase 1: Database Schema & Seed Data

**1.1 Define Drizzle Schema** (`src/db/schema.ts`)

```typescript
// Rooms table (inventory)
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  singleRate: real('single_rate').notNull(),
  doubleRate: real('double_rate').notNull(),
  housekeepingStatus: text('housekeeping_status').notNull().default('clean'), // 'clean' | 'dirty'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Groups/Events table (parent bookings)
export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  groupName: text('group_name').notNull(),
  primaryContactId: text('primary_contact_id').references(() => guests.id),
  groupDiscountAmount: real('group_discount_amount').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Room Bookings table (child bookings)
export const roomBookings = sqliteTable('room_bookings', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id),
  roomId: text('room_id').notNull().references(() => rooms.id),
  guestId: text('guest_id').references(() => guests.id),
  checkIn: integer('check_in', { mode: 'timestamp' }).notNull(),
  checkOut: integer('check_out', { mode: 'timestamp' }).notNull(),
  occupancyType: text('occupancy_type').notNull(), // 'single' | 'double'
  manualDiscount: real('manual_discount').default(0),
  mealCookedBreakfast: integer('meal_cooked_breakfast', { mode: 'boolean' }).default(false),
  mealContinentalBreakfast: integer('meal_continental_breakfast', { mode: 'boolean' }).default(false),
  mealPackedLunch: integer('meal_packed_lunch', { mode: 'boolean' }).default(false),
  mealCost: real('meal_cost').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Guests table (CRM)
export const guests = sqliteTable('guests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  dietaryRequirements: text('dietary_requirements'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

**1.2 Create Seed Script** (`scripts/seed-rooms.ts`)

Pre-populate 6 rooms with rates:
- Double Hobbit hut: Single £80, Double £120
- Twin Hobbit hut: Single £75, Double £110
- Mermaid Room: Single £90, Double £140
- Fairy Room: Single £85, Double £130
- Woodland Room: Single £95, Double £150
- Nania Room: Single £100, Double £160

*(Adjust rates as needed during implementation)*

**1.3 Push Schema & Run Seed**
```bash
npm run db:push
npm run seed
```

---

### Phase 2: Core Booking Logic (Backend)

**2.1 Group Creation API** (`netlify/functions/groups.ts`)

Endpoints:
- `POST /api/groups` - Create new group
- `GET /api/groups` - List all groups with rollup calculations
- `GET /api/groups/{id}` - Get group with all Room Bookings
- `PATCH /api/groups/{id}` - Update group details
- `DELETE /api/groups/{id}` - Delete group (cascade Room Bookings)

**Rollup Calculations** (computed in API response):
- `totalRoomsBooked`: Count of linked Room Bookings
- `grandTotal`: SUM(all Room Booking totals) - groupDiscountAmount

**2.2 Room Booking API** (`netlify/functions/room-bookings.ts`)

Endpoints:
- `POST /api/room-bookings` - Create booking (validate room availability)
- `POST /api/room-bookings/bulk` - Create multiple bookings for a group
- `GET /api/room-bookings` - List bookings (filter by date range, group, room)
- `PATCH /api/room-bookings/{id}` - Update booking
- `DELETE /api/room-bookings/{id}` - Delete booking

**Pricing Logic** (computed field in response):
```typescript
function calculateBookingTotal(booking, room) {
  const nights = Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24));
  const ratePerNight = booking.occupancyType === 'single' ? room.singleRate : room.doubleRate;
  const basePrice = ratePerNight * nights;
  return (basePrice + booking.mealCost) - booking.manualDiscount;
}
```

**Availability Check**:
Query existing bookings for target room where date ranges overlap, return error if conflict.

**2.3 Guest API** (`netlify/functions/guests.ts`)

Standard CRUD endpoints with search by name/email.

**2.4 Rooms API** (`netlify/functions/rooms.ts`)

- `GET /api/rooms` - List all rooms (includes housekeeping status)
- `PATCH /api/rooms/{id}` - Update housekeeping status

---

### Phase 3: Frontend Views (Next.js Pages)

**3.1 Dashboard** (`src/app/page.tsx`)

Components:
- Today's Check-ins card (query bookings where checkIn = today)
- Today's Check-outs card (query bookings where checkOut = today)
- Rooms Needing Cleaning card (query rooms where housekeepingStatus = 'dirty')
- Tomorrow's Breakfast Summary (query bookings where checkIn ≤ tomorrow AND checkOut > tomorrow, aggregate meals)

**3.2 Groups Master View** (`src/app/groups/page.tsx`)

- Table of all Groups with columns: Group Name, Primary Contact, # Rooms, Grand Total
- Expandable rows showing Room Bookings (Room, Guest, Dates, Meals, Total)
- Breakfast summary per group calculated client-side
- "Create Group" button → opens modal/form

**3.3 Group Creation Flow** (`src/app/groups/new/page.tsx`)

Form:
1. Group details (name, primary contact, notes)
2. Add Room Bookings section (repeatable):
   - Select Room (dropdown showing availability)
   - Select Guest (searchable dropdown, "Create New" option)
   - Check-in/Check-out date pickers
   - Occupancy Type (radio: Single/Double)
   - Meal checkboxes (Cooked Breakfast, Continental, Packed Lunch)
   - Manual Discount input (optional)
3. Group Discount input (optional)
4. Submit → creates Group + bulk creates Room Bookings

**3.4 Master Calendar** (`src/app/calendar/page.tsx`)

Implementation:
- Grid layout: Rows = 6 rooms, Columns = dates (scrollable horizontally)
- Query all Room Bookings for visible date range
- Render colored bars (color hashed from Group ID for consistency)
- Click bar → open Room Booking detail modal
- Drag-to-extend dates (Phase 2 enhancement, skip for MVP)

Color-coding logic:
```typescript
function getGroupColor(groupId: string) {
  // Hash group ID to consistent color from palette
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const hash = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

**3.5 Kitchen Report** (`src/app/kitchen/page.tsx`)

- Date selector (default: tomorrow)
- Query Room Bookings where checkIn ≤ selectedDate AND checkOut > selectedDate
- Table with columns: Room, Guest, Cooked Breakfast, Continental, Packed Lunch, Dietary Requirements
- Summary footer: Total counts per meal type

**3.6 Housekeeping Dashboard** (`src/app/housekeeping/page.tsx`)

- Grid of 6 room cards
- Each card shows: Room Name, Status badge (Clean/Dirty), Toggle button
- Filter toggle: "Show Only Needs Cleaning"
- Highlight rooms with check-outs today

**3.7 Guests CRM** (`src/app/guests/page.tsx`)

- Searchable table (name, email, phone)
- Click guest → view detail with booking history
- Create/Edit guest modal

---

### Phase 4: PWA Configuration

**4.1 Manifest File** (`public/manifest.json`)

```json
{
  "name": "B&B Booking Manager",
  "short_name": "B&B Manager",
  "description": "Group booking and meal management for your B&B",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**4.2 Service Worker** (`public/sw.js`)

Cache strategy:
- Cache shell (HTML, CSS, JS) for offline viewing
- Network-first for API calls (fallback to cache if offline)
- Display "Offline Mode" banner when no connection

**4.3 Install Prompt** (`src/components/InstallPrompt.tsx`)

Show prompt on first visit (desktop) or after 2 visits (mobile) encouraging installation.

---

### Phase 5: Mobile Responsiveness

Apply **Minimalist B2B Professional** design guidelines:

**Breakpoints**:
- Mobile (<768px): Single column, stacked cards, hamburger menu
- Tablet (768-1199px): 2-column grids, condensed spacing
- Desktop (≥1200px): Full multi-column layouts

**Touch Optimizations**:
- 48px minimum touch targets for buttons
- Date pickers use native mobile inputs
- Calendar swipes horizontally on mobile
- Kitchen Report becomes vertically scrollable cards (not table)

**Typography Scaling**:
- Reduce heading sizes by 25% on mobile
- Increase body line-height to 1.65 for readability

---

### Phase 6: Authentication & Deployment

**6.1 Email OTP Setup**

Follow `fullstack_app.md` guide for Better Auth + Resend integration.

Staff-only access (no guest portal in MVP).

**6.2 Local Testing**

```bash
npm run netlify:dev
# Test at http://localhost:8888
# Verify OTP codes in console
# Test all CRUD operations
# Test offline mode (disable network in DevTools)
```

**6.3 Production Deployment**

1. Create Turso production database: `turso db create bnb-booking-manager-prod`
2. Get auth token: `turso db tokens create bnb-booking-manager-prod`
3. Set Netlify env vars:
   - `DATABASE_URL`
   - `DATABASE_AUTH_TOKEN`
   - `RESEND_API_KEY`
4. Deploy: `netlify deploy --prod`

---

## Verification & Demo Script

### Local Testing Checklist

**Database Setup**:
- [ ] Schema pushed successfully
- [ ] 6 rooms seeded with correct rates
- [ ] Can view rooms in Drizzle Studio

**Group Booking Flow**:
- [ ] Create new guest "John Smith" with dietary note "Vegetarian"
- [ ] Create group "Smith Family Reunion" with 3 Room Bookings:
  - Double Hobbit hut (John Smith, Double occupancy, 3 nights, Cooked Breakfast)
  - Fairy Room (Guest TBD, Single occupancy, 3 nights, Continental)
  - Woodland Room (Guest TBD, Double, 2 nights, Packed Lunch)
- [ ] Apply £50 group discount
- [ ] Verify Grand Total calculates correctly
- [ ] Check calendar shows all 3 bookings in same color

**Calendar View**:
- [ ] Navigate to dates showing bookings
- [ ] Verify color-coding by group
- [ ] Click booking bar → opens edit modal
- [ ] Verify no overlapping bookings for same room

**Kitchen Report**:
- [ ] Select tomorrow's date
- [ ] Verify shows correct meal counts
- [ ] Verify displays John Smith's dietary requirements
- [ ] Verify totals: "1 Cooked, 1 Continental, 1 Packed"

**Housekeeping**:
- [ ] Toggle Double Hobbit hut to "Dirty"
- [ ] Verify appears in "Needs Cleaning" filter
- [ ] Toggle back to "Clean"

**PWA**:
- [ ] Open in Chrome → see "Install App" prompt
- [ ] Install to home screen
- [ ] Verify opens in standalone mode
- [ ] Disable network → verify can view bookings (cached)

---

### Demo Script (5 minutes)

**Setup**: Have 2-3 groups pre-created with bookings for this week.

1. **Dashboard** (30s)
   - "Here's today's overview: 2 check-ins, 1 check-out, 1 room needs cleaning."

2. **Groups View** (60s)
   - "This is the Smith Wedding group: 5 rooms, £1,200 total."
   - Expand → "See each room, guest, and meals. They have 4 cooked breakfasts tomorrow."

3. **Calendar** (60s)
   - "Color-coded timeline: blue bars are the Smith group, green is the Jones group."
   - Click bar → "Edit booking details, adjust meals, or apply discount."

4. **Kitchen Report** (45s)
   - "Tomorrow morning we need: 7 cooked breakfasts, 3 continental, 2 packed lunches."
   - "See dietary notes: 2 guests are gluten-free."

5. **Mobile Demo** (60s)
   - Pull out phone → "Installed as app, opens instantly."
   - "Same features, touch-optimized. Check bookings while welcoming guests."

6. **Housekeeping** (45s)
   - "Mark rooms clean/dirty. Filter to see only what needs attention."

---

## Deploy

### Prerequisites

- Turso CLI installed: `brew install tursodatabase/tap/turso`
- Netlify CLI installed: `npm install -g netlify-cli`
- Resend account with API key

### Production Deployment Steps

**1. Create Production Database**

```bash
# Create database
turso db create bnb-booking-manager-prod

# Get connection URL
turso db show bnb-booking-manager-prod --url

# Generate auth token
turso db tokens create bnb-booking-manager-prod
```

**2. Initialize Netlify Project**

```bash
# Login to Netlify
netlify login

# Initialize (link to new site)
netlify init

# Name suggestion: "bnb-booking-manager"
```

**3. Configure Environment Variables**

```bash
# Set production secrets
netlify env:set DATABASE_URL "libsql://[your-db-url]"
netlify env:set DATABASE_AUTH_TOKEN "[your-token]"
netlify env:set RESEND_API_KEY "[your-resend-key]"
netlify env:set NODE_ENV "production"
```

**4. Deploy**

```bash
# Build and deploy
npm run build
netlify deploy --prod
```

**5. Seed Production Data**

Run seed script against production database (modify `turso db shell` connection in seed script).

**6. Post-Deployment Verification**

- [ ] Visit production URL
- [ ] Register first staff account via OTP
- [ ] Verify 6 rooms exist
- [ ] Create test booking
- [ ] Check calendar renders
- [ ] Test on mobile device (install PWA)
- [ ] Verify offline mode works

### Domain Configuration (Optional)

If adding custom domain:
```bash
netlify domains:add your-bnb.com
# Follow DNS instructions in Netlify dashboard
```

---

## Success Criteria

✅ **Operational**: Staff can create group bookings with multiple rooms in under 2 minutes  
✅ **Accurate**: All pricing calculations (base + meals - discounts) compute correctly  
✅ **Visible**: Calendar shows all bookings color-coded by group, no overlaps  
✅ **Actionable**: Kitchen report generates tomorrow's meal list in 3 clicks  
✅ **Accessible**: Works on iPhone, Android, and desktop with consistent experience  
✅ **Installable**: PWA installs on all devices, functions offline for viewing  
✅ **Fast**: All views load in <1 second on 4G connection

---

## Future Enhancements (Post-MVP)

- Payment tracking per group (deposits, balances)
- Email confirmations via Resend templates
- Drag-to-reschedule bookings in calendar
- Revenue reporting dashboard
- Channel manager API integration
- Guest self-service portal
- Inventory alerts (breakfast supplies)
- Automated housekeeping schedules
- Multi-property support
