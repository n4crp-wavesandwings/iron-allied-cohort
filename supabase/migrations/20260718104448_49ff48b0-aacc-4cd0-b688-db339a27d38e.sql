
-- Merchant is a person (contact), not an organization.
-- 1. Add is_merchant flag; allow contacts with no owning entity (standalone merchants).
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_merchant boolean NOT NULL DEFAULT false;
ALTER TABLE public.contacts ALTER COLUMN entity_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_is_merchant_idx ON public.contacts (org_id, is_merchant) WHERE is_merchant = true AND deleted_at IS NULL;

-- 2. Point program_merchants at contacts (no existing rows).
ALTER TABLE public.program_merchants RENAME COLUMN merchant_id TO contact_id;
ALTER TABLE public.program_merchants
  ADD CONSTRAINT program_merchants_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
ALTER TABLE public.program_merchants
  ADD CONSTRAINT program_merchants_program_fk
  FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
