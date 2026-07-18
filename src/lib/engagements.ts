import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EngagementType = { id: string; name: string; icon: string | null; sort_order: number; active: boolean };
export type EngagementOutcome = { id: string; name: string; sort_order: number; active: boolean };
export type EngagementTag = { id: string; name: string; group: string | null; sort_order: number; active: boolean; is_custom?: boolean };
export type Program = { id: string; name: string; description: string | null; active: boolean; sort_order: number };

export type EngagementRow = {
  id: string;
  org_id: string;
  engagement_type_id: string | null;
  occurred_at: string;
  outcome_id: string | null;
  store_id: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
};

export const engagementTypesQuery = queryOptions({
  queryKey: ["engagement_types"],
  queryFn: async (): Promise<EngagementType[]> => {
    const { data, error } = await supabase
      .from("engagement_types")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const engagementOutcomesQuery = queryOptions({
  queryKey: ["engagement_outcomes"],
  queryFn: async (): Promise<EngagementOutcome[]> => {
    const { data, error } = await supabase
      .from("engagement_outcomes")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const engagementTagsQuery = queryOptions({
  queryKey: ["engagement_tags"],
  queryFn: async (): Promise<EngagementTag[]> => {
    const { data, error } = await supabase
      .from("engagement_tags")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const programsQuery = queryOptions({
  queryKey: ["programs"],
  queryFn: async (): Promise<Program[]> => {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .eq("active", true)
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export type EngagementListItem = EngagementRow & {
  type: { id: string; name: string } | null;
  types: { engagement_type_id: string; type: { id: string; name: string } | null }[];
  outcome: { id: string; name: string } | null;
  store: { id: string; store_number: string; name: string | null } | null;
  people: { contact_id: string; contact: { id: string; first_name: string | null; last_name: string | null; name: string | null } | null }[];
  organizations: { entity_id: string; entity: { id: string; name: string } | null }[];
  programs: { program_id: string; program: { id: string; name: string } | null }[];
  stores: { store_id: string; store: { id: string; store_number: string; name: string | null } | null }[];
  tags: { tag_id: string; tag: { id: string; name: string; group: string | null; is_custom?: boolean } | null }[];
  follow_ups: { id: string; title: string; due_date: string; status: string }[];
  job_site_visit: { id: string; visit_type: { id: string; name: string } | null } | null;
};

const engagementSelect = `
  *,
  type:engagement_types(id,name),
  types:engagement_type_links(engagement_type_id, type:engagement_types(id,name)),
  outcome:engagement_outcomes(id,name),
  store:stores(id,store_number,name),
  people:engagement_people(contact_id, contact:contacts(id,first_name,last_name,name)),
  organizations:engagement_organizations(entity_id, entity:entities(id,name)),
  programs:engagement_programs(program_id, program:programs(id,name)),
  stores:engagement_stores(store_id, store:stores(id,store_number,name)),
  tags:engagement_tag_links(tag_id, tag:engagement_tags(id,name,"group",is_custom)),
  follow_ups(id,title,due_date,status),
  job_site_visit:job_site_visits(id, visit_type:job_site_visit_types(id,name))
`;

const engagementSelect = `
  *,
  type:engagement_types(id,name),
  types:engagement_type_links(engagement_type_id, type:engagement_types(id,name)),
  outcome:engagement_outcomes(id,name),
  store:stores(id,store_number,name),
  people:engagement_people(contact_id, contact:contacts(id,first_name,last_name,name)),
  organizations:engagement_organizations(entity_id, entity:entities(id,name)),
  programs:engagement_programs(program_id, program:programs(id,name)),
  stores:engagement_stores(store_id, store:stores(id,store_number,name)),
  tags:engagement_tag_links(tag_id, tag:engagement_tags(id,name,"group",is_custom)),
  follow_ups(id,title,due_date,status)
`;

export const recentEngagementsQuery = queryOptions({
  queryKey: ["engagements", "recent"],
  queryFn: async (): Promise<EngagementListItem[]> => {
    const { data, error } = await supabase
      .from("engagements")
      .select(engagementSelect)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const engagementDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["engagement", id],
    queryFn: async (): Promise<EngagementListItem | null> => {
      const { data, error } = await supabase
        .from("engagements")
        .select(engagementSelect)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

export const engagementsByStoreQuery = (storeId: string) =>
  queryOptions({
    queryKey: ["engagements", "store", storeId],
    queryFn: async (): Promise<EngagementListItem[]> => {
      // engagements where store is primary OR linked via engagement_stores
      const { data: primary, error: e1 } = await supabase
        .from("engagements")
        .select(engagementSelect)
        .is("deleted_at", null)
        .eq("store_id", storeId);
      if (e1) throw e1;
      const { data: linked, error: e2 } = await supabase
        .from("engagement_stores")
        .select(`engagement:engagements(${engagementSelect})`)
        .eq("store_id", storeId);
      if (e2) throw e2;
      const linkedItems = ((linked as any[]) ?? []).map((r) => r.engagement).filter(Boolean);
      const merged = [...((primary as any[]) ?? []), ...linkedItems];
      const seen = new Set<string>();
      const uniq = merged.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
      uniq.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      return uniq;
    },
  });

export const engagementsByContactQuery = (contactId: string) =>
  queryOptions({
    queryKey: ["engagements", "contact", contactId],
    queryFn: async (): Promise<EngagementListItem[]> => {
      const { data, error } = await supabase
        .from("engagement_people")
        .select(`engagement:engagements(${engagementSelect})`)
        .eq("contact_id", contactId);
      if (error) throw error;
      const items = ((data as any[]) ?? [])
        .map((r) => r.engagement)
        .filter((e: any) => e && !e.deleted_at);
      items.sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      return items;
    },
  });

export const engagementsByEntityQuery = (entityId: string) =>
  queryOptions({
    queryKey: ["engagements", "entity", entityId],
    queryFn: async (): Promise<EngagementListItem[]> => {
      const { data, error } = await supabase
        .from("engagement_organizations")
        .select(`engagement:engagements(${engagementSelect})`)
        .eq("entity_id", entityId);
      if (error) throw error;
      const items = ((data as any[]) ?? [])
        .map((r) => r.engagement)
        .filter((e: any) => e && !e.deleted_at);
      items.sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      return items;
    },
  });

export function contactLabel(c: { first_name?: string | null; last_name?: string | null; name?: string | null } | null | undefined): string {
  if (!c) return "";
  const parts = [c.first_name, c.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return c.name ?? "Unnamed";
}

export function engagementTypeLabel(e: {
  types?: { type: { id: string; name: string } | null }[];
  type?: { id: string; name: string } | null;
}): string {
  const names = (e.types ?? []).map((t) => t.type?.name).filter(Boolean) as string[];
  if (names.length) return names.join(" + ");
  return e.type?.name ?? "Engagement";
}
