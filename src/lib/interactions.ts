import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InteractionType = Database["public"]["Enums"]["interaction_type"];
export type InteractionRow = Database["public"]["Tables"]["interactions"]["Row"];

export const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "call", label: "Call" },
  { value: "visit", label: "Visit" },
  { value: "note", label: "Note" },
];

export function interactionTypeLabel(t: InteractionType): string {
  return INTERACTION_TYPES.find((i) => i.value === t)?.label ?? t;
}

export const interactionsQueryOptions = (entityId: string) =>
  queryOptions({
    queryKey: ["interactions", entityId],
    queryFn: async (): Promise<InteractionRow[]> => {
      const { data, error } = await supabase
        .from("interactions")
        .select("*")
        .eq("entity_id", entityId)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
