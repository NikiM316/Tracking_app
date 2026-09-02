# Security model

This app is a **single-user prototype**. It has no login screen, no sessions, and
no multi-user authorization. That is a deliberate choice, not an oversight, and
this document records the shape of it so the trade-offs stay visible.

Read this before touching database permissions, RLS, or the Supabase client.

## How access actually works

There is exactly one path from the app to the database:

- [`lib/supabase/server.ts`](lib/supabase/server.ts) creates a Supabase client
  with `SUPABASE_SERVICE_ROLE_KEY`. The service role has `BYPASSRLS`, so it sees
  and writes everything.
- That module starts with `import "server-only"`, so importing it from a Client
  Component is a build error rather than a runtime leak.
- Every row is written against a single hardcoded user id,
  `00000000-0000-0000-0000-000000000000`, exposed as `PLACEHOLDER_USER_ID` in
  [`lib/utils/placeholder-user.ts`](lib/utils/placeholder-user.ts).

There is no browser Supabase client. Nothing reaches the database from the
client; all mutations go through Server Actions.

**Security therefore rests on one fact: the service-role key never reaches the
browser.**

## Rules

1. **Never prefix the service-role key with `NEXT_PUBLIC_`.** Anything
   `NEXT_PUBLIC_*` is inlined into the client bundle and world-readable. The
   correct name is `SUPABASE_SERVICE_ROLE_KEY`, and it must stay server-only.
2. **Never import `lib/supabase/server.ts` from a Client Component**, and never
   pass the client or the key through props, context, or a serialized payload.
3. **Never commit `.env.local`.** `.gitignore` covers `.env*`; keep it that way.
4. **Do not add permissive RLS policies** while the app is in this mode. See
   below for why they would be misleading rather than helpful.
5. **Treat the service-role key as a full database password.** Rotate it in the
   Supabase dashboard if it is ever pasted into a log, an issue, or a chat.

## Database lockdown

RLS is enabled on all 29 public tables. Originally there were **zero** policies,
which fails closed but only by accident, and it left one real hole. Migration
[`20260902071914_lock_down_public_access.sql`](supabase/migrations/20260902071914_lock_down_public_access.sql)
turns that into declared intent:

| Measure | Effect |
| --- | --- |
| `deny_all_anon_authenticated` restrictive policy on all 29 tables | `anon` and `authenticated` are denied on every table, and stay denied even if a permissive policy is added later |
| `REVOKE ALL ON ALL TABLES` from `anon`, `authenticated` | No table privileges remain behind the policies, so the lockdown survives RLS being toggled off |
| `ALTER DEFAULT PRIVILEGES ... REVOKE` for both roles | Newly created tables are not auto-granted to client roles |
| `REVOKE EXECUTE ON increment_workout_water` from `PUBLIC`, `anon`, `authenticated` | Closes the one genuine hole (see below) |

`service_role` is intentionally untouched. Revoking its access would break the app.

### The hole that was closed

`public.increment_workout_water(uuid, integer)` is `SECURITY DEFINER`, so it runs
with the owner's rights and **RLS does not apply to it**. It was created with
`EXECUTE` granted to `PUBLIC`, which meant anyone holding the publishable anon
key — a value shipped to browsers by design — could call it over PostgREST and
increment the water total of any workout by guessing or reading an id. It was the
only finding where the empty-policy fail-closed behavior did not save us.

Verified after the fix, using the anon key against PostgREST:

```
GET  /rest/v1/exercises                -> 401  permission denied for table exercises
POST /rest/v1/rpc/increment_workout_water -> 401  permission denied for function increment_workout_water
```

The same requests with the service-role key return `200` with data, confirming
the app is unaffected.

### Keeping the invariant

The deny-all block in that migration is a loop over `pg_class`, so **a new table
is not covered until it runs again**. After adding tables, either re-run that
block or copy its `DO $$ ... $$` body into the new migration.

## What is deliberately out of scope

Real multi-user authentication — Supabase Auth, cookie sessions, per-user RLS
policies using `auth.uid()`, protected routes, and middleware — is **not
implemented and not planned** while the app stays single-user.

If that changes, the work is: introduce Supabase Auth, replace
`PLACEHOLDER_USER_ID` with the authenticated user's id, swap the service-role
client for a request-scoped anon client, **drop the `deny_all_anon_authenticated`
policies** (restrictive policies would otherwise override any new permissive
ones), and write real per-user policies. Do not do half of this: a partial
migration is worse than either end state.

## Known accepted warnings

The Supabase security advisor reports `auth_leaked_password_protection` as
disabled. This is accepted: there is no password authentication in this app, so
there is nothing for the check to protect.
