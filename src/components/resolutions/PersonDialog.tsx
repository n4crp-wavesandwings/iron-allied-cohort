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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contactDisplayName } from "@/lib/contacts";
import type { Database } from "@/integrations/supabase/types";
import type { ResolutionPersonRow, ResolutionRelationshipRow } from "@/lib/resolutions";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolutionId: string;
  linkedEntityIds: string[];
  person?: ResolutionPersonRow | null;
}

const MANUAL = "__manual__";

export function PersonDialog({
  open,
  onOpenChange,
  resolutionId,
  linkedEntityIds,
  person = null,
}: Props) {
  const isEdit = !!person;
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"contact" | "manual">("manual");
  const [contactId, setContactId] = useState<string | null>(null);
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");

  const contactsQuery = useQuery({
    queryKey: ["contacts-for-persons", linkedEntityIds],
    enabled: open && linkedEntityIds.length > 0,
    queryFn: async (): Promise<ContactRow[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .in("entity_id", linkedEntityIds)
        .is("deleted_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open) return;
    if (person) {
      setMode(person.manual_entry ? "manual" : "contact");
      setContactId(person.contact_id);
      setPersonName(person.person_name);
      setPersonRole(person.person_role);
    } else {
      setMode(linkedEntityIds.length > 0 ? "contact" : "manual");
      setContactId(null);
      setPersonName("");
      setPersonRole("");
    }
  }, [open, person, linkedEntityIds.length]);

  const mutation = useMutation({
    mutationFn: async () => {
      let name = personName.trim();
      let role = personRole.trim();
      let cid: string | null = null;
      let manual = true;

      if (mode === "contact" && contactId) {
        const c = (contactsQuery.data ?? []).find((x) => x.id === contactId);
        if (!c) throw new Error("Select a contact.");
        name = contactDisplayName(c);
        role = role || c.job_title || "";
        cid = c.id;
        manual = false;
      }
      if (!name) throw new Error("Name is required.");
      if (!role) throw new Error("Role is required.");

      const payload = {
        resolution_id: resolutionId,
        contact_id: cid,
        person_name: name,
        person_role: role,
        manual_entry: manual,
      };
      if (isEdit && person) {
        const { error } = await supabase
          .from("customer_resolution_people")
          .update(payload)
          .eq("id", person.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customer_resolution_people").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions", resolutionId, "people"] });
      toast.success(isEdit ? "Person updated" : "Person added");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Person" : "Add Person"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {linkedEntityIds.length > 0 && (
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={mode === "contact" ? contactId ?? "" : MANUAL}
                onValueChange={(v) => {
                  if (v === MANUAL) {
                    setMode("manual");
                    setContactId(null);
                  } else {
                    setMode("contact");
                    setContactId(v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select existing contact or enter manually" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MANUAL}>Manual entry</SelectItem>
                  {(contactsQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {contactDisplayName(c)}
                      {c.job_title ? ` · ${c.job_title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === "manual" && (
            <div className="space-y-2">
              <Label htmlFor="p_name">Name *</Label>
              <Input
                id="p_name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="p_role">Role *</Label>
            <Input
              id="p_role"
              placeholder="e.g., Manager, Technician"
              value={personRole}
              onChange={(e) => setPersonRole(e.target.value)}
              required
            />
          </div>
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
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
