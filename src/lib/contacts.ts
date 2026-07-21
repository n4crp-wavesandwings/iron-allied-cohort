import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactCommMethod = Database["public"]["Enums"]["contact_comm_method"];
export type ContactRelationshipStrength =
  Database["public"]["Enums"]["contact_relationship_strength"];

export const PREFERRED_CONTACT_METHODS = [
  "Email",
  "Office Phone",
  "Mobile Phone",
] as const;
export type PreferredContactMethod = (typeof PREFERRED_CONTACT_METHODS)[number];

export const CONTACT_COMM_METHODS: ContactCommMethod[] = [
  "Email",
  "Office Phone",
  "Mobile Phone",
  "Teams",
  "LinkedIn",
  "In Person",
  "Other",
];

export const CONTACT_RELATIONSHIP_STRENGTHS: ContactRelationshipStrength[] = [
  "Weak",
  "Moderate",
  "Strong",
  "Critical",
];

export const contactsQueryOptions = (entityId: string) =>
  queryOptions({
    queryKey: ["contacts", entityId],
    queryFn: async (): Promise<ContactRow[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("entity_id", entityId)
        .is("deleted_at", null)
        .eq("active", true)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export function contactDisplayName(c: ContactRow): string {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return c.name ?? "Unnamed";
}

// ---------------------------------------------------------------------------
// Canonical writers — phones, emails, and roles live in their own tables.
// These helpers are idempotent: they skip inserts that would duplicate an
// existing row (normalized comparison for phone digits, case-insensitive for
// email, trimmed for role). Never write to contacts.office_phone /
// contacts.mobile_phone / contacts.email / contacts.job_title.
// ---------------------------------------------------------------------------
function digits(v: string): string {
  return v.replace(/\D/g, "");
}

export async function addContactPhone(
  contactId: string,
  phone: string,
  label: "Mobile" | "Office" = "Mobile",
): Promise<void> {
  const trimmed = phone.trim();
  if (!trimmed) return;
  const newDigits = digits(trimmed);
  const { data: existing } = await supabase
    .from("contact_phones")
    .select("id, phone, is_primary")
    .eq("contact_id", contactId);
  const match = (existing ?? []).find((row: any) => {
    const d = digits(row.phone ?? "");
    return d.length >= 7 && d.slice(-10) === newDigits.slice(-10);
  });
  if (match) return;
  const isPrimary = !existing || existing.length === 0;
  await supabase
    .from("contact_phones")
    .insert({ contact_id: contactId, phone: trimmed, label, is_primary: isPrimary } as any);
}

export async function addContactEmail(
  contactId: string,
  email: string,
  label: string = "Work",
): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) return;
  const { data: existing } = await supabase
    .from("contact_emails")
    .select("id, email")
    .eq("contact_id", contactId);
  const match = (existing ?? []).find(
    (row: any) => (row.email ?? "").toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return;
  const isPrimary = !existing || existing.length === 0;
  await supabase
    .from("contact_emails")
    .insert({ contact_id: contactId, email: trimmed, label, is_primary: isPrimary } as any);
}

export async function addContactRole(contactId: string, role: string): Promise<void> {
  const trimmed = role.trim();
  if (!trimmed) return;
  const { data: existing } = await supabase
    .from("contact_roles")
    .select("id, role")
    .eq("contact_id", contactId);
  const match = (existing ?? []).find(
    (row: any) => (row.role ?? "").trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return;
  await supabase
    .from("contact_roles")
    .insert({ contact_id: contactId, role: trimmed } as any);
}

export async function writeCanonicalContactDetails(
  contactId: string,
  input: { mobilePhone?: string; officePhone?: string; email?: string; role?: string },
): Promise<void> {
  if (input.mobilePhone) await addContactPhone(contactId, input.mobilePhone, "Mobile");
  if (input.officePhone) await addContactPhone(contactId, input.officePhone, "Office");
  if (input.email) await addContactEmail(contactId, input.email);
  if (input.role) await addContactRole(contactId, input.role);
}

