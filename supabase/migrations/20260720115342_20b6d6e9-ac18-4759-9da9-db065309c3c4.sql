
-- Split trigger: BEFORE for closed_at mutation, AFTER for history insert (needs persisted NEW.id)
CREATE OR REPLACE FUNCTION public.customer_resolutions_status_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_closed_new boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_id IS NOT NULL THEN
      SELECT is_closed INTO is_closed_new FROM public.resolution_statuses WHERE id = NEW.status_id;
      IF is_closed_new AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status_id IS DISTINCT FROM OLD.status_id AND NEW.status_id IS NOT NULL THEN
      SELECT is_closed INTO is_closed_new FROM public.resolution_statuses WHERE id = NEW.status_id;
      IF is_closed_new THEN
        IF NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
      ELSE
        NEW.closed_at := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.customer_resolutions_status_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_id IS NOT NULL THEN
      INSERT INTO public.resolution_status_history(org_id, customer_resolution_id, from_status_id, to_status_id, changed_by)
      VALUES (NEW.org_id, NEW.id, NULL, NEW.status_id, auth.uid());
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status_id IS DISTINCT FROM OLD.status_id AND NEW.status_id IS NOT NULL THEN
      INSERT INTO public.resolution_status_history(org_id, customer_resolution_id, from_status_id, to_status_id, changed_by)
      VALUES (NEW.org_id, NEW.id, OLD.status_id, NEW.status_id, auth.uid());
    END IF;
  END IF;
  RETURN NULL;
END $$;

REVOKE EXECUTE ON FUNCTION public.customer_resolutions_status_before() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.customer_resolutions_status_after() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cr_status ON public.customer_resolutions;
DROP TRIGGER IF EXISTS trg_cr_status_before ON public.customer_resolutions;
DROP TRIGGER IF EXISTS trg_cr_status_after ON public.customer_resolutions;

CREATE TRIGGER trg_cr_status_before
  BEFORE INSERT OR UPDATE ON public.customer_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.customer_resolutions_status_before();

CREATE TRIGGER trg_cr_status_after
  AFTER INSERT OR UPDATE ON public.customer_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.customer_resolutions_status_after();
