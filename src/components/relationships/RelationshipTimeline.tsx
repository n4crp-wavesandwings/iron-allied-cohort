import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, MessageSquare, Phone, MapPin, StickyNote } from "lucide-react";
import { interactionsQueryOptions, interactionTypeLabel } from "@/lib/interactions";
import { followUpsQueryOptions } from "@/lib/followups";
import type { InteractionRow, InteractionType } from "@/lib/interactions";
import type { FollowUpRow } from "@/lib/followups";

type TimelineItem =
  | { kind: "interaction"; date: Date; data: InteractionRow }
  | { kind: "follow_up"; date: Date; data: FollowUpRow };

function interactionIcon(type: InteractionType) {
  switch (type) {
    case "meeting":
      return MessageSquare;
    case "call":
      return Phone;
    case "visit":
      return MapPin;
    case "note":
      return StickyNote;
    default:
      return MessageSquare;
  }
}

export function RelationshipTimeline({ entityId }: { entityId: string }) {
  const queryClient = useQueryClient();
  const interactions = useQuery(interactionsQueryOptions(entityId));
  const followUps = useQuery(followUpsQueryOptions(entityId));

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_ups", entityId] });
      toast.success("Follow-up completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (interactions.isLoading || followUps.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const items: TimelineItem[] = [
    ...(interactions.data ?? []).map(
      (i): TimelineItem => ({
        kind: "interaction",
        date: new Date(i.occurred_at),
        data: i,
      }),
    ),
    ...(followUps.data ?? []).map(
      (f): TimelineItem => ({
        kind: "follow_up",
        date: new Date(f.due_date),
        data: f,
      }),
    ),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No timeline yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        if (item.kind === "interaction") {
          const Icon = interactionIcon(item.data.type);
          return (
            <li
              key={`i-${item.data.id}`}
              className="flex gap-3 rounded-md border-l-4 border-l-primary bg-muted/30 p-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {interactionTypeLabel(item.data.type)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.date.toLocaleString()}
                  </span>
                </div>
                {item.data.body && (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.data.body}</p>
                )}
              </div>
            </li>
          );
        }
        const f = item.data;
        const isOpen = f.status === "open";
        return (
          <li
            key={`f-${f.id}`}
            className="flex gap-3 rounded-md border-l-4 border-l-amber-500 bg-amber-50/40 p-3 dark:bg-amber-950/20"
          >
            {isOpen ? (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={isOpen ? "outline" : "secondary"} className="text-xs">
                    Follow-up · {isOpen ? "Open" : "Done"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  Due {new Date(f.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{f.title}</p>
                {isOpen && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markDone.mutate(f.id)}
                    disabled={markDone.isPending}
                  >
                    Mark Done
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
