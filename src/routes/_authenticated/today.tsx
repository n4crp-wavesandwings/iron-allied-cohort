import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  openDueFollowUpsQueryOptions,
  recentInteractionsQueryOptions,
  formatDueLabel,
} from "@/lib/followups";
import { interactionTypeLabel } from "@/lib/interactions";
import { relationshipsQueryOptions } from "@/lib/relationships";
import {
  customerIdentifier,
  priorityBadgeClass,
  todayResolutionsQueryOptions,
} from "@/lib/resolutions";
import { RelationshipDialog } from "@/components/relationships/RelationshipDialog";
import { FollowUpDialog } from "@/components/relationships/FollowUpDialog";
import { InteractionForm } from "@/components/relationships/InteractionForm";

export const Route = createFileRoute("/_authenticated/today")({
  component: TodayPage,
});

function TodayPage() {
  const queryClient = useQueryClient();
  const followUps = useQuery(openDueFollowUpsQueryOptions);
  const interactions = useQuery(recentInteractionsQueryOptions);
  const resolutionsToday = useQuery(todayResolutionsQueryOptions);

  const [newRelOpen, setNewRelOpen] = useState(false);
  const [newFollowUpOpen, setNewFollowUpOpen] = useState(false);
  const [newInteractionOpen, setNewInteractionOpen] = useState(false);
  const [interactionEntity, setInteractionEntity] = useState<string>("");

  const markDone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow_ups"] });
      toast.success("Follow-up completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prepare. Prioritize. Perform. Record. Follow through.
        </p>
      </div>

      {/* Section 1: Open Follow-Ups Due Today or Overdue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Follow-Ups</CardTitle>
        </CardHeader>
        <CardContent>
          {followUps.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !followUps.data || followUps.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups due today or overdue. You're all caught up!
            </p>
          ) : (
            <ul className="space-y-2">
              {followUps.data.map((f) => {
                const { label, overdue } = formatDueLabel(f.due_date);
                const entity = (f as { entity?: { id: string; name: string } | null })
                  .entity;
                const interaction = (
                  f as { interaction?: { id: string; type: string } | null }
                ).interaction;
                return (
                  <li
                    key={f.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-md border p-3",
                      overdue &&
                        "border-destructive/50 bg-destructive/5",
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{f.title}</span>
                        <Badge
                          variant={overdue ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {overdue ? "Overdue · " : ""}
                          {label}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {entity ? (
                          <Link
                            to="/relationships/$id"
                            params={{ id: entity.id }}
                            className="hover:underline"
                          >
                            {entity.name}
                          </Link>
                        ) : (
                          "No relationship"
                        )}
                        {interaction && (
                          <>
                            {" · "}
                            {interactionTypeLabel(
                              interaction.type as Parameters<
                                typeof interactionTypeLabel
                              >[0],
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markDone.mutate(f.id)}
                      disabled={markDone.isPending}
                    >
                      Mark Done
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section 1b: Customer Resolutions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Resolutions</CardTitle>
        </CardHeader>
        <CardContent>
          <ResolutionsTodaySection resolutions={resolutionsToday.data ?? []} isLoading={resolutionsToday.isLoading} />
        </CardContent>
      </Card>

      {/* Section 2: Recent Interactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Interactions</CardTitle>
        </CardHeader>
        <CardContent>
          {interactions.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !interactions.data || interactions.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions yet.</p>
          ) : (
            <ul className="space-y-2">
              {interactions.data.map((i) => {
                const entity = (i as { entity?: { id: string; name: string } | null })
                  .entity;
                return (
                  <li key={i.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {interactionTypeLabel(i.type)}
                        </Badge>
                        {entity && (
                          <Link
                            to="/relationships/$id"
                            params={{ id: entity.id }}
                            className="text-sm font-medium hover:underline"
                          >
                            {entity.name}
                          </Link>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.occurred_at).toLocaleString()}
                      </span>
                    </div>
                    {i.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {i.body}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Quick Add Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Add</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setNewRelOpen(true)}>+ New Relationship</Button>
          <Button
            onClick={() => {
              setInteractionEntity("");
              setNewInteractionOpen(true);
            }}
          >
            + New Interaction
          </Button>
          <Button onClick={() => setNewFollowUpOpen(true)}>+ New Follow-Up</Button>
        </CardContent>
      </Card>

      <RelationshipDialog open={newRelOpen} onOpenChange={setNewRelOpen} />
      <FollowUpDialog open={newFollowUpOpen} onOpenChange={setNewFollowUpOpen} />
      <NewInteractionDialog
        open={newInteractionOpen}
        onOpenChange={setNewInteractionOpen}
        entityId={interactionEntity}
        onEntityChange={setInteractionEntity}
      />
    </div>
  );
}

function NewInteractionDialog({
  open,
  onOpenChange,
  entityId,
  onEntityChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  onEntityChange: (id: string) => void;
}) {
  const relationships = useQuery({
    ...relationshipsQueryOptions("all"),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Relationship *</Label>
          <Select value={entityId} onValueChange={onEntityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a relationship" />
            </SelectTrigger>
            <SelectContent>
              {(relationships.data ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {entityId ? (
          <InteractionForm entityId={entityId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a relationship above to log an interaction.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

type TodayResolution = NonNullable<ReturnType<typeof todayResolutionsQueryOptions.queryFn>> extends Promise<infer T>
  ? T extends Array<infer U>
    ? U
    : never
  : never;

function ResolutionsTodaySection({
  resolutions,
  isLoading,
}: {
  resolutions: TodayResolution[];
  isLoading: boolean;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const today = new Date().toISOString().slice(0, 10);
  const filtered = resolutions.filter((r) => {
    const isHighPriority = r.priority === "Urgent" || r.priority === "High";
    const overdueTasks = (r.tasks ?? []).some(
      (t) =>
        (t.status === "Open" || t.status === "Waiting") &&
        t.due_date &&
        t.due_date < today,
    );
    const myTaskDueToday = (r.tasks ?? []).some(
      (t) =>
        t.owner_type === "Me" &&
        (t.status === "Open" || t.status === "Waiting") &&
        t.due_date &&
        t.due_date <= today,
    );
    return isHighPriority || overdueTasks || myTaskDueToday;
  });

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No urgent Customer Resolutions or overdue tasks.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {filtered.map((r) => {
        const openTasks = (r.tasks ?? []).filter(
          (t) => t.status === "Open" || t.status === "Waiting",
        );
        const nextTask =
          openTasks.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0] ?? null;
        return (
          <li key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {customerIdentifier(r)} — {r.title}
                </span>
                <Badge className={priorityBadgeClass(r.priority)}>{r.priority}</Badge>
              </div>
              {nextTask && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextTask.task}
                  {nextTask.due_date && (
                    <> · Due {new Date(nextTask.due_date + "T00:00:00").toLocaleDateString()}</>
                  )}
                </p>
              )}
            </div>
            <Link
              to="/resolutions/$id"
              params={{ id: r.id }}
              className="text-sm underline"
            >
              View
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
