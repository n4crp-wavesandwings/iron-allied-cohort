import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUSES = ["Active", "Prospect", "Former"] as const;
type Status = (typeof STATUSES)[number];

export function NewProviderDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("Active");
  const [hq, setHq] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setStatus("Active");
      setHq("");
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Provider name is required.");
      const payload: any = {
        type: "provider",
        organization_type: "Service Provider",
        name: trimmed,
        status,
        active: status === "Active",
        primary_location: hq.trim() || null,
      };
      const { data, error } = await supabase
        .from("entities")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data!.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      toast.success("Service Provider created");
      onOpenChange(false);
      navigate({ to: "/relationships/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Service Provider</DialogTitle>
          <DialogDescription>
            Just the essentials. Fill in contacts, coverage, and programs on the profile.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="np_name">Provider Name *</Label>
            <Input
              id="np_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="np_hq">Headquarters (city, state)</Label>
            <Input
              id="np_hq"
              value={hq}
              onChange={(e) => setHq(e.target.value)}
              placeholder="Optional"
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
              {mutation.isPending ? "Saving…" : "Create Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
