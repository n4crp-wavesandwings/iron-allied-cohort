
DO $$
DECLARE
  canonical uuid := 'ab4e1fe6-8acc-44b8-a3bc-186ab39e857f';
  dup uuid       := '4430a715-798b-46c4-a0a2-99c9d1e5cd50';
BEGIN
  -- contact_organizations UNIQUE(contact_id, organization_id)
  DELETE FROM public.contact_organizations d
    WHERE d.organization_id = dup
      AND EXISTS (SELECT 1 FROM public.contact_organizations c
                  WHERE c.contact_id = d.contact_id AND c.organization_id = canonical);
  UPDATE public.contact_organizations SET organization_id = canonical WHERE organization_id = dup;

  -- engagement_organizations UNIQUE(engagement_id, entity_id)
  DELETE FROM public.engagement_organizations d
    WHERE d.entity_id = dup
      AND EXISTS (SELECT 1 FROM public.engagement_organizations c
                  WHERE c.engagement_id = d.engagement_id AND c.entity_id = canonical);
  UPDATE public.engagement_organizations SET entity_id = canonical WHERE entity_id = dup;

  -- follow_up_organizations (dedupe defensively on entity_id + follow_up_id if present)
  DELETE FROM public.follow_up_organizations d
    WHERE d.entity_id = dup
      AND EXISTS (SELECT 1 FROM public.follow_up_organizations c
                  WHERE c.follow_up_id = d.follow_up_id AND c.entity_id = canonical);
  UPDATE public.follow_up_organizations SET entity_id = canonical WHERE entity_id = dup;

  -- contacts.entity_id (no uniqueness, safe to update)
  UPDATE public.contacts SET entity_id = canonical WHERE entity_id = dup;

  -- Resolutions
  UPDATE public.customer_resolution_relationships SET relationship_id = canonical WHERE relationship_id = dup;
  UPDATE public.customer_resolutions SET service_provider_id = canonical WHERE service_provider_id = dup;

  -- org_district_coverage UNIQUE(entity_id, district_id)
  DELETE FROM public.org_district_coverage d
    WHERE d.entity_id = dup
      AND EXISTS (SELECT 1 FROM public.org_district_coverage c
                  WHERE c.district_id = d.district_id AND c.entity_id = canonical);
  UPDATE public.org_district_coverage SET entity_id = canonical WHERE entity_id = dup;

  -- org_store_coverage UNIQUE(entity_id, store_id)
  DELETE FROM public.org_store_coverage d
    WHERE d.entity_id = dup
      AND EXISTS (SELECT 1 FROM public.org_store_coverage c
                  WHERE c.store_id = d.store_id AND c.entity_id = canonical);
  UPDATE public.org_store_coverage SET entity_id = canonical WHERE entity_id = dup;

  -- provider_programs UNIQUE(provider_id, program_id) (best effort)
  DELETE FROM public.provider_programs d
    WHERE d.provider_id = dup
      AND EXISTS (SELECT 1 FROM public.provider_programs c
                  WHERE c.program_id = d.program_id AND c.provider_id = canonical);
  UPDATE public.provider_programs SET provider_id = canonical WHERE provider_id = dup;

  -- provider_program_stores UNIQUE(provider_id, program_id, store_id) (best effort)
  DELETE FROM public.provider_program_stores d
    WHERE d.provider_id = dup
      AND EXISTS (SELECT 1 FROM public.provider_program_stores c
                  WHERE c.program_id = d.program_id AND c.store_id = d.store_id AND c.provider_id = canonical);
  UPDATE public.provider_program_stores SET provider_id = canonical WHERE provider_id = dup;

  -- Simple FK repoints
  UPDATE public.job_site_visits SET service_provider_id = canonical WHERE service_provider_id = dup;
  UPDATE public.interactions SET entity_id = canonical WHERE entity_id = dup;
  UPDATE public.follow_ups SET entity_id = canonical WHERE entity_id = dup;
  UPDATE public.program_merchants SET contact_id = canonical WHERE contact_id = dup;

  DELETE FROM public.entities WHERE id = dup;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS entities_org_type_name_unique
  ON public.entities (org_id, type, lower(btrim(name)))
  WHERE deleted_at IS NULL;
