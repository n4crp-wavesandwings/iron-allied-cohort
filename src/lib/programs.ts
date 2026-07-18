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
  contact_id: string;
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
      return data as ProgramWithParent | null;
    },
  });

export type MerchantContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
};

export function contactLabel(c: MerchantContact | null | undefined): string {
  if (!c) return "—";
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return full || c.name || "—";
}

export type ProgramMerchantWithContact = ProgramMerchantRow & {
  contact: MerchantContact | null;
};

export const programMerchantsQuery = (programId: string) =>
  queryOptions({
    queryKey: ["program-merchants", programId],
    queryFn: async (): Promise<ProgramMerchantWithContact[]> => {
      const { data, error } = await supabase
        .from("program_merchants" as any)
        .select("*, contact:contact_id(id, first_name, last_name, name)")
        .eq("program_id", programId)
        .order("is_current", { ascending: false })
        .order("role", { ascending: true })
        .order("start_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

export const merchantContactsQuery = queryOptions({
  queryKey: ["contacts", "merchants"],
  queryFn: async (): Promise<MerchantContact[]> => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, name")
      .eq("is_merchant" as any, true)
      .is("deleted_at", null)
      .order("last_name", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const contactProgramMerchantsQuery = (contactId: string) =>
  queryOptions({
    queryKey: ["contact-program-merchants", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_merchants" as any)
        .select("*, program:program_id(id, name, status)")
        .eq("contact_id", contactId)
        .order("is_current", { ascending: false })
        .order("role", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
