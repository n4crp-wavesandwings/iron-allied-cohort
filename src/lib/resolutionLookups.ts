import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ResolutionCategoryRow =
  Database["public"]["Tables"]["resolution_categories"]["Row"];
export type ResolutionPriorityRow =
  Database["public"]["Tables"]["resolution_priorities"]["Row"];
export type ResolutionStatusRow =
  Database["public"]["Tables"]["resolution_statuses"]["Row"];
export type ResolutionStatusHistoryRow =
  Database["public"]["Tables"]["resolution_status_history"]["Row"];
export type ResolutionEngagementRow =
  Database["public"]["Tables"]["resolution_engagements"]["Row"];

export const resolutionCategoriesQuery = queryOptions({
  queryKey: ["resolution_categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("resolution_categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const resolutionPrioritiesQuery = queryOptions({
  queryKey: ["resolution_priorities"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("resolution_priorities")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const resolutionStatusesQuery = queryOptions({
  queryKey: ["resolution_statuses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("resolution_statuses")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const resolutionStatusHistoryQuery = (resolutionId: string) =>
  queryOptions({
    queryKey: ["resolutions", resolutionId, "status_history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resolution_status_history")
        .select(
          "*, from_status:resolution_statuses!resolution_status_history_from_status_id_fkey(id,name), to_status:resolution_statuses!resolution_status_history_to_status_id_fkey(id,name)",
        )
        .eq("customer_resolution_id", resolutionId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const resolutionEngagementsQuery = (resolutionId: string) =>
  queryOptions({
    queryKey: ["resolutions", resolutionId, "engagements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resolution_engagements")
        .select(
          "*, engagement:engagements(id, occurred_at, note, engagement_type:engagement_types(name))",
        )
        .eq("customer_resolution_id", resolutionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const openResolutionsByStoreQuery = (storeId: string) =>
  queryOptions({
    queryKey: ["resolutions", "by_store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolutions")
        .select(
          "id, title, opened_at, general_issue, customer_first_initial, customer_last_name, priority:resolution_priorities(name, severity_color, sort_order), status:resolution_statuses(name, is_closed)",
        )
        .eq("store_id", storeId)
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []).filter((r: any) => !r.status?.is_closed);
    },
  });

export const openResolutionsByProviderQuery = (providerEntityId: string) =>
  queryOptions({
    queryKey: ["resolutions", "by_provider", providerEntityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolutions")
        .select(
          "id, title, opened_at, general_issue, customer_first_initial, customer_last_name, priority:resolution_priorities(name, severity_color, sort_order), status:resolution_statuses(name, is_closed)",
        )
        .eq("service_provider_id", providerEntityId)
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []).filter((r: any) => !r.status?.is_closed);
    },
  });
