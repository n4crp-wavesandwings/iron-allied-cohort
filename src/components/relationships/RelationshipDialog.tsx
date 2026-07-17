import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RELATIONSHIP_TYPES,
  STATUS_OPTIONS,
  type EntityRow,
  type EntityType,
  type StatusOption,
} from "@/lib/relationships";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship?: EntityRow | null;
}

export function RelationshipDialog({ open, onOpenChange, relationship }: Props) {
  const isEdit = !!relationship;
  const queryClient = useQueryClient();

  const [type, setType] = useState<EntityType | "">("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<StatusOption | "">("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setType(relationship?.type ?? "");
      setName(relationship?.name ?? "");
      setStatus((relationship?.status as StatusOption) ?? "");
      setDistrict(relationship?.district ?? "");
      setNotes(relationship?.notes ?? "");
    }
  }, [open, relationship]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!type || !name.trim() || !status) {
        throw new Error("Relationship Type, Name, and Status are required.");
      }
      const payload = {
        type: type as EntityType,
        name: name.trim(),
        status,
        district: district.trim() || null,
        notes: notes.trim() || null,
      };
      if (isEdit && relationship) {
        const { error } = await supabase
          .from("entities")
          .update(payload)
          .eq("id", relationship.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      toast.success(isEdit ? "Relationship updated" : "Relationship created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Relationship" : "New Relationship"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
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
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
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
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
