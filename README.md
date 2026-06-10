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
src/lib/               Frontend helpers (API wrapper, deposits, room colours)
netlify/functions/     API endpoints (rooms, guests, groups, room-bookings, settings)
tests/                 Vitest unit tests
plans/                 Implementation plans and status reports
```
