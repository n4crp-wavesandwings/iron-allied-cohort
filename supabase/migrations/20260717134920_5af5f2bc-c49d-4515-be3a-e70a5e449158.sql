
-- Enums (create if not exists)
DO $$ BEGIN
  CREATE TYPE public.entity_comm_method AS ENUM ('Email','Phone','Text','In Person','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_comm_method AS ENUM ('Email','Office Phone','Mobile Phone','Teams','LinkedIn','In Person','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_relationship_strength AS ENUM ('Weak','Moderate','Strong','Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cr_severity AS ENUM ('Customer Experience','Safety','Financial','Installation','Product','Communication','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cr_resolution_type AS ENUM ('Installation','Delivery','Product','Billing','Service','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cr_escalation_level AS ENUM ('Store','District','Regional','Corporate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.follow_up_category AS ENUM ('Relationship','Issue Resolution','Customer Request','Feedback','Other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Entities
ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS dba_name text,
  ADD COLUMN IF NOT EXISTS territory text,
  ADD COLUMN IF NOT EXISTS primary_location text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS preferred_communication_method public.entity_comm_method,
  ADD COLUMN IF NOT EXISTS internal_reference_number text;

-- Contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS microsoft_teams text,
  ADD COLUMN IF NOT EXISTS preferred_communication_method_v2 public.contact_comm_method,
  ADD COLUMN IF NOT EXISTS relationship_strength public.contact_relationship_strength,
  ADD COLUMN IF NOT EXISTS birthday date;

-- Customer Resolutions
ALTER TABLE public.customer_resolutions
  ADD COLUMN IF NOT EXISTS severity public.cr_severity,
  ADD COLUMN IF NOT EXISTS resolution_type public.cr_resolution_type,
  ADD COLUMN IF NOT EXISTS escalation_level public.cr_escalation_level;

-- Tasks
ALTER TABLE public.customer_resolution_tasks
  ADD COLUMN IF NOT EXISTS estimated_completion_date date,
  ADD COLUMN IF NOT EXISTS actual_completion_date date;

-- Follow-ups
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS category public.follow_up_category,
  ADD COLUMN IF NOT EXISTS reminder_date date;
