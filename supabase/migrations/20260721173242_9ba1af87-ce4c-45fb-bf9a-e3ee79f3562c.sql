
-- Add "Text Message" engagement type for existing orgs (idempotent)
INSERT INTO public.engagement_types (org_id, name, sort_order)
SELECT o.id, 'Text Message', 12
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.engagement_types et
  WHERE et.org_id = o.id AND lower(et.name) = 'text message'
);

-- Update per-org seed to include Text Message for future orgs
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
    (NEW.id,'Phone Call',10),(NEW.id,'Text Message',12),(NEW.id,'Email',15),(NEW.id,'Job-Site Visit',20),
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

  INSERT INTO public.quick_starts (org_id, name, icon, body, channel, sort_order, is_favorite) VALUES
    (NEW.id,'Thinking of You','❤️','Hey {FirstName}, you crossed my mind today, so I just wanted to say hello. Hope everything''s going well. Have a great rest of the week!','text',10,true),
    (NEW.id,'Great Job','👏','Hey {FirstName}, I just wanted to tell you great job. I really appreciate your hard work. Keep it up!','text',20,true),
    (NEW.id,'Checking In','👋','Hey {FirstName}, hope you''re having a good week. Just checking in to see how things are going. Let me know if I can help with anything.','text',30,true),
    (NEW.id,'Let''s Get Together','☕','Hey {FirstName}, it''s been a little while. I''d love to get together and catch up. Let me know what your schedule looks like over the next week or two.','text',40,true),
    (NEW.id,'Give Me a Call','📞','Hey {FirstName}, when you get a chance, give me a call. Nothing urgent.','text',50,true);

  RETURN NEW;
END $function$;
