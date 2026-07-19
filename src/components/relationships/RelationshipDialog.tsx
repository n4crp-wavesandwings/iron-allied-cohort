import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENTITY_COMM_METHODS,
  RELATIONSHIP_TYPES,
  STATUS_OPTIONS,
  typeLabel,
  type EntityCommMethod,
  type EntityRow,
  type EntityType,
  type StatusOption,
} from "@/lib/relationships";
import { organizationTypesQuery } from "@/lib/locations";
import { CoveragePanel } from "@/components/coverage/CoveragePanel";
import {
  activeProgramsQuery,
  providerProgramIdsQuery,
  syncProviderPrograms,
} from "@/lib/programs";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship?: EntityRow | null;
}

export function RelationshipDialog({ open, onOpenChange, relationship }: Props) {
  const isEdit = !!relationship;
  const queryClient = useQueryClient();
  const { data: orgTypes = [] } = useQuery(organizationTypesQuery);

  const [type, setType] = useState<EntityType | "">("");
  const [orgType, setOrgType] = useState<string>("");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [status, setStatus] = useState<StatusOption | "">("");
  const [active, setActive] = useState(true);
  const [website, setWebsite] = useState("");
  const [prefComm, setPrefComm] = useState<EntityCommMethod | "">("");
  const [internalRef, setInternalRef] = useState("");
  const [notes, setNotes] = useState("");

  // Two-step create: after basic save, show CoveragePanel targeting the new id
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Provider ↔ Programs
  const { data: allActivePrograms = [] } = useQuery(activeProgramsQuery);
  const { data: linkedProgramIds = [] } = useQuery({
    ...providerProgramIdsQuery(relationship?.id ?? ""),
    enabled: !!relationship?.id && open,
  });
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setType(relationship?.type ?? "");
      setOrgType((relationship as any)?.organization_type ?? "");
      setName(relationship?.name ?? "");
      setLegalName((relationship as any)?.legal_name ?? "");
      setStatus((relationship?.status as StatusOption) ?? "");
      setActive((relationship as any)?.active ?? true);
      setWebsite((relationship as any)?.website ?? "");
      setPrefComm(((relationship as any)?.preferred_communication_method as EntityCommMethod) ?? "");
      setInternalRef((relationship as any)?.internal_reference_number ?? "");
      setNotes(relationship?.notes ?? "");
      setCreatedId(null);
    }
    // Only re-sync when opening/switching relationship.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, relationship?.id]);

  useEffect(() => {
    if (open && relationship?.id) {
      setSelectedProgramIds(new Set(linkedProgramIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, relationship?.id, linkedProgramIds.join("|")]);


  const mutation = useMutation({
    mutationFn: async () => {
      if (!type || !name.trim() || !status) {
        throw new Error("Type, Name, and Status are required.");
      }
      const payload: any = {
        type,
        name: name.trim(),
        status,
        legal_name: legalName.trim() || null,
        organization_type: orgType || null,
        active,
        website: website.trim() || null,
        preferred_communication_method: prefComm || null,
        internal_reference_number: internalRef.trim() || null,
        notes: notes.trim() || null,
      };
      let entityId: string;
      if (isEdit && relationship) {
        const { error } = await supabase.from("entities").update(payload).eq("id", relationship.id);
        if (error) throw error;
        entityId = relationship.id;
      } else {
        const { data, error } = await supabase
          .from("entities")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        entityId = data!.id as string;
      }
      // Sync provider ↔ programs on edit for providers
      if (isEdit && type === "provider") {
        await syncProviderPrograms(entityId, selectedProgramIds);
      }
      return entityId;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["provider-programs"] });
      queryClient.invalidateQueries({ queryKey: ["program-providers"] });
      toast.success(isEdit ? "Relationship updated" : "Relationship created");
      if (isEdit) {
        onOpenChange(false);
      } else {
        setCreatedId(id);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const dialogTitle = isEdit
    ? "Edit Relationship"
    : createdId
      ? `Coverage — ${name}`
      : type
        ? `New ${orgType || typeLabel(type as EntityType)}`
        : "New Relationship";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {createdId ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign coverage now, or skip and add it later from the relationship page.
            </p>
            <CoveragePanel mode={{ kind: "entity", entityId: createdId }} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Relationship Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Organization Type</Label>
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgTypes.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name * (organization display name)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input id="legal_name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusOption)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox id="rel_active" checked={active} onCheckedChange={(v) => setActive(v === true)} />
                <Label htmlFor="rel_active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Communication Method</Label>
                <Select value={prefComm} onValueChange={(v) => setPrefComm(v as EntityCommMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_COMM_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_ref">Internal Reference Number</Label>
              <Input
                id="internal_ref"
                value={internalRef}
                onChange={(e) => setInternalRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>

            {isEdit && type === "provider" && (
              <div className="space-y-2">
                <Label>Programs</Label>
                <p className="text-xs text-muted-foreground">
                  Which programs does this provider do?
                </p>
                <div className="rounded-md border border-border divide-y max-h-64 overflow-y-auto">
                  {allActivePrograms.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No active programs.</p>
                  ) : (
                    allActivePrograms.map((p) => {
                      const checked = selectedProgramIds.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3 px-3 py-3 cursor-pointer min-h-11"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedProgramIds((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(p.id);
                                else next.delete(p.id);
                                return next;
                              });
                            }}
                            className="h-5 w-5"
                          />
                          <span className="text-base">{p.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}


            <p className="text-xs text-muted-foreground">
              District, Market, and Region are set via structured Coverage
              {isEdit ? " on the relationship page." : " in the next step."}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Save & Continue to Coverage"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
