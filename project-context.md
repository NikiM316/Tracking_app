# Project Context Document — Cycle Tracker

> **Last updated:** August 6, 2026  
> **Purpose:** Reference document for future development. Summarizes the current architecture, data model, and conventions of this Next.js gym tracking application.

---

## 1. Tech Stack & Architecture

### Core Framework

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | **Next.js 16.2.11** (App Router) | Server Components, Server Actions, no API routes |
| UI Library | **React 19.2.4** | Client islands for interactivity |
| Language | **TypeScript 5** (strict mode) | Path alias `@/*` → project root |
| Styling | **Tailwind CSS v4** | Via `@import "tailwindcss"` in `app/globals.css`; no separate `tailwind.config.*` |
| Database | **Supabase** (`@supabase/supabase-js` ^2.110) | Server-side only with service role key |
| Charts | **Recharts** ^3.10 | Used in analytics progression chart |
| Dates | **date-fns** ^4.4 | Formatting and parsing in analytics UI |

### Next.js App Router Setup

- **Routing:** App Router with a single route group `(app)` that wraps all main tabs in a shared shell. No dynamic segments, no `api/` routes, no `loading.tsx` / `error.tsx` / `not-found.tsx`.
- **Rendering:** All main pages export `export const dynamic = "force-dynamic"` — data is always fetched fresh on each request.
- **Entry point:** `/` redirects to `/today` via `redirect()` in `app/page.tsx`.
- **Config:** `next.config.ts` is empty (defaults only). No custom rewrites, headers, or image domains.

### PWA Configuration

The app is configured for **Add to Home Screen** style installation, but **not** a full offline-capable PWA:

| Feature | Status |
|---------|--------|
| Web manifest | ✅ `public/manifest.webmanifest` linked via `metadata.manifest` in root layout |
| Apple web app meta | ✅ `appleWebApp.capable`, `black-translucent` status bar |
| Mobile viewport | ✅ Fixed scale, `viewportFit: "cover"`, theme color `#09090b` |
| Service worker | ❌ No Workbox, `next-pwa`, or SW registration |
| Icon assets | ⚠️ Manifest references `/icon-192.png` and `/icon-512.png` but these files are **not present** in `public/` |

- **App name:** Cycle Tracker  
- **Start URL:** `/today`  
- **Display:** `standalone`, portrait orientation, dark theme

### Styling Approach

- **Tailwind v4** with CSS-first configuration in `app/globals.css`:
  - `@theme inline` defines `--color-background`, `--color-foreground`, font variables
  - Dark zinc palette (`zinc-950` background, `emerald-500` accent)
- **Fonts:** Geist Sans + Geist Mono via `next/font/google`
- **Mobile-first:** `max-w-md` shell, safe-area inset padding, 16px minimum input font size (prevents iOS zoom)
- **No component library:** Custom UI primitives in `components/ui/` (not shadcn/ui)

### State Management

There is **no global client state library** (no Redux, Zustand, React Query, or SWR).

| Concern | Approach |
|---------|----------|
| Server data | Fetched in Server Components via Server Actions in `lib/actions/` |
| Client interactivity | Local React state (`useState`, `useRef`, `useMemo`) in `"use client"` components |
| Mutations | Server Actions called directly from client components |
| Optimistic UI | Minimal — debounced auto-save with local `dirty` / `saving` flags on sets |
| Cache invalidation | `revalidatePath()` after mutations (e.g. `/today`, `/history`) |
| Async transitions | `useTransition` in `ProgressionChart` for exercise selection loading |

---

## 2. Folder Structure

```
Tracking_app/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, PWA metadata, dark body)
│   ├── page.tsx                  # Redirect "/" → "/today"
│   ├── globals.css               # Tailwind v4 + CSS variables
│   ├── favicon.ico
│   └── (app)/                    # Route group — shared shell, no URL segment
│       ├── layout.tsx            # AppShell + cycle day header
│       ├── today/page.tsx        # Active workout logging
│       ├── cycle/page.tsx        # 14-day program overview
│       ├── history/page.tsx      # Completed workouts
│       └── analytics/page.tsx    # Consistency + progression charts
│
├── components/                   # Feature-driven UI (not atomic design)
│   ├── layout/                   # App chrome
│   │   ├── AppShell.tsx          # Mobile shell: header + main + bottom nav
│   │   ├── BottomNav.tsx         # Fixed tab bar (Today / Cycle / History / Analytics)
│   │   └── CycleDayHeader.tsx    # Sticky "Day X of 14" header
│   ├── workout/                  # Today page — core logging UX
│   │   ├── WorkoutForm.tsx       # Orchestrator: debounced save, finish, warmups
│   │   ├── ExerciseBlock.tsx     # Per-exercise container
│   │   ├── SetList.tsx / SetRow.tsx
│   │   ├── SetCategoryPicker.tsx
│   │   ├── ExerciseNotesInput.tsx
│   │   ├── PreviousSessionGhost.tsx
│   │   ├── RestTimer.tsx
│   │   ├── WaterTracker.tsx
│   │   └── WorkoutCompleteSummary.tsx
│   ├── history/
│   │   └── WorkoutHistoryAccordion.tsx
│   ├── analytics/
│   │   ├── ConsistencyCalendar.tsx
│   │   └── ProgressionChart.tsx
│   ├── cycle/
│   │   └── CycleDayAccordion.tsx
│   └── ui/                       # Shared primitives
│       ├── Button.tsx
│       ├── NumberInput.tsx
│       └── SegmentedControl.tsx
│
├── lib/                          # Server-side logic & utilities
│   ├── actions/                  # Server Actions ("use server")
│   │   ├── workout.ts            # Today CRUD + reads
│   │   ├── history.ts            # Workout history aggregation
│   │   ├── analytics.ts          # Calendar + exercise progress
│   │   └── cycle.ts              # 14-day program overview
│   ├── supabase/
│   │   ├── server.ts             # createServerSupabaseClient()
│   │   └── types.ts              # Hand-written Database types
│   ├── program/
│   │   └── cycle.ts              # Static CYCLE_PROGRAM (14 days)
│   └── utils/
│       ├── cycle-day.ts          # Cycle day calculation from anchor date
│       ├── placeholder-user.ts   # PLACEHOLDER_USER_ID constant
│       ├── water.ts              # Water goals, parsing, formatting
│       ├── warmups.ts            # Smart warmup prescriptions
│       └── format-rest.ts        # Human-readable rest durations
│
├── public/
│   ├── manifest.webmanifest
│   └── *.svg                     # Default Next.js assets (no PWA icons)
│
├── package.json
├── next.config.ts
├── postcss.config.mjs            # @tailwindcss/postcss only
├── tsconfig.json                 # @/* path alias
└── AGENTS.md                     # Next.js version-specific agent notes
```

### Route Map

| URL | Page | Primary data source |
|-----|------|---------------------|
| `/` | Redirect | → `/today` |
| `/today` | Workout logging | `getTodayWorkoutData()` |
| `/cycle` | Program schedule | `getCycleOverviewData()` |
| `/history` | Past workouts | `getWorkoutHistory()` |
| `/analytics` | Charts & calendar | `getConsistencyCalendar()`, `getExercisesForAnalytics()` |

---

## 3. Database & Backend (Supabase)

### Connection Model

- **Single client:** `createServerSupabaseClient()` in `lib/supabase/server.ts`
- **Key type:** Service role key (`SUPABASE_SERVICE_ROLE_KEY`) — bypasses Row Level Security
- **Scope:** Server-only (`import "server-only"`), no browser client, no `@supabase/ssr` usage despite it being listed in `package.json`
- **Auth disabled:** Session persistence and token refresh are explicitly turned off
- **New-format keys:** Custom fetch wrapper strips `Authorization: Bearer` header for Supabase keys starting with `sb_publishable_` or `sb_secret_`

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side database access |
| `PLACEHOLDER_USER_ID` | No | Overrides default all-zeros UUID for single-user mode |
| `CYCLE_START_DATE` | No | Anchor date for 14-day rotation (default: `2026-08-04`) |

### Inferred Schema

Types are hand-written in `lib/supabase/types.ts`. No migrations folder exists in the repo.

#### Entity Relationship Diagram

```
┌─────────────┐
│  exercises  │  (global catalog, not user-scoped)
│─────────────│
│ id (PK)     │
│ name        │
│ slug (UK)   │
│ category    │  enum: barbell | calisthenics | cardio | mobility
│ created_at  │
└──────┬──────┘
       │
       │ exercise_id
       ▼
┌─────────────┐       ┌──────────────────┐
│    sets     │──────▶│     workouts      │
│─────────────│       │──────────────────│
│ id (PK)     │       │ id (PK)           │
│ workout_id  │◀──────│ user_id (FK)      │──▶ auth.users (intended, not wired)
│ exercise_id │       │ cycle_day (1–14)  │
│ set_category│       │ date (YYYY-MM-DD) │
│ weight_kg   │       │ completed_at      │
│ reps        │       │ water_ml          │
│ set_order   │       │ created_at        │
│ rest_seconds│       └────────┬───────────┘
│ created_at  │                │
└─────────────┘                │ workout_id
                               ▼
                    ┌──────────────────┐
                    │  exercise_notes  │
                    │──────────────────│
                    │ id (PK)          │
                    │ workout_id       │
                    │ exercise_id      │
                    │ note             │
                    │ created_at       │
                    │ updated_at       │
                    │ UNIQUE(workout_id, exercise_id)
                    └──────────────────┘
```

#### Table Details

**`exercises`** — Master exercise catalog seeded in Supabase. Referenced by slug from the static program in `lib/program/cycle.ts`. Not scoped to `user_id`.

**`workouts`** — One row per user per calendar date. Tracks which cycle day was performed, completion status, and daily water intake.

- Scoped by `user_id`
- Unique constraint inferred: one workout per `(user_id, date)`
- `completed_at` null = in-progress; non-null = finished (appears in history)
- `cycle_day` stores the program day (1–14) at time of logging

**`sets`** — Individual logged sets within a workout.

- Belongs to `workout_id` → `exercises.id`
- `set_category` enum: `warmup`, `top_set`, `back_off`, `working_set`, `zone_2`
- `weight_kg` nullable (bodyweight / calisthenics sets)
- `set_order` determines display sequence
- `rest_seconds` records rest taken after the preceding set

**`exercise_notes`** — Free-text notes per exercise per workout.

- Upserted on conflict `(workout_id, exercise_id)`
- Previous notes from completed workouts are surfaced as "ghost" hints on the Today page

#### Database Function

```sql
increment_workout_water(p_workout_id UUID, p_amount INTEGER) → INTEGER
```

Atomically increments `workouts.water_ml` and returns the new total. Called via `supabase.rpc()` from the `incrementWaterMl` server action.

### Static Program vs. Database

The **14-day training program** lives in code (`lib/program/cycle.ts`), not in the database:

- Each day has a label (e.g. "Push A", "Total Rest") and an ordered list of exercise **slugs**
- Exercise metadata (name, category) is fetched from Supabase at runtime by slug
- Rest days: cycle days **4**, **7**, **11**, **14** (Active Recovery or Total Rest)

---

## 4. Core Features & Data Flow

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│  Server Component (page.tsx)                            │
│  - force-dynamic                                        │
│  - await server action(s)                               │
│  - pass data as props to client component               │
└────────────────────┬────────────────────────────────────┘
                     │ initialData prop
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Client Component ("use client")                        │
│  - local state for form/editing                       │
│  - calls server actions on user interaction             │
│  - debounced auto-save (WorkoutForm: 3s)              │
└────────────────────┬────────────────────────────────────┘
                     │ server action calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│  lib/actions/*.ts ("use server")                        │
│  - createServerSupabaseClient()                         │
│  - PLACEHOLDER_USER_ID for all queries                  │
│  - revalidatePath() after mutations                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              Supabase (Postgres)
```

### Feature: Today (Workout Logging)

**Page:** `app/(app)/today/page.tsx` → `<WorkoutForm initialData={...} />`

**Read flow (`getTodayWorkoutData`):**
1. Compute current cycle day from `CYCLE_START_DATE` anchor
2. Look up program day exercises by slug from Supabase
3. Fetch or create today's workout row for the placeholder user
4. Load sets and notes for today's workout
5. Load previous notes from most recent completed workouts

**Write flow (client-driven):**
| Action | Trigger | Server Action |
|--------|---------|---------------|
| Auto-save workout | Debounced (3s) on set/note changes | `upsertWorkout`, `upsertSet`, `deleteSet`, `upsertExerciseNote` |
| Add water | Quick-add buttons or custom amount | `incrementWaterMl` (auto-upserts workout first) |
| Finish workout | "Finish Workout" button | `finishWorkout` → sets `completed_at` |
| Smart warmups | Top set weight entered | Client-side `buildSmartWarmups()` → saved via `upsertSet` |
| Previous session ghost | Exercise expanded | `getPreviousExerciseSession`, `getPreviousTopSet` |

**Local set model:** Client maintains `LocalSet` objects with `localId`, `dirty`, and `saving` flags. DB sets are mapped on load; new sets get temporary local IDs until persisted.

### Feature: Cycle (Program Overview)

**Page:** `app/(app)/cycle/page.tsx` → `<CycleDayAccordion />`

- Merges static `CYCLE_PROGRAM` with exercise names from Supabase
- Highlights current cycle day
- Read-only — no mutations

### Feature: History

**Page:** `app/(app)/history/page.tsx` → `<WorkoutHistoryAccordion />`

- Fetches completed workouts (`completed_at IS NOT NULL`) ordered by date descending
- Joins sets, notes, and exercise metadata client-side in the server action
- Resolves program label from `cycle_day` via `getProgramDay()`

### Feature: Analytics

**Page:** `app/(app)/analytics/page.tsx`

**Consistency Calendar (`getConsistencyCalendar`):**
- Iterates from cycle anchor date to today
- Status per day: `logged` (workout exists), `rest` (cycle days 4/7/11/14), `missed`, or `future`
- Rendered server-side in `<ConsistencyCalendar />`

**Progression Chart (`getExerciseProgress`):**
- Server action computes best e1RM per date using **Epley formula**: `weight × (1 + reps / 30)`
- Client component `<ProgressionChart />` fetches progress on exercise selection change via `useTransition`
- Rendered with Recharts `LineChart`

### Server Actions Reference

| File | Exports | Revalidates |
|------|---------|-------------|
| `workout.ts` | `getTodayWorkoutData`, `getPreviousExerciseSession`, `getPreviousTopSet`, `upsertWorkout`, `finishWorkout`, `incrementWaterMl`, `upsertSet`, `deleteSet`, `upsertExerciseNote` | `/today`, `/history` |
| `history.ts` | `getWorkoutHistory` | — |
| `analytics.ts` | `getConsistencyCalendar`, `getExercisesForAnalytics`, `getExerciseProgress` | — |
| `cycle.ts` | `getCycleOverviewData` | — |

---

## 5. Authentication & Security

### Current State: No Auth Implemented

Authentication is **not wired up**. The app operates in single-user prototype mode:

| Aspect | Current Implementation |
|--------|------------------------|
| User identity | Hard-coded `PLACEHOLDER_USER_ID` (`00000000-0000-0000-0000-000000000000`), overridable via env |
| Supabase client | Service role key on server only — full database access, bypasses RLS |
| Middleware | **None** — no `middleware.ts`, no route protection, no session refresh |
| Browser client | **None** — no `createBrowserClient`, no client-side Supabase calls |
| `@supabase/ssr` | Listed in dependencies but **unused** |

All server actions filter data with `.eq("user_id", userId)` using the placeholder ID, so the schema is **ready for multi-user auth** but the wiring is not done.

### Security Considerations for Production

Before deploying to multiple users, the following must be addressed:

1. **Replace service role** with anon key + authenticated user JWT in server actions
2. **Implement Supabase Auth** (email, OAuth, etc.) with `@supabase/ssr` cookie-based sessions
3. **Add middleware** for session refresh and protected route gating
4. **Enable RLS policies** on `workouts`, `sets`, and `exercise_notes` scoped to `auth.uid()`
5. **Remove `PLACEHOLDER_USER_ID`** and derive `user_id` from the authenticated session
6. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client

---

## 6. Known Patterns & Conventions

### Component Patterns

| Pattern | Description |
|---------|-------------|
| **Server page → Client island** | Pages are async Server Components; interactivity isolated to `"use client"` children |
| **Feature folders** | Components grouped by domain (`workout/`, `analytics/`, `history/`, `cycle/`, `layout/`, `ui/`) |
| **Props-down, actions-up** | Server-fetched data passed as `initialData`; mutations call server actions directly |
| **No shared hooks directory** | React hooks used inline in client components; no `hooks/` folder |

### UI Conventions

| Convention | Detail |
|------------|--------|
| **Custom UI primitives** | `Button`, `NumberInput`, `SegmentedControl` — hand-rolled, not shadcn/ui |
| **Color system** | Dark zinc base, emerald accent for primary actions and active nav |
| **Card pattern** | `rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5` |
| **Touch targets** | Minimum `min-h-12` on buttons, `min-h-14` on nav items |
| **Inline SVG icons** | Bottom nav uses inline Heroicons-style SVGs, not an icon library |

### Server Action Conventions

- Every action file starts with `"use server"`
- Supabase client created per invocation (no singleton)
- Errors returned as `{ error: string }` union types (not thrown to client for mutations)
- Read actions throw `Error` on failure
- `revalidatePath()` called after successful mutations

### Type Conventions

- Database row types defined in `lib/supabase/types.ts` with a `Database` generic for Supabase client typing
- Action-specific DTOs exported alongside actions (e.g. `TodayWorkoutData`, `HistoryWorkoutEntry`)
- Client-local types exported from components when needed (e.g. `LocalSet` from `SetRow.tsx`)

### Domain Logic Locations

| Logic | Location |
|-------|----------|
| 14-day program schedule | `lib/program/cycle.ts` (static) |
| Cycle day calculation | `lib/utils/cycle-day.ts` |
| Smart warmup prescriptions | `lib/utils/warmups.ts` (50%/70%/90% of top set) |
| Water parsing/formatting | `lib/utils/water.ts` |
| Rest duration display | `lib/utils/format-rest.ts` |
| e1RM calculation | Inline in `lib/actions/analytics.ts` (Epley) |

### Set Categories

| Category | Typical Use |
|----------|-------------|
| `warmup` | Ramp-up sets (including smart auto-generated warmups) |
| `top_set` | Heaviest working set of the session |
| `back_off` | Reduced weight after top set |
| `working_set` | Standard working sets |
| `zone_2` | Cardio / active recovery |

### Import Alias

All imports use the `@/` prefix mapping to the project root (configured in `tsconfig.json`).

---

## Appendix: Gaps & Future Work

Items identified during analysis that are not yet implemented:

- [ ] User authentication (Supabase Auth + middleware + RLS)
- [ ] Browser-side Supabase client (`@supabase/ssr` integration)
- [ ] PWA service worker and offline support
- [ ] PWA icon assets (`icon-192.png`, `icon-512.png`)
- [ ] Supabase migrations in repo (`supabase/migrations/`)
- [ ] Error boundaries (`error.tsx`) and loading states (`loading.tsx`)
- [ ] API routes (currently all data access is via Server Actions)
- [ ] Test suite

---

## Quick Reference: Key Files

| File | Role |
|------|------|
| `lib/program/cycle.ts` | Static 14-day training program |
| `lib/actions/workout.ts` | Primary CRUD for workout logging |
| `lib/supabase/server.ts` | Supabase client factory |
| `lib/supabase/types.ts` | Database type definitions |
| `components/workout/WorkoutForm.tsx` | Main workout logging orchestrator |
| `app/(app)/layout.tsx` | Shared app shell wrapper |
| `app/layout.tsx` | Root layout, PWA metadata, fonts |
