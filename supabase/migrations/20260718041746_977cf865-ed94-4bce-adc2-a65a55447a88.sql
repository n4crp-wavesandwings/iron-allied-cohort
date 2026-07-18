
-- ============= LOOKUP: resolution_categories =============
CREATE TABLE public.resolution_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_categories TO authenticated;
GRANT ALL ON public.resolution_categories TO service_role;
ALTER TABLE public.resolution_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org read categories" ON public.resolution_categories FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org write categories" ON public.resolution_categories FOR ALL TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_res_cat_updated BEFORE UPDATE ON public.resolution_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= LOOKUP: resolution_priorities =============
CREATE TABLE public.resolution_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  severity_color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_priorities TO authenticated;
GRANT ALL ON public.resolution_priorities TO service_role;
ALTER TABLE public.resolution_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org read priorities" ON public.resolution_priorities FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org write priorities" ON public.resolution_priorities FOR ALL TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_res_pri_updated BEFORE UPDATE ON public.resolution_priorities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= LOOKUP: resolution_statuses =============
CREATE TABLE public.resolution_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  is_closed boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_statuses TO authenticated;
GRANT ALL ON public.resolution_statuses TO service_role;
ALTER TABLE public.resolution_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org read statuses" ON public.resolution_statuses FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org write statuses" ON public.resolution_statuses FOR ALL TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_res_sta_updated BEFORE UPDATE ON public.resolution_statuses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= EXTEND customer_resolutions =============
ALTER TABLE public.customer_resolutions
  ADD COLUMN category_id uuid REFERENCES public.resolution_categories(id) ON DELETE SET NULL,
  ADD COLUMN priority_id uuid REFERENCES public.resolution_priorities(id) ON DELETE SET NULL,
  ADD COLUMN status_id uuid REFERENCES public.resolution_statuses(id) ON DELETE SET NULL,
  ADD COLUMN service_provider_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  ADD COLUMN program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN po_number text,
  ADD COLUMN order_number text,
  ADD COLUMN general_issue text,
  ADD COLUMN commitments text,
  ADD COLUMN owner uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN opened_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN closed_at timestamptz;

-- Loosen legacy NOT NULLs so new records don't need enum values
ALTER TABLE public.customer_resolutions
  ALTER COLUMN priority DROP NOT NULL,
  ALTER COLUMN status DROP NOT NULL,
  ALTER COLUMN customer_last_name DROP NOT NULL,
  ALTER COLUMN customer_first_initial DROP NOT NULL;

-- ============= resolution_engagements =============
CREATE TABLE public.resolution_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (customer_resolution_id, engagement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_engagements TO authenticated;
GRANT ALL ON public.resolution_engagements TO service_role;
ALTER TABLE public.resolution_engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org rw resolution_engagements" ON public.resolution_engagements FOR ALL TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

-- ============= resolution_status_history =============
CREATE TABLE public.resolution_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  from_status_id uuid REFERENCES public.resolution_statuses(id),
  to_status_id uuid NOT NULL REFERENCES public.resolution_statuses(id),
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resolution_status_history TO authenticated;
GRANT ALL ON public.resolution_status_history TO service_role;
ALTER TABLE public.resolution_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org rw resolution_status_history" ON public.resolution_status_history FOR ALL TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

-- ============= Trigger: log status change + closed_at =============
CREATE OR REPLACE FUNCTION public.customer_resolutions_status_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_closed_new boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_id IS NOT NULL THEN
      INSERT INTO public.resolution_status_history(org_id, customer_resolution_id, from_status_id, to_status_id, changed_by)
      VALUES (NEW.org_id, NEW.id, NULL, NEW.status_id, auth.uid());
      SELECT is_closed INTO is_closed_new FROM public.resolution_statuses WHERE id = NEW.status_id;
      IF is_closed_new AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status_id IS DISTINCT FROM OLD.status_id AND NEW.status_id IS NOT NULL THEN
      INSERT INTO public.resolution_status_history(org_id, customer_resolution_id, from_status_id, to_status_id, changed_by)
      VALUES (NEW.org_id, NEW.id, OLD.status_id, NEW.status_id, auth.uid());
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

DROP TRIGGER IF EXISTS trg_cr_status ON public.customer_resolutions;
CREATE TRIGGER trg_cr_status
  BEFORE INSERT OR UPDATE ON public.customer_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.customer_resolutions_status_trigger();

-- ============= Update per-org auto-seed to include new lookups =============
CREATE OR REPLACE FUNCTION public.seed_engagement_lookups_for_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.job_site_visit_types (org_id, name, sort_order) VALUES
    (NEW.id,'High Value Customer (HVC)',10),(NEW.id,'Job-Site Inspection (JSI)',20),
    (NEW.id,'Issue Resolution',30),(NEW.id,'Follow-up Visit',40),(NEW.id,'Other',90);
  INSERT INTO public.job_site_checklist_items (org_id, name, "group", sort_order) VALUES
    (NEW.id,'Installer badges verified','Compliance',10),(NEW.id,'Background checks confirmed','Compliance',20),
    (NEW.id,'Safe work practices observed','Compliance',30),(NEW.id,'Property protected','Compliance',40),
    (NEW.id,'Workmanship reviewed','Compliance',50),(NEW.id,'Customer introduced to DSM','Compliance',60),
    (NEW.id,'Customer satisfied so far','Customer Experience',110),(NEW.id,'Questions answered','Customer Experience',120),
    (NEW.id,'Expectations clarified','Customer Experience',130),(NEW.id,'Concerns addressed','Customer Experience',140),
    (NEW.id,'Literature provided','Customer Experience',150),(NEW.id,'Business card left','Customer Experience',160),
    (NEW.id,'Program guide shared','Customer Experience',170),(NEW.id,'Additional opportunities discussed','Customer Experience',180);
  INSERT INTO public.job_site_opportunity_items (org_id, name, sort_order) VALUES
    (NEW.id,'Front Door',10),(NEW.id,'Back Door',20),(NEW.id,'Windows',30),
    (NEW.id,'Flooring',40),(NEW.id,'Bath',50),(NEW.id,'Kitchen',60),
    (NEW.id,'HVAC',70),(NEW.id,'Water Treatment',80),(NEW.id,'Roofing',90);

  -- Resolution lookups
  INSERT INTO public.resolution_categories (org_id, name, sort_order) VALUES
    (NEW.id,'Installation',10),(NEW.id,'Sales Support',20),(NEW.id,'Product',30),
    (NEW.id,'Customer Concern',40),(NEW.id,'Training',50),(NEW.id,'Service Provider',60),
    (NEW.id,'Display',70),(NEW.id,'Other',90);
  INSERT INTO public.resolution_priorities (org_id, name, sort_order, severity_color) VALUES
    (NEW.id,'Low',10,'#22c55e'),(NEW.id,'Medium',20,'#eab308'),
    (NEW.id,'High',30,'#f97316'),(NEW.id,'Critical',40,'#ef4444');
  INSERT INTO public.resolution_statuses (org_id, name, sort_order, is_closed) VALUES
    (NEW.id,'Open',10,false),(NEW.id,'Waiting on Store',20,false),
    (NEW.id,'Waiting on Provider',30,false),(NEW.id,'Waiting on Customer',40,false),
    (NEW.id,'Scheduled Visit',50,false),(NEW.id,'Corporate Review',60,false),
    (NEW.id,'Resolved',80,true),(NEW.id,'Closed',90,true);

  RETURN NEW;
END $$;

-- Backfill lookup rows for all existing organizations
INSERT INTO public.resolution_categories (org_id, name, sort_order)
SELECT o.id, v.name, v.sort_order FROM public.organizations o
CROSS JOIN (VALUES
  ('Installation',10),('Sales Support',20),('Product',30),
  ('Customer Concern',40),('Training',50),('Service Provider',60),
  ('Display',70),('Other',90)
) AS v(name, sort_order)
ON CONFLICT (org_id, name) DO NOTHING;

INSERT INTO public.resolution_priorities (org_id, name, sort_order, severity_color)
SELECT o.id, v.name, v.sort_order, v.color FROM public.organizations o
CROSS JOIN (VALUES
  ('Low',10,'#22c55e'),('Medium',20,'#eab308'),
  ('High',30,'#f97316'),('Critical',40,'#ef4444')
) AS v(name, sort_order, color)
ON CONFLICT (org_id, name) DO NOTHING;

INSERT INTO public.resolution_statuses (org_id, name, sort_order, is_closed)
SELECT o.id, v.name, v.sort_order, v.is_closed FROM public.organizations o
CROSS JOIN (VALUES
  ('Open',10,false),('Waiting on Store',20,false),
  ('Waiting on Provider',30,false),('Waiting on Customer',40,false),
  ('Scheduled Visit',50,false),('Corporate Review',60,false),
  ('Resolved',80,true),('Closed',90,true)
) AS v(name, sort_order, is_closed)
ON CONFLICT (org_id, name) DO NOTHING;

-- Backfill existing customer_resolutions: map legacy enum status/priority to new FK ids
UPDATE public.customer_resolutions cr
SET priority_id = rp.id
FROM public.resolution_priorities rp
WHERE rp.org_id = cr.org_id
  AND cr.priority_id IS NULL
  AND (
    (cr.priority::text = 'Urgent' AND rp.name = 'Critical') OR
    (cr.priority::text = 'High'   AND rp.name = 'High') OR
    (cr.priority::text = 'Normal' AND rp.name = 'Medium') OR
    (cr.priority::text = 'Low'    AND rp.name = 'Low')
  );

UPDATE public.customer_resolutions cr
SET status_id = rs.id
FROM public.resolution_statuses rs
WHERE rs.org_id = cr.org_id
  AND cr.status_id IS NULL
  AND (
    (cr.status::text = 'New'         AND rs.name = 'Open') OR
    (cr.status::text = 'In Progress' AND rs.name = 'Open') OR
    (cr.status::text = 'Waiting'     AND rs.name = 'Waiting on Provider') OR
    (cr.status::text = 'Resolved'    AND rs.name = 'Resolved') OR
    (cr.status::text = 'Closed'      AND rs.name = 'Closed')
  );

-- Backfill opened_at from opened_date; closed_at from completed_date
UPDATE public.customer_resolutions
SET opened_at = COALESCE(opened_at, (opened_date::timestamptz))
WHERE opened_date IS NOT NULL;

UPDATE public.customer_resolutions
SET closed_at = (completed_date::timestamptz)
WHERE completed_date IS NOT NULL AND closed_at IS NULL;

-- Backfill service_provider_id from existing customer_resolution_relationships
UPDATE public.customer_resolutions cr
SET service_provider_id = rel.relationship_id
FROM public.customer_resolution_relationships rel
WHERE rel.resolution_id = cr.id
  AND rel.role = 'Service Provider'
  AND cr.service_provider_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_res_engagements_res ON public.resolution_engagements(customer_resolution_id);
CREATE INDEX IF NOT EXISTS idx_res_engagements_eng ON public.resolution_engagements(engagement_id);
CREATE INDEX IF NOT EXISTS idx_res_history_res ON public.resolution_status_history(customer_resolution_id);
CREATE INDEX IF NOT EXISTS idx_cr_status_id ON public.customer_resolutions(status_id);
CREATE INDEX IF NOT EXISTS idx_cr_priority_id ON public.customer_resolutions(priority_id);
CREATE INDEX IF NOT EXISTS idx_cr_store_id ON public.customer_resolutions(store_id);
CREATE INDEX IF NOT EXISTS idx_cr_provider_id ON public.customer_resolutions(service_provider_id);
