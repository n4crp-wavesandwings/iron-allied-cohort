import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logHistory } from "@/lib/resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolutionId: string;
}

export function NoteDialog({ open, onOpenChange, resolutionId }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("Note cannot be empty.");
      await logHistory(resolutionId, "note_added", note.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions", resolutionId, "history"] });
      toast.success("Note added");
      setNote("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Update</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="note">Update / Note</Label>
            <Textarea
              id="note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              {mutation.isPending ? "Saving…" : "Add Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
