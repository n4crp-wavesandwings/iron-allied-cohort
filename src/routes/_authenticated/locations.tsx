import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoresQuery } from "@/lib/me";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Upload } from "lucide-react";
import {
  regionsQuery, marketsQuery, districtsQuery, storesQuery,
  type Region, type Market, type District, type Store,
} from "@/lib/locations";
import { PersonField, type PersonValue } from "@/components/people/PersonField";

export const Route = createFileRoute("/_authenticated/locations")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; mine?: 1 } => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    mine: s.mine ? 1 : undefined,
  }),
  component: LocationsPage,
});

type Level = "region" | "market" | "district" | "store";

function LocationsPage() {
  const search = Route.useSearch();
  const initialTab = search.tab === "stores" ? "stores" : search.tab === "markets" ? "markets" : search.tab === "districts" ? "districts" : "regions";
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground">Region → Market → District → Store hierarchy. All records are editable and re-parentable.</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/stores/import"><Upload className="h-4 w-4 mr-1" />Import Stores</Link>
        </Button>
      </div>
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="districts">Districts</TabsTrigger>
          <TabsTrigger value="stores">Stores</TabsTrigger>
        </TabsList>
        <TabsContent value="regions"><RegionsTab /></TabsContent>
        <TabsContent value="markets"><MarketsTab /></TabsContent>
        <TabsContent value="districts"><DistrictsTab /></TabsContent>
        <TabsContent value="stores"><StoresTab initialMine={search.mine === 1} /></TabsContent>
      </Tabs>
    </div>
  );

}

function useCrud(table: string, invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string; values: any; deleted?: boolean }) => {
      if (payload.id && payload.deleted) {
        const { error } = await supabase.from(table as any).update({ status: "Inactive" }).eq("id", payload.id);
        if (error) throw error; return;
      }
      if (payload.id) {
        const { error } = await supabase.from(table as any).update(payload.values).eq("id", payload.id);
        if (error) throw error; return;
      }
      const { error } = await supabase.from(table as any).insert(payload.values);
      if (error) throw error;
    },
    onSuccess: () => { invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

function RegionsTab() {
  const { data: regions = [] } = useQuery(regionsQuery);
  const mut = useCrud("regions", ["regions"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Regions</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus className="h-4 w-4" /> New Region</Button>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left"><tr><th className="py-2">Name</th><th>Code</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2 font-medium">{r.name}</td><td>{r.code ?? "—"}</td><td>{r.status}</td>
                <td className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {regions.length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No regions yet.</td></tr>}
          </tbody>
        </table>
      </CardContent>
      <NodeDialog open={open} onOpenChange={setOpen} level="region" record={editing}
        onSave={(v) => mut.mutate({ id: editing?.id, values: v }, { onSuccess: () => setOpen(false) })} />
    </Card>
  );
}

function MarketsTab() {
  const { data: regions = [] } = useQuery(regionsQuery);
  const { data: markets = [] } = useQuery(marketsQuery);
  const mut = useCrud("markets", ["markets"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Market | null>(null);
  const regionMap = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Markets</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus className="h-4 w-4" /> New Market</Button>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left"><tr><th className="py-2">Name</th><th>Region</th><th>Code</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="py-2 font-medium">{m.name}</td><td>{regionMap.get(m.region_id) ?? "—"}</td><td>{m.code ?? "—"}</td><td>{m.status}</td>
                <td className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {markets.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground">No markets yet.</td></tr>}
          </tbody>
        </table>
      </CardContent>
      <NodeDialog open={open} onOpenChange={setOpen} level="market" record={editing}
        onSave={(v) => mut.mutate({ id: editing?.id, values: v }, { onSuccess: () => setOpen(false) })} />
    </Card>
  );
}

function DistrictsTab() {
  const { data: markets = [] } = useQuery(marketsQuery);
  const { data: regions = [] } = useQuery(regionsQuery);
  const { data: districts = [] } = useQuery(districtsQuery);
  const mut = useCrud("districts", ["districts"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<District | null>(null);
  const marketMap = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);
  const regionMap = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Districts</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus className="h-4 w-4" /> New District</Button>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left"><tr><th className="py-2">District</th><th>Market</th><th>Region</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {districts.map((d) => {
              const m = marketMap.get(d.market_id);
              return (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td>{m?.name ?? "—"}</td>
                  <td>{m ? regionMap.get(m.region_id) ?? "—" : "—"}</td>
                  <td>{d.status}</td>
                  <td className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></td>
                </tr>
              );
            })}
            {districts.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground">No districts yet.</td></tr>}
          </tbody>
        </table>
      </CardContent>
      <NodeDialog open={open} onOpenChange={setOpen} level="district" record={editing}
        onSave={(v) => mut.mutate({ id: editing?.id, values: v }, { onSuccess: () => setOpen(false) })} />
    </Card>
  );
}

function StoresTab({ initialMine = false }: { initialMine?: boolean }) {
  const { data: stores = [] } = useQuery(storesQuery);
  const { data: myStores = [] } = useQuery(myStoresQuery);
  const { data: districts = [] } = useQuery(districtsQuery);
  const { data: markets = [] } = useQuery(marketsQuery);
  const { data: regions = [] } = useQuery(regionsQuery);
  const mut = useCrud("stores", ["stores"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState<boolean>(initialMine);
  useEffect(() => { setMine(initialMine); }, [initialMine]);
  const districtMap = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const marketMap = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);
  const regionMap = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);
  const myIds = useMemo(() => new Set(myStores.map((s) => s.id)), [myStores]);

  const base = mine ? stores.filter((s) => myIds.has(s.id)) : stores;
  const filtered = base.filter((s) =>
    !search || s.store_number.includes(search) || (s.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Group by district when in "My Stores" mode
  const groups = useMemo(() => {
    if (!mine) return null;
    const m = new Map<string, { district: string; stores: typeof filtered }>();
    for (const s of filtered) {
      const d = districtMap.get(s.district_id);
      const key = d?.name ?? "—";
      if (!m.has(key)) m.set(key, { district: key, stores: [] });
      m.get(key)!.stores.push(s);
    }
    return Array.from(m.values()).sort((a, b) => a.district.localeCompare(b.district));
  }, [mine, filtered, districtMap]);

  const telHref = (p: string | null) => (p ? `tel:${p.replace(/[^\d+]/g, "")}` : undefined);
  const mapHref = (s: Store) => {
    const parts = [(s as any).address, s.city, s.state, (s as any).zip].filter(Boolean).join(", ");
    if (!parts) return undefined;
    return `https://maps.google.com/?q=${encodeURIComponent(parts)}`;
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Stores</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setMine(false)}
                className={`px-3 py-1.5 text-xs ${!mine ? "bg-accent font-medium" : "text-muted-foreground"}`}
              >All Stores</button>
              <button
                type="button"
                onClick={() => setMine(true)}
                className={`px-3 py-1.5 text-xs ${mine ? "bg-accent font-medium" : "text-muted-foreground"}`}
              >My Stores{myStores.length ? ` (${myStores.length})` : ""}</button>
            </div>
            <Input placeholder="Search by number or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus className="h-4 w-4" /> New Store</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mine ? (
          groups && groups.length > 0 ? (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.district}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    District {g.district}
                  </div>
                  <ul className="divide-y rounded-md border">
                    {g.stores.map((s) => {
                      const href = mapHref(s as any);
                      const tel = telHref(s.main_phone);
                      return (
                        <li key={s.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{s.store_number}</span>
                              <span className="truncate">{s.name ?? ""}</span>
                            </div>
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-xs text-primary underline">
                                {[(s as any).address, s.city, s.state, (s as any).zip].filter(Boolean).join(", ")}
                              </a>
                            ) : (
                              <div className="text-xs text-muted-foreground">{s.city ?? "—"}</div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {tel && (
                              <Button asChild size="sm" variant="outline" className="h-10">
                                <a href={tel}>Call</a>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">No stores match your personal coverage yet.</p>
          )
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left"><tr><th className="py-2">Store #</th><th>Name</th><th>District</th><th>Market</th><th>Region</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => {
                const d = districtMap.get(s.district_id);
                const m = d ? marketMap.get(d.market_id) : null;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-medium">{s.store_number}</td>
                    <td>{s.name ?? "—"}</td>
                    <td>{d?.name ?? "—"}</td>
                    <td>{m?.name ?? "—"}</td>
                    <td>{m ? regionMap.get(m.region_id) ?? "—" : "—"}</td>
                    <td>{s.status}</td>
                    <td className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No stores.</td></tr>}
            </tbody>
          </table>
        )}
      </CardContent>
      <NodeDialog open={open} onOpenChange={setOpen} level="store" record={editing}
        onSave={(v) => mut.mutate({ id: editing?.id, values: v }, { onSuccess: () => setOpen(false) })} />
    </Card>
  );
}

function NodeDialog({ open, onOpenChange, level, record, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; level: Level; record: any; onSave: (v: any) => void;
}) {
  const { data: regions = [] } = useQuery(regionsQuery);
  const { data: markets = [] } = useQuery(marketsQuery);
  const { data: districts = [] } = useQuery(districtsQuery);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [storeNumber, setStoreNumber] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [notes, setNotes] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [mainPhone, setMainPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [storeManager, setStoreManager] = useState("");
  const [storeManagerPerson, setStoreManagerPerson] = useState<PersonValue>(null);

  useMemo(() => {
    if (open) {
      setName(record?.name ?? "");
      setCode(record?.code ?? "");
      setStoreNumber(record?.store_number ?? "");
      setParentId(record?.region_id ?? record?.market_id ?? record?.district_id ?? "");
      setStatus(record?.status ?? "Active");
      setNotes(record?.notes ?? "");
      setCity(record?.city ?? "");
      setStateVal(record?.state ?? "");
      setMainPhone(record?.main_phone ?? "");
      setAddress((record as any)?.address ?? "");
      setZip((record as any)?.zip ?? "");
      setStoreManager((record as any)?.store_manager ?? "");
      setStoreManagerPerson(null);
    }
  }, [open, record]);

  const createParent = async (parentLevel: Level, parentName: string) => {
    const table = parentLevel === "region" ? "regions" : parentLevel === "market" ? "markets" : "districts";
    const insertVals: any = { name: parentName };
    if (parentLevel === "market") insertVals.region_id = prompt("Region for new market — leaving blank will fail. Enter Region ID:") || "";
    // For simple inline create, we call it below via a dedicated button. Kept for future use.
    const { data, error } = await supabase.from(table as any).insert(insertVals).select("id").single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: [table] });
    return (data as any).id as string;
  };

  const parentOptions = () => {
    if (level === "market") return regions.map((r) => ({ id: r.id, label: r.name }));
    if (level === "district") return markets.map((m) => ({ id: m.id, label: `${m.name}${regions.find((r) => r.id === m.region_id) ? " (" + regions.find((r) => r.id === m.region_id)!.name + ")" : ""}` }));
    if (level === "store") return districts.map((d) => {
      const m = markets.find((x) => x.id === d.market_id);
      return { id: d.id, label: `District ${d.name}${m ? " · " + m.name : ""}` };
    });
    return [];
  };
  const parentField = level === "market" ? "region_id" : level === "district" ? "market_id" : level === "store" ? "district_id" : null;

  const submit = () => {
    const v: any = { status, notes: notes || null };
    if (level === "store") {
      if (!storeNumber.trim()) return toast.error("Store number required");
      if (!parentId) return toast.error("Parent district required");
      v.store_number = storeNumber.trim(); v.name = name || null; v.city = city || null; v.state = stateVal || null; v.main_phone = mainPhone || null;
      v.address = address || null; v.zip = zip || null; v.store_manager = storeManager || null;
      v.district_id = parentId;
    } else {
      if (!name.trim()) return toast.error("Name required");
      v.name = name.trim();
      if (level !== "region") { if (!parentId) return toast.error("Parent required"); (v as any)[parentField!] = parentId; }
      if (level === "region" || level === "market") v.code = code || null;
    }
    onSave(v);
  };

  const [inlineNewOpen, setInlineNewOpen] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const [inlineParent, setInlineParent] = useState("");

  const parentLevel: Level | null = level === "market" ? "region" : level === "district" ? "market" : level === "store" ? "district" : null;
  const grandParentOptions = () => {
    if (parentLevel === "market") return regions.map((r) => ({ id: r.id, label: r.name }));
    if (parentLevel === "district") return markets.map((m) => ({ id: m.id, label: m.name }));
    return [];
  };

  const doInlineCreate = async () => {
    if (!parentLevel || !inlineName.trim()) return;
    const table = parentLevel === "region" ? "regions" : parentLevel === "market" ? "markets" : "districts";
    const vals: any = { name: inlineName.trim() };
    if (parentLevel === "market") { if (!inlineParent) return toast.error("Region required"); vals.region_id = inlineParent; }
    if (parentLevel === "district") { if (!inlineParent) return toast.error("Market required"); vals.market_id = inlineParent; }
    const { data, error } = await supabase.from(table as any).insert(vals).select("id").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: [table] });
    setParentId((data as any).id);
    setInlineNewOpen(false); setInlineName(""); setInlineParent("");
    toast.success(`Created new ${parentLevel}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{record ? "Edit" : "New"} {level}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {level === "store" ? (
            <>
              <div className="space-y-2"><Label>Store Number *</Label><Input value={storeNumber} onChange={(e) => setStoreNumber(e.target.value)} /></div>
              <div className="space-y-2"><Label>Store Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Zip</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
                <div className="space-y-2"><Label>Main Phone</Label><Input value={mainPhone} onChange={(e) => setMainPhone(e.target.value)} /></div>
              </div>
              {record?.id ? (
                <PersonField
                  label="Store Manager"
                  roleLabel="Store Manager"
                  defaultChannel="Internal"
                  linkTarget={{ kind: "store", storeId: record.id }}
                  value={storeManagerPerson ?? (storeManager ? { id: "__text__", name: storeManager } : null)}
                  onChange={(v) => {
                    setStoreManagerPerson(v);
                    setStoreManager(v?.name ?? "");
                  }}
                  placeholder={storeManager ? `Currently: ${storeManager} — tap to change` : "Search a person by name…"}
                />
              ) : (
                <div className="space-y-2">
                  <Label>Store Manager</Label>
                  <p className="text-xs text-muted-foreground">Save the store first, then assign a manager from your contacts.</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              {level !== "district" && <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>}
            </>
          )}

          {parentField && (
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Parent {parentLevel} *</Label>
                <Button type="button" variant="link" size="sm" onClick={() => setInlineNewOpen(true)}>+ Create new {parentLevel}</Button>
              </div>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue placeholder={`Select ${parentLevel}`} /></SelectTrigger>
                <SelectContent>
                  {parentOptions().map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>

        {inlineNewOpen && parentLevel && (
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-sm font-medium">New {parentLevel}</div>
            <Input placeholder="Name" value={inlineName} onChange={(e) => setInlineName(e.target.value)} />
            {parentLevel !== "region" && (
              <Select value={inlineParent} onValueChange={setInlineParent}>
                <SelectTrigger><SelectValue placeholder={`Select ${parentLevel === "market" ? "region" : "market"}`} /></SelectTrigger>
                <SelectContent>
                  {grandParentOptions().map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setInlineNewOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={doInlineCreate}>Create</Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
