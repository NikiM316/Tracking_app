# System

Single source of truth for what this app is, how it is built, and how its database is locked down. Consolidated on 2026-09-28 from `project-architecture.md`, `project-context.md`, and `SECURITY.md`, keeping the later security model and the schema that actually ships.

## Concept

This is a **single-user, mobile-first life-management PWA**. One person runs it from a phone home screen. It holds three separate tracking systems in one app shell.

The unifying idea is **structured self-accountability**. Each module encodes a rigid, pre-committed protocol and then measures adherence to it.

| Module | Routes | Core purpose |
|---|---|---|
| **Fitness** (Gym Tracker) | `/today`, `/cycle`, `/history`, `/analytics` | Log workouts against a fixed 14-day hybrid Push/Pull/Legs cycle. Set-by-set logging, smart barbell warm-ups, a consistency calendar, and estimated-1RM progression. |
| **Finance** (Finance Tracker) | `/finance/**` | EUR-centric net worth across cash accounts and an investment portfolio. Manual transactions plus Revolut CSV import, category-grouped spending, and live ETH pricing. |
| **Monk Mode** (Discipline) | `/monk`, `/monk/habits`, `/monk/challenge` | A 180-day binary challenge. Every day is PASSED or FAILED. One failure resets the attempt. Tracks mandatory habits, daily tasks, digital-fasting limits, an end-of-day reflection, and a loosely coupled 6-week study curriculum. |

The root page (`app/page.tsx`) is a three-card launcher. There is no cross-module dashboard and no shared data. The only way between modules is the Home control back to `/`.

There is **no authentication**. Every row belongs to one placeholder user, `00000000-0000-0000-0000-000000000000` (`me@fitness.local` in `auth.users`). Server code uses the Supabase service-role key. Real multi-user auth is out of scope while the app stays single-user. See [Security Model (single-user)](#security-model-single-user).

## Architecture

### Stack

| Package | Version | Role |
|---|---|---|
| `next` | 16.2.11 | App Router. Server Components and Server Actions. No route handlers. |
| `react` / `react-dom` | 19.2.4 | UI runtime. |
| `@supabase/supabase-js` | ^2.110.8 | Only database client. Server-side only. |
| `tailwindcss` | ^4 | CSS-first styling via `@import "tailwindcss"` in `app/globals.css`. No `tailwind.config.js`. |
| `zod` | ^4 | Server-action input validation. |
| `recharts` | ^3.10 | Progression chart on `/analytics`. |
| `papaparse` | ^5.5.4 | Client-side Revolut CSV parsing. |
| `date-fns` | ^4.4 | Date helpers. |
| `server-only` | ^0.0.1 | Guards `lib/supabase/server.ts` against client import. |
| `vitest` | ^4 | Unit tests for pure domain logic. |
| `typescript` | ^5 | Strict mode. `@/*` maps to the project root. |

This project pins **Next.js 16**, which differs from most training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code, and heed deprecation notices. The agent copy of that warning lives in `CLAUDE.md`.

There is no global client state library, no UI kit, and no form library. Validation lives in Zod schemas shared with server actions. Styling is a dark zinc palette (`zinc-950` background, `zinc-50` text, `emerald-400/500` accent) with mobile fixes in `globals.css`: no tap highlight, 16px form controls so iOS does not zoom on focus, and `input[type="date"]` overrides for Safari.

The app is installable. `app/layout.tsx` sets the Apple web-app metadata and viewport (`viewportFit: "cover"`, theme `#09090b`). Icons are `public/icon-192.png` and `public/icon-512.png`. A service worker is registered from `features/core/components/ServiceWorkerRegister.tsx`.

### Layout

`app/` holds routing. `features/` holds everything else. A typical page awaits one server read and passes a serialisable view model into a feature component.

```
Tracking_app/
├── app/                     # layouts, pages, error boundaries
│   ├── page.tsx             # three-card launcher
│   ├── (fitness)/           # /today /cycle /history /analytics
│   ├── (finance)/           # /finance/**
│   └── (monk)/              # /monk/**
├── features/
│   ├── core/                # shared shell and UI primitives
│   ├── fitness/
│   ├── finance/
│   └── monk/
├── lib/
│   ├── supabase/            # service-role client + generated Database types
│   ├── program/cycle.ts     # the 14-day program
│   └── utils/
└── supabase/                # migrations, seed, local CLI config
```

Each feature module uses the same internal shape: `actions/`, `components/`, `lib/`, and `types.ts`. Fitness, Monk, and Finance server actions all live in `actions/` directories.

`features/core/` owns the shared shell (`AppShell`, `BottomNav`) and primitives (`Button`, `NumberInput`, `SegmentedControl`, `HomeLink`, `RouteErrorFallback`). Each route group passes its own header and nav into the shared shell. Touch targets stay at `min-h-12` or larger.

Mutations are Server Actions. There are no `route.ts` handlers. Read helpers that must stay server-only import the Supabase client, which is marked `import "server-only"`.

### Fitness

The 14-day cycle is an `as const` array in `lib/program/cycle.ts`: Push A, Pull A, Legs A, Active Recovery, Upper A, Lower A, Total Rest, then the B variants and a second rest day.

**Cycle day advancement is workout-driven, not calendar-driven.** A new workout's `cycle_day` is `(previous workout's cycle_day % 14) + 1`. Skipping a calendar day does not skip a program day. The header selector can override the day, and the override carries forward.

- **Smart warm-ups.** "Top set" on a barbell exercise generates three warm-up sets at 50% × 8, 70% × 5, and 90% × 1 of the previous top set on the same cycle day, rounded to 2.5 kg (`lib/utils/warmups.ts`).
- **Debounced autosave.** Sets and notes save shortly after the last edit, with a flush on unmount.
- **Rest timers.** One per set row, persisted in `sessionStorage`. Elapsed seconds are written onto the following set.
- **Analytics.** A consistency calendar and an estimated-1RM chart using the Epley formula (`weight × (1 + reps / 30)`).

Calendar dates for fitness, finance, and monk all use `Europe/Sofia` (`lib/utils/dates.ts`), not UTC `toISOString().slice(0, 10)`.

### Finance

Two ledgers, one EUR net-worth figure:

- **Cashflow:** accounts, categories, and transactions.
- **Investments:** portfolios, securities, holdings, and trades.

**Balances are derived, never stored.** An account balance is `opening_balance` plus the signed sum of its transactions. Amounts are stored as positive numbers. Direction comes from `type` (`expense`, `income`, `transfer`). Expense and income rows require a category. Transfer rows use one row: a source account plus `transfer_account_id`, and no category. Database `CHECK` constraints enforce that shape.

Investment cost basis is weighted-average cost, recalculated on each buy. Sells are checked against held quantity. Live pricing is ETH-only, via CoinGecko, in EUR. Other holdings show invested value without a mark-to-market P/L.

CSV import targets the Revolut consolidated statement. PapaParse runs in the browser with `header: false`. A row counts when column 0 parses as a date and column 3 parses as a non-zero amount, which skips Revolut's preamble. Positive amounts become income and negative amounts become expenses, both under generic default categories. Importing the same file twice duplicates the rows.

Non-EUR cash is listed and is not FX-converted. Budget, FX-rate, security-price, and settings tables were removed; they had no application code.

### Monk Mode

Each calendar day is scored binary by `scoreDay()` in `features/monk/lib/accountability.ts`, shared by server and client so the UI can preview the result before finalising:

```
mandatoryFailures = (digital fasting failed ? 1 : 0)
                  + count(incomplete mandatory habit logs)
                  + count(incomplete mandatory tasks)

PASSED  iff  mandatoryFailures <= max_mandatory_failures_allowed   // default 0
```

Three rules define the module:

1. **Binary days.** No partial credit. Optional habits and tasks never affect the outcome.
2. **No quiet edits.** Once `finalized_at` is set and `status` leaves `in_progress`, mutations reject the day. There is no unlock UI.
3. **You cannot skip days.** `catchUpMissedDays()` walks from `started_on` through yesterday, creates missing day rows, and auto-finalises anything still open. A missed mandatory item fails the attempt. Opening `/monk` can fail the challenge before the page renders.

Digital fasting is always mandatory. A `null` actual-minutes value fails, so leaving the field blank is not a bypass. Social-media and gaming minutes are tracked separately.

Rules are snapshotted. A challenge freezes its rule set at start. A day freezes each habit's mandatory flag and target when the log row is created. Editing a habit affects future days only.

Under the default `on_any_fail` rule, a failed day closes the attempt. The next attempt cannot start before the day after the failure. Attempt history is kept. Best streak is computed across all `monk_challenges` rows.

The study plan (`study_plans` → `study_plan_weeks` → `study_plan_items`) is seeded from `Study_plan.md`. A study item can be pulled into the day as a task. Study progress survives a Monk Mode reset. The current week is the first week with `is_completed = false`.

### Routes

| Route | Data |
|---|---|
| `/` | Static launcher |
| `/today` | Today's workout |
| `/cycle` | 14-day program overview |
| `/history` | Completed workouts |
| `/analytics` | Consistency calendar and progression |
| `/finance` | Dashboard |
| `/finance/accounts/new`, `/finance/portfolios/new` | Create forms |
| `/finance/transactions/new` | Accounts and categories |
| `/finance/investments/new` | Portfolios |
| `/finance/import` | Revolut CSV |
| `/monk` | Today checklist, or setup / reset / completed |
| `/monk/habits` | Habit manager |
| `/monk/challenge` | Attempt status |

There is no middleware and no protected route. Every URL is publicly reachable; the database is not. See the security model.

## Data Layer

Live project **Tracking_app** (`rxfcnpdwwkfaaxnciyxj`), Postgres 17, region `eu-west-2`. The repository can recreate the schema.

### Client

`lib/supabase/server.ts` is the only client factory. It is `import "server-only"` and builds a service-role client with `persistSession: false` and `autoRefreshToken: false`.

The project uses new-format keys (`sb_secret_…` / `sb_publishable_…`), which are not JWTs. `supabase-js` still sends them as `Authorization: Bearer`, and the API gateway intermittently rejects that with "JWT issued at future". The custom `fetch` wrapper:

1. Always sets the `apikey` header.
2. Strips a Bearer token when that token is itself a new-format key.
3. Forces `cache: "no-store"` on every response.
4. Retries with backoff when the body matches that gateway error.

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side database access. Never prefix with `NEXT_PUBLIC_`. |
| `PLACEHOLDER_USER_ID` | No | Overrides the all-zeros user id. Default is `00000000-0000-0000-0000-000000000000`. |

Local values come from `supabase start`. See `supabase/README.md`.

### Schema

Twenty `public` tables. Types are generated into `lib/supabase/database.generated.ts` and re-exported from `lib/supabase/types.ts`, with finance and monk aliases alongside.

**Fitness:** `exercises` (global catalog, keyed by `slug`), `workouts` (one row per user per date: `cycle_day`, `completed_at`, `water_ml`), `sets` (`warmup` / `top_set` / `back_off` / `working_set`), `exercise_notes` (unique on workout + exercise). `water_ml` remains on the row and is unused by the app. `workouts (user_id, date DESC)` and `sets (workout_id)` are indexed.

**Finance:** `finance_accounts`, `finance_categories` (self-referencing tree), `finance_transactions`, `finance_portfolios`, `finance_securities` (`user_id IS NULL` means a shared catalogue row), `finance_holdings`, `finance_investment_transactions`. Cashflow totals are aggregated in the database (`finance_cashflow_totals`).

**Monk and study:** `monk_settings`, `monk_challenges`, `monk_days`, `monk_habits`, `monk_habit_logs`, `monk_tasks`, `study_plans`, `study_plan_weeks`, `study_plan_items`. A partial unique index allows at most one active challenge per user. Days are unique on `(challenge_id, date)` and `(challenge_id, day_number)`. Habit logs are unique on `(day_id, habit_id)`. Day creation treats unique violations as a race guard. `catch_up_missed_days_tx` runs the missed-day walk in one transaction.

Migrations live in `supabase/migrations/`, ordered from the reconstructed fitness baseline through the lockdown, indexes, cashflow totals, catch-up transaction, and the drop of unused tables. `supabase/seed.sql` loads the exercise catalog. Finance categories and the study plan are seeded inside migrations. Add a new timestamped migration rather than editing an applied file, then regenerate `lib/supabase/database.generated.ts`.

### How a request moves

1. An async Server Component awaits a read function.
2. That function uses the service-role client and returns a plain view model from the module's `types.ts`.
3. Client components receive the data as props and call Server Actions to mutate.
4. Actions call `revalidatePath`. Optimistic UI covers the toggles that should move before the round-trip finishes.

Account balances, streaks, and 1RM series are still mostly computed in TypeScript after the rows are fetched. Cashflow totals are the exception and are computed in SQL.

## Security Model (single-user)

This app is a **single-user prototype**. It has no login screen, no sessions, and no multi-user authorization. That is a deliberate choice. Read this before touching database permissions, RLS, or the Supabase client.

### How access actually works

There is exactly one path from the app to the database:

- `lib/supabase/server.ts` creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY`. The service role has `BYPASSRLS`, so it sees and writes everything.
- That module starts with `import "server-only"`, so importing it from a Client Component is a build error rather than a runtime leak.
- Every row is written against a single hardcoded user id, `00000000-0000-0000-0000-000000000000`, exposed as `PLACEHOLDER_USER_ID` in `lib/utils/placeholder-user.ts`.

There is no browser Supabase client. Nothing reaches the database from the client. All mutations go through Server Actions.

**Security rests on one fact: the service-role key never reaches the browser.**

### Rules

1. **Never prefix the service-role key with `NEXT_PUBLIC_`.** Anything `NEXT_PUBLIC_*` is inlined into the client bundle. The correct name is `SUPABASE_SERVICE_ROLE_KEY`, and it must stay server-only.
2. **Never import `lib/supabase/server.ts` from a Client Component**, and never pass the client or the key through props, context, or a serialized payload.
3. **Never commit `.env.local`.** `.gitignore` covers `.env*`.
4. **Do not add permissive RLS policies** while the app is in this mode. A restrictive deny-all policy would override them, and a permissive policy aimed at `anon` would be a hole, not a safeguard.
5. **Treat the service-role key as a full database password.** Rotate it in the Supabase dashboard if it is ever pasted into a log, an issue, or a chat.

### Database lockdown

RLS is enabled on all 20 public tables. `supabase/migrations/20260902071914_lock_down_public_access.sql` turns the old "RLS on, zero policies" accident into declared intent:

| Measure | Effect |
|---|---|
| `deny_all_anon_authenticated` restrictive policy on every public table | `anon` and `authenticated` are denied, and stay denied even if a permissive policy is added later |
| `REVOKE ALL ON ALL TABLES` from `anon` and `authenticated` | No table privileges remain behind the policies, so the lockdown survives RLS being toggled off |
| `ALTER DEFAULT PRIVILEGES ... REVOKE` for both roles | Newly created tables are not auto-granted to client roles |
| `DROP FUNCTION increment_workout_water` | Removes the only `SECURITY DEFINER` RPC. `workouts.water_ml` stays |
| Default `EXECUTE` on new functions revoked from `PUBLIC` | A later `SECURITY DEFINER` function is not anon-callable by default |

`service_role` is intentionally untouched. Revoking its access would break the app.

`public.increment_workout_water(uuid, integer)` was `SECURITY DEFINER`, so it ran with the owner's rights and RLS did not apply to it. It was created with `EXECUTE` granted to `PUBLIC`, which meant anyone holding the publishable anon key could call it over PostgREST and increment any workout's water total by id. Execute was revoked from `PUBLIC`, `anon`, and `authenticated`, and the function has since been dropped. `workouts.water_ml` is still on the table.

Verified after the lockdown, using the anon key against PostgREST:

```
GET  /rest/v1/exercises                     -> 401  permission denied for table exercises
POST /rest/v1/rpc/increment_workout_water   -> 401  permission denied for function increment_workout_water
```

The exercises request with the service-role key returns `200` with data. The water RPC no longer exists.

The deny-all block is a loop over `pg_class`, so **a new table is not covered until that block runs again**. After adding tables, re-run that block or copy its `DO $$ ... $$` body into the new migration. Default privileges already stop new tables from being granted to `anon` and `authenticated`.

### Out of scope

Supabase Auth, cookie sessions, per-user RLS using `auth.uid()`, protected routes, and middleware are **not implemented and not planned** while the app stays single-user.

If that changes, the work is a single cutover: introduce Supabase Auth, replace `PLACEHOLDER_USER_ID` with the authenticated user's id, swap the service-role client for a request-scoped anon client, **drop the `deny_all_anon_authenticated` policies** (restrictive policies would otherwise override any new permissive ones), and write real per-user policies. Do not do half of this.

### Accepted advisor warning

The Supabase security advisor reports `auth_leaked_password_protection` as disabled. This is accepted: there is no password authentication in this app.

## Technical Debt

The September 2026 audit's critical items are done: migrations and seed are in the repo, the water RPC is dropped, Vitest covers the pure domain logic, finance and monk actions are split into `actions/`, shells are shared, dates share `Europe/Sofia`, unused tables are dropped, database types are generated, PWA icons and a service worker exist, and `@supabase/ssr` is not a dependency.

What remains:

- **Supabase reads skip the Next.js fetch cache.** The client wrapper in `lib/supabase/server.ts` sets `cache: "no-store"` on every request so the new-format key workaround cannot be cached. That is correct for the gateway bug and it means no Supabase response is reused across requests.
- **Embedded joins are untyped.** Generated table types still set `Relationships: []`, so PostgREST embeds need a cast.
- **New tables need an explicit deny-all policy.** Default privileges withhold grants, but `deny_all_anon_authenticated` is not applied until the lockdown loop is copied into the new migration.
- **No CI.** There is no workflow that runs lint, tests, or `scripts/verify-migrations.sh` on push.
- **`.cursor/plans/` is a backlog, not this document.** Those plans describe the pre-remediation audit. Behavior and security questions should be answered from this file and from `supabase/migrations/`.
