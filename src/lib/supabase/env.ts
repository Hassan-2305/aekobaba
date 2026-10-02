// Shared guard for Supabase env values. A value copied verbatim from
// .env.example ("https://<project-ref>.supabase.co", "<anon-key>") is
// non-empty but unusable — treating it as configured made supabase-js throw
// "Invalid supabaseUrl: Provided URL is malformed." on every session read.
// Placeholders and malformed URLs count as unset, so callers fail closed.

export function usableSupabaseEnv(
  url: string | undefined,
  anonKey: string | undefined,
): { url: string; anonKey: string } | null {
  if (!url || !anonKey) return null;
  if (url.includes("<") || anonKey.includes("<")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { url, anonKey };
}
