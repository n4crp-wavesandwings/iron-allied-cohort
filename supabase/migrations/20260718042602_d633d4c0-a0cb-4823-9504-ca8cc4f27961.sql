
ALTER FUNCTION public.programs_sync_active() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.programs_sync_active() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_engagement_lookups_for_org() FROM PUBLIC, anon, authenticated;
