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
  customer_first_initial: string | null;
  customer_last_name: string | null;
  po_number: string | null;
  order_number: string | null;
  visit_notes: string | null;
  visit_type: { id: string; name: string } | null;
  program: { id: string; name: string } | null;
  service_provider: { id: string; name: string } | null;
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
          id, engagement_id, visit_type_id, program_id, service_provider_id,
          customer_first_initial, customer_last_name, po_number, order_number, visit_notes,
          visit_type:job_site_visit_types(id,name),
          program:programs(id,name),
          service_provider:entities(id,name),
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
