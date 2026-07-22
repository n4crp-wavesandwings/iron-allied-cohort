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

// ---------------------------------------------------------------------------
// Shared canonical READ helper — the read-side mirror of writeCanonicalContactDetails.
// Returns all contacts affiliated with an organization/provider/merchant entity via
// `contact_organizations` (canonical) or legacy `contacts.entity_id`, with phones,
// emails, and roles from canonical tables. Every screen listing an org's people
// MUST route through this helper so no future screen drifts onto a legacy path.
// ---------------------------------------------------------------------------
export type CanonicalPhone = {
  id: string;
  contact_id: string;
  phone: string;
  is_primary: boolean;
  label: string | null;
};
export type CanonicalEmail = {
  id: string;
  contact_id: string;
  email: string;
  is_primary: boolean;
  label: string | null;
};
export type CanonicalOrgContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  name: string | null;
  active: boolean | null;
  deleted_at: string | null;
  preferred_contact_method: string | null;
  best_time_to_contact: string | null;
  note: string | null;
  phones: CanonicalPhone[];
  emails: CanonicalEmail[];
  roles: string[];
  primary_phone: string | null;
  primary_email: string | null;
  job_title: string | null;
  // aliases kept so existing UI reading legacy field names still works —
  // sourced from canonical tables, NOT the legacy flat columns.
  email: string | null;
  mobile_phone: string | null;
  office_phone: string | null;
};

export function orgContactsCanonicalQuery(entityId: string) {
  return queryOptions({
    queryKey: ["org_contacts_canonical", entityId],
    queryFn: async (): Promise<CanonicalOrgContact[]> => {
      if (!entityId) return [];
      const baseCols =
        "id, first_name, last_name, preferred_name, name, active, deleted_at, preferred_contact_method, best_time_to_contact, note";
      const [{ data: direct, error: e1 }, { data: linked, error: e2 }] = await Promise.all([
        supabase
          .from("contacts")
          .select(baseCols)
          .eq("entity_id", entityId)
          .is("deleted_at", null)
          .eq("active", true),
        supabase
          .from("contact_organizations")
          .select(`contact:contacts(${baseCols})`)
          .eq("organization_id", entityId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map<string, any>();
      for (const c of (direct as any[]) ?? []) map.set(c.id, c);
      for (const row of (linked as any[]) ?? []) {
        const c = row.contact;
        if (!c || c.deleted_at || c.active === false) continue;
        if (!map.has(c.id)) map.set(c.id, c);
      }
      const ids = Array.from(map.keys());
      if (ids.length === 0) return [];
      const [{ data: phones }, { data: emails }, { data: roles }] = await Promise.all([
        supabase
          .from("contact_phones")
          .select("id,contact_id,phone,is_primary,label")
          .in("contact_id", ids),
        supabase
          .from("contact_emails")
          .select("id,contact_id,email,is_primary,label")
          .in("contact_id", ids),
        supabase
          .from("contact_roles")
          .select("id,contact_id,role,is_primary")
          .in("contact_id", ids),
      ]);
      const groupBy = <T extends { contact_id: string }>(rows: T[] | null | undefined) => {
        const m = new Map<string, T[]>();
        for (const r of rows ?? []) {
          const a = m.get(r.contact_id) ?? [];
          a.push(r);
          m.set(r.contact_id, a);
        }
        return m;
      };
      const pm = groupBy((phones as any[]) ?? []);
      const em = groupBy((emails as any[]) ?? []);
      const rm = groupBy((roles as any[]) ?? []);
      return Array.from(map.values())
        .map((c: any): CanonicalOrgContact => {
          const ps = (pm.get(c.id) ?? []) as CanonicalPhone[];
          const es = (em.get(c.id) ?? []) as CanonicalEmail[];
          const rs = (rm.get(c.id) ?? []) as { role: string; is_primary: boolean }[];
          const primaryPhoneRow = ps.find((p) => p.is_primary) ?? ps[0];
          const primaryEmailRow = es.find((e) => e.is_primary) ?? es[0];
          const primaryRoleRow = rs.find((r) => r.is_primary) ?? rs[0];
          const mobileRow =
            ps.find((p) => (p.label ?? "").toLowerCase() === "mobile") ?? null;
          const officeRow =
            ps.find((p) => (p.label ?? "").toLowerCase() === "office") ?? null;
          const primary_phone = primaryPhoneRow?.phone ?? null;
          const primary_email = primaryEmailRow?.email ?? null;
          return {
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            preferred_name: c.preferred_name,
            name: c.name,
            active: c.active,
            deleted_at: c.deleted_at,
            preferred_contact_method: c.preferred_contact_method,
            best_time_to_contact: c.best_time_to_contact,
            note: c.note,
            phones: ps,
            emails: es,
            roles: rs.map((r) => r.role).filter(Boolean),
            primary_phone,
            primary_email,
            job_title: primaryRoleRow?.role ?? null,
            email: primary_email,
            mobile_phone: mobileRow?.phone ?? primary_phone ?? null,
            office_phone: officeRow?.phone ?? null,
          };
        })
        .sort((a, b) =>
          (a.first_name ?? a.name ?? "").localeCompare(b.first_name ?? b.name ?? ""),
        );
    },
  });
}


export function contactDisplayName(c: {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}): string {
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

