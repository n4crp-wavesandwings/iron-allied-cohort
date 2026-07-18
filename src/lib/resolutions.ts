import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ResolutionRow = Database["public"]["Tables"]["customer_resolutions"]["Row"];
export type ResolutionRelationshipRow =
  Database["public"]["Tables"]["customer_resolution_relationships"]["Row"];
export type ResolutionPersonRow =
  Database["public"]["Tables"]["customer_resolution_people"]["Row"];
export type ResolutionTaskRow =
  Database["public"]["Tables"]["customer_resolution_tasks"]["Row"];
export type ResolutionHistoryRow =
  Database["public"]["Tables"]["customer_resolution_history"]["Row"];

export type CrPriority = Database["public"]["Enums"]["cr_priority"];
export type CrStatus = Database["public"]["Enums"]["cr_status"];
export type CrRelationshipRole = Database["public"]["Enums"]["cr_relationship_role"];
export type CrTaskOwnerType = Database["public"]["Enums"]["cr_task_owner_type"];
export type CrTaskStatus = Database["public"]["Enums"]["cr_task_status"];
export type CrEventType = Database["public"]["Enums"]["cr_event_type"];
export type CrSeverity = Database["public"]["Enums"]["cr_severity"];
export type CrResolutionType = Database["public"]["Enums"]["cr_resolution_type"];
export type CrEscalationLevel = Database["public"]["Enums"]["cr_escalation_level"];

export const CR_PRIORITIES: CrPriority[] = ["Low", "Normal", "High", "Urgent"];
export const CR_STATUSES: CrStatus[] = ["New", "In Progress", "Waiting", "Resolved", "Closed"];
export const CR_RELATIONSHIP_ROLES: CrRelationshipRole[] = ["Service Provider", "Store", "Other"];
export const CR_TASK_OWNER_TYPES: CrTaskOwnerType[] = [
  "Me",
  "Service Provider",
  "Store",
  "Associate",
  "Leader",
  "Other",
];
export const CR_TASK_STATUSES: CrTaskStatus[] = ["Open", "Waiting", "Complete"];

export const CR_SEVERITIES: CrSeverity[] = [
  "Customer Experience",
  "Safety",
  "Financial",
  "Installation",
  "Product",
  "Communication",
  "Other",
];
export const CR_RESOLUTION_TYPES: CrResolutionType[] = [
  "Installation",
  "Delivery",
  "Product",
  "Billing",
  "Service",
  "Other",
];
export const CR_ESCALATION_LEVELS: CrEscalationLevel[] = [
  "Store",
  "District",
  "Regional",
  "Corporate",
];

export function customerIdentifier(r: Pick<ResolutionRow, "customer_first_initial" | "customer_last_name">): string {
  const initial = r.customer_first_initial ?? "";
  const last = r.customer_last_name ?? "";
  if (!initial && !last) return "—";
  return `${initial}${initial ? "." : ""} ${last}`.trim();
}

export function priorityRank(p: CrPriority | null | undefined): number {
  if (!p) return 99;
  return { Urgent: 0, High: 1, Normal: 2, Low: 3 }[p];
}

export function priorityBadgeClass(p: CrPriority | null | undefined): string {
  switch (p) {
    case "Urgent":
      return "bg-destructive text-destructive-foreground";
    case "High":
      return "bg-orange-500 text-white";
    case "Normal":
      return "bg-secondary text-secondary-foreground";
    case "Low":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const resolutionsListQueryOptions = queryOptions({
  queryKey: ["resolutions", "list"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("customer_resolutions")
      .select(
        "*, category:resolution_categories(id,name), priority_lookup:resolution_priorities(id,name,sort_order,severity_color), status_lookup:resolution_statuses(id,name,sort_order,is_closed), provider:entities!customer_resolutions_service_provider_id_fkey(id,name), store:stores(id,store_number,name), relationships:customer_resolution_relationships(id,role,relationship_id,entity:entities(id,name,type)), tasks:customer_resolution_tasks(id,task,owner_name,owner_type,due_date,status,waiting_on)",
      )
      .is("deleted_at", null);
    if (error) throw error;
    return data ?? [];
  },
});


export const resolutionDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["resolutions", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolutions")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const resolutionRelationshipsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["resolutions", id, "relationships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolution_relationships")
        .select("*, entity:entities(id,name,type)")
        .eq("resolution_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

export const resolutionPeopleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["resolutions", id, "people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolution_people")
        .select("*")
        .eq("resolution_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const resolutionTasksQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["resolutions", id, "tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolution_tasks")
        .select("*")
        .eq("resolution_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const resolutionHistoryQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["resolutions", id, "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_resolution_history")
        .select("*")
        .eq("resolution_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export async function logHistory(
  resolutionId: string,
  eventType: CrEventType,
  eventDescription: string,
  previousValue?: string | null,
  newValue?: string | null,
) {
  const { error } = await supabase.from("customer_resolution_history").insert({
    resolution_id: resolutionId,
    event_type: eventType,
    event_description: eventDescription,
    previous_value: previousValue ?? null,
    new_value: newValue ?? null,
  });
  if (error) throw error;
}

export const todayResolutionsQueryOptions = queryOptions({
  queryKey: ["resolutions", "today"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("customer_resolutions")
      .select("*, tasks:customer_resolution_tasks(id,task,owner_name,owner_type,due_date,status)")
      .is("deleted_at", null)
      .not("status", "in", "(Resolved,Closed)");
    if (error) throw error;
    return data ?? [];
  },
});
