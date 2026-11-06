REVOKE ALL ON public.victim_progress_updates FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.victim_progress_updates FROM authenticated;
GRANT SELECT ON public.victim_progress_updates TO authenticated;
GRANT ALL ON public.victim_progress_updates TO service_role;