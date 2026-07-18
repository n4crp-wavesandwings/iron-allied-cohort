
-- 1. Extend follow_up_status enum
ALTER TYPE public.follow_up_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.follow_up_status ADD VALUE IF NOT EXISTS 'completed';

-- 2. Add priority to follow_ups
DO $$ BEGIN
  CREATE TYPE public.follow_up_priority AS ENUM ('Low','Medium','High','Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS priority public.follow_up_priority NOT NULL DEFAULT 'Medium';

-- 3. Link tables
CREATE TABLE IF NOT EXISTS public.follow_up_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follow_up_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_people TO authenticated;
GRANT ALL ON public.follow_up_people TO service_role;
ALTER TABLE public.follow_up_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_up_people same org" ON public.follow_up_people
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TABLE IF NOT EXISTS public.follow_up_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follow_up_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_stores TO authenticated;
GRANT ALL ON public.follow_up_stores TO service_role;
ALTER TABLE public.follow_up_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_up_stores same org" ON public.follow_up_stores
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TABLE IF NOT EXISTS public.follow_up_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follow_up_id, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_organizations TO authenticated;
GRANT ALL ON public.follow_up_organizations TO service_role;
ALTER TABLE public.follow_up_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_up_organizations same org" ON public.follow_up_organizations
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TABLE IF NOT EXISTS public.follow_up_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follow_up_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_programs TO authenticated;
GRANT ALL ON public.follow_up_programs TO service_role;
ALTER TABLE public.follow_up_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_up_programs same org" ON public.follow_up_programs
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- 4. quick_starts
CREATE TABLE IF NOT EXISTS public.quick_starts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'text', -- 'text' | 'email'
  sort_order integer NOT NULL DEFAULT 100,
  is_favorite boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_starts TO authenticated;
GRANT ALL ON public.quick_starts TO service_role;
ALTER TABLE public.quick_starts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quick_starts same org" ON public.quick_starts
  FOR ALL TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER quick_starts_set_updated_at BEFORE UPDATE ON public.quick_starts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Update org seed function to seed Core Five
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
    (NEW.id,'Water Heaters',100,'Active',true);

  SELECT id INTO carpet_id FROM public.programs
    WHERE org_id = NEW.id AND lower(name) = 'carpet' LIMIT 1;

  INSERT INTO public.programs (org_id, name, sort_order, status, active, parent_program_id)
    VALUES (NEW.id,'Artificial Turf',110,'Active',true, carpet_id);

  -- Core Five Quick Starts (favorites)
  INSERT INTO public.quick_starts (org_id, name, icon, body, channel, sort_order, is_favorite) VALUES
    (NEW.id,'Thinking of You','❤️','Hey {FirstName}, you crossed my mind today, so I just wanted to say hello. Hope everything''s going well. Have a great rest of the week!','text',10,true),
    (NEW.id,'Great Job','👏','Hey {FirstName}, I just wanted to tell you great job. I really appreciate your hard work. Keep it up!','text',20,true),
    (NEW.id,'Checking In','👋','Hey {FirstName}, hope you''re having a good week. Just checking in to see how things are going. Let me know if I can help with anything.','text',30,true),
    (NEW.id,'Let''s Get Together','☕','Hey {FirstName}, it''s been a little while. I''d love to get together and catch up. Let me know what your schedule looks like over the next week or two.','text',40,true),
    (NEW.id,'Give Me a Call','📞','Hey {FirstName}, when you get a chance, give me a call. Nothing urgent.','text',50,true);

  RETURN NEW;
END $function$;

-- 6. Backfill Core Five for existing orgs that don't have them yet
INSERT INTO public.quick_starts (org_id, name, icon, body, channel, sort_order, is_favorite)
SELECT o.id, v.name, v.icon, v.body, 'text', v.sort_order, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('Thinking of You','❤️','Hey {FirstName}, you crossed my mind today, so I just wanted to say hello. Hope everything''s going well. Have a great rest of the week!',10),
  ('Great Job','👏','Hey {FirstName}, I just wanted to tell you great job. I really appreciate your hard work. Keep it up!',20),
  ('Checking In','👋','Hey {FirstName}, hope you''re having a good week. Just checking in to see how things are going. Let me know if I can help with anything.',30),
  ('Let''s Get Together','☕','Hey {FirstName}, it''s been a little while. I''d love to get together and catch up. Let me know what your schedule looks like over the next week or two.',40),
  ('Give Me a Call','📞','Hey {FirstName}, when you get a chance, give me a call. Nothing urgent.',50)
) AS v(name, icon, body, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.quick_starts qs WHERE qs.org_id = o.id AND qs.name = v.name
);
