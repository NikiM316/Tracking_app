# Tracking_app

A single-user, mobile-first life-management PWA.

## Tech stack

Next.js 16, Supabase, and Tailwind CSS.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root. The server needs these Supabase variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role key>
```

`PLACEHOLDER_USER_ID` is optional. When it is unset, the app uses `00000000-0000-0000-0000-000000000000`.

`SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `NEXT_PUBLIC_`.

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

See [System.md](System.md) for architecture, data, and the single-user security model.
