# Project Context & Architecture

> **Status:** Living document. Generated from a full audit of the codebase and the live Supabase project on **2026-09-01**.
> **Audience:** A developer or AI agent picking this project up cold.
> **Repo:** `/Users/nikolaymarinov/Documents/Tracking_app` · branch `reflection` (also `main`, `Fixing_the_study_plan`)

---

## 1. High-Level Overview

This is a **single-user, mobile-first life-management PWA**. One person (the repo owner) uses it from a phone home screen to run three separate but philosophically related tracking systems out of one app shell.

The unifying idea is **structured self-accountability**: each module encodes a rigid, pre-committed protocol and then measures adherence to it, rather than offering open-ended logging. The fitness module enforces a fixed 14-day training rotation, the discipline module enforces a 180-day binary pass/fail streak that cannot be quietly edited, and the finance module enforces a derived-balance ledger where net worth is computed from transactions rather than typed in.

### The three modules

| Module | Route prefix | Core purpose |
|---|---|---|
| **Fitness** ("Gym Tracker") | `/today`, `/cycle`, `/history`, `/analytics` | Log workouts against a fixed 14-day hybrid Push/Pull/Legs cycle. Set-by-set logging with smart barbell warm-ups, rest timers, water intake, consistency calendar, and estimated-1RM progression charts. |
| **Finance** ("Finance Tracker") | `/finance/**` | Track EUR-centric net worth across cash accounts and an investment portfolio. Manual transaction entry plus Revolut CSV import, category-grouped spending, and live ETH pricing. |
| **Monk Mode** ("Discipline") | `/monk`, `/monk/habits`, `/monk/challenge` | A 180-day binary challenge. Every day is PASSED or FAILED with no partial credit; one failure resets the attempt to zero. Tracks mandatory habits, daily tasks, digital fasting limits, an end-of-day reflection, and a loosely coupled 6-week study curriculum. |

The root page (`app/page.tsx`) is a plain three-card launcher into these modules. There is no cross-module dashboard, no shared data, and no navigation between modules other than returning to the launcher via the Home icon in each header.

### Defining characteristics

- **No authentication.** Every query is hardcoded to a single placeholder user, `00000000-0000-0000-0000-000000000000` (present in `auth.users` as `me@fitness.local`). All server code uses the Supabase **service role key**.
- **Server-first.** 62 of 97 TypeScript files are Server Components or server-only modules. Mutations are Server Actions; there are **zero API route handlers** in the app.
- **Aggressively uncached.** All 13 data pages are `force-dynamic` and the Supabase fetch layer forces `cache: "no-store"`. This is a known, documented performance problem (see §7).
- **PWA in metadata only.** Installable manifest and iOS meta tags exist, but there is no service worker and the referenced icon files are missing.

---

## 2. Tech Stack & Dependencies

### Runtime dependencies

| Package | Version | Role |
|---|---|---|
| `next` | **16.2.11** | App Router framework. See the version warning below. |
| `react` / `react-dom` | 19.2.4 | UI runtime (Server Components, Actions, `use client`). |
| `@supabase/supabase-js` | ^2.110.8 | Sole database client, used server-side only. |
| `@supabase/ssr` | ^0.12.3 | **Unused.** Installed but never imported — there is no browser client and no cookie-based auth. Safe to remove. |
| `recharts` | ^3.10.1 | Progression line chart on `/analytics`. |
| `papaparse` | ^5.5.4 | Client-side CSV parsing for the Revolut import. |
| `canvas-confetti` | ^1.9.4 | Celebration effect when the daily water goal is hit. |
| `date-fns` | ^4.4.0 | Present as a dependency; the codebase mostly uses hand-rolled ISO-string date helpers instead. |
| `server-only` | ^0.0.1 | Guards `lib/supabase/server.ts` against client import. |

### Dev dependencies

`typescript` ^5 (strict mode on), `tailwindcss` ^4 with `@tailwindcss/postcss`, `eslint` ^9 with `eslint-config-next` 16.2.11 (flat config), plus `@types/*`.

### What is deliberately absent

There is **no** state management library (no Redux, Zustand, Jotai, TanStack Query), **no** UI component library (no shadcn/ui, Radix, Headless UI), **no** form library (no React Hook Form), **no** validation library (no Zod — all validation is hand-written inside server actions), and **no** test framework of any kind.

### Version warning for AI agents

This project pins **Next.js 16**, which has breaking changes relative to most training data. Per the repo's `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` before writing code. The most relevant differences here are Cache Components / `'use cache'`, `updateTag` vs `revalidatePath`, and Turbopack being the default dev bundler.

Note that `package.json` sets `"dev": "next dev --webpack"`, which explicitly **opts out of Turbopack** and causes slow on-demand route compilation in development.

### Styling

Tailwind CSS v4 via CSS-first `@import "tailwindcss"` in `app/globals.css`. No `tailwind.config.js`. A consistent dark palette is applied by convention rather than by theme tokens: `zinc-950` background, `zinc-50` text, `emerald-400/500` accent, `red` for destructive states.

`globals.css` carries three mobile-specific fixes worth knowing about: `-webkit-tap-highlight-color: transparent`, a global `font-size: 16px` on form controls (prevents iOS zoom-on-focus), and a block of overrides making `input[type="date"]` render correctly in iOS Safari.

---

## 3. Directory Structure & Architecture

### Layout

```
Tracking_app/
├── app/                        # Next.js App Router — routing and layouts only
│   ├── layout.tsx              # Root: fonts, PWA metadata, viewport, <body> shell
│   ├── page.tsx                # Module launcher (3 cards)
│   ├── error.tsx               # Root error boundary
│   ├── globals.css             # Tailwind v4 entry + mobile fixes
│   ├── (fitness)/              # Route group → /today /cycle /history /analytics
│   ├── (finance)/              # Route group → /finance/**
│   └── (monk)/                 # Route group → /monk/**
│
├── features/                   # All business logic, organised by domain
│   ├── core/                   # Cross-module shared UI primitives
│   ├── fitness/                # ~3,750 LOC
│   ├── finance/                # ~3,566 LOC
│   └── monk/                   # ~4,185 LOC
│
├── lib/
│   ├── supabase/               # Client factory + hand-written DB types
│   ├── program/cycle.ts        # The 14-day training program definition
│   └── utils/                  # Pure helpers (warmups, water, cycle-day, formatting)
│
├── public/manifest.webmanifest # PWA manifest (references missing icons)
├── AGENTS.md / CLAUDE.md       # Next 16 version warning for AI agents
├── Study_plan.md               # 6-week learning curriculum (seed data for Monk Mode)
└── .cursor/plans/              # Two planning documents (see §7)
```

**Size:** ~13,500 lines of TypeScript/TSX across 97 files — `app/` 503, `features/core` 253, `features/fitness` 3,750, `features/finance` 3,566, `features/monk` 4,185, `lib/` 1,240.

### The architectural pattern

The project follows a consistent and genuinely well-observed convention:

> **`app/` holds routing. `features/` holds everything else.**

Route files are deliberately thin. A typical page is under 25 lines: it awaits one server action and passes the serialisable result to a feature component.

```6:9:app/(monk)/monk/page.tsx
export default async function MonkTodayPage() {
  const data = await getTodayPageData();
  return <TodayView {...data} />;
}
```

Each feature module is internally structured the same way:

```
features/<module>/
├── actions/          # "use server" mutations and read aggregators
├── components/
│   ├── layout/       # AppShell, Header, BottomNav (one set per module)
│   ├── <domain>/     # Feature-specific UI
│   └── forms/        # (finance only)
├── lib/              # Pure domain logic, server-side orchestration
├── types.ts          # View-model types for that module
└── hooks/            # Empty (.gitkeep) in all three modules
```

### Route groups and shell duplication

Each of the three route groups has its **own** `AppShell`, `Header`, and `BottomNav`. These are near-identical in structure — a sticky header with a Home link and a fixed bottom tab bar with safe-area insets — but are duplicated per module rather than parameterised. This is arguably the single largest source of copy-paste in the codebase, though it does keep the modules fully decoupled.

`features/core/` holds the only genuinely shared UI: `Button`, `NumberInput`, `SegmentedControl`, `HomeLink`, and `RouteErrorFallback`. Only `HomeLink`, `Button`, and `RouteErrorFallback` are used across more than one module.

### Server/client boundary

- **35 files** carry `"use client"` — mostly forms, timers, modals, and accordions.
- **8 files** carry `"use server"` — the action modules.
- **Zero** API route handlers (`route.ts`). All data flow goes through Server Components and Server Actions.

A notable subtlety: read-only functions like `getTodayPageData()` live inside `"use server"` files. In Next.js this makes them callable from the client, which widens the exposed surface more than intended — they are only ever called from Server Components.

### Path aliases

`@/*` maps to the project root (`tsconfig.json`), so imports read as `@/features/monk/actions/today` and `@/lib/supabase/server`.

---

## 4. Core Modules Breakdown

### 4.0 Core (`features/core/`, 253 LOC)

Five presentational primitives with no data access:

| Component | Client? | Notes |
|---|---|---|
| `Button.tsx` | No | 4 variants (`primary`/`secondary`/`danger`/`ghost`), `min-h-12` touch target. |
| `NumberInput.tsx` | No | Stepper with −/+ buttons, clamping, optional null. Used for reps/weight/minutes. |
| `SegmentedControl.tsx` | No | Generic `<T extends string \| number>` radiogroup. |
| `HomeLink.tsx` | No | Inline SVG house icon back to `/`. |
| `RouteErrorFallback.tsx` | Yes | Shared error UI, wired into all four `error.tsx` boundaries. |

Consistent accessibility discipline is visible here: `role="radiogroup"`/`aria-checked`, `aria-label` on icon buttons, and 44px+ touch targets throughout.

---

### 4.1 Fitness (`features/fitness/`, 3,750 LOC)

**Concept.** A fixed 14-day hybrid cycle defined declaratively in `lib/program/cycle.ts` (27 lines) as an `as const` array of `{ day, label, exerciseSlugs }`:

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | Push A | Pull A | Legs A | Active Rec. | Upper A | Lower A | Rest | Push B | Pull B | Legs B | Active Rec. | Upper B | Lower B | Rest |

**Cycle day advancement is workout-driven, not calendar-driven.** When today's `workouts` row is created, its `cycle_day` is `(previous workout's cycle_day % 14) + 1`. Skipping a day does not skip a workout. The user can manually override the day from the header selector, and the override carries forward.

**Key behaviours:**

- **Smart warm-ups.** Selecting "Top set" on a `barbell`-category exercise auto-generates three warm-up sets at 50% × 8, 70% × 5, 90% × 1 of the previous top set *on the same cycle day*, rounded to 2.5 kg increments (`lib/utils/warmups.ts`).
- **Debounced autosave.** Sets and notes save 3 seconds after the last keystroke, with a flush on unmount.
- **Rest timers.** One per set row, persisted in `sessionStorage` so a page reload does not lose an in-progress rest. Elapsed seconds are written to the *following* set's `rest_seconds`.
- **Water tracking.** 3,500 ml daily goal, incremented atomically through the `increment_workout_water` Postgres RPC, with manual optimistic update and confetti on first goal hit.
- **Analytics.** A GitHub-style consistency calendar (`logged`/`pending`/`rest`/`missed`/`future`) and a Recharts estimated-1RM progression chart using the Epley formula.

**Server actions** live in four files: `workout.ts` (615 lines, 11 exports), `analytics.ts` (211), `history.ts` (124), `cycle.ts` (77).

**Component hotspot:** `WorkoutForm.tsx` at **738 lines** is the largest fitness component — a god component owning set CRUD, note CRUD, water, finish, warm-up generation, debounce management, and three distinct view modes (rest day / active / completed).

---

### 4.2 Finance (`features/finance/`, 3,566 LOC)

**Concept.** A double-sided personal ledger: a **cashflow side** (accounts, transactions, categories) and an **investment side** (portfolios, securities, holdings, trades), summed into a single EUR net worth figure.

**Balances are always derived, never stored.** `getAccounts()` computes each balance as `opening_balance` plus the signed sum of all that account's transactions. Amounts are stored as positive numbers; direction comes from the `type` enum (`expense` / `income` / `transfer`).

**Key behaviours:**

- **Net worth** = EUR cash balances + investment market value. Non-EUR cash is listed separately but **not converted** — there is no FX conversion despite `finance_fx_rates` existing in the schema.
- **Transfers use a single row** (source account + `transfer_account_id`), even though the schema was designed for two linked rows via `transfer_transaction_id`. That column is never populated.
- **Investment cost basis** uses weighted-average cost, recalculated on each buy. Sells are validated against held quantity.
- **Live pricing is ETH-only.** `lib/crypto-prices.ts` calls CoinGecko's simple-price endpoint for `ethereum` in EUR. Every other holding shows invested value and "P/L unavailable". The call runs with `cache: "no-store"` on every dashboard render.
- **CSV import** targets the Revolut consolidated statement format specifically. PapaParse runs client-side with `header: false`; rows are identified heuristically (column 0 parses as a date, column 3 parses as a non-zero amount), which is how it skips Revolut's ~100 preamble lines. Positive amounts become income, negative become expenses, both assigned generic default categories.

**Server actions:** a single **1,031-line `actions.ts`** with 14 exports. Note that `features/finance/actions/` also exists as an empty directory with only a `.gitkeep` — a planned split that was never carried out.

**Component hotspots:** `ImportCsvForm.tsx` (337), `NewTransactionForm.tsx` (278), `EditTransactionModal.tsx` (268), `NewInvestmentTradeForm.tsx` (222), `PortfolioHoldingsSection.tsx` (216).

---

### 4.3 Monk Mode (`features/monk/`, 4,185 LOC)

**Concept.** The most rule-dense module. A 180-day challenge where each calendar day is scored **binary**:

```
mandatoryFailures = (digital fasting failed ? 1 : 0)
                  + count(incomplete mandatory habit logs)
                  + count(incomplete mandatory tasks)

PASSED  iff  mandatoryFailures <= max_mandatory_failures_allowed   // default 0
```

Scoring is a pure function, `scoreDay()` in `features/monk/lib/accountability.ts`, which is deliberately shared between server and client so the UI can show a live pass/fail preview before finalising.

**The three rules that define the module:**

1. **Binary days.** No partial credit. Optional habits and tasks never affect the outcome.
2. **No quiet edits.** Once a day is finalised (`finalized_at` set, `status` moved off `in_progress`), every mutating action rejects it with *"This day is locked."* `monk_overrides` exists in the schema as an audit trail for unlocking, but there is no override UI — the lock is absolute.
3. **You cannot skip days.** On every page load, `catchUpMissedDays()` walks from `started_on` through yesterday, creates any missing day rows, and auto-finalises anything still open, tagging the source as `system_missed` or `automatic`. A single missed mandatory item on any of those days fails the attempt.

**Digital fasting** is always mandatory and has an anti-cheat property: a `null` actual-minutes value **fails**, so ignoring the field is not a way to avoid it. Two channels are tracked — social media (limit stored per-day, per-user, and snapshotted on the challenge) and gaming (limit stored per-day only, default 30 min).

**Rule snapshotting** is used throughout to keep history honest. A challenge freezes its rule set at start; a day freezes each habit's mandatory flag and target at creation. Editing a habit therefore affects future days only, and past days keep the rules they were actually judged under.

**Failure and reset.** Under the default `on_any_fail` rule, a failed day closes the attempt (`status = failed`). The user must explicitly start attempt N+1, and the earliest permitted start is the day after the failure. Attempt history is never deleted — `monk_challenges` accumulates rows and best-streak is computed across all of them.

**Study plan.** A separate, loosely coupled domain (`study_plans` → `study_plan_weeks` → `study_plan_items`) seeded from `Study_plan.md`, a 6-week curriculum covering Cursor/AI, React/Next.js, algorithms, SQL, APIs, and system design. Users can pull a study item into the day as a mandatory or optional task. Study progress deliberately **survives** a Monk Mode reset. Note that the current week is determined by "first week where `is_completed = false`" rather than by `study_plans.starts_on`, which is stored but unused.

**Server actions:** `today.ts` (697 lines, 14 exports), `challenge.ts` (235), `habits.ts` (130), backed by `lib/challenge-ops.ts` (673 lines) which holds the server-side orchestration.

**Component hotspot:** `TodayChecklist.tsx` at **846 lines** is the largest single component in the entire repo — see §7.

### How the modules intersect

They mostly **don't**, and that is intentional. They share the Supabase client, the placeholder user ID, the `features/core` primitives, the root layout, and the design language. They share **no data**. The only near-miss is that both fitness and monk track a form of daily discipline but have completely separate day models: fitness uses UTC `toISOString().slice(0,10)`, while monk uses timezone-aware `Intl.DateTimeFormat` in `Europe/Sofia`.

---

## 5. Data Layer & Supabase Integration

### Project

Live Supabase project **`Tracking_app`** (`rxfcnpdwwkfaaxnciyxj`), Postgres 17.6, region **`eu-west-2`** (London), status healthy. **29 tables** in `public`.

### Client construction

There is exactly **one** client factory, `lib/supabase/server.ts` (101 lines), marked `import "server-only"`. It builds a service-role client with `persistSession: false` and `autoRefreshToken: false`.

Most of the file is a custom `fetch` wrapper working around a specific Supabase gateway issue. The project uses **new-format keys** (`sb_secret_…` / `sb_publishable_…`), which are not JWTs. `supabase-js` still places them in an `Authorization: Bearer` header, and the API gateway intermittently rejects that with *"JWT issued at future"*. The wrapper therefore:

1. Always sets the `apikey` header.
2. Strips any `Authorization: Bearer` header whose token is itself a new-format key.
3. Forces `cache: "no-store"` on every response.
4. Retries up to 3 times with exponential backoff when the response body matches that specific error.

```30:31:lib/supabase/server.ts
 * 4. Retries a few times with backoff on the known transient gateway JWT error
 */
```

Two consequences worth flagging. First, step 3 disables Next.js caching for **every** Supabase read app-wide. Second, several call sites wrap queries in their own `withTransientRetry` (up to 4 attempts), which composes with the fetch-level retry to a worst case of ~12 attempts and several seconds of stalling on a single flaky query.

The factory is **not** memoised with React `cache()`, so a new client is constructed on every call — and a few actions build two per invocation.

### Type system

Types are **hand-written, not generated** from the database. They are split across three files and merged by intersection:

```55:58:lib/supabase/types.ts
export type Database = {
  public: {
    Tables: FinanceTables & MonkTables & {
      exercises: {
```

- `lib/supabase/types.ts` (114 lines) — fitness tables, the `Database` root, the `increment_workout_water` function signature, and enum merging.
- `lib/supabase/finance-types.ts` (417 lines) — 12 finance tables + 6 enums.
- `lib/supabase/monk-types.ts` (464 lines) — 13 monk/study tables + 9 enums.

Every table declares `Relationships: []`, so PostgREST embedded-join results are not type-safe and require casting. Because the types are hand-maintained, **they can silently drift from the live schema** — regenerating with `generate_typescript_types` would be the safer long-term approach.

### Schema

**Fitness (5 objects)**

| Table | Purpose | Rows (live) |
|---|---|---|
| `exercises` | Catalogue keyed by `slug`; `category` ∈ `barbell`/`calisthenics`/`cardio`/`mobility` | 70 |
| `workouts` | One row per user per date: `cycle_day`, `completed_at`, `water_ml` | 24 |
| `sets` | `set_category` ∈ `warmup`/`top_set`/`back_off`/`working_set`/`zone_2`, `weight_kg`, `reps`, `set_order`, `rest_seconds` | 149 |
| `exercise_notes` | Unique on `(workout_id, exercise_id)` | 15 |
| `increment_workout_water(uuid, int)` | `SECURITY DEFINER` RPC for atomic water increment | — |

**Finance (12 tables, 6 enums)**

Actively used: `finance_accounts` (4), `finance_categories` (21, self-referencing via `parent_id`), `finance_transactions` (38), `finance_portfolios` (1), `finance_securities` (1, `user_id IS NULL` denotes a shared catalogue entry), `finance_holdings` (1), `finance_investment_transactions` (1).

Defined but **completely unused by application code**: `finance_settings`, `finance_budgets`, `finance_budget_items`, `finance_security_prices`, `finance_fx_rates`.

Enums: `finance_account_type`, `finance_transaction_type`, `finance_category_kind`, `finance_budget_period`, `finance_security_type`, `finance_investment_tx_type`.

Database CHECK constraints enforce that expense/income rows carry a category and transfer rows carry a `transfer_account_id` with no category.

**Monk Mode (13 tables, 9 enums)**

Actively used: `monk_settings` (1), `monk_challenges` (4), `monk_days` (8), `monk_habits` (2), `monk_habit_logs` (16), `monk_tasks` (10), `study_plans` (1), `study_plan_weeks` (6), `study_plan_items` (38).

Defined but unused: `monk_app_usage`, `monk_goals`, `monk_commitments`, `monk_overrides`.

The schema is well-constrained. `monk_challenges_one_active_per_user` is a partial unique index enforcing at most one active attempt; `monk_days` is uniquely keyed on both `(challenge_id, date)` and `(challenge_id, day_number)`; `monk_habit_logs` is unique on `(day_id, habit_id)`. The code relies on these — day creation catches unique-violation errors as a race-condition guard, and `closeChallenge` uses an optimistic `eq("status", "active")` filter.

### Authentication flow

**There is none.** This is the most important thing to understand about the data layer.

- Every action calls `getPlaceholderUserId()` → `process.env.PLACEHOLDER_USER_ID ?? "00000000-0000-0000-0000-000000000000"`.
- That UUID exists as a real row in `auth.users` (`me@fitness.local`) so foreign keys resolve.
- No login, no session, no middleware, no protected routes, no `@supabase/ssr` browser client.
- `.env.local` documents the intent: *"Prototype user until Supabase Auth is wired in."*

### Row-Level Security — verified live

**RLS is enabled on all 29 tables. Zero of them have any policy.**

The practical effect is *fail-closed*: with no policies, the `anon` and `authenticated` roles can read and write nothing. The application works exclusively because the **service role bypasses RLS entirely**. Security therefore rests on one thing — `SUPABASE_SERVICE_ROLE_KEY` never reaching the client. The code does defend this properly via `import "server-only"` and by keeping the key un-prefixed (no `NEXT_PUBLIC_`).

The consequence is that **the entire authorisation model lives in application code**. Every query manually filters by `user_id`, and there is no database-level backstop if one is forgotten. Adding real auth means writing ~29 policy sets from scratch.

Supabase's security advisor confirms this, reporting `rls_enabled_no_policy` on all 29 tables. It also flags one genuine issue beyond the placeholder-auth situation: **`increment_workout_water` is a `SECURITY DEFINER` function executable by both `anon` and `authenticated`** via `/rest/v1/rpc/`. Unlike the tables, this RPC is *not* protected by the empty-policy fail-closed behaviour — anyone holding the publishable key and a valid workout UUID could increment water. Low impact here, but it is the one place the RLS shield has a hole.

### Indexing — verified live

Finance and Monk are well indexed: `user_id`, `(user_id, date DESC)`, `(challenge_id, day_number)`, `(day_id, sort_order)`, and appropriate partial unique indexes are all present.

**The fitness tables are not.** `workouts` and `sets` have **no secondary indexes whatsoever** — only their primary keys. Given that `getTodayWorkoutData()` performs three separate full scans of the user's entire completed-workout history on every save, the missing `workouts (user_id, date DESC)` and `sets (workout_id)` indexes are the highest-value database fix available. Current row counts (24 and 149) mask the problem; it will degrade linearly.

### Migrations

Ten migrations are applied to the live project, but **none of them are in the repository** — there is no `supabase/` directory. Schema changes were applied directly through the Supabase MCP tooling.

```
20260805080419  add_rest_seconds_to_sets
20260805101104  add_water_ml_to_workouts
20260805101128  add_increment_workout_water_function
20260807073531  create_finance_schema
20260807073934  seed_finance_defaults_for_placeholder_user
20260820083115  create_monk_mode_schema
20260820083303  harden_monk_schema
20260827120407  add_is_completed_to_study_plan_weeks
20260827121237  add_is_completed_to_study_plan_items
20260829113701  add_gaming_minutes_to_monk_days
```

This is a **reproducibility gap**: the repository cannot recreate its own database. A fresh clone has no path to a working environment.

### Data fetching strategy

The pattern is uniform across all three modules:

1. An `async` Server Component page awaits one or more read functions from a `"use server"` module.
2. Those functions build a service-role client, query, and return plain serialisable view-model objects (defined in each module's `types.ts`) — never raw table rows.
3. Client components receive that data as props and call Server Actions for mutations.
4. Actions call `revalidatePath(...)`, and the client **additionally** calls `router.refresh()`.

Step 4 is the app's central performance flaw — see §7.

Aggregation happens **in application code, not SQL**. Account balances, streaks, 1RM progression, and consistency calendars are all computed in TypeScript after fetching rows. There are no database views and no aggregate queries.

The only caching primitive in use is React `cache()`, applied to exactly one function — `getOrCreateTodayWorkout()` — to deduplicate it between the fitness layout and the today page within a single request.

---

## 6. Key Workflows & Routing

### Route map

| Route | Group | Component | Data source |
|---|---|---|---|
| `/` | — | Static launcher | none |
| `/today` | fitness | `WorkoutForm` | `getTodayWorkoutData()` |
| `/cycle` | fitness | `CycleDayAccordion` | `getCycleOverviewData()` |
| `/history` | fitness | `WorkoutHistoryAccordion` | `getWorkoutHistory()` |
| `/analytics` | fitness | `ConsistencyCalendar` + `ProgressionChart` | `getConsistencyCalendar()`, `getExercisesForAnalytics()` |
| `/finance` | finance | Dashboard sections | 5 readers in `Promise.all` |
| `/finance/accounts/new` | finance | `NewAccountForm` | none |
| `/finance/portfolios/new` | finance | `NewPortfolioForm` | none |
| `/finance/transactions/new` | finance | `NewTransactionForm` | `getAccounts()`, `getCategories()` |
| `/finance/investments/new` | finance | `NewInvestmentTradeForm` | `getPortfolios()` |
| `/finance/import` | finance | `ImportCsvForm` | `getAccounts()` |
| `/monk` | monk | `TodayView` → 3 modes | `getTodayPageData()` |
| `/monk/habits` | monk | `HabitsManager` | `getHabitsPageData()` |
| `/monk/challenge` | monk | `ChallengeView` | `getChallengePageData()` |

All 13 data pages declare `export const dynamic = "force-dynamic"`.

**Protected routes: none.** There is no middleware, no auth guard, and no redirect logic anywhere. Every route is publicly reachable.

### Workflow: logging a workout

1. Open `/today`. The layout and page both need today's workout; `getOrCreateTodayWorkout()` is React-`cache()`d so the row is fetched-or-created once. Its `cycle_day` is derived from the previous workout's day + 1.
2. `getTodayWorkoutData()` loads the program day's exercises in program order, plus existing sets, notes, and — for each exercise — the previous session and the previous top set on the same cycle day (shown as ghost text).
3. The user adds a set, picks a category, enters weight and reps. Choosing "Top set" on a barbell lift triggers automatic generation of three warm-up sets.
4. Edits debounce for 3s, then `upsertSet` writes and revalidates `/today`.
5. A rest timer runs between sets, persisted to `sessionStorage`; its elapsed time is attached to the next set saved.
6. Water is added via quick-add buttons, hitting the atomic RPC with an optimistic UI update and confetti at 3,500 ml.
7. "Finish Workout" sets `completed_at` (requires ≥1 set), swapping the view to a read-only summary and making the workout visible in `/history` and `/analytics`.

If the cycle day is wrong, the header selector calls `updateWorkoutCycleDay` and the fix carries forward to future days.

### Workflow: a Monk Mode day

1. Open `/monk`. `getTodayPageData()` runs `prepareActiveChallenge()`, which loads the active challenge and then executes `catchUpMissedDays()` — creating and auto-finalising every unfinalised day from `started_on` through yesterday. **A missed day can fail the whole challenge before the page even renders.**
2. Today's row is created if absent, with active habits snapshotted into `monk_habit_logs` (mandatory flag and target frozen at creation).
3. The view branches on `mode`:
   - `setup` — no challenge ever existed → `SetupForm` (define habits, set the social limit, start attempt 1).
   - `reset_required` — last attempt failed → blocking `ResetScreen`.
   - `completed` — 180 days passed → celebratory `ResetScreen` variant.
   - `today` — active → `TodayChecklist`.
4. Through the day the user toggles habits, manages tasks (add / complete / reorder / edit / delete), logs social-media and gaming minutes, optionally pulls a study item in as a task, and writes four reflection fields.
5. A live `scoreDay()` preview shows the current pass/fail state.
6. "Finalize Day" opens a two-step confirmation, then writes the reflection, scores the day, sets `finalized_at`, and **locks it permanently**. A fail closes the attempt; passing day 180 completes the challenge.

### Workflow: importing finance CSV

Select target account → drop a Revolut CSV → PapaParse reads it client-side → rows are detected heuristically (col 0 = date, col 3 = signed amount) so preamble lines are skipped → the first 5 rows preview → `bulkInsertTransactions` inserts them all with sign-derived types and generic default categories → `/finance` revalidates.

**There is no deduplication at any stage.** Importing the same statement twice creates a complete duplicate set, and correcting categories afterwards must be done one transaction at a time through `EditTransactionModal`.

### Error handling

Four `error.tsx` boundaries (root, fitness, monk — finance has none of its own and falls through to root), all rendering the shared `RouteErrorFallback`. Actions return discriminated results (`{ data }` or `{ error }`) rather than throwing; read functions throw and are caught by the boundary. The fitness layout swallows its own fetch failure and falls back to "Day 1 / Hybrid Cycle" so the shell stays up.

---

## 7. Current Technical State & Debt

The codebase is **more disciplined than most solo projects** — consistent feature-module structure, thin routes, pure domain logic separated from I/O, hand-written validation in every action, and real accessibility attention. The debt below is concentrated in a few specific, well-understood places rather than spread thin.

### 7.2 Critical: schema is not reproducible

Ten migrations exist on the live Supabase project; **zero** exist in the repo. A fresh clone cannot create its database. The remedy is to run `supabase db pull` (or export each migration) into a committed `supabase/migrations/` directory, plus a seed script for the 70 exercises, 21 finance categories, and the 6-week study plan.

### 7.3 High: performance architecture

A detailed diagnosis already exists at `.cursor/plans/pwa_mobile_performance_0b16f1e8.plan.md` (all 15 todos still `pending`). The findings, which this audit confirms:

**Every click costs two round-trips.** 13 `router.refresh()` call sites across 12 components fire immediately after a Server Action that already called `revalidatePath`. In Next.js the action response *already contains* the fresh RSC payload; the refresh fetches it a second time.

**Nothing is optimistic.** `useOptimistic` and `useActionState` are used **zero times**. Fourteen components use `useTransition`, but only to disable a button while waiting. A habit checkbox does not visually move until the write, the revalidation, and the refetch have all completed. (`WorkoutForm` does hand-roll an optimistic water increment with rollback — that pattern just needs generalising.)

**Nothing streams.** There are **zero** `loading.tsx` files and **zero** `<Suspense>` boundaries. Combined with `force-dynamic` on all 13 pages, no HTML is sent until the last query resolves.

**Caching is disabled at every layer.** `cache: "no-store"` in the Supabase fetch wrapper, `force-dynamic` on all pages, `staleTimes` unset, and an unmemoised client factory.

**The refetch is far more expensive than the write.** Monk revalidates three routes per checkbox tap and re-runs `catchUpMissedDays` (three awaits per calendar date). Fitness re-runs three sequential unlimited full scans of workout history. Finance refetches five readers including an uncached CoinGecko call.

**Nothing is code-split.** No `next/dynamic` or `React.lazy` anywhere, so `recharts` (~400 KB) ships in the `/analytics` chunk, `papaparse` in `/finance/import`, and `canvas-confetti` on `/today`.

Two additional items this audit adds: the missing `workouts`/`sets` indexes (§5), and `"dev": "next dev --webpack"` opting out of Turbopack.

### 7.4 High: three god components

| File | Lines | Concerns owned |
|---|---|---|
| `features/monk/components/today/TodayChecklist.tsx` | **846** | Day header, habits list, task CRUD with reorder, two digital-fasting channels, study panel, four reflection fields, two-step finalize dialog. ~15 `useState` hooks. |
| `features/fitness/components/workout/WorkoutForm.tsx` | **738** | Set CRUD, note CRUD, water, finish, warm-up generation, debounce refs, unmount flush, three view modes. |
| `features/finance/actions.ts` | **1,031** | All 14 finance server actions in one file. |

`TodayChecklist` splits cleanly along the section boundaries already visible in its JSX (`HabitsSection`, `TasksSection`, `DigitalFastingSection`, `StudyPanel`, `ReflectionSection`, `FinalizeBar`). `actions.ts` should move into the `features/finance/actions/` directory that already exists, empty, waiting for it.

Also large: `features/monk/actions/today.ts` (697), `features/monk/lib/challenge-ops.ts` (673), `features/fitness/actions/workout.ts` (615).

### 7.5 Medium: structural inconsistencies

- **Two different action layouts.** Fitness and Monk use `actions/` directories; Finance uses one flat `actions.ts` *next to* an empty `actions/` directory. Pick one.
- **Empty scaffolding.** `hooks/` exists with only `.gitkeep` in all three feature modules, and `features/core/actions/` likewise. Either use them or delete them.
- **Triplicated shells.** Three near-identical `AppShell` / `Header` / `BottomNav` sets.
- **Duplicated helpers.** `getPlaceholderUserId()` is copy-pasted into `history.ts` and `analytics.ts` instead of imported from `today-workout.ts`. `formatCurrency()` appears in 4+ finance components. `setCategoryLabel` maps and weekday/month arrays are duplicated across fitness components. `getTodayDateString()` exists in both `actions.ts` and `NewTransactionForm.tsx`.
- **Two incompatible date models.** Fitness uses UTC `toISOString().slice(0,10)`; Monk uses timezone-aware `Intl.DateTimeFormat` with `Europe/Sofia`. Around midnight these disagree about what day it is.
- **Two incompatible cycle-day models in fitness.** `/today` advances from workout history; `/analytics` falls back to calendar maths from a `CYCLE_START_DATE` anchor. These drift apart whenever days are skipped or manually overridden. (The anchor env var is also declared but left empty in `.env.local`.)

### 7.6 Medium: type-safety gaps

- **Hand-written database types** across three files that can silently drift from the live schema. `generate_typescript_types` would fix this.
- **`Relationships: []`** on every table means embedded joins are untyped, forcing casts like `(joinedRows as unknown as FinanceTransaction[] | null)` in `actions.ts:273`.
- **No runtime validation library.** Every action hand-rolls its checks, and coverage is uneven — `createTransaction` never validates that the account UUID is well-formed or that it belongs to the user; `bulkInsertTransactions` does no server-side date validation; `createAccount` does not validate the `accountType` enum beyond its TypeScript type. Zod schemas shared between form and action would close this.
- **`as` casts** on select handlers (`event.target.value as FinanceAccountType`).
- Read-only functions living in `"use server"` files are exposed as callable client endpoints unnecessarily.

### 7.7 Medium: features half-built in schema

Substantial schema surface exists with no code behind it, which is cognitive overhead for anyone reading the types:

- **Finance:** budgets (2 tables), FX rates, security price history, `finance_settings.base_currency`, `cashflow_transaction_id` linking, `portfolios.account_id`, two-row transfers via `transfer_transaction_id`. Also, `getAccounts()` never filters `is_archived`.
- **Monk:** `monk_goals`, `monk_commitments`, `monk_app_usage`, and `monk_overrides` (the intended unlock/audit mechanism — its absence is why day locks are currently absolute). The `consecutive_fails` and `fails_in_window` reset rules are stored and configurable but `shouldResetOnFail()` only implements `on_any_fail`.
- **Fitness:** the `zone_2` set category exists in the enum with no UI path; `getPreviousExerciseSession` and `getPreviousTopSet` are exported but never called.

### 7.8 Medium: PWA is incomplete

- `manifest.webmanifest` references `/icon-192.png` and `/icon-512.png`. **Neither file exists** in `public/`, so installation falls back to a default icon.
- **No service worker.** No offline capability, no app-shell precaching — every launch from the home screen is a full network round-trip. For an app whose primary use is logging sets at the gym on a phone, offline support is arguably a functional requirement rather than a nicety.
- `@supabase/ssr` is installed but never imported.
- The manifest could move to `app/manifest.ts` for type safety.
- The root layout metadata still says **"Cycle Tracker" / "14-day hybrid fitness cycle tracker"** — leftover from when this was fitness-only. The installed app is branded as a gym tracker even though it now contains three modules.

### 7.9 Low: process and documentation

- **`README.md` is the unmodified `create-next-app` boilerplate** with a duplicated `# Tracking_app` heading appended. It documents none of the setup this project actually requires (Supabase env vars, the placeholder user, the missing migrations).
- **`project-context.md`** (35 KB, last touched 2026-08-10) predates the Monk Mode module and is now partly stale. This document supersedes it.
- **Commit messages are non-descriptive** and often quote-wrapped: `"Changes"` appears six times, alongside `"Your_changes"`, `"Fixed_the_conflict"`, `"Changedtheoverrideproblem"`.
- **Plan documents are stale.** All six todos in the Monk Mode Phase 1 plan are marked `pending` despite the feature being shipped and working; all 15 in the PWA performance plan are `pending` and unstarted.
- **`Study_plan.md` is misleadingly named** — it reads like a Monk Mode specification but is actually a personal learning curriculum used as seed data.
- **`.DS_Store` files are committed** throughout the tree and should be gitignored.
- No CI, no pre-commit hooks, no deployment configuration.

### Suggested priority order

1. Commit the migrations and a seed script — without this nothing else is reproducible.
2. Add a test runner and cover the pure domain logic in `accountability.ts`, `warmups.ts`, and the finance utils.
3. Execute Phases 1–2 of the existing performance plan (remove redundant `router.refresh()`, add `useOptimistic`, add `loading.tsx` and Suspense) — highest felt improvement for the least risk.
4. Add the two missing fitness indexes.
5. Split `TodayChecklist.tsx` and `features/finance/actions.ts`.
6. Generate database types instead of hand-writing them; introduce Zod for action input validation.
7. Generate the PWA icons and add a service worker.
8. Decide on auth: either write RLS policies and wire up Supabase Auth, or explicitly document single-user-forever and lock the RPC hole.
