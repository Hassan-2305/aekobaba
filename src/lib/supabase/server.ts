import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { usableSupabaseEnv } from "./env";

// Supabase server clients. Two distinct construction sites:
//
// - Server Components / Server Actions / Route Handlers use `cookies()` from
//   `next/headers` (Node runtime). Server Actions and Route Handlers may write
//   cookies, so token refresh works there; Server Components are read-only by
//   contract — the middleware keeps refresh cookies current for renders.
// - The edge middleware builds its own client against the request/response
//   cookie pair (see src/middleware.ts).

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Read Supabase env, or null when unset or still a placeholder — callers fail closed on null. */
export function supabaseEnv(): SupabaseEnv | null {
  // Literal process.env reads so Next.js can inline NEXT_PUBLIC_ values.
  return usableSupabaseEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createSupabaseServerClient(env: SupabaseEnv) {
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — cookies are read-only
          // there. The middleware refresh keeps sessions current for renders;
          // write paths (actions, route handlers) can set cookies and proceed.
        }
      },
    },
  });
}
