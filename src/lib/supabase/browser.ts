import { createBrowserClient } from "@supabase/ssr";

import { usableSupabaseEnv } from "./env";

// Browser-side Supabase client for the brand's realtime subscription. Built
// lazily — NEXT_PUBLIC_ env is inlined at build time, and when it is absent
// (pre-credentials dev) callers fall back to the dev SSE bridge instead.

export interface SupabaseBrowserEnv {
  url: string;
  anonKey: string;
}

/** Read Supabase env as the browser sees it, or null when unset or still a placeholder. */
export function supabaseBrowserEnv(): SupabaseBrowserEnv | null {
  // Literal process.env reads so Next.js can inline NEXT_PUBLIC_ values.
  return usableSupabaseEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createSupabaseBrowserClient(env: SupabaseBrowserEnv) {
  return createBrowserClient(env.url, env.anonKey);
}
