import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  engagementTypesQuery,
  engagementOutcomesQuery,
  engagementTagsQuery,
  programsQuery,
  contactLabel,
} from "@/lib/engagements";
import {
  storesQuery,
  districtsQuery,
  marketsQuery,
  regionsQuery,
  orgStoreCoverageQuery,
  orgDistrictCoverageQuery,
} from "@/lib/locations";

type ContactPick = { id: string; first_name: string | null; last_name: string | null; name: string | null; entity_id: string | null };
type EntityPick = { id: string; name: string; type: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: {
    entityId?: string;
    storeId?: string;
    contactId?: string;
  };
}

function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}
function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function EngagementDialog({ open, onOpenChange, defaults }: Props) {
  const qc = useQueryClient();

  const types = useQuery(engagementTypesQuery);
  const outcomes = useQuery(engagementOutcomesQuery);
  const tags = useQuery(engagementTagsQuery);
  const programs = useQuery(programsQuery);
  const stores = useQuery(storesQuery);
  const districts = useQuery(districtsQuery);
  const markets = useQuery(marketsQuery);
  const regions = useQuery(regionsQuery);

  const contacts = useQuery({
    queryKey: ["contacts", "all"],
    enabled: open,
    queryFn: async (): Promise<ContactPick[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,first_name,last_name,name,entity_id")
        .is("deleted_at", null)
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const entities = useQuery({
    queryKey: ["entities", "all"],
    enabled: open,
    queryFn: async (): Promise<EntityPick[]> => {
      const { data, error } = await supabase
        .from("entities")
        .select("id,name,type")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  // State
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(nowLocalInput());
  const [storeId, setStoreId] = useState<string>(defaults?.storeId ?? "");
  const [primaryOrgId, setPrimaryOrgId] = useState<string>(defaults?.entityId ?? "");
  const [extraOrgIds, setExtraOrgIds] = useState<string[]>([]);
  const [peopleIds, setPeopleIds] = useState<string[]>(defaults?.contactId ? [defaults.contactId] : []);
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [extraStoreIds, setExtraStoreIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [outcomeId, setOutcomeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [wantFollowUp, setWantFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDue, setFollowUpDue] = useState(todayISO());
  const [inlinePersonOpen, setInlinePersonOpen] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setTypeIds([]);
      setOccurredAt(nowLocalInput());
      setStoreId(defaults?.storeId ?? "");
      setPrimaryOrgId(defaults?.entityId ?? "");
      setExtraOrgIds([]);
      setPeopleIds(defaults?.contactId ? [defaults.contactId] : []);
      setProgramIds([]);
      setExtraStoreIds([]);
      setTagIds([]);
      setCustomTagInput("");
      setOutcomeId("");
      setNote("");
      setWantFollowUp(false);
      setFollowUpTitle("");
      setFollowUpDue(todayISO());
    }
  }, [open, defaults?.storeId, defaults?.entityId, defaults?.contactId]);

  // Derived location for selected store
  const selectedStore = useMemo(() => (stores.data ?? []).find((s) => s.id === storeId), [stores.data, storeId]);
  const selectedDistrict = useMemo(
    () => (selectedStore ? (districts.data ?? []).find((d) => d.id === selectedStore.district_id) : undefined),
    [districts.data, selectedStore],
  );
  const selectedMarket = useMemo(
    () => (selectedDistrict ? (markets.data ?? []).find((m) => m.id === selectedDistrict.market_id) : undefined),
    [markets.data, selectedDistrict],
  );
  const selectedRegion = useMemo(
    () => (selectedMarket ? (regions.data ?? []).find((r) => r.id === selectedMarket.region_id) : undefined),
    [regions.data, selectedMarket],
  );

  // Covering providers for the selected store (derived from org coverage tables)
  const coveringProviders = useQuery({
    queryKey: ["covering-providers", storeId, selectedDistrict?.id],
    enabled: !!storeId && !!selectedDistrict,
    queryFn: async (): Promise<EntityPick[]> => {
      const districtId = selectedDistrict!.id;
      // Orgs covering the whole district
      const { data: dCov } = await supabase
        .from("org_district_coverage")
        .select("entity_id, scope, entity:entities(id,name,type)")
        .eq("district_id", districtId);
      // Orgs covering this specific store
      const { data: sCov } = await supabase
        .from("org_store_coverage")
        .select("entity_id, entity:entities(id,name,type)")
        .eq("store_id", storeId);
      const map = new Map<string, EntityPick>();
      for (const r of ((dCov as any[]) ?? [])) {
        if (r.scope === "whole" && r.entity) map.set(r.entity.id, r.entity);
      }
      for (const r of ((sCov as any[]) ?? [])) {
        if (r.entity) map.set(r.entity.id, r.entity);
      }
      return Array.from(map.values());
    },
  });

  const selectedTypes = (types.data ?? []).filter((t) => typeIds.includes(t.id));
  const dialogTitle =
    selectedTypes.length === 0
      ? "New Engagement"
      : `New ${selectedTypes.map((t) => t.name).join(" + ")}`;

  // Group tags
  const tagsByGroup = useMemo(() => {
    const m = new Map<string, typeof tags.data>();
    for (const t of tags.data ?? []) {
      const g = t.group ?? "Other";
      const arr = m.get(g) ?? [];
      arr.push(t);
      m.set(g, arr);
    }
    return Array.from(m.entries());
  }, [tags.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (typeIds.length === 0) throw new Error("Select at least one engagement type.");
      const hasAnyLink =
        !!storeId ||
        !!primaryOrgId ||
        extraOrgIds.length > 0 ||
        peopleIds.length > 0 ||
        extraStoreIds.length > 0;
      if (!hasAnyLink) throw new Error("Link at least one store, organization, or person.");

      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;

      // Resolve any pending custom tag typed but not confirmed yet
      let finalTagIds = [...tagIds];
      const pending = customTagInput.trim();
      if (pending) {
        const resolved = await ensureCustomTag(pending, tags.data ?? []);
        if (resolved && !finalTagIds.includes(resolved)) finalTagIds.push(resolved);
      }

      const { data: eng, error } = await supabase
        .from("engagements")
        .insert({
          engagement_type_id: typeIds[0], // keep legacy column populated with first type
          occurred_at: new Date(occurredAt).toISOString(),
          outcome_id: outcomeId || null,
          store_id: storeId || null,
          note: note.trim() || null,
          created_by: userId,
        } as any)
        .select("id, org_id")
        .single();
      if (error) throw error;
      const engagementId = (eng as any).id as string;
      const orgId = (eng as any).org_id as string;

      // Link tables
      const inserts: Promise<any>[] = [];
      const allOrgIds = Array.from(new Set([primaryOrgId, ...extraOrgIds].filter(Boolean)));
      if (allOrgIds.length) {
        inserts.push(
          supabase.from("engagement_organizations").insert(
            allOrgIds.map((entity_id) => ({ engagement_id: engagementId, entity_id, org_id: orgId })) as any,
          ) as any,
        );
      }
      if (peopleIds.length) {
        inserts.push(
          supabase.from("engagement_people").insert(
            peopleIds.map((contact_id) => ({ engagement_id: engagementId, contact_id, org_id: orgId })) as any,
          ) as any,
        );
      }
      if (programIds.length) {
        inserts.push(
          supabase.from("engagement_programs").insert(
            programIds.map((program_id) => ({ engagement_id: engagementId, program_id, org_id: orgId })) as any,
          ) as any,
        );
      }
      if (extraStoreIds.length) {
        inserts.push(
          supabase.from("engagement_stores").insert(
            extraStoreIds.map((store_id) => ({ engagement_id: engagementId, store_id, org_id: orgId })) as any,
          ) as any,
        );
      }
      if (finalTagIds.length) {
        inserts.push(
          supabase.from("engagement_tag_links").insert(
            finalTagIds.map((tag_id) => ({ engagement_id: engagementId, tag_id, org_id: orgId })) as any,
          ) as any,
        );
      }
      // Engagement type multi-links
      if (typeIds.length) {
        inserts.push(
          supabase.from("engagement_type_links").insert(
            typeIds.map((engagement_type_id) => ({ engagement_id: engagementId, engagement_type_id, org_id: orgId })) as any,
          ) as any,
        );
      }
      const results = await Promise.all(inserts);
      for (const r of results) if (r.error) throw r.error;

      // Optional follow-up
      if (wantFollowUp && followUpTitle.trim()) {
        const { error: fErr } = await supabase.from("follow_ups").insert({
          engagement_id: engagementId,
          entity_id: primaryOrgId || null,
          title: followUpTitle.trim(),
          due_date: followUpDue,
          status: "open",
          assigned_to: userId,
          org_id: orgId,
        } as any);
        if (fErr) throw fErr;
      }
      return engagementId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagements"] });
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      toast.success("Engagement saved");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. Type — multi-select */}
          <section className="space-y-2">
            <Label>Engagement Type *</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(types.data ?? []).map((t) => {
                const on = typeIds.includes(t.id);
                return (
                  <Button
                    key={t.id}
                    type="button"
                    variant={on ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setTypeIds((prev) =>
                        on ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                      )
                    }
                    className="justify-start"
                  >
                    {on ? "✓ " : ""}
                    {t.name}
                  </Button>
                );
              })}
            </div>
            {typeIds.length === 0 && (
              <p className="text-xs text-muted-foreground">Tap one or more types (required).</p>
            )}
          </section>

          {/* When */}
          <section className="space-y-2">
            <Label htmlFor="occurred">When</Label>
            <Input
              id="occurred"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="max-w-xs"
            />
          </section>

          {/* 2. Primary Store */}
          <section className="space-y-2">
            <Label>Primary Store</Label>
            <Combobox
              value={storeId}
              onChange={setStoreId}
              placeholder="Search stores…"
              options={(stores.data ?? []).map((s) => ({
                value: s.id,
                label: `Store ${s.store_number}${s.name ? ` — ${s.name}` : ""}${s.city ? ` (${s.city})` : ""}`,
              }))}
              allowClear
            />
            {selectedStore && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">District:</span>{" "}
                  <span className="font-medium">{selectedDistrict?.name ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Market:</span>{" "}
                  <span className="font-medium">{selectedMarket?.name ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Region:</span>{" "}
                  <span className="font-medium">{selectedRegion?.name ?? "—"}</span>
                </div>
                {coveringProviders.data && coveringProviders.data.length > 0 && (
                  <div className="pt-1">
                    <div className="text-muted-foreground mb-1">Covering providers:</div>
                    <div className="flex flex-wrap gap-1">
                      {coveringProviders.data.map((p) => {
                        const linked = extraOrgIds.includes(p.id) || primaryOrgId === p.id;
                        return (
                          <Badge
                            key={p.id}
                            variant={linked ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              if (primaryOrgId === p.id) return;
                              setExtraOrgIds((prev) =>
                                prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                              );
                            }}
                          >
                            {linked ? "✓ " : "+ "}
                            {p.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. Primary Organization */}
          <section className="space-y-2">
            <Label>Primary Organization</Label>
            <Combobox
              value={primaryOrgId}
              onChange={setPrimaryOrgId}
              placeholder="Search organizations…"
              options={(entities.data ?? []).map((e) => ({
                value: e.id,
                label: `${e.name} (${e.type})`,
              }))}
              allowClear
            />
          </section>

          {/* 4. People */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>People Present</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setInlinePersonOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Add Person
              </Button>
            </div>
            <MultiCombobox
              placeholder="Search contacts…"
              selectedIds={peopleIds}
              onChange={setPeopleIds}
              options={(contacts.data ?? []).map((c) => ({
                value: c.id,
                label: contactLabel(c),
              }))}
            />
          </section>

          {/* 5. Programs */}
          {(programs.data?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <Label>Programs</Label>
              <MultiCombobox
                placeholder="Search programs…"
                selectedIds={programIds}
                onChange={setProgramIds}
                options={(programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              />
            </section>
          )}

          {/* 6. Tags */}
          <section className="space-y-2">
            <Label>Category Tags</Label>
            <div className="space-y-2">
              {tagsByGroup.map(([group, groupTags]) => (
                <div key={group}>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(groupTags ?? []).map((t) => {
                      const on = tagIds.includes(t.id);
                      return (
                        <Badge
                          key={t.id}
                          variant={on ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() =>
                            setTagIds((prev) =>
                              on ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                            )
                          }
                        >
                          {t.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Outcome */}
          <section className="space-y-2">
            <Label>Outcome</Label>
            <div className="flex flex-wrap gap-2">
              {(outcomes.data ?? []).map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  size="sm"
                  variant={outcomeId === o.id ? "default" : "outline"}
                  onClick={() => setOutcomeId(outcomeId === o.id ? "" : o.id)}
                >
                  {o.name}
                </Button>
              ))}
            </div>
          </section>

          {/* 8. Note */}
          <section className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional — voice dictation supported via your keyboard"
            />
          </section>

          {/* 9. Follow-up */}
          <section className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={wantFollowUp}
                onCheckedChange={(v) => setWantFollowUp(!!v)}
              />
              Create a follow-up
            </label>
            {wantFollowUp && (
              <div className="grid gap-2 pl-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="fu-title" className="text-xs">Title</Label>
                  <Input
                    id="fu-title"
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    placeholder="What needs to happen next"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fu-due" className="text-xs">Due Date</Label>
                  <Input
                    id="fu-due"
                    type="date"
                    value={followUpDue}
                    onChange={(e) => setFollowUpDue(e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save Engagement"}
            </Button>
          </div>
        </div>

        <InlinePersonDialog
          open={inlinePersonOpen}
          onOpenChange={setInlinePersonOpen}
          defaultEntityId={primaryOrgId}
          entities={entities.data ?? []}
          onCreated={(id) => {
            setPeopleIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            qc.invalidateQueries({ queryKey: ["contacts", "all"] });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Combobox helpers --------------------

function Combobox({
  value,
  onChange,
  placeholder,
  options,
  allowClear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <div className="flex items-center gap-1">
            {allowClear && selected && (
              <X
                className="h-3 w-3 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MultiCombobox({
  selectedIds,
  onChange,
  placeholder,
  options,
}: {
  selectedIds: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selectedIds);
  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const on = selectedSet.has(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      onSelect={() => {
                        onChange(on ? selectedIds.filter((x) => x !== o.value) : [...selectedIds, o.value]);
                      }}
                    >
                      <Checkbox checked={on} className="mr-2" />
                      {o.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const o = options.find((x) => x.value === id);
            if (!o) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {o.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onChange(selectedIds.filter((x) => x !== id))}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -------------------- Inline person create --------------------

function InlinePersonDialog({
  open,
  onOpenChange,
  defaultEntityId,
  entities,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityId: string;
  entities: EntityPick[];
  onCreated: (id: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [entityId, setEntityId] = useState(defaultEntityId);
  const [jobTitle, setJobTitle] = useState("");
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setEntityId(defaultEntityId);
      setJobTitle("");
      setMobile("");
    }
  }, [open, defaultEntityId]);

  const create = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() && !lastName.trim()) throw new Error("Enter a name.");
      if (!entityId) throw new Error("Select an organization.");
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          entity_id: entityId,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          job_title: jobTitle.trim() || null,
          mobile_phone: mobile.trim() || null,
          active: true,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: (id) => {
      toast.success("Person added");
      onCreated(id);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Person</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Organization *</Label>
            <Combobox
              value={entityId}
              onChange={setEntityId}
              placeholder="Select organization…"
              options={entities.map((e) => ({ value: e.id, label: `${e.name} (${e.type})` }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role / Job title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mobile phone (optional)</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
