import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  job_title: string | null;
  email: string | null;
  office_phone: string | null;
  mobile_phone: string | null;
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
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [primaryProgramId, setPrimaryProgramId] = useState<string>("none");
  const [secondaryPrograms, setSecondaryPrograms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setFirstName(contact?.first_name ?? "");
    setLastName(contact?.last_name ?? "");
    setJobTitle(contact?.job_title ?? "");
    setEmail(contact?.email ?? "");
    setOfficePhone(contact?.office_phone ?? "");
    setMobilePhone(contact?.mobile_phone ?? "");
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
  }, [open, contact, existingLinks]);

  const save = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First and Last name are required");
      }
      const { data: profile } = await supabase.from("profiles").select("org_id").single();
      if (!profile?.org_id) throw new Error("No organization");

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        job_title: jobTitle.trim() || null,
        email: email.trim() || null,
        office_phone: officePhone.trim() || null,
        mobile_phone: mobilePhone.trim() || null,
        note: notes.trim() || null,
        active,
        is_merchant: true,
      };

      let contactId = contact?.id;
      if (isEdit && contactId) {
        const { error } = await supabase.from("contacts").update(payload as any).eq("id", contactId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert({ ...(payload as any), org_id: profile.org_id, entity_id: null })
          .select("id")
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      if (!contactId) return;

      // Reconcile program_merchants
      const desiredPrimary = primaryProgramId === "none" ? null : primaryProgramId;
      const desiredSecondary = new Set(secondaryPrograms);
      if (desiredPrimary) desiredSecondary.delete(desiredPrimary);

      const now = new Date().toISOString().slice(0, 10);

      const currentPrimary = existingLinks.find(
        (l: any) => l.is_current && l.role === "Primary",
      );
      const currentSecondaries = existingLinks.filter(
        (l: any) => l.is_current && l.role === "Secondary",
      );

      if (currentPrimary && currentPrimary.program_id !== desiredPrimary) {
        await supabase
          .from("program_merchants" as any)
          .update({ is_current: false, end_date: now })
          .eq("id", currentPrimary.id);
      }
      if (
        desiredPrimary &&
        (!currentPrimary || currentPrimary.program_id !== desiredPrimary)
      ) {
        await supabase.from("program_merchants" as any).insert({
          org_id: profile.org_id,
          program_id: desiredPrimary,
          contact_id: contactId,
          role: "Primary",
          is_current: true,
          start_date: now,
        });
      }

      for (const sec of currentSecondaries) {
        if (!desiredSecondary.has(sec.program_id)) {
          await supabase
            .from("program_merchants" as any)
            .update({ is_current: false, end_date: now })
            .eq("id", sec.id);
        }
      }
      const existingSecondaryProgIds = new Set(
        currentSecondaries.map((s: any) => s.program_id as string),
      );
      const toAdd: string[] = [];
      for (const p of desiredSecondary) {
        if (!existingSecondaryProgIds.has(p)) toAdd.push(p);
      }
      if (toAdd.length) {
        await supabase.from("program_merchants" as any).insert(
          toAdd.map((pid) => ({
            org_id: profile.org_id,
            program_id: pid,
            contact_id: contactId,
            role: "Secondary",
            is_current: true,
            start_date: now,
          })),
        );
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
          <div>
            <Label>Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Office Phone</Label>
              <Input value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} />
            </div>
            <div>
              <Label>Mobile Phone</Label>
              <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} />
            </div>
          </div>

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
