ALTER TABLE public.job_site_visits ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

CREATE INDEX IF NOT EXISTS idx_job_site_visits_org_store ON public.job_site_visits (org_id, store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_site_visits_org_provider ON public.job_site_visits (org_id, service_provider_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_site_visits_org_program ON public.job_site_visits (org_id, program_id) WHERE deleted_at IS NULL;