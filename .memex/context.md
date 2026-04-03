# B&B Group Booking System - Project Rules

## Project Overview
A comprehensive booking management system for a 6-room B&B with emphasis on group bookings, individual bookings, meal management, financial tracking, and operational efficiency. Built as a PWA for cross-platform use (iPhone, Android, desktop).

## Tech Stack & Architecture

### Core Technologies
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Netlify Functions (serverless) with TypeScript
- **Database**: Turso (SQLite) with Drizzle ORM
- **Hosting**: Netlify (with PWA support)
- **Authentication**: Email OTP via Resend (to be implemented)

### Critical Implementation Rules

#### CSS and Styling
- **@import order matters**: Google Fonts import MUST come before `@import "tailwindcss"`
- Correct order:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @import "tailwindcss";
  ```
- All custom utility classes defined after imports in `globals.css`

#### Development Server
- **Use `netlify dev` for full functionality** - runs on port 8888
- `npm run dev` only runs Next.js (port 3000) - API routes won't work
- Netlify dev integrates:
  - Next.js dev server (port 3000)
  - Netlify Functions (serverless API)
  - Proper `/api/*` → `/.netlify/functions/:splat` routing

#### Database Connection Pattern
- **ALWAYS use standard `@libsql/client` adapter in Netlify Functions** - supports both file: and https: URLs
- Use HTTP client for production (`@libsql/client/http` causes errors with file: URLs)
- Local development uses `file:./dev.db`, production uses Turso cloud database
- Database client setup for Netlify Functions:
  ```typescript
  import { drizzle } from 'drizzle-orm/sqlite-proxy';
  import { createClient } from '@libsql/client';
  ```

#### API Structure
- All API endpoints are Netlify Functions in `netlify/functions/`
- CORS headers required on all function responses
- Use shared utilities: `utils/db.ts`, `utils/cors.ts`, `utils/pricing.ts`
- API base path: `/api/*` redirects to `/.netlify/functions/:splat`
- Client-side API wrapper in `src/lib/api.ts` provides clean interface

#### Frontend Patterns
- **ALL pages using hooks must be client components** - add `'use client'` at top
- Use shared `<Navigation />` component on all pages
- Loading states required for all async data
- Error handling with try-catch and user-friendly alerts
- Mobile-first responsive design

## Data Model & Business Logic

### The 6 Fixed Rooms
**Pre-populated rooms that can be renamed and repriced:**
1. **Double Hobbit hut**: Single £80, Double £120
2. **Twin Hobbit hut**: Single £75, Double £110  
3. **Mermaid Room**: Single £90, Double £140
4. **Fairy Room**: Single £85, Double £130
5. **Woodland Room**: Single £95, Double £150
6. **Nania Room**: Single £100, Double £160

### Room Color Coding System
Consistent colors used throughout the application (calendar, reports):
- **Double Hobbit hut**: Blue (`bg-blue-100`)
- **Twin Hobbit hut**: Cyan (`bg-cyan-100`)
- **Mermaid Room**: Teal (`bg-teal-100`)
- **Fairy Room**: Pink (`bg-pink-100`)
- **Woodland Room**: Green (`bg-green-100`)
- **Nania Room**: Purple (`bg-purple-100`)

Defined in `/src/lib/roomColors.ts` - use `getRoomColor(roomName)` function

### Core Relationships
```
Groups (Parent Container)
  ↓ has many
Room Bookings (Child Records)
  ↓ references
Rooms (Inventory - 6 fixed)
Guests (CRM)
Settings (Global config - single row)
```

### Individual vs Group Bookings
- **Individual bookings**: Auto-create group named "Individual - [Guest Name]"
- **Group bookings**: User-created groups for events, parties, etc.
- **Filtering**: Group dropdowns hide "Individual -" prefixed groups
- Both types use same data structure, ensuring consistency

### Pricing Formulas

**Room Booking Total (calculated in API response):**
```
((Rate per Night × Nights) + Meal Costs) - Manual Discount
```
- Rate determined by occupancy type (single vs double)
- Nights calculated from check-in to check-out dates
- Calculated in `netlify/functions/utils/pricing.ts`

**Group Grand Total (calculated in API response):**
```
SUM(all Room Booking totals) - Group Discount Amount
```

### Deposit System
**Dual Entry Modes:**
- **Percentage Mode**: Enter % (e.g., 20%) → auto-calculates amount
- **Fixed Amount Mode**: Enter exact £ amount → shows % equivalent
- Default: 20% percentage mode
- Both modes show real-time calculation and balance due

**Payment Tracking:**
- `depositAmount`: Stored in booking (calculated or manual)
- `depositPaid`: Boolean flag for deposit status
- `balancePaid`: Boolean flag for full payment
- Balance = Total - Deposit Amount

### Availability Logic
- Room bookings must not overlap for the same room
- **Date overlap formula**: `checkIn < existingCheckOut AND existingCheckIn < checkOut`
- Availability check in `room-bookings.ts` uses simplified range overlap
- Returns 409 Conflict status if room unavailable

## Design System - Minimalist B2B Professional

### Typography
- **Font**: Inter (Google Fonts) for all text
- **Headings**: Semi-bold (600) to Bold (700)
- **Body**: Regular (400) with line-height 1.6

### Color Palette
- **Primary Background**: #ffffff (white)
- **Secondary Background**: #f8fafc (slate-50)
- **Primary Text**: #0f172a (slate-900)
- **Secondary Text**: #475569 (slate-600)
- **Primary Accent**: #2563eb (blue-600)
- **Borders**: #e2e8f0 (slate-200)

### Tailwind Utility Classes (in globals.css)
- `.btn-primary` - Blue button for primary actions
- `.btn-secondary` - Gray button for secondary actions
- `.card` - White card with border and shadow
- `.input` - Styled form input with focus states
- `.label` - Form label styling

## Implemented Features & Views

### 1. Dashboard (/) - COMPLETED
- **Status**: Fully functional with real-time data
- Shows today's check-ins/check-outs count
- Displays rooms needing cleaning
- **Full calendar view** with day/week/month switcher
- Links to relevant pages when data present
- Quick action buttons for individual/group bookings

### 2. Bookings Master View (/bookings) - COMPLETED
- **Status**: Fully functional
- Lists ALL bookings (group + individual)
- Status badges: Upcoming, Active, Completed
- Shows room, dates, duration, occupancy, meals
- Color-coded by room
- Links to group detail

### 3. Individual Booking Form (/bookings/new) - COMPLETED
- **Status**: Fully functional
- **Group selector**: Add to existing group OR create new
- Guest: Select existing OR create new inline
- Room selection with pricing display
- Date picker with check-in/check-out
- Occupancy type (single/double)
- Meal options with cost field
- **Dual deposit entry**: Percentage OR fixed amount
- **Pricing modes**: Standard rate OR custom price
- **Payment summary**: Shows total, deposit, balance
- Real-time calculations
- Notes field

### 4. Groups Master View (/groups) - COMPLETED
- **Status**: Fully functional
- Lists all groups with rollup calculations
- Shows: Group name, total rooms booked, grand total
- Click any group to view details

### 5. Group Detail View (/groups/[id]) - COMPLETED
- **Status**: Fully functional with booking management
- View all bookings in group
- Add new bookings with room selection
- Guest selection or create new
- Meal options checkboxes
- Delete bookings
- Delete entire group
- Breakfast summary for group

### 6. Group Creation Flow (/groups/new) - COMPLETED
- **Status**: Functional - creates group container
- Create group with name, discount, notes
- After creation, navigate to group detail to add bookings

### 7. Master Calendar (/calendar) - COMPLETED
- **Status**: Fully functional with advanced views
- **Three view modes**: Day / Week / Month
- **Navigation**: Prev/Next buttons + Today button
- **Grid layout**: Rooms as rows, dates as columns
- **Week starts Monday** (Mon-Sun view)
- **Room color coding**: Consistent colors throughout
- **Booking display**: Guest name + "Xn • Yp" (nights × people)
- Click booking → go to group detail
- Current date highlighted in blue
- Hover shows full booking details
- Legend shows all room colors
- Responsive with horizontal scroll

### 8. Finances (/finances) - COMPLETED
- **Status**: Fully functional
- **Summary cards**: Total revenue, deposits received, balance outstanding
- **Filters**: All, Payment Pending, Deposit Paid, Paid in Full
- **Bookings table**: Guest, room, dates, total, deposit, balance, status
- **Quick actions**: 
  - Mark deposit paid
  - Mark balance paid
  - View booking
- **Status badges**: Payment Pending (red), Deposit Paid (yellow), Paid in Full (green)
- Real-time payment tracking

### 9. Kitchen Report (/kitchen) - COMPLETED
- **Status**: Fully functional
- Date selector (defaults to tomorrow)
- **Breakfast summary cards**: Cooked, Continental, Packed lunch counts
- Table with room, guest, meal details
- Filters bookings for selected date

### 10. Housekeeping Dashboard (/housekeeping) - COMPLETED
- **Status**: Fully functional
- 6-room grid with clean/dirty status
- Toggle status per room (updates immediately)
- Filter: "Show only needs cleaning"

### 11. Guests CRM (/guests) - COMPLETED
- **Status**: Fully functional
- Searchable contact list (name/email)
- Create new guests with form
- Display dietary requirements prominently
- Grid layout for easy scanning

### 12. Settings (/settings) - COMPLETED
- **Status**: Fully functional with tabbed interface
- **General Tab**: B&B info, contact details, check-in/out times, currency, tax rate
- **Rooms & Pricing Tab**: Edit room names and rates (auto-save on blur)
- **Meal Pricing Tab**: Default prices for cooked, continental, packed meals
- **Policies Tab**: Cancellation policy text area
- Visual "Saving..." indicators
- Single-row database design (ID: 'default')

## Meal Options
Three meal types tracked per booking (boolean fields):
- **Cooked Breakfast** (`mealCookedBreakfast`)
- **Continental Breakfast** (`mealContinentalBreakfast`)
- **Packed Lunch** (`mealPackedLunch`)

Plus `mealCost` field for total meal charges (manual input)

## Development Workflow

### Environment Setup
1. Install Node.js via nvm: `nvm install --lts`
2. Install dependencies: `npm install`
3. Install Netlify CLI: `npm install -g netlify-cli`
4. Setup database: `npm run db:push`
5. Seed rooms: `npm run seed`
6. Start dev server: `netlify dev` (on port 8888)

### Database Commands
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio for database inspection
- `npm run seed` - Seed the 6 rooms (run once only)
- `sqlite3 dev.db "SELECT * FROM rooms;"` - Query database directly

### Development Servers
- **Recommended**: `netlify dev` - Full stack on port 8888
- **Frontend only**: `npm run dev` - Next.js only on port 3000 (API won't work)

### Start Script
Use `./start.sh` which:
- Checks for Node.js (loads nvm if needed)
- Creates database if missing
- Installs dependencies if missing
- Starts dev server on port 3000 (Note: Should use netlify dev instead)

## File Structure (Actual Implementation)

```
/src
  /app                      # Next.js App Router pages
    page.tsx                # Dashboard - real-time stats + calendar
    /bookings
      page.tsx              # All bookings listing
      /new
        page.tsx            # Individual booking form
    /groups
      page.tsx              # Groups listing
      /new
        page.tsx            # Create new group
      /[id]
        page.tsx            # Group detail + booking management
    /calendar
      page.tsx              # Full calendar with day/week/month views
    /finances
      page.tsx              # Financial tracking and payment management
    /kitchen
      page.tsx              # Kitchen/meal prep report with summary
    /housekeeping
      page.tsx              # Room status management
    /guests
      page.tsx              # Guest CRM
    /settings
      page.tsx              # Settings with tabbed interface
    globals.css             # Tailwind + custom styles (IMPORT ORDER MATTERS!)
    layout.tsx              # Root layout
  /components
    Navigation.tsx          # Shared navigation (client component)
    Calendar.tsx            # Reusable calendar component
  /db
    schema.ts               # Drizzle schema (5 tables)
    client.ts               # Database client
  /lib
    api.ts                  # Client-side API wrapper functions
    roomColors.ts           # Room color mapping system

/netlify
  /functions                # Serverless API endpoints
    rooms.ts                # GET, PATCH (name, singleRate, doubleRate, housekeepingStatus)
    guests.ts               # Full CRUD + search
    groups.ts               # CRUD + rollup calculations
    room-bookings.ts        # CRUD + availability + bulk create + deposit tracking
    settings.ts             # GET, PATCH (single row config)
    /utils
      db.ts                 # Database connection helper
      cors.ts               # CORS headers helper
      pricing.ts            # Booking calculation functions

/scripts
  seed-rooms.ts             # Database seeding (run once)

/
  netlify.toml              # API routing + build config
  drizzle.config.ts         # Database configuration
  start.sh                  # Startup script
  dev.db                    # Local SQLite database
```

## Database Schema

### Rooms Table
- `id`, `name`, `singleRate`, `doubleRate`, `housekeepingStatus`, `createdAt`
- 6 fixed rooms (can be renamed/repriced but not deleted)

### Guests Table
- `id`, `name`, `email`, `phone`, `dietaryRequirements`, `createdAt`

### Groups Table
- `id`, `groupName`, `primaryContactId`, `groupDiscountAmount`, `notes`, `createdAt`

### Room Bookings Table
- `id`, `groupId`, `roomId`, `guestId`, `checkIn`, `checkOut`
- `occupancyType`, `manualDiscount`
- `mealCookedBreakfast`, `mealContinentalBreakfast`, `mealPackedLunch`, `mealCost`
- **`depositAmount`, `depositPaid`, `balancePaid`, `paymentNotes`**
- `createdAt`

### Settings Table (Single Row)
- `id` (always 'default'), `bnbName`, `bnbEmail`, `bnbPhone`, `bnbAddress`
- `checkInTime`, `checkOutTime`, `currency`, `taxRate`
- `defaultMealCookedPrice`, `defaultMealContinentalPrice`, `defaultMealPackedPrice`
- `cancellationPolicy`, `updatedAt`

## Important Gotchas & Solutions

### Issue: CSS @import rules error
**Error**: `@import rules must precede all rules`
**Solution**: Always put Google Fonts import BEFORE `@import "tailwindcss"`

### Issue: API endpoints return 404
**Cause**: Running `npm run dev` instead of `netlify dev`
**Solution**: Use `netlify dev` to access Netlify Functions

### Issue: Native Module Errors in Netlify Functions
**Solution**: Use `@libsql/client` (not `/http` version) which supports both file: and https: URLs

### Issue: CORS Errors
**Solution**: All Netlify functions include CORS headers via `utils/cors.ts` helper

### Issue: Booking Conflicts
**Solution**: Simplified availability check: `checkIn < existingCheckOut AND existingCheckIn < checkOut`

### Issue: "use client" missing
**Error**: Hooks like `useState`, `useEffect` fail
**Solution**: Add `'use client'` directive at top of any component using hooks

### Issue: Room updates failing with "No values to set"
**Solution**: Rooms API now accepts `name`, `singleRate`, `doubleRate`, `housekeepingStatus` - only sends provided fields

### Issue: Settings page deposit field showing errors
**Solution**: Removed depositPercentage from settings - deposits now entered per booking

## Current Implementation Status

### ✅ Completed (95%)
- Database schema with all tables
- All Netlify Functions with full logic
- All frontend pages with real data integration
- Navigation and routing
- Form handling and validation
- Error states and loading indicators
- Mobile responsive layouts
- Design system implementation
- Individual booking system
- Advanced calendar (day/week/month views)
- Room color coding system
- Deposit tracking with dual modes
- Financial management page
- Settings page with room editing

### ⏳ Remaining (5%)
- PWA manifest.json
- Service worker for offline support
- Install prompts
- Email OTP authentication (Better Auth + Resend)
- Production Turso database setup
- Netlify production deployment
- Payment method tracking (future)
- Receipt generation (future)

## Testing Checklist

Before deploying:
- [x] Database has 6 rooms seeded correctly
- [x] API endpoints return expected data structure
- [x] Frontend displays real data from API
- [x] Error states handled gracefully
- [x] Loading states shown during async operations
- [x] Mobile responsive layouts work
- [x] Availability checking prevents double bookings
- [x] Pricing calculations match formulas
- [x] Room updates save correctly
- [x] Deposit calculations work (both modes)
- [x] Calendar displays correctly in all views
- [x] Financial tracking accurate
- [ ] PWA installs on mobile devices
- [ ] Authentication flow works end-to-end

## Common Commands Reference

```bash
# Development
netlify dev              # Start full stack dev server (port 8888) - RECOMMENDED
npm run dev              # Start Next.js only (port 3000) - API won't work
./start.sh               # Automated startup (needs update to use netlify dev)

# Database
npm run db:push          # Apply schema changes
npm run db:studio        # Open Drizzle Studio GUI
npm run seed             # Seed 6 rooms (run once)
sqlite3 dev.db           # Direct database access

# Build & Deploy
npm run build            # Production build
netlify deploy --prod    # Deploy to production (after setup)

# Debugging
curl http://localhost:8888/api/rooms  # Test API endpoint
```

## Key Patterns & Conventions

### Calendar System
- **Week starts Monday** (Mon-Sun, not Sun-Sat)
- **Booking display format**: `[Guest Name]` + `Xn • Yp` (nights × people)
- **Color coding**: Consistent room colors from `roomColors.ts`
- **Date overlap detection**: Simplified formula for accuracy

### Deposit Handling
- **Dual modes**: Users choose percentage OR fixed amount
- **Real-time feedback**: Shows equivalent in other unit
- **Default**: 20% percentage mode
- **Payment tracking**: Two flags - depositPaid, balancePaid

### Group vs Individual Bookings
- **Auto-group pattern**: "Individual - [Guest Name]"
- **Filtering rule**: Hide "Individual -" prefixed groups from dropdowns
- **Same data model**: Ensures consistency across all reports

### Settings Page Pattern
- **Single-row database**: ID always 'default'
- **Auto-save on blur**: Room edits save when leaving field
- **Visual feedback**: "Saving..." indicator during updates
- **Tabbed interface**: Organized by General, Rooms, Meals, Policies

### API Response Patterns
- **Calculated totals**: Always include `calculatedTotal` in booking responses
- **Rollup data**: Groups include `totalRoomsBooked` and `grandTotal`
- **Enriched data**: Bookings include room details when needed

## Next Steps

1. **Complete PWA setup**: manifest.json, service worker
2. **Implement authentication**: Better Auth with email OTP
3. **Setup production database**: Turso cloud
4. **Deploy to Netlify**: Full production deployment
5. **User acceptance testing**: Have B&B staff test
6. **Future enhancements**:
   - Payment method tracking
   - Receipt/invoice generation
   - Email confirmations to guests
   - Advanced financial reports
   - Booking confirmation emails

## Known Limitations

- No payment method tracking yet (cash, card, bank transfer)
- No receipt/invoice generation
- No email confirmations (future feature)
- No authentication (Phase 4)
- Local database only (production needs Turso cloud)
- Calendar could benefit from drag-and-drop (future enhancement)