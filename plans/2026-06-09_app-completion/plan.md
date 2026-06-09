# B&B Group Booking System: Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the B&B Group Booking System from 95% complete (working locally) to deployed, tested and installable in production.

**Architecture:** Next.js 16 App Router frontend with Netlify Functions as the API layer, Turso (libSQL) database via Drizzle ORM. Business logic (availability, pricing, deposits) is extracted into pure functions and covered by Vitest unit tests before deployment. PWA support is added via the App Router's native `manifest.ts` route plus a minimal service worker.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Drizzle ORM, @libsql/client, Netlify Functions, Vitest (new), Turso cloud (new).

**Scope note:** Email OTP authentication (Better Auth + Resend) is a separate subsystem and deliberately **not** in this plan. It needs its own plan once this one lands. Until auth exists, Task 9 mitigates the exposure and **no real guest data should be entered into the production site**.

---

## Known bug found during planning

`netlify/functions/room-bookings.ts:16-19` checks availability with `lte(roomBookings.checkIn, checkOut)` and `gte(roomBookings.checkOut, checkIn)` (inclusive). The comment above it correctly states the strict rule: ranges overlap if `start1 < end2 AND start2 < end1`. The inclusive version wrongly rejects back-to-back bookings, which are a normal B&B pattern (guest A checks out on the 10th, guest B checks in on the 10th). Task 2 fixes this test-first.

---

### Task 1: Vitest setup

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In the `"scripts"` block, after `"seed"`:

```json
    "seed": "tsx scripts/seed-rooms.ts",
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Verify the runner works**

Run: `npm test`
Expected: exits cleanly with "No test files found" (or similar), no config errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add Vitest test runner"
```

---

### Task 2: Extract availability overlap logic and fix the back-to-back bug (TDD)

**Files:**
- Create: `netlify/functions/utils/availability.ts`
- Create: `tests/availability.test.ts`
- Modify: `netlify/functions/room-bookings.ts:9-29` (the `checkAvailability` function)

- [ ] **Step 1: Write the failing tests**

Create `tests/availability.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rangesOverlap } from '../netlify/functions/utils/availability';

const d = (s: string) => new Date(s);

describe('rangesOverlap', () => {
  it('detects a full overlap', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-02'), d('2026-07-04'))).toBe(true);
  });

  it('detects a partial overlap at the start', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-06-28'), d('2026-07-02'))).toBe(true);
  });

  it('detects a partial overlap at the end', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-04'), d('2026-07-08'))).toBe(true);
  });

  it('detects identical ranges', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-01'), d('2026-07-05'))).toBe(true);
  });

  it('allows back-to-back bookings (check-in on the other booking\'s check-out day)', () => {
    // Guest A leaves on the 5th, Guest B arrives on the 5th. This must be allowed.
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-05'), d('2026-07-08'))).toBe(false);
    expect(rangesOverlap(d('2026-07-05'), d('2026-07-08'), d('2026-07-01'), d('2026-07-05'))).toBe(false);
  });

  it('allows clearly separate ranges', () => {
    expect(rangesOverlap(d('2026-07-01'), d('2026-07-05'), d('2026-07-10'), d('2026-07-12'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, `rangesOverlap` does not exist (module not found).

- [ ] **Step 3: Create `netlify/functions/utils/availability.ts`**

```ts
// Two date ranges overlap if: start1 < end2 AND start2 < end1.
// Strict comparison so back-to-back bookings (check-out day = check-in day) are allowed.
export function rangesOverlap(
  checkIn1: Date,
  checkOut1: Date,
  checkIn2: Date,
  checkOut2: Date
): boolean {
  return checkIn1 < checkOut2 && checkIn2 < checkOut1;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `rangesOverlap` tests PASS.

- [ ] **Step 5: Wire it into `checkAvailability`**

In `netlify/functions/room-bookings.ts`, replace the existing `checkAvailability` function (lines 9-29) with a version that fetches the room's bookings and filters in memory using the tested helper:

```ts
import { rangesOverlap } from './utils/availability';

// Check if room is available for the date range
async function checkAvailability(db: any, roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string) {
  const existingBookings = await db.select().from(roomBookings).where(
    eq(roomBookings.roomId, roomId)
  );

  const conflicts = existingBookings.filter((b: any) =>
    b.id !== excludeBookingId &&
    rangesOverlap(checkIn, checkOut, new Date(b.checkIn), new Date(b.checkOut))
  );

  return conflicts.length === 0;
}
```

Also remove the now-unused `or`, `lte`, `gte`, `between` imports from the `drizzle-orm` import on line 2 if nothing else uses them (`gte`/`lte` are still used in the GET filter at lines 48-49, so keep those two; remove `or` and `between`).

- [ ] **Step 6: Manually verify against the running dev server**

With the dev DB seeded and `netlify dev` running on port 8888, create a booking, then create a second booking in the same room whose check-in equals the first booking's check-out. Expected: 201 Created (previously this returned 409).

```bash
# Adjust roomId/groupId to real ids from your dev.db (see Drizzle Studio)
curl -s -X POST http://localhost:8888/api/room-bookings \
  -H 'Content-Type: application/json' \
  -d '{"groupId":"<GROUP_ID>","roomId":"<ROOM_ID>","checkIn":"2026-07-01","checkOut":"2026-07-05","occupancyType":"double"}'
curl -s -X POST http://localhost:8888/api/room-bookings \
  -H 'Content-Type: application/json' \
  -d '{"groupId":"<GROUP_ID>","roomId":"<ROOM_ID>","checkIn":"2026-07-05","checkOut":"2026-07-08","occupancyType":"double"}'
```

- [ ] **Step 7: Commit**

```bash
git add netlify/functions/utils/availability.ts netlify/functions/room-bookings.ts tests/availability.test.ts
git commit -m "fix: allow back-to-back bookings, extract tested overlap logic"
```

---

### Task 3: Unit tests for pricing calculations

**Files:**
- Create: `tests/pricing.test.ts`
- Test target: `netlify/functions/utils/pricing.ts` (existing, no changes expected)

- [ ] **Step 1: Write the tests**

Create `tests/pricing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateBookingTotal, calculateGroupTotal } from '../netlify/functions/utils/pricing';

const room = {
  id: 'room-1',
  name: 'Mermaid Room',
  singleRate: 80,
  doubleRate: 120,
} as any;

const booking = (overrides: object) => ({
  checkIn: new Date('2026-07-01'),
  checkOut: new Date('2026-07-04'), // 3 nights
  occupancyType: 'double',
  mealCost: 0,
  manualDiscount: 0,
  ...overrides,
} as any);

describe('calculateBookingTotal', () => {
  it('charges double rate x nights', () => {
    expect(calculateBookingTotal(booking({}), room)).toBe(360); // 120 x 3
  });

  it('charges single rate for single occupancy', () => {
    expect(calculateBookingTotal(booking({ occupancyType: 'single' }), room)).toBe(240); // 80 x 3
  });

  it('adds meal cost and subtracts discount', () => {
    expect(calculateBookingTotal(booking({ mealCost: 30, manualDiscount: 50 }), room)).toBe(340); // 360 + 30 - 50
  });

  it('treats null meal cost and discount as zero', () => {
    expect(calculateBookingTotal(booking({ mealCost: null, manualDiscount: null }), room)).toBe(360);
  });

  it('counts one night for a single-night stay', () => {
    expect(calculateBookingTotal(booking({ checkOut: new Date('2026-07-02') }), room)).toBe(120);
  });

  it('counts nights correctly across the October clock change', () => {
    // 2026-10-24 to 2026-10-26 spans BST -> GMT. ISO date strings parse as UTC
    // midnight so this should still be exactly 2 nights.
    expect(calculateBookingTotal(
      booking({ checkIn: new Date('2026-10-24'), checkOut: new Date('2026-10-26') }), room
    )).toBe(240);
  });
});

describe('calculateGroupTotal', () => {
  it('sums booking totals', () => {
    expect(calculateGroupTotal([100, 200, 300])).toBe(600);
  });

  it('subtracts the group discount', () => {
    expect(calculateGroupTotal([100, 200, 300], 50)).toBe(550);
  });

  it('handles an empty group', () => {
    expect(calculateGroupTotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test`
Expected: all PASS. If any fail, the pricing function has a genuine bug. Investigate with superpowers:systematic-debugging before changing either the test or the code.

- [ ] **Step 3: Commit**

```bash
git add tests/pricing.test.ts
git commit -m "test: cover booking and group pricing calculations"
```

---

### Task 4: Extract and test the deposit calculation

The deposit logic currently lives inline in `src/app/bookings/new/page.tsx:109-113` (and is duplicated in the edit form). Extract it to a shared helper so both forms use one tested implementation.

**Files:**
- Create: `src/lib/deposit.ts`
- Create: `tests/deposit.test.ts`
- Modify: `src/app/bookings/new/page.tsx` (the `getDepositAmount` function around line 109)
- Modify: `src/app/bookings/edit/[id]/page.tsx` (its equivalent deposit calculation, find it with `grep -n "depositMode" src/app/bookings/edit/\[id\]/page.tsx`)

- [ ] **Step 1: Write the failing tests**

Create `tests/deposit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateDeposit } from '../src/lib/deposit';

describe('calculateDeposit', () => {
  it('returns the fixed amount in amount mode', () => {
    expect(calculateDeposit({ total: 500, mode: 'amount', amount: 75, percentage: 20 })).toBe(75);
  });

  it('returns a percentage of the total in percentage mode', () => {
    expect(calculateDeposit({ total: 500, mode: 'percentage', amount: 0, percentage: 20 })).toBe(100);
  });

  it('handles a zero total in percentage mode', () => {
    expect(calculateDeposit({ total: 0, mode: 'percentage', amount: 0, percentage: 20 })).toBe(0);
  });

  it('never returns a negative deposit', () => {
    expect(calculateDeposit({ total: 500, mode: 'amount', amount: -10, percentage: 20 })).toBe(0);
    expect(calculateDeposit({ total: 500, mode: 'percentage', amount: 0, percentage: -5 })).toBe(0);
  });

  it('caps the deposit at the booking total', () => {
    expect(calculateDeposit({ total: 100, mode: 'amount', amount: 250, percentage: 20 })).toBe(100);
    expect(calculateDeposit({ total: 100, mode: 'percentage', amount: 0, percentage: 150 })).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, module `src/lib/deposit` not found.

- [ ] **Step 3: Create `src/lib/deposit.ts`**

```ts
export type DepositMode = 'amount' | 'percentage';

export function calculateDeposit(opts: {
  total: number;
  mode: DepositMode;
  amount: number;
  percentage: number;
}): number {
  const raw = opts.mode === 'amount' ? opts.amount : (opts.total * opts.percentage) / 100;
  return Math.min(Math.max(raw, 0), Math.max(opts.total, 0));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Wire the helper into both booking forms**

In `src/app/bookings/new/page.tsx`, import the helper and replace the body of `getDepositAmount` (around lines 109-113) so it delegates:

```ts
import { calculateDeposit } from '@/lib/deposit';

// inside the component, replacing the existing getDepositAmount body:
const getDepositAmount = () => calculateDeposit({
  total: getFinalPrice(),
  mode: depositMode,
  amount: depositAmount,
  percentage: depositPercentage,
});
```

Make the equivalent replacement in `src/app/bookings/edit/[id]/page.tsx` (same state variable names are expected; verify with grep first and adapt the total source to that page's price function).

- [ ] **Step 6: Verify in the browser**

With the dev server running, open http://localhost:3000/bookings/new, pick a guest, room and dates, then toggle between percentage and fixed deposit modes. Expected: deposit figure updates live in both modes, and a fixed deposit larger than the total is capped at the total.

- [ ] **Step 7: Commit**

```bash
git add src/lib/deposit.ts tests/deposit.test.ts src/app/bookings/new/page.tsx "src/app/bookings/edit/[id]/page.tsx"
git commit -m "refactor: extract shared, tested deposit calculation"
```

---

### Task 5: PWA manifest and app metadata

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-icon.png`
- Modify: `src/app/layout.tsx:15-18` (metadata block)

- [ ] **Step 1: Create the source icon `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <path d="M128 232 L256 128 L384 232 V384 H128 Z" fill="#ffffff"/>
  <rect x="216" y="288" width="80" height="96" fill="#2563eb"/>
</svg>
```

- [ ] **Step 2: Generate PNG icons**

```bash
# ImageMagick (install with: brew install imagemagick)
magick public/icon.svg -resize 192x192 public/icon-192.png
magick public/icon.svg -resize 512x512 public/icon-512.png
magick public/icon.svg -resize 180x180 public/apple-icon.png
```

If ImageMagick is unavailable, use `npx @squoosh/cli` or any image tool; the only requirement is real PNGs at those sizes.

- [ ] **Step 3: Create `src/app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'B&B Group Booking System',
    short_name: 'B&B Bookings',
    description: 'Booking, meal and finance management for a 6-room B&B',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
```

- [ ] **Step 4: Fix the app metadata in `src/app/layout.tsx`**

Replace the existing metadata export (lines 15-18, currently the create-next-app default):

```ts
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "B&B Group Booking System",
  description: "Booking, meal and finance management for a 6-room B&B",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "B&B Bookings",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds. Then with the dev server running, `curl -s http://localhost:3000/manifest.webmanifest` returns the JSON manifest, and the browser tab shows the new title.

- [ ] **Step 6: Commit**

```bash
git add src/app/manifest.ts src/app/layout.tsx public/icon.svg public/icon-192.png public/icon-512.png public/apple-icon.png
git commit -m "feat: add PWA manifest, icons and proper app metadata"
```

---

### Task 6: Service worker for installability and offline shell

Keep this deliberately minimal: never cache `/api` responses (stale booking data is worse than no data), cache static assets, show cached pages when offline.

**Files:**
- Create: `public/sw.js`
- Create: `src/components/ServiceWorkerRegister.tsx`
- Modify: `src/app/layout.tsx` (render the register component)

- [ ] **Step 1: Create `public/sw.js`**

```js
const CACHE_NAME = 'bb-bookings-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls or non-GET requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return;
  }

  // Network first, fall back to cache when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

- [ ] **Step 2: Create `src/components/ServiceWorkerRegister.tsx`**

```tsx
'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  return null;
}
```

- [ ] **Step 3: Render it in `src/app/layout.tsx`**

```tsx
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

// inside the body tag, alongside {children}:
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegister />
        {children}
      </body>
```

- [ ] **Step 4: Verify with a production build**

```bash
npm run build && npm run start
```

Open http://localhost:3000 in Chrome, DevTools → Application → Service Workers. Expected: `sw.js` is activated, and the Application → Manifest pane shows the install prompt is available with no warnings.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js src/components/ServiceWorkerRegister.tsx src/app/layout.tsx
git commit -m "feat: add service worker for PWA installability"
```

---

### Task 7: Production Turso database

**Files:**
- None changed in the repo. `drizzle.config.ts`, `src/db/client.ts` and `netlify/functions/utils/db.ts` already read `DATABASE_URL` and `DATABASE_AUTH_TOKEN`, so this task is configuration only.

- [ ] **Step 1: Install the Turso CLI and authenticate**

```bash
brew install tursodatabase/tap/turso
turso auth login
```

- [ ] **Step 2: Create the database**

```bash
turso db create bb-bookings --location lhr   # London region
turso db show bb-bookings --url               # note the libsql://... URL
turso db tokens create bb-bookings            # note the auth token
```

- [ ] **Step 3: Push the schema and seed the rooms**

```bash
DATABASE_URL="libsql://<from-step-2>" DATABASE_AUTH_TOKEN="<from-step-2>" npm run db:push
DATABASE_URL="libsql://<from-step-2>" DATABASE_AUTH_TOKEN="<from-step-2>" npm run seed
```

Expected: `db:push` reports the 5 tables created; `seed` inserts the 6 rooms.

- [ ] **Step 4: Verify the data**

```bash
turso db shell bb-bookings "SELECT name FROM rooms;"
```

Expected: 6 room names (Double Hobbit hut, Twin Hobbit hut, Mermaid Room, Fairy Room, Woodland Room, Nania Room).

- [ ] **Step 5: Record the credentials**

Add the production values to a private note (not the repo). Do NOT put them in `.env.local`, which should keep pointing at `file:./dev.db` for local work.

---

### Task 8: Netlify production deployment

**Files:**
- Possibly modify: `netlify.toml` (only if the deploy verification fails; current config with `@netlify/plugin-nextjs` is expected to work)

- [ ] **Step 1: Link the site**

```bash
npx netlify login
npx netlify init    # create & configure a new site, or `npx netlify link` if it already exists
```

- [ ] **Step 2: Set production environment variables**

```bash
npx netlify env:set DATABASE_URL "libsql://<from-task-7>"
npx netlify env:set DATABASE_AUTH_TOKEN "<from-task-7>"
```

- [ ] **Step 3: Deploy**

```bash
npx netlify deploy --build --prod
```

Expected: build succeeds, deploy URL printed.

- [ ] **Step 4: Verify every API endpoint in production**

```bash
SITE="https://<your-site>.netlify.app"
curl -s -o /dev/null -w "rooms: %{http_code}\n"          "$SITE/api/rooms"
curl -s -o /dev/null -w "guests: %{http_code}\n"         "$SITE/api/guests"
curl -s -o /dev/null -w "groups: %{http_code}\n"         "$SITE/api/groups"
curl -s -o /dev/null -w "room-bookings: %{http_code}\n"  "$SITE/api/room-bookings"
curl -s -o /dev/null -w "settings: %{http_code}\n"       "$SITE/api/settings"
```

Expected: 200 for all five. `/api/rooms` should return the 6 seeded rooms.

- [ ] **Step 5: Full manual smoke test on the deployed site**

Work through this checklist in the browser against the production URL:

- [ ] Dashboard loads with the 6 rooms and zero bookings
- [ ] Create a guest in Guests CRM
- [ ] Create an individual booking (auto-creates an "Individual - [Guest]" group), both deposit modes show correct figures
- [ ] Attempt a double-booking of the same room and dates: rejected with a clear message
- [ ] Create a back-to-back booking (check-in on another booking's check-out day): accepted
- [ ] Create a group with 2 bookings and a group discount; group total = sum of bookings minus discount
- [ ] Calendar shows the bookings in day, week and month views
- [ ] Kitchen report shows the breakfast counts for the booked dates
- [ ] Finances shows deposits and balances matching what was entered
- [ ] Housekeeping status toggles persist after a refresh
- [ ] Settings changes save and survive a refresh
- [ ] Delete the test bookings, group and guest to leave the database clean
- [ ] On a phone: install the PWA from the browser menu and confirm it opens standalone

- [ ] **Step 6: Commit anything that needed fixing, then tag the milestone**

```bash
git add -A
git commit -m "chore: production deployment fixes"   # only if files changed
git tag v1.0.0
```

---

### Task 9: Pre-auth security hardening

The API currently allows any origin (`Access-Control-Allow-Origin: *`) and has no authentication, so anyone who discovers the URL can read and modify guest data. Full auth is a separate plan; this task narrows the surface now.

**Files:**
- Modify: `netlify/functions/utils/cors.ts:1-5`

- [ ] **Step 1: Restrict CORS to the production origin**

Replace the `corsHeaders` constant in `netlify/functions/utils/cors.ts`:

```ts
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};
```

- [ ] **Step 2: Set the origin in Netlify**

```bash
npx netlify env:set ALLOWED_ORIGIN "https://<your-site>.netlify.app"
npx netlify deploy --build --prod
```

Local dev keeps working because the fallback stays `*` when the variable is unset.

- [ ] **Step 3: Verify**

```bash
curl -s -D - -o /dev/null "https://<your-site>.netlify.app/api/rooms" | grep -i access-control-allow-origin
```

Expected: the header now names the site URL, not `*`.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/utils/cors.ts
git commit -m "security: restrict API CORS to the production origin"
```

- [ ] **Step 5: Record the constraint**

Until the auth plan is implemented, do not enter real guest names, emails or phone numbers into the production site. CORS restriction stops casual cross-site access but is not authentication.

---

### Task 10: README rewrite

**Files:**
- Modify: `README.md` (full replacement of the create-next-app default)

- [ ] **Step 1: Replace `README.md`**

````markdown
# B&B Group Booking System

Booking management for a 6-room B&B: group and individual bookings, meal
planning, finances, housekeeping and a guest CRM. Built as an installable
PWA for use on desktop, phone and tablet.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **API:** Netlify Functions (`netlify/functions/`)
- **Database:** Turso (libSQL/SQLite) with Drizzle ORM
- **Hosting:** Netlify

## Local Development

```bash
npm install
npm run db:push       # create tables in the local SQLite file (dev.db)
npm run seed          # insert the 6 rooms (run once)
npx netlify dev       # full stack on http://localhost:8888
```

`npm run dev` alone serves the frontend on port 3000 without the API
functions, so use `netlify dev` for real work.

## Environment Variables

| Variable | Local | Production |
|----------|-------|------------|
| `DATABASE_URL` | `file:./dev.db` | `libsql://...turso.io` |
| `DATABASE_AUTH_TOKEN` | not needed | Turso database token |
| `ALLOWED_ORIGIN` | not needed | the production site URL |

Local values live in `.env.local`. Production values are set in Netlify
(`npx netlify env:set ...`), never committed.

## Useful Commands

```bash
npm test              # run the Vitest unit tests
npm run db:studio     # browse the database in Drizzle Studio
npm run build         # production build
npx netlify deploy --build --prod   # deploy
```

## Project Structure

```
src/app/               Pages (dashboard, bookings, groups, calendar, ...)
src/components/        Shared components (Navigation, Calendar)
src/db/                Drizzle schema and client
src/lib/               Frontend helpers (API wrapper, pricing, deposits)
netlify/functions/     API endpoints (rooms, guests, groups, room-bookings, settings)
tests/                 Vitest unit tests
plans/                 Implementation plans and status reports
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: replace default README with project documentation"
```

---

## Out of scope (next plan)

**Email OTP authentication** (Better Auth + Resend, login/logout, route protection middleware). This is its own subsystem with its own schema additions and deserves a dedicated plan. It is the gate for entering real guest data into production.

**Future enhancements** already logged in PROJECT_STATUS.md Priority 3: drag-and-drop calendar, payment method tracking, receipts/invoices, email confirmations.
