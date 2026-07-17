ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS office_phone text,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS best_time_to_contact text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.contacts ALTER COLUMN name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS contacts_entity_id_idx ON public.contacts(entity_id);
CREATE INDEX IF NOT EXISTS contacts_deleted_at_idx ON public.contacts(deleted_at);
CREATE INDEX IF NOT EXISTS follow_ups_entity_id_idx ON public.follow_ups(entity_id);