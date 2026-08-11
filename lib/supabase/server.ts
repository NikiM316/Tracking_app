import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

function isNewFormatSupabaseKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

function isNewFormatBearerToken(authorization: string | null): boolean {
  if (!authorization) return false;
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  return (
    token.startsWith("sb_publishable_") || token.startsWith("sb_secret_")
  );
}

/**
 * New-format Supabase keys (`sb_secret_…` / `sb_publishable_…`) are not JWTs.
 * supabase-js still puts them in `Authorization: Bearer` for PostgREST by
 * default. The API gateway then either rejects them as non-JWTs or intermittently
 * surfaces that as "JWT issued at future".
 *
 * Auth for these keys belongs only in the `apikey` header — the gateway mints
 * a short-lived JWT from that. This fetch wrapper:
 * 1. Always keeps `apikey` set
 * 2. Strips any Bearer token that is itself a new-format API key
 * 3. Forces `cache: "no-store"` so Next.js never caches REST responses
 * 4. Retries once on the known transient gateway JWT error
 */
function createNewFormatKeyFetch(apiKey: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);

    if (!headers.has("apikey")) {
      headers.set("apikey", apiKey);
    }

    if (
      isNewFormatSupabaseKey(apiKey) &&
      isNewFormatBearerToken(headers.get("Authorization"))
    ) {
      headers.delete("Authorization");
    }

    // Avoid re-spreading the original headers object (which still contains the
    // Bearer API key) so undici/Next cannot merge it back in.
    const { headers: _ignoredHeaders, cache: _ignoredCache, ...rest } =
      init ?? {};

    const doFetch = () =>
      fetch(input, {
        ...rest,
        headers,
        cache: "no-store",
      });

    let response = await doFetch();

    if (!response.ok) {
      const body = await response.clone().text();
      if (/JWT issued at future/i.test(body)) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        response = await doFetch();
      }
    }

    return response;
  };
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return { url, serviceRoleKey };
}

export function createServerSupabaseClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: createNewFormatKeyFetch(serviceRoleKey),
    },
  });
}
