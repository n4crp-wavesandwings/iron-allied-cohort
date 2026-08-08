CREATE OR REPLACE FUNCTION public.set_job_site_visit_checks(p_visit_id uuid, p_checks jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.job_site_visits WHERE id = p_visit_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Job-site visit not found';
  END IF;

  DELETE FROM public.job_site_visit_checks WHERE job_site_visit_id = p_visit_id;

  INSERT INTO public.job_site_visit_checks (org_id, job_site_visit_id, checklist_item_id, checked)
  SELECT v_org, p_visit_id, (e->>'checklist_item_id')::uuid, COALESCE((e->>'checked')::boolean, false)
  FROM jsonb_array_elements(COALESCE(p_checks, '[]'::jsonb)) AS e;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_job_site_visit_opportunities(p_visit_id uuid, p_opportunities jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.job_site_visits WHERE id = p_visit_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Job-site visit not found';
  END IF;

  DELETE FROM public.job_site_visit_opportunities WHERE job_site_visit_id = p_visit_id;

  INSERT INTO public.job_site_visit_opportunities (org_id, job_site_visit_id, opportunity_item_id, note)
  SELECT v_org, p_visit_id, (e->>'opportunity_item_id')::uuid, NULLIF(e->>'note', '')
  FROM jsonb_array_elements(COALESCE(p_opportunities, '[]'::jsonb)) AS e;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_job_site_visit_checks(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_job_site_visit_opportunities(uuid, jsonb) TO authenticated;