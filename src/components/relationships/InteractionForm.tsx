import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { INTERACTION_TYPES, type InteractionType } from "@/lib/interactions";

function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function InteractionForm({ entityId }: { entityId: string }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<InteractionType | "">("");
  const [body, setBody] = useState("");
  const [occurredAt, setOccurredAt] = useState<string>(nowLocalInput());

  const mutation = useMutation({
    mutationFn: async () => {
      if (!type) throw new Error("Interaction Type is required.");
      if (!body.trim()) throw new Error("Notes are required.");
      const { error } = await supabase.from("interactions").insert({
        entity_id: entityId,
        type,
        body: body.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
        source: "human",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions", entityId] });
      toast.success("Interaction logged");
      setType("");
      setBody("");
      setOccurredAt(nowLocalInput());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="space-y-2">
        <Label>Interaction Type *</Label>
        <Select value={type} onValueChange={(v) => setType(v as InteractionType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {INTERACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Notes *</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="occurred_at">Date & Time</Label>
        <Input
          id="occurred_at"
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Log Interaction"}
      </Button>
    </form>
  );
}
