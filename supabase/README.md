# Database

Everything needed to recreate this project's database from scratch.

Before 2026-09-02 the schema existed only on the hosted Supabase project and the
repository had no way to reproduce it. These migrations close that gap.

## Layout

- `migrations/` — 11 ordered migrations. The first one,
  `20260724000000_create_fitness_schema.sql`, was reconstructed from the live
  database because the fitness tables predated the migration history (the
  original earliest migration already assumed `public.sets` existed). The
  remaining 10 are byte-identical exports of what is recorded in the live
  project's `supabase_migrations.schema_migrations`.
- `seed.sql` — the 70-exercise catalog. Applied automatically by
  `supabase db reset`. Finance categories and the study plan are seeded inside
  migrations instead, so they are deliberately not repeated here.
- `config.toml` — CLI configuration for the local stack.

## Local setup

Requires Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
# Start Postgres, apply all migrations, then run seed.sql
supabase start

# Re-apply everything from zero at any point
supabase db reset
```

Then point the app at the local stack. `supabase start` prints the API URL and
keys; put them in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key printed by supabase start>
PLACEHOLDER_USER_ID=00000000-0000-0000-0000-000000000000
```

## Verifying the export

`scripts/verify-migrations.sh` checksums the 10 exported migration files against
the hashes recorded from the live project. Run it after editing any of them:

```bash
bash scripts/verify-migrations.sh
```

The baseline migration is excluded from that check because it was authored here
rather than exported.

## Applying changes to the hosted project

Migrations in this directory are the source of truth going forward. Add a new
timestamped file rather than editing an applied one, and regenerate
`lib/supabase/*types.ts` afterwards so the hand-written types cannot drift.

## Security model

RLS is enabled on all 29 tables with only deny-all policies; the app reaches the
database exclusively through the server-side service-role client, which bypasses
RLS. See [SECURITY.md](../SECURITY.md) before changing any of this.
