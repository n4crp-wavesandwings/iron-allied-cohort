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
import { relationshipsQueryOptions } from "@/lib/relationships";
import { interactionsQueryOptions, interactionTypeLabel } from "@/lib/interactions";
import type { FollowUpRow, FollowUpStatus } from "@/lib/followups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId?: string | null;
  interactionId?: string | null;
  followUp?: FollowUpRow | null;
}

const NONE = "__none__";

function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function FollowUpDialog({
  open,
  onOpenChange,
  entityId = null,
  interactionId = null,
  followUp = null,
}: Props) {
  const isEdit = !!followUp;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayInput());
  const [status, setStatus] = useState<FollowUpStatus>("open");
  const [relId, setRelId] = useState<string | null>(entityId);
  const [intId, setIntId] = useState<string | null>(interactionId);

  const relationships = useQuery({
    ...relationshipsQueryOptions("all"),
    enabled: open,
  });
  const interactions = useQuery({
    ...interactionsQueryOptions(relId ?? ""),
    enabled: open && !!relId,
  });

  useEffect(() => {
    if (!open) return;
    if (followUp) {
      setTitle(followUp.title);
      setDueDate(followUp.due_date.slice(0, 10));
      setStatus(followUp.status);
      setRelId(followUp.entity_id);
      setIntId(followUp.interaction_id);
    } else {
      setTitle("");
      setDueDate(todayInput());
      setStatus("open");
      setRelId(entityId);
      setIntId(interactionId);
    }
  }, [open, followUp, entityId, interactionId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required.");
      if (!dueDate) throw new Error("Due date is required.");
      const payload = {
        title: title.trim(),
        due_date: dueDate,
        status,
        entity_id: relId,
        interaction_id: relId ? intId : null,
        completed_at:
          status === "done"
            ? followUp?.completed_at ?? new Date().toISOString()
            : null,
      };
      if (isEdit && followUp) {
        const { error } = await supabase
          .from("follow_ups")
          .update(payload)
          .eq("id", followUp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follow_ups").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_ups"] });
      toast.success(isEdit ? "Follow-up updated" : "Follow-up created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Follow-up" : "Create Follow-up"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="fu_title">Title *</Label>
            <Input
              id="fu_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fu_due">Due Date *</Label>
              <Input
                id="fu_due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FollowUpStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select
              value={relId ?? NONE}
              onValueChange={(v) => {
                const next = v === NONE ? null : v;
                setRelId(next);
                setIntId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {(relationships.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {relId && (
            <div className="space-y-2">
              <Label>Interaction</Label>
              <Select
                value={intId ?? NONE}
                onValueChange={(v) => setIntId(v === NONE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(interactions.data ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {interactionTypeLabel(i.type)} ·{" "}
                      {new Date(i.occurred_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
