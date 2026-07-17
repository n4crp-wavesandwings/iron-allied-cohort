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
  CR_TASK_OWNER_TYPES,
  CR_TASK_STATUSES,
  logHistory,
  type CrTaskOwnerType,
  type CrTaskStatus,
  type ResolutionTaskRow,
} from "@/lib/resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolutionId: string;
  task?: ResolutionTaskRow | null;
}

export function TaskDialog({ open, onOpenChange, resolutionId, task = null }: Props) {
  const isEdit = !!task;
  const queryClient = useQueryClient();
  const [taskText, setTaskText] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerType, setOwnerType] = useState<CrTaskOwnerType>("Me");
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<CrTaskStatus>("Open");
  const [waitingOn, setWaitingOn] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState<string>("");
  const [actualCompletionDate, setActualCompletionDate] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTaskText(task.task);
      setOwnerName(task.owner_name);
      setOwnerType(task.owner_type);
      setDueDate(task.due_date ?? "");
      setStatus(task.status);
      setWaitingOn(task.waiting_on ?? "");
      setNotes(task.notes ?? "");
      setEstimatedCompletionDate((task as any).estimated_completion_date ?? "");
      setActualCompletionDate((task as any).actual_completion_date ?? "");
    } else {
      setTaskText("");
      setOwnerName("");
      setOwnerType("Me");
      setDueDate("");
      setStatus("Open");
      setWaitingOn("");
      setNotes("");
      setEstimatedCompletionDate("");
      setActualCompletionDate("");
    }
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!taskText.trim()) throw new Error("Task is required.");
      if (!ownerName.trim()) throw new Error("Owner name is required.");
      const payload = {
        resolution_id: resolutionId,
        task: taskText.trim(),
        owner_name: ownerName.trim(),
        owner_type: ownerType,
        due_date: dueDate || null,
        status,
        waiting_on: waitingOn.trim() || null,
        notes: notes.trim() || null,
        estimated_completion_date: estimatedCompletionDate || null,
        actual_completion_date:
          status === "Complete"
            ? actualCompletionDate || (task?.actual_completion_date as string | undefined) ||
              new Date().toISOString().slice(0, 10)
            : actualCompletionDate || null,
        completed_at:
          status === "Complete"
            ? task?.completed_at ?? new Date().toISOString()
            : null,
      };
      if (isEdit && task) {
        const { error } = await supabase
          .from("customer_resolution_tasks")
          .update(payload)
          .eq("id", task.id);
        if (error) throw error;
        await logHistory(
          resolutionId,
          status === "Complete" && task.status !== "Complete" ? "task_completed" : "task_created",
          status === "Complete" && task.status !== "Complete"
            ? `Task completed: ${payload.task}`
            : `Task updated: ${payload.task}`,
        );
      } else {
        const { error } = await supabase.from("customer_resolution_tasks").insert(payload);
        if (error) throw error;
        await logHistory(resolutionId, "task_created", `Task created: ${payload.task}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions", resolutionId] });
      queryClient.invalidateQueries({ queryKey: ["resolutions", "list"] });
      queryClient.invalidateQueries({ queryKey: ["resolutions", "today"] });
      toast.success(isEdit ? "Task updated" : "Task created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="t_task">Task / Next Step *</Label>
            <Textarea
              id="t_task"
              rows={2}
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t_owner">Owner Name *</Label>
              <Input
                id="t_owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Owner Type *</Label>
              <Select value={ownerType} onValueChange={(v) => setOwnerType(v as CrTaskOwnerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CR_TASK_OWNER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="t_due">Due Date</Label>
              <Input
                id="t_due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CrTaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CR_TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="t_waiting">Waiting On</Label>
            <Input
              id="t_waiting"
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t_notes">Notes</Label>
            <Textarea id="t_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
