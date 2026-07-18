
-- Pass 9: Retailer/brand hook + portable contact-store assignments

-- 1) Retailers table (invisible future-proofing; no UI)
CREATE TABLE IF NOT EXISTS public.retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retailers TO authenticated;
GRANT ALL ON public.retailers TO service_role;

ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retailers_tenant_select" ON public.retailers;
DROP POLICY IF EXISTS "retailers_tenant_insert" ON public.retailers;
DROP POLICY IF EXISTS "retailers_tenant_update" ON public.retailers;
DROP POLICY IF EXISTS "retailers_tenant_delete" ON public.retailers;

CREATE POLICY "retailers_tenant_select" ON public.retailers
  FOR SELECT TO authenticated USING (org_id = public.current_org_id());
CREATE POLICY "retailers_tenant_insert" ON public.retailers
  FOR INSERT TO authenticated WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "retailers_tenant_update" ON public.retailers
  FOR UPDATE TO authenticated USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY "retailers_tenant_delete" ON public.retailers
  FOR DELETE TO authenticated USING (org_id = public.current_org_id());

DROP TRIGGER IF EXISTS retailers_set_updated_at ON public.retailers;
CREATE TRIGGER retailers_set_updated_at
  BEFORE UPDATE ON public.retailers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Nullable retailer_id hook on stores (no UI in this pass)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS retailer_id uuid REFERENCES public.retailers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stores_retailer_id_idx ON public.stores(retailer_id);

-- 3) Portable contact-store assignments: add lightweight history fields
ALTER TABLE public.contact_store_coverage
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

CREATE INDEX IF NOT EXISTS contact_store_coverage_current_idx
  ON public.contact_store_coverage(contact_id) WHERE is_current;

-- 4) Retire the catch-all "Home Depot" Store-type entity (test artifact w/ Stephen Hritz).
-- Verified: 0 linked engagements/contacts/interactions/follow-ups. Safe soft-delete.
UPDATE public.entities
SET deleted_at = now()
WHERE id = 'fca7486e-3f5d-492f-8e89-8bb53f05d676'
  AND deleted_at IS NULL;
