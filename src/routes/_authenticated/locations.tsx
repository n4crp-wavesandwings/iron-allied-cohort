import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Pencil, Plus } from "lucide-react";
import {
  regionsQuery, marketsQuery, districtsQuery, storesQuery,
  type Region, type Market, type District, type Store,
} from "@/lib/locations";

export const Route = createFileRoute("/_authenticated/locations")({ component: LocationsPage });

type Level = "region" | "market" | "district" | "store";

function LocationsPage() {
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
      <Tabs defaultValue="regions">
        <TabsList>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="districts">Districts</TabsTrigger>
          <TabsTrigger value="stores">Stores</TabsTrigger>
        </TabsList>
        <TabsContent value="regions"><RegionsTab /></TabsContent>
        <TabsContent value="markets"><MarketsTab /></TabsContent>
        <TabsContent value="districts"><DistrictsTab /></TabsContent>
        <TabsContent value="stores"><StoresTab /></TabsContent>
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

function StoresTab() {
  const { data: stores = [] } = useQuery(storesQuery);
  const { data: districts = [] } = useQuery(districtsQuery);
  const { data: markets = [] } = useQuery(marketsQuery);
  const { data: regions = [] } = useQuery(regionsQuery);
  const mut = useCrud("stores", ["stores"]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [search, setSearch] = useState("");
  const districtMap = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);
  const marketMap = useMemo(() => new Map(markets.map((m) => [m.id, m])), [markets]);
  const regionMap = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);

  const filtered = stores.filter((s) =>
    !search || s.store_number.includes(search) || (s.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Stores</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="Search by number or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="gap-1"><Plus className="h-4 w-4" /> New Store</Button>
        </div>
      </CardHeader>
      <CardContent>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Main Phone</Label><Input value={mainPhone} onChange={(e) => setMainPhone(e.target.value)} /></div>
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
