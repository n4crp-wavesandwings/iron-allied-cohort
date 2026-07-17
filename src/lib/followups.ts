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
