
-- ============= ENUMS =============
CREATE TYPE public.entity_type AS ENUM ('store','provider','merchant','program','internal');
CREATE TYPE public.interaction_type AS ENUM ('meeting','call','visit','note');
CREATE TYPE public.follow_up_status AS ENUM ('open','done');

-- ============= ORGANIZATIONS =============
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============= HELPERS =============
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Handle new user: create org + profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  display_name text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  INSERT INTO public.organizations (name)
    VALUES (COALESCE(display_name,'My Organization') || '''s Organization')
    RETURNING id INTO new_org_id;
  INSERT INTO public.profiles (id, org_id, email, full_name)
    VALUES (NEW.id, new_org_id, NEW.email, display_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies for organizations/profiles
CREATE POLICY "Users read own org" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_org_id());
CREATE POLICY "Users update own org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id())
  WITH CHECK (id = public.current_org_id());

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= ENTITIES =============
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  type public.entity_type NOT NULL,
  name text NOT NULL,
  status text,
  district text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select entities" ON public.entities FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org insert entities" ON public.entities FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "org update entities" ON public.entities FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_entities_updated BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= CONTACTS =============
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  entity_id uuid NOT NULL REFERENCES public.entities(id),
  name text NOT NULL,
  role text,
  contact_info text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select contacts" ON public.contacts FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org insert contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "org update contacts" ON public.contacts FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= INTERACTIONS =============
CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  entity_id uuid NOT NULL REFERENCES public.entities(id),
  type public.interaction_type NOT NULL,
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'human',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.interactions TO authenticated;
GRANT ALL ON public.interactions TO service_role;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select interactions" ON public.interactions FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org insert interactions" ON public.interactions FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "org update interactions" ON public.interactions FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_interactions_updated BEFORE UPDATE ON public.interactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= FOLLOW UPS =============
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) DEFAULT public.current_org_id(),
  entity_id uuid REFERENCES public.entities(id),
  interaction_id uuid REFERENCES public.interactions(id),
  title text NOT NULL,
  due_date date NOT NULL,
  status public.follow_up_status NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select follow_ups" ON public.follow_ups FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "org insert follow_ups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "org update follow_ups" ON public.follow_ups FOR UPDATE TO authenticated USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());
CREATE TRIGGER trg_follow_ups_updated BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
