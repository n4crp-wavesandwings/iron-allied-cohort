import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LocationStatus = "Active" | "Inactive";
export type CoverageScope = "whole" | "selected";

export interface Region { id: string; name: string; code: string | null; status: LocationStatus; notes: string | null; }
export interface Market { id: string; name: string; code: string | null; region_id: string; status: LocationStatus; notes: string | null; }
export interface District { id: string; name: string; market_id: string; leader_contact_id: string | null; status: LocationStatus; notes: string | null; }
export interface Store { id: string; store_number: string; name: string | null; district_id: string; city: string | null; state: string | null; main_phone: string | null; status: LocationStatus; notes: string | null; }

const from = (t: string) => supabase.from(t as any);

export const regionsQuery = queryOptions({
  queryKey: ["regions"],
  queryFn: async (): Promise<Region[]> => {
    const { data, error } = await from("regions").select("*").is("deleted_at", null).order("name");
    if (error) throw error; return (data as any) ?? [];
  },
});

export const marketsQuery = queryOptions({
  queryKey: ["markets"],
  queryFn: async (): Promise<Market[]> => {
    const { data, error } = await from("markets").select("*").is("deleted_at", null).order("name");
    if (error) throw error; return (data as any) ?? [];
  },
});

export const districtsQuery = queryOptions({
  queryKey: ["districts"],
  queryFn: async (): Promise<District[]> => {
    const { data, error } = await from("districts").select("*").is("deleted_at", null).order("name");
    if (error) throw error; return (data as any) ?? [];
  },
});

export const storesQuery = queryOptions({
  queryKey: ["stores"],
  queryFn: async (): Promise<Store[]> => {
    const { data, error } = await from("stores").select("*").is("deleted_at", null).order("store_number");
    if (error) throw error; return (data as any) ?? [];
  },
});

export const organizationTypesQuery = queryOptions({
  queryKey: ["organization_types"],
  queryFn: async (): Promise<{ id: string; name: string; active: boolean }[]> => {
    const { data, error } = await from("organization_types").select("*").eq("active", true).order("name");
    if (error) throw error; return (data as any) ?? [];
  },
});

export function orgDistrictCoverageQuery(entityId: string) {
  return queryOptions({
    queryKey: ["org_district_coverage", entityId],
    queryFn: async () => {
      const { data, error } = await from("org_district_coverage").select("*").eq("entity_id", entityId);
      if (error) throw error; return (data as any[]) ?? [];
    },
  });
}
export function orgStoreCoverageQuery(entityId: string) {
  return queryOptions({
    queryKey: ["org_store_coverage", entityId],
    queryFn: async () => {
      const { data, error } = await from("org_store_coverage").select("*").eq("entity_id", entityId);
      if (error) throw error; return (data as any[]) ?? [];
    },
  });
}
export function contactDistrictCoverageQuery(contactId: string) {
  return queryOptions({
    queryKey: ["contact_district_coverage", contactId],
    queryFn: async () => {
      const { data, error } = await from("contact_district_coverage").select("*").eq("contact_id", contactId);
      if (error) throw error; return (data as any[]) ?? [];
    },
  });
}
export function contactStoreCoverageQuery(contactId: string) {
  return queryOptions({
    queryKey: ["contact_store_coverage", contactId],
    queryFn: async () => {
      const { data, error } = await from("contact_store_coverage").select("*").eq("contact_id", contactId);
      if (error) throw error; return (data as any[]) ?? [];
    },
  });
}

export function storeLabel(s: Store, district?: District | null): string {
  const parts = [`Store ${s.store_number}`];
  if (s.name || s.city) parts.push(s.name ?? s.city ?? "");
  if (district) parts.push(`District ${district.name}`);
  return parts.filter(Boolean).join(" — ");
}
