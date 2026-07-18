import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProgramRow = {
  id: string;
  org_id: string;
  name: string;
  parent_program_id: string | null;
  sub_category: string | null;
  status: string;
  active: boolean | null;
  notes: string | null;
  description: string | null;
  sort_order: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramMerchantRow = {
  id: string;
  org_id: string;
  program_id: string;
  merchant_id: string;
  role: "Primary" | "Secondary";
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramWithParent = ProgramRow & {
  parent: { id: string; name: string } | null;
};

export const programsListQuery = queryOptions({
  queryKey: ["programs", "list"],
  queryFn: async (): Promise<ProgramWithParent[]> => {
    const { data, error } = await supabase
      .from("programs")
      .select("*, parent:parent_program_id(id, name)")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const programDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["programs", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*, parent:parent_program_id(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as (ProgramWithParent | null);
    },
  });

export type ProgramMerchantWithEntity = ProgramMerchantRow & {
  merchant: { id: string; name: string } | null;
};

export const programMerchantsQuery = (programId: string) =>
  queryOptions({
    queryKey: ["program-merchants", programId],
    queryFn: async (): Promise<ProgramMerchantWithEntity[]> => {
      const { data, error } = await supabase
        .from("program_merchants" as any)
        .select("*, merchant:merchant_id(id, name)")
        .eq("program_id", programId)
        .order("is_current", { ascending: false })
        .order("role", { ascending: true })
        .order("start_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

export const merchantEntitiesQuery = queryOptions({
  queryKey: ["entities", "merchants"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("entities")
      .select("id, name")
      .eq("type", "merchant")
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    return (data as { id: string; name: string }[]) ?? [];
  },
});
