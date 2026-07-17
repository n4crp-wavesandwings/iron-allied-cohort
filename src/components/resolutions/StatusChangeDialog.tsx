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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CR_STATUSES, logHistory, type CrStatus, type ResolutionRow } from "@/lib/resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolution: ResolutionRow;
}

export function StatusChangeDialog({ open, onOpenChange, resolution }: Props) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CrStatus>(resolution.status);

  useEffect(() => {
    if (open) setStatus(resolution.status);
  }, [open, resolution.status]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (status === resolution.status) return;
      const isClosing = status === "Resolved" || status === "Closed";
      const payload: {
        status: CrStatus;
        completed_date: string | null;
      } = {
        status,
        completed_date: isClosing
          ? resolution.completed_date ?? new Date().toISOString().slice(0, 10)
          : null,
      };
      const { error } = await supabase
        .from("customer_resolutions")
        .update(payload)
        .eq("id", resolution.id);
      if (error) throw error;
      await logHistory(
        resolution.id,
        "status_changed",
        `Status changed: ${resolution.status} → ${status}`,
        resolution.status,
        status,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      toast.success("Status updated");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CrStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
