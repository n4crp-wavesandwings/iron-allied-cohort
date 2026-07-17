
-- Enums
CREATE TYPE public.cr_priority AS ENUM ('Low','Normal','High','Urgent');
CREATE TYPE public.cr_status AS ENUM ('New','In Progress','Waiting','Resolved','Closed');
CREATE TYPE public.cr_relationship_role AS ENUM ('Service Provider','Store','Other');
CREATE TYPE public.cr_task_owner_type AS ENUM ('Me','Service Provider','Store','Associate','Leader','Other');
CREATE TYPE public.cr_task_status AS ENUM ('Open','Waiting','Complete');
CREATE TYPE public.cr_event_type AS ENUM ('resolution_updated','task_created','task_completed','status_changed','note_added','interaction_linked','followup_linked');

-- Main table
CREATE TABLE public.customer_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  title text NOT NULL,
  customer_last_name text NOT NULL,
  customer_first_initial text NOT NULL CHECK (char_length(customer_first_initial) BETWEEN 1 AND 1),
  reference_number text,
  priority public.cr_priority NOT NULL DEFAULT 'Normal',
  status public.cr_status NOT NULL DEFAULT 'New',
  summary text,
  desired_resolution text,
  opened_date date NOT NULL DEFAULT (now()::date),
  target_date date,
  completed_date date,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_resolutions TO authenticated;
GRANT ALL ON public.customer_resolutions TO service_role;
ALTER TABLE public.customer_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select cr" ON public.customer_resolutions FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert cr" ON public.customer_resolutions FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update cr" ON public.customer_resolutions FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.customer_resolutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX cr_deleted_at_idx ON public.customer_resolutions(deleted_at);
CREATE INDEX cr_org_idx ON public.customer_resolutions(org_id);

-- Junction: relationships
CREATE TABLE public.customer_resolution_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  relationship_id uuid NOT NULL REFERENCES public.entities(id),
  role public.cr_relationship_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_resolution_relationships TO authenticated;
GRANT ALL ON public.customer_resolution_relationships TO service_role;
ALTER TABLE public.customer_resolution_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select crr" ON public.customer_resolution_relationships FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert crr" ON public.customer_resolution_relationships FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update crr" ON public.customer_resolution_relationships FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete crr" ON public.customer_resolution_relationships FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE INDEX crr_resolution_idx ON public.customer_resolution_relationships(resolution_id);

-- People
CREATE TABLE public.customer_resolution_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id),
  person_name text NOT NULL,
  person_role text NOT NULL,
  manual_entry boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_resolution_people TO authenticated;
GRANT ALL ON public.customer_resolution_people TO service_role;
ALTER TABLE public.customer_resolution_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select crp" ON public.customer_resolution_people FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert crp" ON public.customer_resolution_people FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update crp" ON public.customer_resolution_people FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete crp" ON public.customer_resolution_people FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_crp_updated BEFORE UPDATE ON public.customer_resolution_people FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX crp_resolution_idx ON public.customer_resolution_people(resolution_id);

-- Tasks
CREATE TABLE public.customer_resolution_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  task text NOT NULL,
  owner_name text NOT NULL,
  owner_type public.cr_task_owner_type NOT NULL,
  due_date date,
  status public.cr_task_status NOT NULL DEFAULT 'Open',
  waiting_on text,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_resolution_tasks TO authenticated;
GRANT ALL ON public.customer_resolution_tasks TO service_role;
ALTER TABLE public.customer_resolution_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select crt" ON public.customer_resolution_tasks FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert crt" ON public.customer_resolution_tasks FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org update crt" ON public.customer_resolution_tasks FOR UPDATE TO authenticated USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete crt" ON public.customer_resolution_tasks FOR DELETE TO authenticated USING (org_id = current_org_id());
CREATE TRIGGER trg_crt_updated BEFORE UPDATE ON public.customer_resolution_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX crt_resolution_idx ON public.customer_resolution_tasks(resolution_id);
CREATE INDEX crt_status_idx ON public.customer_resolution_tasks(status);

-- History
CREATE TABLE public.customer_resolution_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  event_type public.cr_event_type NOT NULL,
  event_description text NOT NULL,
  previous_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);
GRANT SELECT, INSERT ON public.customer_resolution_history TO authenticated;
GRANT ALL ON public.customer_resolution_history TO service_role;
ALTER TABLE public.customer_resolution_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select crh" ON public.customer_resolution_history FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert crh" ON public.customer_resolution_history FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE INDEX crh_resolution_idx ON public.customer_resolution_history(resolution_id, created_at DESC);

-- Interactions junction
CREATE TABLE public.customer_resolution_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  interaction_id uuid NOT NULL REFERENCES public.interactions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_resolution_interactions TO authenticated;
GRANT ALL ON public.customer_resolution_interactions TO service_role;
ALTER TABLE public.customer_resolution_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select cri" ON public.customer_resolution_interactions FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert cri" ON public.customer_resolution_interactions FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete cri" ON public.customer_resolution_interactions FOR DELETE TO authenticated USING (org_id = current_org_id());

-- Followups junction
CREATE TABLE public.customer_resolution_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_org_id() REFERENCES public.organizations(id),
  resolution_id uuid NOT NULL REFERENCES public.customer_resolutions(id) ON DELETE CASCADE,
  follow_up_id uuid NOT NULL REFERENCES public.follow_ups(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_resolution_followups TO authenticated;
GRANT ALL ON public.customer_resolution_followups TO service_role;
ALTER TABLE public.customer_resolution_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select crf" ON public.customer_resolution_followups FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org insert crf" ON public.customer_resolution_followups FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org delete crf" ON public.customer_resolution_followups FOR DELETE TO authenticated USING (org_id = current_org_id());
