import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  regionsQuery, marketsQuery, districtsQuery, storesQuery,
  orgDistrictCoverageQuery, orgStoreCoverageQuery,
  contactDistrictCoverageQuery, contactStoreCoverageQuery,
} from "@/lib/locations";

type Mode = { kind: "entity"; entityId: string } | { kind: "contact"; contactId: string };

export function CoveragePanel({ mode }: { mode: Mode }) {
  const qc = useQueryClient();
  const { data: regions = [] } = useQuery(regionsQuery);
  const { data: markets = [] } = useQuery(marketsQuery);
  const { data: districts = [] } = useQuery(districtsQuery);
  const { data: stores = [] } = useQuery(storesQuery);

  const districtCovQuery = mode.kind === "entity" ? orgDistrictCoverageQuery(mode.entityId) : contactDistrictCoverageQuery(mode.contactId);
  const storeCovQuery = mode.kind === "entity" ? orgStoreCoverageQuery(mode.entityId) : contactStoreCoverageQuery(mode.contactId);
  const { data: dCov = [] } = useQuery(districtCovQuery);
  const { data: sCov = [] } = useQuery(storeCovQuery);

  const districtTable = mode.kind === "entity" ? "org_district_coverage" : "contact_district_coverage";
  const storeTable = mode.kind === "entity" ? "org_store_coverage" : "contact_store_coverage";
  const fkCol = mode.kind === "entity" ? "entity_id" : "contact_id";
  const fkVal = mode.kind === "entity" ? mode.entityId : mode.contactId;

  const covByDistrict = useMemo(() => new Map(dCov.map((c: any) => [c.district_id, c])), [dCov]);
  const storesByDistrict = useMemo(() => {
    const m = new Map<string, typeof stores>();
    for (const s of stores) { const arr = m.get(s.district_id) ?? []; arr.push(s); m.set(s.district_id, arr); }
    return m;
  }, [stores]);
  const coveredStoreIds = useMemo(() => new Set(sCov.map((c: any) => c.store_id)), [sCov]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: districtCovQuery.queryKey });
    qc.invalidateQueries({ queryKey: storeCovQuery.queryKey });
  };

  const toggleDistrict = useMutation({
    mutationFn: async (districtId: string) => {
      const existing = covByDistrict.get(districtId);
      if (existing) {
        // remove district coverage AND any store-coverage rows for that district
        const storeIds = (storesByDistrict.get(districtId) ?? []).map((s) => s.id);
        if (storeIds.length) await supabase.from(storeTable as any).delete().eq(fkCol, fkVal).in("store_id", storeIds);
        const { error } = await supabase.from(districtTable as any).delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(districtTable as any).insert({ [fkCol]: fkVal, district_id: districtId, scope: "whole" });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setScope = useMutation({
    mutationFn: async ({ districtId, scope }: { districtId: string; scope: "whole" | "selected" }) => {
      const existing = covByDistrict.get(districtId);
      if (!existing) return;
      if (scope === "whole") {
        // clear store coverage for this district
        const storeIds = (storesByDistrict.get(districtId) ?? []).map((s) => s.id);
        if (storeIds.length) await supabase.from(storeTable as any).delete().eq(fkCol, fkVal).in("store_id", storeIds);
      }
      const { error } = await supabase.from(districtTable as any).update({ scope }).eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStore = useMutation({
    mutationFn: async (storeId: string) => {
      if (coveredStoreIds.has(storeId)) {
        const { error } = await supabase.from(storeTable as any).delete().eq(fkCol, fkVal).eq("store_id", storeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(storeTable as any).insert({ [fkCol]: fkVal, store_id: storeId });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  // Derived Markets & Regions
  const districtMap = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const marketMap = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);

  const derivedMarketIds = new Set<string>();
  const derivedRegionIds = new Set<string>();
  for (const c of dCov as any[]) {
    const d = districtMap.get(c.district_id); if (!d) continue;
    const m = marketMap.get(d.market_id); if (!m) continue;
    derivedMarketIds.add(m.id); derivedRegionIds.add(m.region_id);
  }
  for (const c of sCov as any[]) {
    const s = stores.find((x) => x.id === c.store_id); if (!s) continue;
    const d = districtMap.get(s.district_id); if (!d) continue;
    const m = marketMap.get(d.market_id); if (!m) continue;
    derivedMarketIds.add(m.id); derivedRegionIds.add(m.region_id);
  }

  const groupedDistricts = useMemo(() => {
    const groups: { region: string; market: string; districts: typeof districts }[] = [];
    for (const m of markets) {
      const region = regions.find((r) => r.id === m.region_id);
      const marketDistricts = districts.filter((d) => d.market_id === m.id);
      if (marketDistricts.length) groups.push({ region: region?.name ?? "—", market: m.name, districts: marketDistricts });
    }
    return groups;
  }, [markets, regions, districts]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Coverage</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Covered Markets (derived)</div>
            <div className="flex flex-wrap gap-1">
              {[...derivedMarketIds].map((id) => <Badge key={id} variant="secondary">{marketMap.get(id)?.name}</Badge>)}
              {derivedMarketIds.size === 0 && <span className="text-muted-foreground">None</span>}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Covered Regions (derived)</div>
            <div className="flex flex-wrap gap-1">
              {[...derivedRegionIds].map((id) => <Badge key={id} variant="secondary">{regions.find((r) => r.id === id)?.name}</Badge>)}
              {derivedRegionIds.size === 0 && <span className="text-muted-foreground">None</span>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {groupedDistricts.map((g) => (
            <div key={g.market} className="border border-border rounded-md p-3">
              <div className="text-sm font-medium">{g.market} <span className="text-muted-foreground font-normal">· {g.region}</span></div>
              <div className="mt-2 space-y-2">
                {g.districts.map((d) => {
                  const cov = covByDistrict.get(d.id) as any;
                  const dStores = storesByDistrict.get(d.id) ?? [];
                  return (
                    <div key={d.id} className="border-t border-border pt-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id={`d-${d.id}`} checked={!!cov} onCheckedChange={() => toggleDistrict.mutate(d.id)} />
                        <Label htmlFor={`d-${d.id}`} className="cursor-pointer">District {d.name}</Label>
                      </div>
                      {cov && (
                        <div className="ml-6 mt-2 space-y-2">
                          <RadioGroup value={cov.scope} onValueChange={(v) => setScope.mutate({ districtId: d.id, scope: v as any })} className="flex gap-4">
                            <div className="flex items-center gap-2"><RadioGroupItem value="whole" id={`w-${d.id}`} /><Label htmlFor={`w-${d.id}`}>Whole District</Label></div>
                            <div className="flex items-center gap-2"><RadioGroupItem value="selected" id={`s-${d.id}`} /><Label htmlFor={`s-${d.id}`}>Selected Stores</Label></div>
                          </RadioGroup>
                          {cov.scope === "selected" && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {dStores.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox id={`st-${s.id}`} checked={coveredStoreIds.has(s.id)} onCheckedChange={() => toggleStore.mutate(s.id)} />
                                  <Label htmlFor={`st-${s.id}`} className="cursor-pointer">{s.store_number}{s.name ? ` — ${s.name}` : ""}</Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {groupedDistricts.length === 0 && <p className="text-sm text-muted-foreground">No districts configured yet. Create them from the Locations page.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
