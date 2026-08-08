import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type JobSiteVisitType = { id: string; name: string; sort_order: number; active: boolean };
export type JobSiteChecklistItem = { id: string; name: string; group: string; sort_order: number; active: boolean };
export type JobSiteOpportunityItem = { id: string; name: string; sort_order: number; active: boolean };

export const jobSiteVisitTypesQuery = queryOptions({
  queryKey: ["job_site_visit_types"],
  queryFn: async (): Promise<JobSiteVisitType[]> => {
    const { data, error } = await supabase
      .from("job_site_visit_types")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const jobSiteChecklistItemsQuery = queryOptions({
  queryKey: ["job_site_checklist_items"],
  queryFn: async (): Promise<JobSiteChecklistItem[]> => {
    const { data, error } = await supabase
      .from("job_site_checklist_items")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const jobSiteOpportunityItemsQuery = queryOptions({
  queryKey: ["job_site_opportunity_items"],
  queryFn: async (): Promise<JobSiteOpportunityItem[]> => {
    const { data, error } = await supabase
      .from("job_site_opportunity_items")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export type JobSiteVisitDetail = {
  id: string;
  engagement_id: string;
  visit_type_id: string | null;
  program_id: string | null;
  service_provider_id: string | null;
  store_id: string | null;
  customer_first_initial: string | null;
  customer_last_name: string | null;
  po_number: string | null;
  order_number: string | null;
  visit_notes: string | null;
  visit_type: { id: string; name: string } | null;
  program: { id: string; name: string } | null;
  service_provider: { id: string; name: string } | null;
  store: { id: string; store_number: string; name: string | null } | null;
  checks: { checklist_item_id: string; checked: boolean; item: { id: string; name: string; group: string } | null }[];
  opportunities: { opportunity_item_id: string; note: string | null; item: { id: string; name: string } | null }[];
};

export const jobSiteVisitByEngagementQuery = (engagementId: string) =>
  queryOptions({
    queryKey: ["job_site_visit", "engagement", engagementId],
    queryFn: async (): Promise<JobSiteVisitDetail | null> => {
      const { data, error } = await supabase
        .from("job_site_visits")
        .select(`
          id, engagement_id, visit_type_id, program_id, service_provider_id, store_id,
          customer_first_initial, customer_last_name, po_number, order_number, visit_notes,
          visit_type:job_site_visit_types(id,name),
          program:programs(id,name),
          service_provider:entities(id,name),
          store:stores(id,store_number,name),
          checks:job_site_visit_checks(checklist_item_id, checked, item:job_site_checklist_items(id,name,"group")),
          opportunities:job_site_visit_opportunities(opportunity_item_id, note, item:job_site_opportunity_items(id,name))
        `)
        .eq("engagement_id", engagementId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

// ---------------------------------------------------------------------------
// Job-Site Visit — list/summary reads
// ---------------------------------------------------------------------------

export type JobSiteVisitSummary = {
  id: string;
  engagement_id: string;
  store_id: string | null;
  service_provider_id: string | null;
  program_id: string | null;
  visit_type_id: string | null;
  customer_first_initial: string | null;
  customer_last_name: string | null;
  po_number: string | null;
  order_number: string | null;
  visit_notes: string | null;
  occurred_at: string | null;
  engagement: { id: string; occurred_at: string } | null;
  store: { id: string; store_number: string; name: string | null } | null;
  service_provider: { id: string; name: string } | null;
  program: { id: string; name: string } | null;
  visit_type: { id: string; name: string } | null;
  opportunity_count: number;
};

const VISIT_SUMMARY_SELECT = `
  id, engagement_id, store_id, service_provider_id, program_id, visit_type_id,
  customer_first_initial, customer_last_name, po_number, order_number, visit_notes,
  engagement:engagements(id,occurred_at),
  store:stores(id,store_number,name),
  service_provider:entities(id,name),
  program:programs(id,name),
  visit_type:job_site_visit_types(id,name),
  opportunities:job_site_visit_opportunities(count)
`;

function mapVisitSummary(row: any): JobSiteVisitSummary {
  const opps = row.opportunities;
  const opportunity_count = Array.isArray(opps)
    ? (opps[0]?.count ?? 0)
    : (opps?.count ?? 0);
  return {
    id: row.id,
    engagement_id: row.engagement_id,
    store_id: row.store_id ?? null,
    service_provider_id: row.service_provider_id ?? null,
    program_id: row.program_id ?? null,
    visit_type_id: row.visit_type_id ?? null,
    customer_first_initial: row.customer_first_initial ?? null,
    customer_last_name: row.customer_last_name ?? null,
    po_number: row.po_number ?? null,
    order_number: row.order_number ?? null,
    visit_notes: row.visit_notes ?? null,
    occurred_at: row.engagement?.occurred_at ?? null,
    engagement: row.engagement ?? null,
    store: row.store ?? null,
    service_provider: row.service_provider ?? null,
    program: row.program ?? null,
    visit_type: row.visit_type ?? null,
    opportunity_count,
  };
}

function sortByOccurredDesc(rows: JobSiteVisitSummary[]): JobSiteVisitSummary[] {
  return rows.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
}

async function fetchVisitSummaries(
  filter?: { column: "store_id" | "service_provider_id" | "program_id"; value: string },
  limit?: number,
): Promise<JobSiteVisitSummary[]> {
  let q = supabase.from("job_site_visits").select(VISIT_SUMMARY_SELECT).is("deleted_at", null);
  if (filter) q = q.eq(filter.column, filter.value);
  const { data, error } = await q;
  if (error) throw error;
  const rows = sortByOccurredDesc(((data as any[]) ?? []).map(mapVisitSummary));
  return limit ? rows.slice(0, limit) : rows;
}

export const recentJobSiteVisitsQuery = queryOptions({
  queryKey: ["job_site_visits", "recent"],
  queryFn: () => fetchVisitSummaries(undefined, 10),
});

export const jobSiteVisitsByProviderQuery = (entityId: string) =>
  queryOptions({
    queryKey: ["job_site_visits", "provider", entityId],
    queryFn: () => fetchVisitSummaries({ column: "service_provider_id", value: entityId }),
    enabled: !!entityId,
  });

export const jobSiteVisitsByStoreQuery = (storeId: string) =>
  queryOptions({
    queryKey: ["job_site_visits", "store", storeId],
    queryFn: () => fetchVisitSummaries({ column: "store_id", value: storeId }),
    enabled: !!storeId,
  });

export const jobSiteVisitsByProgramQuery = (programId: string) =>
  queryOptions({
    queryKey: ["job_site_visits", "program", programId],
    queryFn: () => fetchVisitSummaries({ column: "program_id", value: programId }),
    enabled: !!programId,
  });

export type StoreLastVisitRow = {
  store_id: string;
  store_number: string;
  name: string | null;
  last_visit_at: string | null;
  days_since: number | null;
};

/** One row per store with its most recent job-site visit. Never-visited stores sort first. */
export const lastVisitByStoreQuery = queryOptions({
  queryKey: ["job_site_visits", "last_by_store"],
  queryFn: async (): Promise<StoreLastVisitRow[]> => {
    const [{ data: stores, error: se }, { data: visits, error: ve }] = await Promise.all([
      supabase
        .from("stores")
        .select("id,store_number,name")
        .is("deleted_at", null)
        .order("store_number"),
      supabase
        .from("job_site_visits")
        .select("store_id, engagement:engagements(occurred_at)")
        .is("deleted_at", null)
        .not("store_id", "is", null),
    ]);
    if (se) throw se;
    if (ve) throw ve;

    const lastByStore = new Map<string, string>();
    for (const v of (visits as any[]) ?? []) {
      const ts = v.engagement?.occurred_at as string | undefined;
      if (!v.store_id || !ts) continue;
      const cur = lastByStore.get(v.store_id);
      if (!cur || ts > cur) lastByStore.set(v.store_id, ts);
    }

    const now = Date.now();
    const rows: StoreLastVisitRow[] = ((stores as any[]) ?? []).map((s) => {
      const last = lastByStore.get(s.id) ?? null;
      return {
        store_id: s.id,
        store_number: s.store_number,
        name: s.name ?? null,
        last_visit_at: last,
        days_since: last ? Math.floor((now - new Date(last).getTime()) / 86_400_000) : null,
      };
    });

    // Never visited first, then oldest visit first.
    rows.sort((a, b) => {
      if (!a.last_visit_at && !b.last_visit_at) return a.store_number.localeCompare(b.store_number);
      if (!a.last_visit_at) return -1;
      if (!b.last_visit_at) return 1;
      return a.last_visit_at.localeCompare(b.last_visit_at);
    });
    return rows;
  },
});

// ---------------------------------------------------------------------------
// Job-Site Visit — mutations
// ---------------------------------------------------------------------------

export type JobSiteVisitInput = {
  /** Client-generated UUID; upsert key. */
  id: string;
  engagement_id: string;
  store_id: string;
  service_provider_id: string;
  program_id: string;
  visit_type_id?: string | null;
  customer_first_initial?: string | null;
  customer_last_name?: string | null;
  po_number?: string | null;
  order_number?: string | null;
  visit_notes?: string | null;
};

export type JobSiteVisitRow = {
  id: string;
  org_id: string;
  engagement_id: string;
  store_id: string | null;
  service_provider_id: string | null;
  program_id: string | null;
  visit_type_id: string | null;
  customer_first_initial: string | null;
  customer_last_name: string | null;
  po_number: string | null;
  order_number: string | null;
  visit_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const nullable = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

/** Create or update a job-site visit. Store, provider and program are required. */
export async function upsertJobSiteVisit(visit: JobSiteVisitInput): Promise<JobSiteVisitRow> {
  if (!visit.id) throw new Error("A job-site visit id is required.");
  if (!visit.engagement_id) throw new Error("A job-site visit must belong to an engagement.");
  if (!visit.store_id) throw new Error("Store is required for a job-site visit.");
  if (!visit.service_provider_id) throw new Error("Service provider is required for a job-site visit.");
  if (!visit.program_id) throw new Error("Program is required for a job-site visit.");

  // org_id is inherited from the parent engagement (RLS scopes both to current_org_id()).
  const { data: eng, error: ee } = await supabase
    .from("engagements")
    .select("id, org_id")
    .eq("id", visit.engagement_id)
    .single();
  if (ee) throw ee;

  const { data: user } = await supabase.auth.getUser();

  const payload = {
    id: visit.id,
    org_id: (eng as any).org_id,
    engagement_id: visit.engagement_id,
    store_id: visit.store_id,
    service_provider_id: visit.service_provider_id,
    program_id: visit.program_id,
    visit_type_id: visit.visit_type_id ?? null,
    customer_first_initial: nullable(visit.customer_first_initial),
    customer_last_name: nullable(visit.customer_last_name),
    po_number: nullable(visit.po_number),
    order_number: nullable(visit.order_number),
    visit_notes: nullable(visit.visit_notes),
    created_by: user.user?.id ?? null,
    deleted_at: null,
  };

  const { data, error } = await supabase
    .from("job_site_visits")
    .upsert(payload as any, { onConflict: "id" })
    .select(
      "id, org_id, engagement_id, store_id, service_provider_id, program_id, visit_type_id, customer_first_initial, customer_last_name, po_number, order_number, visit_notes, created_at, updated_at, deleted_at",
    )
    .single();
  if (error) throw error;
  return data as any as JobSiteVisitRow;
}

export type JobSiteVisitCheckInput = { checklist_item_id: string; checked: boolean };
export type JobSiteVisitOpportunityInput = { opportunity_item_id: string; note?: string | null };

/**
 * Replace-all the checklist answers for a visit.
 * Runs server-side in a single transaction so a partial failure cannot leave
 * the visit with no checklist.
 */
export async function setJobSiteVisitChecks(
  visitId: string,
  checks: JobSiteVisitCheckInput[],
): Promise<void> {
  const { error } = await (supabase as any).rpc("set_job_site_visit_checks", {
    p_visit_id: visitId,
    p_checks: checks.map((c) => ({
      checklist_item_id: c.checklist_item_id,
      checked: !!c.checked,
    })),
  });
  if (error) throw error;
}

/** Replace-all the identified opportunities for a visit, in one transaction. */
export async function setJobSiteVisitOpportunities(
  visitId: string,
  opportunities: JobSiteVisitOpportunityInput[],
): Promise<void> {
  const { error } = await (supabase as any).rpc("set_job_site_visit_opportunities", {
    p_visit_id: visitId,
    p_opportunities: opportunities.map((o) => ({
      opportunity_item_id: o.opportunity_item_id,
      note: nullable(o.note),
    })),
  });
  if (error) throw error;
}

/** Soft delete only — job-site visits are never hard deleted. */
export async function softDeleteJobSiteVisit(id: string): Promise<void> {
  const { error } = await supabase
    .from("job_site_visits")
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw error;
}
