
DO $$ BEGIN CREATE TYPE public.location_status AS ENUM ('Active','Inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.coverage_scope AS ENUM ('whole','selected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.organization_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_types TO authenticated;
GRANT ALL ON public.organization_types TO service_role;
ALTER TABLE public.organization_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select organization_types" ON public.organization_types FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert organization_types" ON public.organization_types FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update organization_types" ON public.organization_types FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete organization_types" ON public.organization_types FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_orgtypes_updated BEFORE UPDATE ON public.organization_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS organization_type text;

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  name text NOT NULL, code text,
  status public.location_status NOT NULL DEFAULT 'Active', notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regions TO authenticated;
GRANT ALL ON public.regions TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select regions" ON public.regions FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert regions" ON public.regions FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update regions" ON public.regions FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER trg_regions_updated BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  name text NOT NULL, code text,
  status public.location_status NOT NULL DEFAULT 'Active', notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
CREATE INDEX ON public.markets (region_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markets TO authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select markets" ON public.markets FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert markets" ON public.markets FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update markets" ON public.markets FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER trg_markets_updated BEFORE UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE RESTRICT,
  name text NOT NULL,
  leader_contact_id uuid REFERENCES public.contacts(id),
  status public.location_status NOT NULL DEFAULT 'Active', notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
CREATE INDEX ON public.districts (market_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.districts TO authenticated;
GRANT ALL ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select districts" ON public.districts FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert districts" ON public.districts FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update districts" ON public.districts FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER trg_districts_updated BEFORE UPDATE ON public.districts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  store_number text NOT NULL,
  name text, city text, state text, main_phone text,
  status public.location_status NOT NULL DEFAULT 'Active', notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
CREATE INDEX ON public.stores (district_id);
CREATE INDEX ON public.stores (store_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select stores" ON public.stores FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert stores" ON public.stores FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update stores" ON public.stores FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.org_district_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  scope public.coverage_scope NOT NULL DEFAULT 'whole',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, district_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_district_coverage TO authenticated;
GRANT ALL ON public.org_district_coverage TO service_role;
ALTER TABLE public.org_district_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select odc" ON public.org_district_coverage FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert odc" ON public.org_district_coverage FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update odc" ON public.org_district_coverage FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete odc" ON public.org_district_coverage FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_odc_updated BEFORE UPDATE ON public.org_district_coverage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.org_store_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  UNIQUE (entity_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_store_coverage TO authenticated;
GRANT ALL ON public.org_store_coverage TO service_role;
ALTER TABLE public.org_store_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select osc" ON public.org_store_coverage FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert osc" ON public.org_store_coverage FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete osc" ON public.org_store_coverage FOR DELETE TO authenticated USING (org_id = current_org_id());

CREATE TABLE public.contact_district_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  scope public.coverage_scope NOT NULL DEFAULT 'whole',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, district_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_district_coverage TO authenticated;
GRANT ALL ON public.contact_district_coverage TO service_role;
ALTER TABLE public.contact_district_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select cdc" ON public.contact_district_coverage FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert cdc" ON public.contact_district_coverage FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update cdc" ON public.contact_district_coverage FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete cdc" ON public.contact_district_coverage FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_cdc_updated BEFORE UPDATE ON public.contact_district_coverage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contact_store_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  UNIQUE (contact_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_store_coverage TO authenticated;
GRANT ALL ON public.contact_store_coverage TO service_role;
ALTER TABLE public.contact_store_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select csc" ON public.contact_store_coverage FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert csc" ON public.contact_store_coverage FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete csc" ON public.contact_store_coverage FOR DELETE TO authenticated USING (org_id = current_org_id());

ALTER TABLE public.customer_resolutions ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

INSERT INTO public.organization_types (org_id, name)
SELECT o.id, t.name FROM public.organizations o
CROSS JOIN (VALUES ('Service Provider'),('Manufacturer'),('Installer'),('Vendor'),('Retailer'),('Internal Team'),('Third-party Partner')) AS t(name)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  tenant uuid; region_midsouth uuid; m_atlanta uuid;
  d_ids jsonb := '{}'::jsonb; d_id uuid;
  d_name text; s_num text; d_map RECORD;
BEGIN
  SELECT org_id INTO tenant FROM public.entities WHERE id = '237d0e98-2814-410d-be67-02e85c7a738a';
  IF tenant IS NULL THEN RETURN; END IF;

  INSERT INTO public.regions (org_id, name) VALUES (tenant, 'Midsouth') RETURNING id INTO region_midsouth;
  INSERT INTO public.markets (org_id, region_id, name) VALUES (tenant, region_midsouth, 'Atlanta') RETURNING id INTO m_atlanta;
  INSERT INTO public.markets (org_id, region_id, name)
  SELECT tenant, region_midsouth, n FROM unnest(ARRAY['Chattanooga','Memphis','Birmingham','Jackson MS','Montgomery','Huntsville']) AS n;

  FOREACH d_name IN ARRAY ARRAY['1','2','87','88','234','235','261'] LOOP
    INSERT INTO public.districts (org_id, market_id, name) VALUES (tenant, m_atlanta, d_name) RETURNING id INTO d_id;
    d_ids := d_ids || jsonb_build_object(d_name, d_id::text);
  END LOOP;

  FOR d_map IN SELECT * FROM (VALUES
    ('1',   ARRAY['0105','0131','0147','0149','0161','0175','1754','1755','1856','6978']),
    ('2',   ARRAY['0132','0133','0139','0143','0151','6861','6940','6941','6942','8924']),
    ('87',  ARRAY['0115','0117','0118','0121','0130','0154','0159','1749','6986']),
    ('88',  ARRAY['0114','0123','0127','0138','0148','0157','0164','0178','6848','6977']),
    ('234', ARRAY['0106','0111','0116','0146','0153','0156','1763','1777','6943']),
    ('235', ARRAY['0134','0145','0152','0174','1748','1750','1764','1771','6888','6980','8412','8413']),
    ('261', ARRAY['0110','0126','0128','0129','0144','0165','0172','1774','1775','6979','8584'])
  ) AS x(district_name, stores) LOOP
    FOREACH s_num IN ARRAY d_map.stores LOOP
      INSERT INTO public.stores (org_id, district_id, store_number)
      VALUES (tenant, (d_ids->>d_map.district_name)::uuid, s_num);
    END LOOP;
  END LOOP;

  UPDATE public.entities SET organization_type = 'Service Provider'
  WHERE id = '237d0e98-2814-410d-be67-02e85c7a738a';
END $$;
