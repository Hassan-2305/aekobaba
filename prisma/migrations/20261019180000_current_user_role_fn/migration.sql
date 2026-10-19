-- Role lookup for the edge middleware (it can't run Prisma, so it calls this
-- over PostgREST): returns the caller's own role, NULL for unknown identities.
-- SECURITY DEFINER so it reads through RLS; takes no arguments, so it can only
-- ever reveal your own row. Supabase-only (needs auth.uid()); skipped on plain
-- Postgres such as local test databases.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.current_user_role()
      RETURNS text
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT role::text
        FROM public."User"
        WHERE "supabaseUserId" = auth.uid()::text
          AND role IS NOT NULL;
      $body$
    $fn$;
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated';
  END IF;
END
$migration$;
