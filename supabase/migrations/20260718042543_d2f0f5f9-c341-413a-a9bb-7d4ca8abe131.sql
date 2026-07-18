
-- 1. Extend programs table
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS parent_program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS notes text;

-- Keep legacy 'active' bool in sync with status
CREATE OR REPLACE FUNCTION public.programs_sync_active()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS NOT NULL THEN
    NEW.active := (NEW.status = 'Active');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS programs_sync_active_trg ON public.programs;
CREATE TRIGGER programs_sync_active_trg
  BEFORE INSERT OR UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.programs_sync_active();

-- 2. program_merchants join
CREATE TABLE IF NOT EXISTS public.program_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Primary','Secondary')),
  is_current boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_merchants TO authenticated;
GRANT ALL ON public.program_merchants TO service_role;
ALTER TABLE public.program_merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm tenant read" ON public.program_merchants;
CREATE POLICY "pm tenant read" ON public.program_merchants
  FOR SELECT TO authenticated USING (org_id = current_org_id());
DROP POLICY IF EXISTS "pm tenant insert" ON public.program_merchants;
CREATE POLICY "pm tenant insert" ON public.program_merchants
  FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
DROP POLICY IF EXISTS "pm tenant update" ON public.program_merchants;
CREATE POLICY "pm tenant update" ON public.program_merchants
  FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
DROP POLICY IF EXISTS "pm tenant delete" ON public.program_merchants;
CREATE POLICY "pm tenant delete" ON public.program_merchants
  FOR DELETE TO authenticated USING (org_id = current_org_id());

DROP TRIGGER IF EXISTS program_merchants_updated_at ON public.program_merchants;
CREATE TRIGGER program_merchants_updated_at
  BEFORE UPDATE ON public.program_merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only one current Primary per program
CREATE UNIQUE INDEX IF NOT EXISTS program_merchants_unique_primary
  ON public.program_merchants (program_id)
  WHERE is_current AND role = 'Primary' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS program_merchants_program_idx ON public.program_merchants(program_id);
CREATE INDEX IF NOT EXISTS program_merchants_merchant_idx ON public.program_merchants(merchant_id);

-- 3. Seed programs for existing orgs
WITH targets AS (
  SELECT o.id AS org_id, v.name, v.sort_order
  FROM public.organizations o
  CROSS JOIN (VALUES
    ('HVAC', 10),
    ('Countertops', 20),
    ('Carpet', 30),
    ('Hardwood', 40),
    ('Bath', 50),
    ('Kitchens', 60),
    ('Sheds', 70),
    ('Doors', 80),
    ('Water Treatment', 90),
    ('Water Heaters', 100),
    ('Artificial Turf', 110)
  ) AS v(name, sort_order)
)
INSERT INTO public.programs (org_id, name, sort_order, status, active)
SELECT t.org_id, t.name, t.sort_order, 'Active', true
FROM targets t
WHERE NOT EXISTS (
  SELECT 1 FROM public.programs p
  WHERE p.org_id = t.org_id AND lower(p.name) = lower(t.name) AND p.deleted_at IS NULL
);

-- Wire Artificial Turf → Carpet parent for every org
UPDATE public.programs at
SET parent_program_id = c.id
FROM public.programs c
WHERE at.org_id = c.org_id
  AND lower(at.name) = 'artificial turf'
  AND lower(c.name) = 'carpet'
  AND at.parent_program_id IS NULL;

-- 4. Update auto-seed trigger to include the new program list
CREATE OR REPLACE FUNCTION public.seed_engagement_lookups_for_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  carpet_id uuid;
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

  -- Programs (first-class entities, not organizations)
  INSERT INTO public.programs (org_id, name, sort_order, status, active) VALUES
    (NEW.id,'HVAC',10,'Active',true),
    (NEW.id,'Countertops',20,'Active',true),
    (NEW.id,'Carpet',30,'Active',true),
    (NEW.id,'Hardwood',40,'Active',true),
    (NEW.id,'Bath',50,'Active',true),
    (NEW.id,'Kitchens',60,'Active',true),
    (NEW.id,'Sheds',70,'Active',true),
    (NEW.id,'Doors',80,'Active',true),
    (NEW.id,'Water Treatment',90,'Active',true),
    (NEW.id,'Water Heaters',100,'Active',true)
  RETURNING id INTO carpet_id;

  -- pick up Carpet id explicitly
  SELECT id INTO carpet_id FROM public.programs
    WHERE org_id = NEW.id AND lower(name) = 'carpet' LIMIT 1;

  INSERT INTO public.programs (org_id, name, sort_order, status, active, parent_program_id)
    VALUES (NEW.id,'Artificial Turf',110,'Active',true, carpet_id);

  RETURN NEW;
END $function$;

REVOKE EXECUTE ON FUNCTION public.seed_engagement_lookups_for_org() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.programs_sync_active() FROM PUBLIC, anon, authenticated;
