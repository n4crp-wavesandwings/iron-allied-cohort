
-- 1. Add is_custom to engagement_tags
ALTER TABLE public.engagement_tags
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

-- Case-insensitive uniqueness per org to prevent duplicate/typo tags
CREATE UNIQUE INDEX IF NOT EXISTS engagement_tags_org_lower_name_uniq
  ON public.engagement_tags (org_id, lower(btrim(name)));

-- 2. engagement_type_links join table (multi-select)
CREATE TABLE IF NOT EXISTS public.engagement_type_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  engagement_type_id uuid NOT NULL REFERENCES public.engagement_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, engagement_type_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_type_links TO authenticated;
GRANT ALL ON public.engagement_type_links TO service_role;

ALTER TABLE public.engagement_type_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagement_type_links tenant access"
  ON public.engagement_type_links
  FOR ALL
  TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS engagement_type_links_engagement_idx
  ON public.engagement_type_links (engagement_id);
CREATE INDEX IF NOT EXISTS engagement_type_links_type_idx
  ON public.engagement_type_links (engagement_type_id);

-- 3. Backfill existing single-type engagements into the join table
INSERT INTO public.engagement_type_links (org_id, engagement_id, engagement_type_id)
SELECT e.org_id, e.id, e.engagement_type_id
FROM public.engagements e
WHERE e.engagement_type_id IS NOT NULL
ON CONFLICT (engagement_id, engagement_type_id) DO NOTHING;

-- 4. Seed 'Email' type for every existing org (idempotent via case-insensitive unique index)
INSERT INTO public.engagement_types (org_id, name, sort_order)
SELECT o.id, 'Email', 15
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.engagement_types t
  WHERE t.org_id = o.id AND lower(btrim(t.name)) = 'email'
);

-- 5. Update the new-org seed function to include Email
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
  RETURN NEW;
END $function$;
