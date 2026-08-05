import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

function isNewFormatSupabaseKey(key: string): boolean {
  return key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
}

/**
 * New-format Supabase keys are not JWTs. supabase-js still sends them as
 * Authorization: Bearer by default for PostgREST, which the gateway rejects
 * (e.g. "JWT issued at future"). Strip that header when it equals the apikey.
 */
function createNewFormatKeyFetch(apiKey: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const authorization = headers.get("Authorization");

    if (
      isNewFormatSupabaseKey(apiKey) &&
      authorization === `Bearer ${apiKey}`
    ) {
      headers.delete("Authorization");
    }

    return fetch(input, { ...init, headers });
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
