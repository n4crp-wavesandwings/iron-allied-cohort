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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
}

function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function FollowUpDialog({ open, onOpenChange, entityId }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayInput());

  useEffect(() => {
    if (open) {
      setTitle("");
      setDueDate(todayInput());
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required.");
      if (!dueDate) throw new Error("Due date is required.");
      const { error } = await supabase.from("follow_ups").insert({
        entity_id: entityId,
        title: title.trim(),
        due_date: dueDate,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_ups", entityId] });
      toast.success("Follow-up created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Follow-up</DialogTitle>
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
              {mutation.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
