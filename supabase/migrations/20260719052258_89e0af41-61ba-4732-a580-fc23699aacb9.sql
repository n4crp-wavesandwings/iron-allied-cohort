
CREATE TABLE public.provider_programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org_id() references public.organizations(id),
  provider_id uuid not null references public.entities(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (provider_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_programs TO authenticated;
GRANT ALL ON public.provider_programs TO service_role;
ALTER TABLE public.provider_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_select" ON public.provider_programs FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "pp_insert" ON public.provider_programs FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "pp_update" ON public.provider_programs FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "pp_delete" ON public.provider_programs FOR DELETE TO authenticated USING (org_id = public.current_org_id());
CREATE INDEX provider_programs_provider_id_idx ON public.provider_programs(provider_id);
CREATE INDEX provider_programs_program_id_idx ON public.provider_programs(program_id);

CREATE TABLE public.provider_program_stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.current_org_id() references public.organizations(id),
  provider_id uuid not null references public.entities(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (provider_id, program_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_program_stores TO authenticated;
GRANT ALL ON public.provider_program_stores TO service_role;
ALTER TABLE public.provider_program_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pps_select" ON public.provider_program_stores FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "pps_insert" ON public.provider_program_stores FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "pps_update" ON public.provider_program_stores FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "pps_delete" ON public.provider_program_stores FOR DELETE TO authenticated USING (org_id = public.current_org_id());
CREATE INDEX provider_program_stores_provider_id_idx ON public.provider_program_stores(provider_id);
CREATE INDEX provider_program_stores_program_id_idx ON public.provider_program_stores(program_id);
CREATE INDEX provider_program_stores_store_id_idx ON public.provider_program_stores(store_id);
