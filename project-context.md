# Project Context Document — Cycle Tracker

> **Last updated:** August 7, 2026  
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

### Architecture: Feature-Driven Modular Monolith

The codebase is organized as a **feature-driven modular monolith** under `features/`, with each domain (`core`, `fitness`, `finance`) owning its own `components/`, `hooks/`, and `actions/`. This keeps the fitness tracker and the newer finance tracker cleanly separated while sharing generic UI primitives via `features/core`.

### Next.js App Router Setup

- **Routing:** App Router with two domain route groups — `(fitness)` (all gym/workout tabs, shared shell) and `(finance)` (scaffolded, not yet built out). Route groups add no URL segment. No dynamic segments, no `api/` routes, no `loading.tsx` / `error.tsx` / `not-found.tsx`.
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
- **No component library:** Custom UI primitives in `features/core/components/` (not shadcn/ui)

### State Management

There is **no global client state library** (no Redux, Zustand, React Query, or SWR).

| Concern | Approach |
|---------|----------|
| Server data | Fetched in Server Components via Server Actions in `features/<domain>/actions/` |
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
│   ├── (fitness)/                # Route group — shared shell, no URL segment
│   │   ├── layout.tsx            # AppShell + cycle day header
│   │   ├── today/page.tsx        # Active workout logging
│   │   ├── cycle/page.tsx        # 14-day program overview
│   │   ├── history/page.tsx      # Completed workouts
│   │   └── analytics/page.tsx    # Consistency + progression charts
│   └── (finance)/                # Route group — finance tracker (scaffolded)
│       └── finance/page.tsx      # Placeholder landing page ("/finance")
│
├── features/                     # Feature-driven modular monolith
│   ├── core/                     # Shared/reusable code across all domains
│   │   ├── components/           # Generic UI primitives (not domain-specific)
│   │   │   ├── Button.tsx
│   │   │   ├── NumberInput.tsx
│   │   │   └── SegmentedControl.tsx
│   │   ├── hooks/                # (empty — no shared hooks yet)
│   │   └── actions/               # (empty — no shared server actions yet)
│   │
│   ├── fitness/                  # Gym / workout / exercise tracking domain
│   │   ├── components/
│   │   │   ├── layout/           # App chrome
│   │   │   │   ├── AppShell.tsx          # Mobile shell: header + main + bottom nav
│   │   │   │   ├── BottomNav.tsx         # Fixed tab bar (Today / Cycle / History / Analytics)
│   │   │   │   └── CycleDayHeader.tsx    # Sticky "Day X of 14" header
│   │   │   ├── workout/          # Today page — core logging UX
│   │   │   │   ├── WorkoutForm.tsx       # Orchestrator: debounced save, finish, warmups
│   │   │   │   ├── ExerciseBlock.tsx     # Per-exercise container
│   │   │   │   ├── SetList.tsx / SetRow.tsx
│   │   │   │   ├── SetCategoryPicker.tsx
│   │   │   │   ├── ExerciseNotesInput.tsx
│   │   │   │   ├── PreviousSessionGhost.tsx
│   │   │   │   ├── RestTimer.tsx
│   │   │   │   ├── WaterTracker.tsx
│   │   │   │   └── WorkoutCompleteSummary.tsx
│   │   │   ├── history/
│   │   │   │   └── WorkoutHistoryAccordion.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── ConsistencyCalendar.tsx
│   │   │   │   └── ProgressionChart.tsx
│   │   │   └── cycle/
│   │   │       └── CycleDayAccordion.tsx
│   │   ├── hooks/                # (empty — no custom hooks yet)
│   │   └── actions/              # Server Actions ("use server")
│   │       ├── workout.ts        # Today CRUD + reads
│   │       ├── history.ts        # Workout history aggregation
│   │       ├── analytics.ts      # Calendar + exercise progress
│   │       └── cycle.ts          # 14-day program overview
│   │
│   └── finance/                  # Finance tracker domain (new, scaffolded)
│       ├── components/           # (empty — ready for development)
│       ├── hooks/                # (empty — ready for development)
│       └── actions/              # (empty — ready for development)
│
├── lib/                          # Cross-cutting server-side infra & shared utilities
│   ├── supabase/
│   │   ├── server.ts             # createServerSupabaseClient()
│   │   ├── types.ts              # Hand-written Database types (fitness + finance, merged)
│   │   └── finance-types.ts      # Finance domain Row/Insert/Update types + enums
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

> **Note:** `lib/` still holds fitness-specific program data and utils (`cycle-day`, `warmups`, `water`, etc.) since these predate the feature split and are only consumed by `features/fitness` today. The finance domain now has its own type module (`lib/supabase/finance-types.ts`), merged into the shared `Database` type in `lib/supabase/types.ts` via `Tables: FinanceTables & {...fitness tables}`. If fitness-only pieces of `lib/` ever need isolating, consider moving them into `features/fitness/lib/` and keeping only truly cross-domain infra (the Supabase client factory, shared types) at the top level.

### Route Map

| URL | Page | Primary data source |
|-----|------|---------------------|
| `/` | Redirect | → `/today` |
| `/today` | Workout logging | `getTodayWorkoutData()` |
| `/cycle` | Program schedule | `getCycleOverviewData()` |
| `/history` | Past workouts | `getWorkoutHistory()` |
| `/analytics` | Charts & calendar | `getConsistencyCalendar()`, `getExercisesForAnalytics()` |
| `/finance` | Placeholder | — (scaffold only) |

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

### Finance Schema

Twelve tables covering expense/income tracking, budgets, accounts, and investing, added in the `create_finance_schema` migration (`20260807073531`, applied directly to the remote project via the Supabase MCP server — same mechanism used for the three earlier fitness migrations, since there is no local `supabase/` folder or CLI in this repo). Types live in `lib/supabase/finance-types.ts`.

**Design principles:**

- Same conventions as fitness: `snake_case` plural tables, UUID PKs (`gen_random_uuid()`), `user_id → auth.users(id) ON DELETE CASCADE`, `timestamptz` timestamps, Postgres enums, RLS **enabled with no policies yet** (service role bypasses RLS until Auth is wired — same gap as the fitness tables).
- Two linked ledgers rather than full double-entry accounting: a **cashflow ledger** (`finance_transactions`) for spending/income/transfers, and an **investment ledger** (`finance_investment_transactions`) for portfolio activity. They connect via `finance_investment_transactions.cashflow_transaction_id`.
- Multi-currency: every monetary table has a `currency` column (`CHECK (currency ~ '^[A-Z]{3}$')`), defaulting to `'EUR'`. `finance_fx_rates` supports converting everything into a user's `finance_settings.base_currency` for cross-currency analytics.
- `updated_at` columns are auto-maintained by a shared `finance_set_updated_at()` trigger function (unlike fitness's `exercise_notes.updated_at`, which the app sets manually on upsert).
- Manual entry first: nullable `external_id`/`provider` columns on syncable tables leave room for future bank/broker integrations without a schema change.

#### Entity Relationship Diagram

```
Cashflow ledger                                   Investment ledger
────────────────                                  ──────────────────

finance_settings (1:1 per user)                   finance_portfolios
  user_id (PK/FK)                                   id (PK)
  base_currency                                     user_id (FK)
                                                     name
finance_accounts                                    base_currency
  id (PK)                                            account_id (FK → finance_accounts, nullable)
  user_id (FK)                                            │
  name, account_type                                      │ portfolio_id
  currency, opening_balance                               ▼
  is_archived                          finance_securities ──────▶ finance_holdings
       │ account_id                    id (PK)              │      id (PK)
       │                               user_id (FK, nullable = shared catalog)
       ▼                               symbol, name, security_type    quantity, average_cost
finance_transactions                   currency, exchange, isin
  id (PK)                                     │ security_id
  user_id (FK), account_id (FK)               ▼
  type: expense | income | transfer     finance_investment_transactions
  amount (always positive), currency      id (PK)
  category_id (FK, nullable)              user_id (FK), portfolio_id (FK), security_id (FK, nullable)
  transfer_account_id (FK, nullable)      type: buy | sell | dividend | interest | fee | split | transfer_in/out
  transfer_transaction_id (self FK)       trade_date, quantity, price, amount, fees, currency
       │ category_id                     cashflow_transaction_id (FK → finance_transactions, nullable)
       ▼
finance_categories (self-referencing tree)   finance_security_prices
  id (PK), user_id (FK)                        id (PK), security_id (FK)
  parent_id (self FK, nullable)                price_date, close, currency
  kind: expense | income
  name, icon, color, is_system            finance_fx_rates
       │ category_id                        id (PK)
       ▼                                     base_currency, quote_currency, rate_date, rate
finance_budget_items ◀── finance_budgets
  id (PK), budget_id (FK)     id (PK), user_id (FK)
  category_id (FK)            name, period: monthly | weekly | yearly
  allocated_amount            start_date, end_date (nullable), currency
```

#### Table Details

**`finance_settings`** — 1:1 per-user preferences; currently just `base_currency` (default `EUR`), the target currency for cross-currency net worth/performance rollups.

**`finance_accounts`** — Checking, savings, cash, credit card, loan, and brokerage-cash accounts. Balance is **derived**, not stored: `opening_balance` + signed sum of `finance_transactions` for that account. `is_archived` soft-hides an account without deleting its history.

**`finance_categories`** — Self-referencing expense/income category tree, scoped per user. `kind` (`expense`/`income`) partitions the tree; `is_system` distinguishes seeded defaults from user-created categories. Unique per `(user_id, kind, parent_id, name)` (top-level categories treated as a single "no parent" group via a `COALESCE` unique index, since Postgres treats `NULL`s as distinct).

**`finance_transactions`** — Unified cashflow ledger for expenses, income, and transfers.

- `amount` is always **positive**; sign is derived from `type` when computing balances (`expense` → `-`, `income` → `+`, transfer legs mirrored).
- A `CHECK` constraint enforces shape: `expense`/`income` rows require `category_id` and forbid `transfer_account_id`; `transfer` rows require `transfer_account_id` (≠ `account_id`) and forbid `category_id`.
- Transfers are modeled as **two linked rows** (one per account) joined by `transfer_transaction_id`.
- Indexed by `(user_id, date DESC)`, `(account_id, date DESC)`, `(category_id, date)` for ledger and analytics queries.

**`finance_budgets` / `finance_budget_items`** — A budget is a period (`monthly`/`weekly`/`yearly`, optional `end_date` for open-ended recurring budgets); each `finance_budget_items` row allocates an amount to one category, compared against actual spend from `finance_transactions` for variance reporting.

**`finance_portfolios`** — Groups holdings and investment activity (e.g. "Interactive Brokers", "Crypto"). Optionally linked to a `finance_accounts` row of type `brokerage` via `account_id` so cash sleeve deposits/withdrawals stay connected to the cashflow ledger.

**`finance_securities`** — Catalog of investable instruments (stocks, ETFs, crypto, custom assets), analogous to the fitness `exercises` catalog. `user_id IS NULL` means a shared catalog entry (unique on `(symbol, exchange)`); non-null means a user-private custom asset like real estate (unique on `(user_id, symbol)`).

**`finance_holdings`** — Cached current position (`quantity`, `average_cost`) per `(portfolio_id, security_id)`, kept in sync by the app as investment transactions post. Historical performance is still computed from `finance_investment_transactions` + `finance_security_prices`, not this cache.

**`finance_investment_transactions`** — Append-only portfolio activity ledger (`buy`, `sell`, `dividend`, `interest`, `fee`, `split`, `transfer_in`/`transfer_out`). `security_id` is nullable only for pure-cash rows (fees, interest, transfers). `cashflow_transaction_id` links to the cash side in `finance_transactions` when funded from/to a tracked account.

**`finance_security_prices`** — Historical daily close prices (`UNIQUE(security_id, price_date)`) for marking holdings to market and building performance charts. Seeded manually today; a future price-fetch job can populate `source`.

**`finance_fx_rates`** — Daily conversion rates (`UNIQUE(base_currency, quote_currency, rate_date)`) for converting multi-currency balances/returns into a single reporting currency.

#### Analytics (computed, not stored)

No dedicated analytics tables yet — all derived from the core schema:

| Metric | Derivation |
|--------|------------|
| Spending by category/month | Aggregate `finance_transactions` where `type = 'expense'`, grouped by `category_id` |
| Budget variance | `finance_budget_items.allocated_amount` − sum of expenses in the budget's period/category |
| Account balance over time | Running sum of signed `finance_transactions.amount` from `opening_balance` |
| Holdings market value | `finance_holdings.quantity × finance_security_prices.close` (latest date) |
| Unrealized P&L | Market value − (`quantity × average_cost`) |
| Realized P&L | From `sell` rows in `finance_investment_transactions` vs. cost basis |
| Portfolio return | Time-weighted from valuations + cashflows (investment txs / linked cashflow txs) |

#### Enums

| Enum | Values |
|------|--------|
| `finance_account_type` | `checking`, `savings`, `cash`, `credit_card`, `loan`, `brokerage`, `other` |
| `finance_transaction_type` | `expense`, `income`, `transfer` |
| `finance_category_kind` | `expense`, `income` |
| `finance_budget_period` | `monthly`, `weekly`, `yearly` |
| `finance_security_type` | `stock`, `etf`, `mutual_fund`, `bond`, `crypto`, `commodity`, `real_estate`, `other` |
| `finance_investment_tx_type` | `buy`, `sell`, `dividend`, `interest`, `fee`, `split`, `transfer_in`, `transfer_out`, `other` |

#### Out of Scope (for now)

Bank/broker API sync, recurring transaction rules, tax-lot methods (FIFO/HIFO — computable later from `finance_investment_transactions`), shared/household accounts, full double-entry journals, denormalized daily portfolio NAV snapshots (add `finance_portfolio_snapshots` later if recomputing becomes expensive).

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
│  features/<domain>/actions/*.ts ("use server")           │
│  - createServerSupabaseClient()                         │
│  - PLACEHOLDER_USER_ID for all queries                  │
│  - revalidatePath() after mutations                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              Supabase (Postgres)
```

### Feature: Today (Workout Logging)

**Page:** `app/(fitness)/today/page.tsx` → `<WorkoutForm initialData={...} />` (`features/fitness/components/workout/WorkoutForm.tsx`)

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

**Page:** `app/(fitness)/cycle/page.tsx` → `<CycleDayAccordion />` (`features/fitness/components/cycle/CycleDayAccordion.tsx`)

- Merges static `CYCLE_PROGRAM` with exercise names from Supabase
- Highlights current cycle day
- Read-only — no mutations

### Feature: History

**Page:** `app/(fitness)/history/page.tsx` → `<WorkoutHistoryAccordion />` (`features/fitness/components/history/WorkoutHistoryAccordion.tsx`)

- Fetches completed workouts (`completed_at IS NOT NULL`) ordered by date descending
- Joins sets, notes, and exercise metadata client-side in the server action
- Resolves program label from `cycle_day` via `getProgramDay()`

### Feature: Analytics

**Page:** `app/(fitness)/analytics/page.tsx`

**Consistency Calendar (`getConsistencyCalendar`):**
- Iterates from cycle anchor date to today
- Status per day: `logged` (workout exists), `rest` (cycle days 4/7/11/14), `missed`, or `future`
- Rendered server-side in `<ConsistencyCalendar />`

**Progression Chart (`getExerciseProgress`):**
- Server action computes best e1RM per date using **Epley formula**: `weight × (1 + reps / 30)`
- Client component `<ProgressionChart />` fetches progress on exercise selection change via `useTransition`
- Rendered with Recharts `LineChart`

### Server Actions Reference

All under `features/fitness/actions/`:

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
4. **Enable RLS policies** on `workouts`, `sets`, `exercise_notes`, and all twelve `finance_*` tables, scoped to `auth.uid()`
5. **Remove `PLACEHOLDER_USER_ID`** and derive `user_id` from the authenticated session
6. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client

---

## 6. Known Patterns & Conventions

### Component Patterns

| Pattern | Description |
|---------|-------------|
| **Server page → Client island** | Pages are async Server Components; interactivity isolated to `"use client"` children |
| **Feature-driven modular monolith** | Code grouped by domain under `features/{core,fitness,finance}/{components,hooks,actions}` rather than by type globally |
| **Props-down, actions-up** | Server-fetched data passed as `initialData`; mutations call server actions directly |
| **Hooks folders exist but are empty** | `features/*/hooks/` are scaffolded for future use; React hooks are currently used inline in client components |

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
| e1RM calculation | Inline in `features/fitness/actions/analytics.ts` (Epley) |

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
| `features/fitness/actions/workout.ts` | Primary CRUD for workout logging |
| `lib/supabase/server.ts` | Supabase client factory |
| `lib/supabase/types.ts` | Database type definitions (fitness + finance, merged) |
| `lib/supabase/finance-types.ts` | Finance domain Row/Insert/Update types + enums |
| `features/fitness/components/workout/WorkoutForm.tsx` | Main workout logging orchestrator |
| `features/core/components/` | Shared UI primitives (`Button`, `NumberInput`, `SegmentedControl`) |
| `app/(fitness)/layout.tsx` | Shared fitness app shell wrapper |
| `app/(finance)/finance/page.tsx` | Finance tracker placeholder page |
| `app/layout.tsx` | Root layout, PWA metadata, fonts |
