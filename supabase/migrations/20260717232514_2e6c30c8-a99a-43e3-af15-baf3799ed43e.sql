
-- contact_phones
CREATE TABLE public.contact_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  label text,
  phone text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_phones TO authenticated;
GRANT ALL ON public.contact_phones TO service_role;
ALTER TABLE public.contact_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select contact_phones" ON public.contact_phones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org insert contact_phones" ON public.contact_phones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org update contact_phones" ON public.contact_phones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org delete contact_phones" ON public.contact_phones FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE TRIGGER trg_contact_phones_updated BEFORE UPDATE ON public.contact_phones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX contact_phones_contact_id_idx ON public.contact_phones(contact_id);

-- contact_emails
CREATE TABLE public.contact_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  label text,
  email text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_emails TO authenticated;
GRANT ALL ON public.contact_emails TO service_role;
ALTER TABLE public.contact_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select contact_emails" ON public.contact_emails FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org insert contact_emails" ON public.contact_emails FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org update contact_emails" ON public.contact_emails FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org delete contact_emails" ON public.contact_emails FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE TRIGGER trg_contact_emails_updated BEFORE UPDATE ON public.contact_emails FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX contact_emails_contact_id_idx ON public.contact_emails(contact_id);

-- contact_roles
CREATE TABLE public.contact_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_roles TO authenticated;
GRANT ALL ON public.contact_roles TO service_role;
ALTER TABLE public.contact_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select contact_roles" ON public.contact_roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org insert contact_roles" ON public.contact_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org update contact_roles" ON public.contact_roles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org delete contact_roles" ON public.contact_roles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE INDEX contact_roles_contact_id_idx ON public.contact_roles(contact_id);

-- contact_organizations (many-to-many contact <-> entities)
CREATE TABLE public.contact_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_organizations TO authenticated;
GRANT ALL ON public.contact_organizations TO service_role;
ALTER TABLE public.contact_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org select contact_organizations" ON public.contact_organizations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org insert contact_organizations" ON public.contact_organizations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org update contact_organizations" ON public.contact_organizations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE POLICY "org delete contact_organizations" ON public.contact_organizations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.org_id = current_org_id()));
CREATE INDEX contact_organizations_contact_id_idx ON public.contact_organizations(contact_id);
CREATE INDEX contact_organizations_org_id_idx ON public.contact_organizations(organization_id);
