import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EntityType = Database["public"]["Enums"]["entity_type"];
export type EntityRow = Database["public"]["Tables"]["entities"]["Row"];
export type EntityCommMethod = Database["public"]["Enums"]["entity_comm_method"];

// Program and Merchant are first-class entities of their own.
// - Programs live in `programs`.
// - Merchants are contacts with is_merchant = true.
// Numbered stores live in `stores` (location hierarchy) and are managed under /locations,
// not as generic-company relationship records.
export const RELATIONSHIP_TYPES: { value: EntityType; label: string }[] = [
  { value: "provider", label: "Provider" },
  { value: "internal", label: "Internal" },
];

export const STATUS_OPTIONS = ["Active", "Inactive", "Prospect", "Archived"] as const;
export type StatusOption = (typeof STATUS_OPTIONS)[number];

export const ENTITY_COMM_METHODS: EntityCommMethod[] = [
  "Email",
  "Phone",
  "Text",
  "In Person",
  "Other",
];

export function typeLabel(t: EntityType): string {
  return RELATIONSHIP_TYPES.find((r) => r.value === t)?.label ?? t;
}

export const relationshipsQueryOptions = (type: EntityType | "all") =>
  queryOptions({
    queryKey: ["relationships", type],
    queryFn: async (): Promise<EntityRow[]> => {
      let q = supabase
        .from("entities")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (type !== "all") q = q.eq("type", type);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const relationshipQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["relationships", "detail", id],
    queryFn: async (): Promise<EntityRow | null> => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
