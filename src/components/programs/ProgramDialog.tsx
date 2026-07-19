import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  merchantContactsQuery,
  programMerchantsQuery,
  programsListQuery,
  contactLabel,
  activeProvidersQuery,
  programProviderIdsQuery,
  syncProgramProviders,
  type ProgramWithParent,
} from "@/lib/programs";


type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ProgramWithParent | null;
};

export function ProgramDialog({ open, onOpenChange, program }: Props) {
  const qc = useQueryClient();
  const isEdit = !!program;

  const { data: allPrograms = [] } = useQuery(programsListQuery);
  const { data: merchants = [] } = useQuery(merchantContactsQuery);
  const { data: currentLinks = [] } = useQuery({
    ...programMerchantsQuery(program?.id ?? ""),
    enabled: !!program?.id,
  });

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [subCategory, setSubCategory] = useState("");
  const [status, setStatus] = useState<string>("Active");
  const [notes, setNotes] = useState("");
  const [primaryContactId, setPrimaryContactId] = useState<string>("none");
  const [secondaryIds, setSecondaryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setName(program?.name ?? "");
    setParentId(program?.parent_program_id ?? "none");
    setSubCategory(program?.sub_category ?? "");
    setStatus(program?.status ?? "Active");
    setNotes(program?.notes ?? "");
    const primary = currentLinks.find((l) => l.is_current && l.role === "Primary");
    setPrimaryContactId(primary?.contact_id ?? "none");
    setSecondaryIds(
      new Set(
        currentLinks
          .filter((l) => l.is_current && l.role === "Secondary")
          .map((l) => l.contact_id),
      ),
    );
    // Only re-sync when opening/switching program. `currentLinks` defaults to a
    // fresh `[]` per render, which would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, program?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Program name is required");

      let programId = program?.id;
      const payload = {
        name: name.trim(),
        parent_program_id: parentId === "none" ? null : parentId,
        sub_category: subCategory.trim() || null,
        status,
        notes: notes.trim() || null,
      };
      if (isEdit && programId) {
        const { error } = await supabase.from("programs").update(payload).eq("id", programId);
        if (error) throw error;
      } else {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        if (!profile?.org_id) throw new Error("No organization");
        const { data, error } = await supabase
          .from("programs")
          .insert({ ...payload, org_id: profile.org_id })
          .select("id")
          .single();
        if (error) throw error;
        programId = data.id;
      }

      if (!programId) return;

      const desiredPrimary = primaryContactId === "none" ? null : primaryContactId;
      const desiredSecondary = new Set(secondaryIds);
      if (desiredPrimary) desiredSecondary.delete(desiredPrimary);

      const now = new Date().toISOString().slice(0, 10);

      const currentPrimary = currentLinks.find((l) => l.is_current && l.role === "Primary");
      const currentSecondaries = currentLinks.filter(
        (l) => l.is_current && l.role === "Secondary",
      );

      if (currentPrimary && currentPrimary.contact_id !== desiredPrimary) {
        await supabase
          .from("program_merchants" as any)
          .update({ is_current: false, end_date: now })
          .eq("id", currentPrimary.id);
      }
      if (desiredPrimary && (!currentPrimary || currentPrimary.contact_id !== desiredPrimary)) {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        await supabase.from("program_merchants" as any).insert({
          org_id: profile?.org_id,
          program_id: programId,
          contact_id: desiredPrimary,
          role: "Primary",
          is_current: true,
          start_date: now,
        });
      }

      for (const sec of currentSecondaries) {
        if (!desiredSecondary.has(sec.contact_id)) {
          await supabase
            .from("program_merchants" as any)
            .update({ is_current: false, end_date: now })
            .eq("id", sec.id);
        }
      }
      const existingSecondaryIds = new Set(currentSecondaries.map((s) => s.contact_id));
      const toAdd: string[] = [];
      for (const c of desiredSecondary) {
        if (!existingSecondaryIds.has(c)) toAdd.push(c);
      }
      if (toAdd.length) {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        await supabase.from("program_merchants" as any).insert(
          toAdd.map((cid) => ({
            org_id: profile?.org_id,
            program_id: programId,
            contact_id: cid,
            role: "Secondary",
            is_current: true,
            start_date: now,
          })),
        );
      }

      return programId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["program-merchants"] });
      qc.invalidateQueries({ queryKey: ["contact-program-merchants"] });
      toast.success(isEdit ? "Program updated" : "Program created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parentOptions = allPrograms.filter((p) => p.id !== program?.id);

  const toggleSecondary = (id: string) => {
    setSecondaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Program" : "New Program"}</DialogTitle>
          <DialogDescription>
            A Program is a category of installation work (e.g. HVAC, Carpet, Water Heaters) — not a company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="prog-name">Program Name *</Label>
            <Input
              id="prog-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Water Heaters"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Parent Program</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="prog-sub">Sub-category</Label>
              <Input
                id="prog-sub"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Optional free text"
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Primary Merchant</Label>
            <Select value={primaryContactId} onValueChange={setPrimaryContactId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {merchants.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {contactLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {merchants.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No merchants yet — create one from the Merchant tab on Relationships.
              </p>
            )}
          </div>

          <div>
            <Label>Secondary Merchants</Label>
            <div className="mt-2 space-y-2 rounded-md border border-border p-3 max-h-40 overflow-y-auto">
              {merchants.length === 0 ? (
                <p className="text-xs text-muted-foreground">No merchants available.</p>
              ) : (
                merchants.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={secondaryIds.has(m.id)}
                      onCheckedChange={() => toggleSecondary(m.id)}
                      disabled={m.id === primaryContactId}
                    />
                    <span>{contactLabel(m)}</span>
                    {m.id === primaryContactId && (
                      <span className="text-xs text-muted-foreground">(Primary)</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="prog-notes">Notes</Label>
            <Textarea
              id="prog-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
