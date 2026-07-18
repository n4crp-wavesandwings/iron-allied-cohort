
-- =========================================================
-- Pass 7: Job-Site Visit workflow
-- =========================================================

-- ---------- Lookup: visit types ----------
CREATE TABLE public.job_site_visit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_site_visit_types TO authenticated;
GRANT ALL ON public.job_site_visit_types TO service_role;
ALTER TABLE public.job_site_visit_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jsvt_tenant_all" ON public.job_site_visit_types
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_jsvt_updated BEFORE UPDATE ON public.job_site_visit_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Lookup: checklist items ----------
CREATE TABLE public.job_site_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  "group" text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_site_checklist_items TO authenticated;
GRANT ALL ON public.job_site_checklist_items TO service_role;
ALTER TABLE public.job_site_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jsci_tenant_all" ON public.job_site_checklist_items
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_jsci_updated BEFORE UPDATE ON public.job_site_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Lookup: opportunity items ----------
CREATE TABLE public.job_site_opportunity_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_site_opportunity_items TO authenticated;
GRANT ALL ON public.job_site_opportunity_items TO service_role;
ALTER TABLE public.job_site_opportunity_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jsoi_tenant_all" ON public.job_site_opportunity_items
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_jsoi_updated BEFORE UPDATE ON public.job_site_opportunity_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Main: job_site_visits ----------
CREATE TABLE public.job_site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  visit_type_id uuid REFERENCES public.job_site_visit_types(id),
  program_id uuid REFERENCES public.programs(id),
  service_provider_id uuid REFERENCES public.entities(id),
  customer_first_initial text,
  customer_last_name text,
  po_number text,
  order_number text,
  visit_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  UNIQUE (engagement_id),
  CONSTRAINT job_site_visits_first_initial_len CHECK (customer_first_initial IS NULL OR char_length(customer_first_initial) <= 2)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_site_visits TO authenticated;
GRANT ALL ON public.job_site_visits TO service_role;
ALTER TABLE public.job_site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jsv_tenant_all" ON public.job_site_visits
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_jsv_updated BEFORE UPDATE ON public.job_site_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_job_site_visits_engagement ON public.job_site_visits(engagement_id);

-- ---------- Join: checks ----------
CREATE TABLE public.job_site_visit_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_site_visit_id uuid NOT NULL REFERENCES public.job_site_visits(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.job_site_checklist_items(id) ON DELETE CASCADE,
  checked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_site_visit_id, checklist_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_site_visit_checks TO authenticated;
GRANT ALL ON public.job_site_visit_checks TO service_role;
ALTER TABLE public.job_site_visit_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jsvc_tenant_all" ON public.job_site_visit_checks
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- ---------- Join: opportunities ----------
CREATE TABLE public.job_site_visit_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_site_visit_id uuid NOT NULL REFERENCES public.job_site_visits(id) ON DELETE CASCADE,
  opportunity_item_id uuid NOT NULL REFERENCES public.job_site_opportunity_items(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_site_visit_id, opportunity_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_site_visit_opportunities TO authenticated;
GRANT ALL ON public.job_site_visit_opportunities TO service_role;
ALTER TABLE public.job_site_visit_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jsvo_tenant_all" ON public.job_site_visit_opportunities
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- =========================================================
-- Seed existing organizations
-- =========================================================

-- Ensure "Job-Site Visit" engagement type exists per org (Pass 5 seeded it, but be safe).
INSERT INTO public.engagement_types (org_id, name, sort_order)
SELECT o.id, 'Job-Site Visit', 20
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.engagement_types t
  WHERE t.org_id = o.id AND lower(t.name) = lower('Job-Site Visit')
);

-- Visit types
INSERT INTO public.job_site_visit_types (org_id, name, sort_order)
SELECT o.id, v.name, v.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('High Value Customer (HVC)', 10),
  ('Job-Site Inspection (JSI)', 20),
  ('Issue Resolution', 30),
  ('Follow-up Visit', 40),
  ('Other', 90)
) AS v(name, sort_order);

-- Checklists
INSERT INTO public.job_site_checklist_items (org_id, name, "group", sort_order)
SELECT o.id, c.name, c.grp, c.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('Installer badges verified',           'Compliance', 10),
  ('Background checks confirmed',         'Compliance', 20),
  ('Safe work practices observed',        'Compliance', 30),
  ('Property protected',                  'Compliance', 40),
  ('Workmanship reviewed',                'Compliance', 50),
  ('Customer introduced to DSM',          'Compliance', 60),
  ('Customer satisfied so far',           'Customer Experience', 110),
  ('Questions answered',                  'Customer Experience', 120),
  ('Expectations clarified',              'Customer Experience', 130),
  ('Concerns addressed',                  'Customer Experience', 140),
  ('Literature provided',                 'Customer Experience', 150),
  ('Business card left',                  'Customer Experience', 160),
  ('Program guide shared',                'Customer Experience', 170),
  ('Additional opportunities discussed',  'Customer Experience', 180)
) AS c(name, grp, sort_order);

-- Opportunities
INSERT INTO public.job_site_opportunity_items (org_id, name, sort_order)
SELECT o.id, opp.name, opp.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('Front Door', 10),
  ('Back Door', 20),
  ('Windows', 30),
  ('Flooring', 40),
  ('Bath', 50),
  ('Kitchen', 60),
  ('HVAC', 70),
  ('Water Treatment', 80),
  ('Roofing', 90)
) AS opp(name, sort_order);

-- =========================================================
-- Update new-org auto-seed function
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_engagement_lookups_for_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.engagement_types (org_id, name, sort_order) VALUES
    (NEW.id,'Phone Call',10),(NEW.id,'Email',15),(NEW.id,'Job-Site Visit',20),
    (NEW.id,'Service-Provider Office Meeting',30),
    (NEW.id,'Customer Visit',40),(NEW.id,'Teams/Virtual Meeting',50),(NEW.id,'Leadership Meeting',60),
    (NEW.id,'Peer Meeting',70),(NEW.id,'Planning Meeting',80),(NEW.id,'Merchant Discussion',90),
    (NEW.id,'Provider Performance Review',100),(NEW.id,'Training',110),(NEW.id,'Ride-Along',120),
    (NEW.id,'Working Lunch',130),(NEW.id,'Store Walk',140),(NEW.id,'Recognition',150),
    (NEW.id,'Customer Resolution',160),(NEW.id,'General Note',170);
  INSERT INTO public.engagement_outcomes (org_id, name, sort_order) VALUES
    (NEW.id,'Resolved',10),(NEW.id,'Needs Follow-up',20),(NEW.id,'Waiting',30),(NEW.id,'Scheduled',40),(NEW.id,'Escalated',50);
  INSERT INTO public.engagement_tags (org_id, name, "group", sort_order, is_custom) VALUES
    (NEW.id,'Customer Issue','Customer',10,false),(NEW.id,'Escalation Prevention','Customer',20,false),
    (NEW.id,'Warranty Question','Customer',30,false),(NEW.id,'Customer Communication','Customer',40,false),
    (NEW.id,'Installation','Installation',50,false),(NEW.id,'Scheduling','Installation',60,false),
    (NEW.id,'Change Order','Installation',70,false),(NEW.id,'Completion Issue','Installation',80,false),
    (NEW.id,'Provider Performance','Provider',90,false),(NEW.id,'Provider Communication','Provider',100,false),
    (NEW.id,'Provider Coaching','Provider',110,false),(NEW.id,'Sales Support','Sales',120,false),
    (NEW.id,'Product Knowledge','Sales',130,false),(NEW.id,'Program Information','Sales',140,false),
    (NEW.id,'Store Operations','Operations',150,false),(NEW.id,'Merchandising','Operations',160,false),
    (NEW.id,'Systems/Process','Operations',170,false),(NEW.id,'Training','Training',180,false),
    (NEW.id,'Coaching Provided','Training',190,false),(NEW.id,'Follow-up Training Needed','Training',200,false),
    (NEW.id,'Recognition','Recognition',210,false),(NEW.id,'Follow-up Needed','Follow-up',220,false);

  -- Job-site lookups
  INSERT INTO public.job_site_visit_types (org_id, name, sort_order) VALUES
    (NEW.id,'High Value Customer (HVC)',10),
    (NEW.id,'Job-Site Inspection (JSI)',20),
    (NEW.id,'Issue Resolution',30),
    (NEW.id,'Follow-up Visit',40),
    (NEW.id,'Other',90);
  INSERT INTO public.job_site_checklist_items (org_id, name, "group", sort_order) VALUES
    (NEW.id,'Installer badges verified','Compliance',10),
    (NEW.id,'Background checks confirmed','Compliance',20),
    (NEW.id,'Safe work practices observed','Compliance',30),
    (NEW.id,'Property protected','Compliance',40),
    (NEW.id,'Workmanship reviewed','Compliance',50),
    (NEW.id,'Customer introduced to DSM','Compliance',60),
    (NEW.id,'Customer satisfied so far','Customer Experience',110),
    (NEW.id,'Questions answered','Customer Experience',120),
    (NEW.id,'Expectations clarified','Customer Experience',130),
    (NEW.id,'Concerns addressed','Customer Experience',140),
    (NEW.id,'Literature provided','Customer Experience',150),
    (NEW.id,'Business card left','Customer Experience',160),
    (NEW.id,'Program guide shared','Customer Experience',170),
    (NEW.id,'Additional opportunities discussed','Customer Experience',180);
  INSERT INTO public.job_site_opportunity_items (org_id, name, sort_order) VALUES
    (NEW.id,'Front Door',10),(NEW.id,'Back Door',20),(NEW.id,'Windows',30),
    (NEW.id,'Flooring',40),(NEW.id,'Bath',50),(NEW.id,'Kitchen',60),
    (NEW.id,'HVAC',70),(NEW.id,'Water Treatment',80),(NEW.id,'Roofing',90);

  RETURN NEW;
END $function$;
