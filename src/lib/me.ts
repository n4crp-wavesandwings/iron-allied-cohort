import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SelfContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
};

/** Resolve the current user's "self" contact by matching auth email. */
export const selfContactQuery = queryOptions({
  queryKey: ["me", "self_contact"],
  queryFn: async (): Promise<SelfContact | null> => {
    const { data: u } = await supabase.auth.getUser();
    const email = u.user?.email;
    if (!email) return null;
    const { data, error } = await supabase
      .from("contacts")
      .select("id,first_name,last_name,name,email")
      .ilike("email", email)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as any) ?? null;
  },
});

export type MyStoreRow = {
  id: string;
  store_number: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  main_phone: string | null;
  district_id: string;
  district_name: string | null;
};

export const myStoresQuery = queryOptions({
  queryKey: ["me", "my_stores"],
  queryFn: async (): Promise<MyStoreRow[]> => {
    const { data: u } = await supabase.auth.getUser();
    const email = u.user?.email;
    if (!email) return [];
    const { data: self } = await supabase
      .from("contacts")
      .select("id")
      .ilike("email", email)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const selfId = (self as any)?.id;
    if (!selfId) return [];
    const { data, error } = await supabase
      .from("contact_store_coverage")
      .select(
        `store:stores(id,store_number,name,address,city,state,zip,main_phone,district_id,district:districts(id,name))`,
      )
      .eq("contact_id", selfId);
    if (error) throw error;
    const rows: MyStoreRow[] = ((data as any[]) ?? [])
      .map((r) => r.store)
      .filter(Boolean)
      .map((s: any) => ({
        id: s.id,
        store_number: s.store_number,
        name: s.name,
        address: s.address ?? null,
        city: s.city,
        state: s.state,
        zip: s.zip ?? null,
        main_phone: s.main_phone,
        district_id: s.district_id,
        district_name: s.district?.name ?? null,
      }));
    rows.sort(
      (a, b) =>
        (a.district_name ?? "").localeCompare(b.district_name ?? "") ||
        a.store_number.localeCompare(b.store_number),
    );
    return rows;
  },
});

export type ProviderRow = {
  id: string;
  name: string;
  organization_type: string | null;
};

export const serviceProvidersQuery = queryOptions({
  queryKey: ["entities", "service_providers"],
  queryFn: async (): Promise<ProviderRow[]> => {
    const { data, error } = await supabase
      .from("entities")
      .select("id,name,organization_type,type")
      .is("deleted_at", null)
      .or("type.eq.provider,organization_type.eq.Service Provider")
      .order("name");
    if (error) throw error;
    return ((data as any[]) ?? []) as any;
  },
});

export type ProviderReconnectRow = ProviderRow & {
  last_engagement_at: string | null;
  gap_days: number | null;
};

export const providersReconnectQuery = queryOptions({
  queryKey: ["providers", "reconnect"],
  queryFn: async (): Promise<ProviderReconnectRow[]> => {
    const { data: provs, error: pe } = await supabase
      .from("entities")
      .select("id,name,organization_type,type")
      .is("deleted_at", null)
      .or("type.eq.provider,organization_type.eq.Service Provider")
      .order("name");
    if (pe) throw pe;
    const providers = ((provs as any[]) ?? []) as ProviderRow[];
    if (providers.length === 0) return [];
    const provIds = providers.map((p) => p.id);

    // Contacts for each provider (direct entity_id and via contact_organizations)
    const [{ data: directContacts }, { data: linkedContacts }] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, entity_id")
        .in("entity_id", provIds)
        .is("deleted_at", null),
      supabase
        .from("contact_organizations")
        .select("contact_id, organization_id")
        .in("organization_id", provIds),
    ]);
    const contactToProviders = new Map<string, Set<string>>();
    for (const c of (directContacts as any[]) ?? []) {
      const s = contactToProviders.get(c.id) ?? new Set<string>();
      s.add(c.entity_id);
      contactToProviders.set(c.id, s);
    }
    for (const l of (linkedContacts as any[]) ?? []) {
      const s = contactToProviders.get(l.contact_id) ?? new Set<string>();
      s.add(l.organization_id);
      contactToProviders.set(l.contact_id, s);
    }
    const contactIds = Array.from(contactToProviders.keys());

    // Latest engagements via engagement_organizations (direct)
    const [{ data: engOrgs }, { data: engPeople }] = await Promise.all([
      supabase
        .from("engagement_organizations")
        .select("entity_id, engagement:engagements(occurred_at)")
        .in("entity_id", provIds),
      contactIds.length
        ? supabase
            .from("engagement_people")
            .select("contact_id, engagement:engagements(occurred_at)")
            .in("contact_id", contactIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const lastByProvider = new Map<string, string>();
    const bump = (pid: string, ts: string | null | undefined) => {
      if (!ts) return;
      const cur = lastByProvider.get(pid);
      if (!cur || ts > cur) lastByProvider.set(pid, ts);
    };
    for (const r of (engOrgs as any[]) ?? []) {
      bump(r.entity_id, r.engagement?.occurred_at);
    }
    for (const r of (engPeople as any[]) ?? []) {
      const provs = contactToProviders.get(r.contact_id);
      if (!provs) continue;
      provs.forEach((pid) => bump(pid, r.engagement?.occurred_at));
    }

    const now = Date.now();
    return providers.map((p) => {
      const last = lastByProvider.get(p.id) ?? null;
      const gap_days = last
        ? Math.floor((now - new Date(last).getTime()) / 86_400_000)
        : null;
      return { ...p, last_engagement_at: last, gap_days };
    });
  },
});

export type ProviderContactMethods = ProviderContactRow & {
  phones: { id: string; phone: string; is_primary: boolean; label: string | null }[];
  emails: { id: string; email: string; is_primary: boolean; label: string | null }[];
  primary_phone: string | null;
  primary_email: string | null;
};

export function providerContactsWithMethodsQuery(entityId: string) {
  return queryOptions({
    queryKey: ["provider_contacts_methods", entityId],
    queryFn: async (): Promise<ProviderContactMethods[]> => {
      const [{ data: direct, error: e1 }, { data: linked, error: e2 }] = await Promise.all([
        supabase
          .from("contacts")
          .select("id,first_name,last_name,name,email,mobile_phone,office_phone,job_title")
          .eq("entity_id", entityId)
          .is("deleted_at", null)
          .eq("active", true),
        supabase
          .from("contact_organizations")
          .select(
            `contact:contacts(id,first_name,last_name,name,email,mobile_phone,office_phone,job_title,deleted_at,active)`,
          )
          .eq("organization_id", entityId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map<string, ProviderContactRow>();
      for (const c of (direct as any[]) ?? []) map.set(c.id, c);
      for (const row of (linked as any[]) ?? []) {
        const c = row.contact;
        if (!c || c.deleted_at || c.active === false) continue;
        if (!map.has(c.id)) map.set(c.id, c);
      }
      const ids = Array.from(map.keys());
      if (ids.length === 0) return [];
      const [{ data: phones }, { data: emails }] = await Promise.all([
        supabase
          .from("contact_phones")
          .select("id,contact_id,phone,is_primary,label")
          .in("contact_id", ids),
        supabase
          .from("contact_emails")
          .select("id,contact_id,email,is_primary,label")
          .in("contact_id", ids),
      ]);
      const phoneMap = new Map<string, any[]>();
      for (const p of (phones as any[]) ?? []) {
        const arr = phoneMap.get(p.contact_id) ?? [];
        arr.push(p);
        phoneMap.set(p.contact_id, arr);
      }
      const emailMap = new Map<string, any[]>();
      for (const e of (emails as any[]) ?? []) {
        const arr = emailMap.get(e.contact_id) ?? [];
        arr.push(e);
        emailMap.set(e.contact_id, arr);
      }
      return Array.from(map.values())
        .map((c) => {
          const ps = phoneMap.get(c.id) ?? [];
          const es = emailMap.get(c.id) ?? [];
          const primaryPhoneRow = ps.find((p) => p.is_primary) ?? ps[0];
          const primaryEmailRow = es.find((e) => e.is_primary) ?? es[0];
          const primary_phone =
            primaryPhoneRow?.phone ?? c.mobile_phone ?? c.office_phone ?? null;
          const primary_email = primaryEmailRow?.email ?? c.email ?? null;
          return {
            ...c,
            phones: ps,
            emails: es,
            primary_phone,
            primary_email,
          } as ProviderContactMethods;
        })
        .sort((a, b) =>
          (a.first_name ?? a.name ?? "").localeCompare(b.first_name ?? b.name ?? ""),
        );
    },
  });
}

export type ProviderContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  mobile_phone: string | null;
  office_phone: string | null;
  job_title: string | null;
};

export function providerContactsQuery(entityId: string) {
  return queryOptions({
    queryKey: ["provider_contacts", entityId],
    queryFn: async (): Promise<ProviderContactRow[]> => {
      // union of entity_id direct + contact_organizations join
      const [{ data: direct, error: e1 }, { data: linked, error: e2 }] = await Promise.all([
        supabase
          .from("contacts")
          .select("id,first_name,last_name,name,email,mobile_phone,office_phone,job_title")
          .eq("entity_id", entityId)
          .is("deleted_at", null)
          .eq("active", true),
        supabase
          .from("contact_organizations")
          .select(
            `contact:contacts(id,first_name,last_name,name,email,mobile_phone,office_phone,job_title,deleted_at,active)`,
          )
          .eq("organization_id", entityId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map<string, ProviderContactRow>();
      for (const c of (direct as any[]) ?? []) map.set(c.id, c);
      for (const row of (linked as any[]) ?? []) {
        const c = row.contact;
        if (!c || c.deleted_at || c.active === false) continue;
        if (!map.has(c.id)) map.set(c.id, c);
      }
      return Array.from(map.values()).sort((a, b) =>
        (a.first_name ?? a.name ?? "").localeCompare(b.first_name ?? b.name ?? ""),
      );
    },
  });
}

export function contactFirstName(c: {
  first_name?: string | null;
  name?: string | null;
} | null | undefined): string {
  if (!c) return "there";
  if (c.first_name) return c.first_name;
  if (c.name) return c.name.split(" ")[0];
  return "there";
}

export function contactDisplayName(c: {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
} | null | undefined): string {
  if (!c) return "Unnamed";
  const p = [c.first_name, c.last_name].filter(Boolean);
  if (p.length) return p.join(" ");
  return c.name ?? "Unnamed";
}

/**
 * Log a quick engagement (call / text / quick-start) with a single contact + provider.
 * Uses existing engagement_types by name; falls back to first available type.
 */
export async function logQuickEngagement(input: {
  typeName: "Phone Call" | "Email" | string;
  contactId: string;
  entityId: string;
  note?: string | null;
}): Promise<void> {
  const { data: types, error: te } = await supabase
    .from("engagement_types")
    .select("id,name")
    .eq("active", true);
  if (te) throw te;
  const list = (types as any[]) ?? [];
  const match =
    list.find((t) => t.name?.toLowerCase() === input.typeName.toLowerCase()) ??
    list.find((t) => /phone/i.test(t.name)) ??
    list[0];
  if (!match) throw new Error("No engagement types available.");

  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id;

  const { data: eng, error } = await supabase
    .from("engagements")
    .insert({
      engagement_type_id: match.id,
      occurred_at: new Date().toISOString(),
      note: input.note ?? null,
      created_by: userId,
    } as any)
    .select("id, org_id")
    .single();
  if (error) throw error;
  const engagementId = (eng as any).id as string;
  const orgId = (eng as any).org_id as string;

  await Promise.all([
    supabase
      .from("engagement_type_links")
      .insert({ engagement_id: engagementId, engagement_type_id: match.id, org_id: orgId } as any),
    supabase
      .from("engagement_people")
      .insert({ engagement_id: engagementId, contact_id: input.contactId, org_id: orgId } as any),
    supabase
      .from("engagement_organizations")
      .insert({ engagement_id: engagementId, entity_id: input.entityId, org_id: orgId } as any),
  ]);
}
