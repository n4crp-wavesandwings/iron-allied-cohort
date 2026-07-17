import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactCommMethod = Database["public"]["Enums"]["contact_comm_method"];
export type ContactRelationshipStrength =
  Database["public"]["Enums"]["contact_relationship_strength"];

export const PREFERRED_CONTACT_METHODS = [
  "Email",
  "Office Phone",
  "Mobile Phone",
] as const;
export type PreferredContactMethod = (typeof PREFERRED_CONTACT_METHODS)[number];

export const CONTACT_COMM_METHODS: ContactCommMethod[] = [
  "Email",
  "Office Phone",
  "Mobile Phone",
  "Teams",
  "LinkedIn",
  "In Person",
  "Other",
];

export const CONTACT_RELATIONSHIP_STRENGTHS: ContactRelationshipStrength[] = [
  "Weak",
  "Moderate",
  "Strong",
  "Critical",
];

export const contactsQueryOptions = (entityId: string) =>
  queryOptions({
    queryKey: ["contacts", entityId],
    queryFn: async (): Promise<ContactRow[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("entity_id", entityId)
        .is("deleted_at", null)
        .eq("active", true)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export function contactDisplayName(c: ContactRow): string {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return c.name ?? "Unnamed";
}
