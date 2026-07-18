
-- ============ PROGRAMS ============
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs tenant read" ON public.programs FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "programs tenant write" ON public.programs FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "programs tenant update" ON public.programs FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "programs tenant delete" ON public.programs FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LOOKUPS ============
CREATE TABLE public.engagement_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  name text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_types TO authenticated;
GRANT ALL ON public.engagement_types TO service_role;
ALTER TABLE public.engagement_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "et read" ON public.engagement_types FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "et write" ON public.engagement_types FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER et_updated_at BEFORE UPDATE ON public.engagement_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.engagement_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_outcomes TO authenticated;
GRANT ALL ON public.engagement_outcomes TO service_role;
ALTER TABLE public.engagement_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eo read" ON public.engagement_outcomes FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "eo write" ON public.engagement_outcomes FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER eo_updated_at BEFORE UPDATE ON public.engagement_outcomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.engagement_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  name text NOT NULL,
  "group" text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_tags TO authenticated;
GRANT ALL ON public.engagement_tags TO service_role;
ALTER TABLE public.engagement_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "etag read" ON public.engagement_tags FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "etag write" ON public.engagement_tags FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER etag_updated_at BEFORE UPDATE ON public.engagement_tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ENGAGEMENTS ============
CREATE TABLE public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  engagement_type_id uuid REFERENCES public.engagement_types(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  outcome_id uuid REFERENCES public.engagement_outcomes(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagements TO authenticated;
GRANT ALL ON public.engagements TO service_role;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eng read" ON public.engagements FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "eng write" ON public.engagements FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER eng_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_engagements_org_occurred ON public.engagements(org_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_engagements_store ON public.engagements(store_id) WHERE deleted_at IS NULL;

-- ============ LINK TABLES ============
CREATE TABLE public.engagement_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_people TO authenticated;
GRANT ALL ON public.engagement_people TO service_role;
ALTER TABLE public.engagement_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ep all" ON public.engagement_people FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE INDEX idx_ep_contact ON public.engagement_people(contact_id);
CREATE INDEX idx_ep_engagement ON public.engagement_people(engagement_id);

CREATE TABLE public.engagement_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_organizations TO authenticated;
GRANT ALL ON public.engagement_organizations TO service_role;
ALTER TABLE public.engagement_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eo_link all" ON public.engagement_organizations FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE INDEX idx_eorg_entity ON public.engagement_organizations(entity_id);
CREATE INDEX idx_eorg_engagement ON public.engagement_organizations(engagement_id);

CREATE TABLE public.engagement_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_programs TO authenticated;
GRANT ALL ON public.engagement_programs TO service_role;
ALTER TABLE public.engagement_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eprog all" ON public.engagement_programs FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

CREATE TABLE public.engagement_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_stores TO authenticated;
GRANT ALL ON public.engagement_stores TO service_role;
ALTER TABLE public.engagement_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estore all" ON public.engagement_stores FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE INDEX idx_estore_store ON public.engagement_stores(store_id);
CREATE INDEX idx_estore_engagement ON public.engagement_stores(engagement_id);

CREATE TABLE public.engagement_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.engagement_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_tag_links TO authenticated;
GRANT ALL ON public.engagement_tag_links TO service_role;
ALTER TABLE public.engagement_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "etl all" ON public.engagement_tag_links FOR ALL TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

-- ============ EXTEND follow_ups for engagement linking ============
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE;
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.follow_ups ALTER COLUMN entity_id DROP NOT NULL;

-- ============ SEED LOOKUPS FOR EXISTING ORGS ============
DO $$
DECLARE o record;
BEGIN
  FOR o IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.engagement_types (org_id, name, sort_order) VALUES
      (o.id,'Phone Call',10),(o.id,'Job-Site Visit',20),(o.id,'Service-Provider Office Meeting',30),
      (o.id,'Customer Visit',40),(o.id,'Teams/Virtual Meeting',50),(o.id,'Leadership Meeting',60),
      (o.id,'Peer Meeting',70),(o.id,'Planning Meeting',80),(o.id,'Merchant Discussion',90),
      (o.id,'Provider Performance Review',100),(o.id,'Training',110),(o.id,'Ride-Along',120),
      (o.id,'Working Lunch',130),(o.id,'Store Walk',140),(o.id,'Recognition',150),
      (o.id,'Customer Resolution',160),(o.id,'General Note',170);

    INSERT INTO public.engagement_outcomes (org_id, name, sort_order) VALUES
      (o.id,'Resolved',10),(o.id,'Needs Follow-up',20),(o.id,'Waiting',30),(o.id,'Scheduled',40),(o.id,'Escalated',50);

    INSERT INTO public.engagement_tags (org_id, name, "group", sort_order) VALUES
      (o.id,'Customer Issue','Customer',10),(o.id,'Escalation Prevention','Customer',20),
      (o.id,'Warranty Question','Customer',30),(o.id,'Customer Communication','Customer',40),
      (o.id,'Installation','Installation',50),(o.id,'Scheduling','Installation',60),
      (o.id,'Change Order','Installation',70),(o.id,'Completion Issue','Installation',80),
      (o.id,'Provider Performance','Provider',90),(o.id,'Provider Communication','Provider',100),
      (o.id,'Provider Coaching','Provider',110),(o.id,'Sales Support','Sales',120),
      (o.id,'Product Knowledge','Sales',130),(o.id,'Program Information','Sales',140),
      (o.id,'Store Operations','Operations',150),(o.id,'Merchandising','Operations',160),
      (o.id,'Systems/Process','Operations',170),(o.id,'Training','Training',180),
      (o.id,'Coaching Provided','Training',190),(o.id,'Follow-up Training Needed','Training',200),
      (o.id,'Recognition','Recognition',210),(o.id,'Follow-up Needed','Follow-up',220);
  END LOOP;
END $$;

-- ============ AUTO-SEED LOOKUPS FOR NEW ORGS ============
CREATE OR REPLACE FUNCTION public.seed_engagement_lookups_for_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.engagement_types (org_id, name, sort_order) VALUES
    (NEW.id,'Phone Call',10),(NEW.id,'Job-Site Visit',20),(NEW.id,'Service-Provider Office Meeting',30),
    (NEW.id,'Customer Visit',40),(NEW.id,'Teams/Virtual Meeting',50),(NEW.id,'Leadership Meeting',60),
    (NEW.id,'Peer Meeting',70),(NEW.id,'Planning Meeting',80),(NEW.id,'Merchant Discussion',90),
    (NEW.id,'Provider Performance Review',100),(NEW.id,'Training',110),(NEW.id,'Ride-Along',120),
    (NEW.id,'Working Lunch',130),(NEW.id,'Store Walk',140),(NEW.id,'Recognition',150),
    (NEW.id,'Customer Resolution',160),(NEW.id,'General Note',170);
  INSERT INTO public.engagement_outcomes (org_id, name, sort_order) VALUES
    (NEW.id,'Resolved',10),(NEW.id,'Needs Follow-up',20),(NEW.id,'Waiting',30),(NEW.id,'Scheduled',40),(NEW.id,'Escalated',50);
  INSERT INTO public.engagement_tags (org_id, name, "group", sort_order) VALUES
    (NEW.id,'Customer Issue','Customer',10),(NEW.id,'Escalation Prevention','Customer',20),
    (NEW.id,'Warranty Question','Customer',30),(NEW.id,'Customer Communication','Customer',40),
    (NEW.id,'Installation','Installation',50),(NEW.id,'Scheduling','Installation',60),
    (NEW.id,'Change Order','Installation',70),(NEW.id,'Completion Issue','Installation',80),
    (NEW.id,'Provider Performance','Provider',90),(NEW.id,'Provider Communication','Provider',100),
    (NEW.id,'Provider Coaching','Provider',110),(NEW.id,'Sales Support','Sales',120),
    (NEW.id,'Product Knowledge','Sales',130),(NEW.id,'Program Information','Sales',140),
    (NEW.id,'Store Operations','Operations',150),(NEW.id,'Merchandising','Operations',160),
    (NEW.id,'Systems/Process','Operations',170),(NEW.id,'Training','Training',180),
    (NEW.id,'Coaching Provided','Training',190),(NEW.id,'Follow-up Training Needed','Training',200),
    (NEW.id,'Recognition','Recognition',210),(NEW.id,'Follow-up Needed','Follow-up',220);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.seed_engagement_lookups_for_org() FROM PUBLIC, anon;
CREATE TRIGGER organizations_seed_engagement_lookups
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.seed_engagement_lookups_for_org();
