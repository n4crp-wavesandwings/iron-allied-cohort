import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  programsListQuery,
  contactProgramMerchantsQuery,
} from "@/lib/programs";

export type MerchantEditable = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  note: string | null;
  active: boolean;
} | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: MerchantEditable;
};

export function MerchantDialog({ open, onOpenChange, contact }: Props) {
  const qc = useQueryClient();
  const isEdit = !!contact;

  const { data: allPrograms = [] } = useQuery(programsListQuery);
  const { data: existingLinks = [] } = useQuery({
    ...contactProgramMerchantsQuery(contact?.id ?? ""),
    enabled: !!contact?.id,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [primaryProgramId, setPrimaryProgramId] = useState<string>("none");
  const [secondaryPrograms, setSecondaryPrograms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setFirstName(contact?.first_name ?? "");
    setLastName(contact?.last_name ?? "");
    setNotes(contact?.note ?? "");
    setActive(contact?.active ?? true);
    const primary = existingLinks.find((l: any) => l.is_current && l.role === "Primary");
    setPrimaryProgramId(primary?.program_id ?? "none");
    setSecondaryPrograms(
      new Set(
        existingLinks
          .filter((l: any) => l.is_current && l.role === "Secondary")
          .map((l: any) => l.program_id as string),
      ),
    );
    // Only re-sync when the dialog opens or the target contact changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("org_id")
        .single();
      if (profileErr) throw profileErr;
      if (!profile?.org_id) throw new Error("No organization");

      let contactId = contact?.id;
      if (isEdit && contactId) {
        const { error } = await supabase
          .from("contacts")
          .update({
            note: notes.trim() || null,
            active,
            is_merchant: true,
          } as any)
          .eq("id", contactId);
        if (error) throw error;
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("First and Last name are required");
        }
        const fn = firstName.trim();
        const ln = lastName.trim();
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            org_id: profile.org_id,
            entity_id: null,
            first_name: fn,
            last_name: ln,
            name: `${fn} ${ln}`,
            note: notes.trim() || null,
            active,
            is_merchant: true,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      if (!contactId) return;

      // Reconcile program_merchants — fetch FRESH state (do not trust closure).
      const desiredPrimary = primaryProgramId === "none" ? null : primaryProgramId;
      const desiredSecondary = new Set(secondaryPrograms);
      if (desiredPrimary) desiredSecondary.delete(desiredPrimary);

      const now = new Date().toISOString().slice(0, 10);

      const { data: fresh, error: freshErr } = await supabase
        .from("program_merchants" as any)
        .select("id, program_id, role, is_current")
        .eq("contact_id", contactId)
        .eq("is_current", true);
      if (freshErr) throw freshErr;
      const currentRows = ((fresh ?? []) as unknown) as Array<{
        id: string;
        program_id: string;
        role: string;
        is_current: boolean;
      }>;
      const currentPrimary = currentRows.find((l) => l.role === "Primary") ?? null;
      const currentSecondaries = currentRows.filter((l) => l.role === "Secondary");

      // 1. Close out existing Primary if changing or clearing.
      if (currentPrimary && currentPrimary.program_id !== desiredPrimary) {
        const { error } = await supabase
          .from("program_merchants" as any)
          .update({ is_current: false, end_date: now })
          .eq("id", currentPrimary.id);
        if (error) throw error;
      }

      // 2. Insert new Primary if needed. First unseat any other merchant that
      //    holds Primary on the same program (partial unique index enforces one).
      if (
        desiredPrimary &&
        (!currentPrimary || currentPrimary.program_id !== desiredPrimary)
      ) {
        const { error: unseatErr } = await supabase
          .from("program_merchants" as any)
          .update({ is_current: false, end_date: now })
          .eq("program_id", desiredPrimary)
          .eq("role", "Primary")
          .eq("is_current", true);
        if (unseatErr) throw unseatErr;

        // If this merchant already has a Secondary row for the same program,
        // close it so it doesn't shadow the new Primary.
        const secDupe = currentSecondaries.find((s) => s.program_id === desiredPrimary);
        if (secDupe) {
          const { error } = await supabase
            .from("program_merchants" as any)
            .update({ is_current: false, end_date: now })
            .eq("id", secDupe.id);
          if (error) throw error;
        }

        const { error: insErr } = await supabase.from("program_merchants" as any).insert({
          org_id: profile.org_id,
          program_id: desiredPrimary,
          contact_id: contactId,
          role: "Primary",
          is_current: true,
          start_date: now,
        });
        if (insErr) throw insErr;
      }

      // 3. Remove Secondary rows that were deselected.
      for (const sec of currentSecondaries) {
        if (!desiredSecondary.has(sec.program_id)) {
          const { error } = await supabase
            .from("program_merchants" as any)
            .update({ is_current: false, end_date: now })
            .eq("id", sec.id);
          if (error) throw error;
        }
      }

      // 4. Add new Secondary rows.
      const existingSecondaryProgIds = new Set(
        currentSecondaries
          .filter((s) => desiredSecondary.has(s.program_id))
          .map((s) => s.program_id),
      );
      const toAdd: string[] = [];
      for (const p of desiredSecondary) {
        if (!existingSecondaryProgIds.has(p)) toAdd.push(p);
      }
      if (toAdd.length) {
        const { error } = await supabase.from("program_merchants" as any).insert(
          toAdd.map((pid) => ({
            org_id: profile.org_id,
            program_id: pid,
            contact_id: contactId,
            role: "Secondary",
            is_current: true,
            start_date: now,
          })),
        );
        if (error) throw error;
      }
      return contactId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["program-merchants"] });
      qc.invalidateQueries({ queryKey: ["contact-program-merchants"] });
      qc.invalidateQueries({ queryKey: ["merchants"] });
      toast.success(isEdit ? "Merchant updated" : "Merchant created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSecondary = (id: string) => {
    setSecondaryPrograms((prev) => {
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
          <DialogTitle>{isEdit ? "Edit Merchant" : "New Merchant"}</DialogTitle>
          <DialogDescription>
            A Merchant is the person (corporate merchant) who owns a program.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEdit && contact ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="text-sm font-medium">
                {[contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
                  "Merchant"}
              </div>
              <p className="text-xs text-muted-foreground">
                Name, phone, email, job title, and organization are edited on the contact
                record.
              </p>
              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link
                  to="/contacts/$id"
                  params={{ id: contact.id }}
                  onClick={() => onOpenChange(false)}
                >
                  <ExternalLink className="h-4 w-4" /> Edit contact details
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Primary on Program</Label>
            <Select value={primaryProgramId} onValueChange={setPrimaryProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allPrograms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Secondary on Programs</Label>
            <div className="mt-2 space-y-2 rounded-md border border-border p-3 max-h-40 overflow-y-auto">
              {allPrograms.length === 0 ? (
                <p className="text-xs text-muted-foreground">No programs.</p>
              ) : (
                allPrograms.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={secondaryPrograms.has(p.id)}
                      onCheckedChange={() => toggleSecondary(p.id)}
                      disabled={p.id === primaryProgramId}
                    />
                    <span>{p.name}</span>
                    {p.id === primaryProgramId && (
                      <span className="text-xs text-muted-foreground">(Primary)</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="mact"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <Label htmlFor="mact" className="cursor-pointer">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Merchant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
