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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolutionStatusesQuery } from "@/lib/resolutionLookups";
import { logHistory, type ResolutionRow } from "@/lib/resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolution: ResolutionRow;
}

// Map new status name → legacy enum for back-compat
function legacyStatus(name?: string): "New" | "In Progress" | "Waiting" | "Resolved" | "Closed" {
  switch (name) {
    case "Open": return "New";
    case "Waiting on Store":
    case "Waiting on Provider":
    case "Waiting on Customer": return "Waiting";
    case "Scheduled Visit":
    case "Corporate Review": return "In Progress";
    case "Resolved": return "Resolved";
    case "Closed": return "Closed";
    default: return "New";
  }
}

export function StatusChangeDialog({ open, onOpenChange, resolution }: Props) {
  const queryClient = useQueryClient();
  const statuses = useQuery({ ...resolutionStatusesQuery, enabled: open });
  const [statusId, setStatusId] = useState<string>((resolution as any).status_id ?? "");

  useEffect(() => {
    if (open) setStatusId((resolution as any).status_id ?? "");
  }, [open, resolution]);

  const mutation = useMutation({
    mutationFn: async () => {
      const currentId = (resolution as any).status_id ?? null;
      if (!statusId || statusId === currentId) return;
      const newName = statuses.data?.find((s) => s.id === statusId)?.name;
      const { error } = await supabase
        .from("customer_resolutions")
        .update({
          status_id: statusId,
          status: legacyStatus(newName),
        })
        .eq("id", resolution.id);
      if (error) throw error;
      const oldName = statuses.data?.find((s) => s.id === currentId)?.name ?? resolution.status ?? "—";
      await logHistory(
        resolution.id,
        "status_changed",
        `Status changed: ${oldName} → ${newName}`,
        oldName,
        newName,
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
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(statuses.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
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
