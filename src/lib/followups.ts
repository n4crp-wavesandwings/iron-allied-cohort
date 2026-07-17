import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];
export type FollowUpStatus = Database["public"]["Enums"]["follow_up_status"];

export const followUpsQueryOptions = (entityId: string) =>
  queryOptions({
    queryKey: ["follow_ups", entityId],
    queryFn: async (): Promise<FollowUpRow[]> => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("entity_id", entityId)
        .is("deleted_at", null)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export const openDueFollowUpsQueryOptions = queryOptions({
  queryKey: ["follow_ups", "today"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*, entity:entities(id,name,type), interaction:interactions(id,type)")
      .eq("status", "open")
      .is("deleted_at", null)
      .lte("due_date", todayISO())
      .order("due_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const recentInteractionsQueryOptions = queryOptions({
  queryKey: ["interactions", "recent"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("interactions")
      .select("*, entity:entities(id,name,type)")
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data ?? [];
  },
});

export function formatDueLabel(dueDate: string): { label: string; overdue: boolean } {
  const today = todayISO();
  const due = dueDate.slice(0, 10);
  const overdue = due < today;

  const dueD = new Date(due + "T00:00:00");
  const todayD = new Date(today + "T00:00:00");
  const diffDays = Math.round((dueD.getTime() - todayD.getTime()) / 86_400_000);

  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === -1) return { label: "Yesterday", overdue: true };
  const label = dueD.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { label, overdue };
}
