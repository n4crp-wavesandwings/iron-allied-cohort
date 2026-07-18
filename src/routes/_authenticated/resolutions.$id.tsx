import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  customerIdentifier,
  logHistory,
  priorityBadgeClass,
  resolutionDetailQueryOptions,
  resolutionHistoryQueryOptions,
  resolutionPeopleQueryOptions,
  resolutionRelationshipsQueryOptions,
  resolutionTasksQueryOptions,
  type ResolutionPersonRow,
  type ResolutionTaskRow,
} from "@/lib/resolutions";
import {
  resolutionEngagementsQuery,
  resolutionStatusHistoryQuery,
} from "@/lib/resolutionLookups";
import { ResolutionDialog } from "@/components/resolutions/ResolutionDialog";
import { TaskDialog } from "@/components/resolutions/TaskDialog";
import { PersonDialog } from "@/components/resolutions/PersonDialog";
import { NoteDialog } from "@/components/resolutions/NoteDialog";
import { StatusChangeDialog } from "@/components/resolutions/StatusChangeDialog";
import { FollowUpDialog } from "@/components/relationships/FollowUpDialog";
import { EngagementDialog } from "@/components/engagements/EngagementDialog";

export const Route = createFileRoute("/_authenticated/resolutions/$id")({
  component: ResolutionDetail,
});

function ResolutionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const resolution = useQuery(resolutionDetailQueryOptions(id));
  const rels = useQuery(resolutionRelationshipsQueryOptions(id));
  const people = useQuery(resolutionPeopleQueryOptions(id));
  const tasks = useQuery(resolutionTasksQueryOptions(id));
  const history = useQuery(resolutionHistoryQueryOptions(id));
  const statusHistory = useQuery(resolutionStatusHistoryQuery(id));
  const linkedEngagements = useQuery(resolutionEngagementsQuery(id));

  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ResolutionTaskRow | null>(null);
  const [personOpen, setPersonOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ResolutionPersonRow | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [markResolvedOpen, setMarkResolvedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);

  const markTaskDone = useMutation({
    mutationFn: async (task: ResolutionTaskRow) => {
      const { error } = await supabase
        .from("customer_resolution_tasks")
        .update({ status: "Complete", completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;
      await logHistory(id, "task_completed", `Task completed: ${task.task}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions", id] });
      queryClient.invalidateQueries({ queryKey: ["resolutions", "list"] });
      queryClient.invalidateQueries({ queryKey: ["resolutions", "today"] });
      toast.success("Task completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePerson = useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase
        .from("customer_resolution_people")
        .delete()
        .eq("id", personId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions", id, "people"] });
      toast.success("Person removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markResolved = useMutation({
    mutationFn: async () => {
      if (!resolution.data) return;
      const { error } = await supabase
        .from("customer_resolutions")
        .update({
          status: "Resolved",
          completed_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", id);
      if (error) throw error;
      await logHistory(
        id,
        "status_changed",
        `Status changed: ${resolution.data.status} → Resolved`,
        resolution.data.status,
        "Resolved",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      toast.success("Marked as Resolved");
      setMarkResolvedOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const softDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("customer_resolutions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      toast.success("Resolution deleted");
      navigate({ to: "/resolutions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (resolution.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!resolution.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Resolution not found.</p>
        <Link to="/resolutions" className="text-sm underline">
          Back to list
        </Link>
      </div>
    );
  }

  const r = resolution.data;
  const provider = (rels.data ?? []).find((x) => x.role === "Service Provider");
  const store = (rels.data ?? []).find((x) => x.role === "Store");
  const others = (rels.data ?? []).filter((x) => x.role === "Other");
  const openTasks = (tasks.data ?? []).filter((t) => t.status !== "Complete");
  const completedTasks = (tasks.data ?? []).filter((t) => t.status === "Complete");
  const linkedEntityIds = (rels.data ?? []).map((x) => x.relationship_id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/resolutions"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All Resolutions
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {customerIdentifier(r)} — {r.title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Section A: Header info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Resolution</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label="Customer">{customerIdentifier(r)}</Field>
          <Field label="Category">{(r as any).category?.name ?? "—"}</Field>
          <Field label="Reference #">{r.reference_number ?? "—"}</Field>
          <Field label="Priority">
            {(r as any).priority_lookup ? (
              <Badge
                variant="outline"
                style={{
                  borderColor: (r as any).priority_lookup.severity_color ?? undefined,
                  color: (r as any).priority_lookup.severity_color ?? undefined,
                }}
              >
                {(r as any).priority_lookup.name}
              </Badge>
            ) : r.priority ? (
              <Badge className={priorityBadgeClass(r.priority)}>{r.priority}</Badge>
            ) : "—"}
          </Field>
          <Field label="Status">
            <Badge variant="outline">
              {(r as any).status_lookup?.name ?? r.status ?? "—"}
            </Badge>
          </Field>
          <Field label="Opened">
            {(r as any).opened_at
              ? new Date((r as any).opened_at).toLocaleDateString()
              : r.opened_date
                ? new Date(r.opened_date + "T00:00:00").toLocaleDateString()
                : "—"}
          </Field>
          <Field label="Closed">
            {(r as any).closed_at
              ? new Date((r as any).closed_at).toLocaleDateString()
              : "—"}
          </Field>
          <Field label="PO #">{(r as any).po_number ?? "—"}</Field>
          <Field label="Order #">{(r as any).order_number ?? "—"}</Field>
          <Field label="Program">{(r as any).program?.name ?? "—"}</Field>
          <Field label="General Issue">{(r as any).general_issue ?? "—"}</Field>
          <Field label="Owner">{(r as any).owner ?? "—"}</Field>
          <div className="md:col-span-3">
            <Field label="Commitments">
              <p className="whitespace-pre-wrap text-sm">{(r as any).commitments ?? "—"}</p>
            </Field>
          </div>
        </CardContent>
      </Card>


      {/* Section B: Related Relationships */}
      <Card>
        <CardHeader><CardTitle className="text-base">Related Relationships</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Service Provider: </span>
            {provider?.entity ? (
              <Link
                to="/relationships/$id"
                params={{ id: provider.entity.id }}
                className="hover:underline"
              >
                {provider.entity.name}
              </Link>
            ) : "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Store: </span>
            {store?.entity ? (
              <Link
                to="/relationships/$id"
                params={{ id: store.entity.id }}
                className="hover:underline"
              >
                {store.entity.name}
              </Link>
            ) : "—"}
          </div>
          {others.length > 0 && (
            <div>
              <span className="text-muted-foreground">Other: </span>
              {others.map((o, idx) => (
                <span key={o.id}>
                  {idx > 0 && ", "}
                  {o.entity?.name ?? "—"}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section C: People Involved */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">People Involved</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingPerson(null);
              setPersonOpen(true);
            }}
          >
            + Add Person
          </Button>
        </CardHeader>
        <CardContent>
          {(people.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No people added.</p>
          ) : (
            <ul className="space-y-2">
              {(people.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{p.person_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.person_role} · {p.manual_entry ? "Manual entry" : "Linked contact"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingPerson(p);
                        setPersonOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePerson.mutate(p.id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section D: Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Summary">
            <p className="whitespace-pre-wrap text-sm">{r.summary || "—"}</p>
          </Field>
          <Field label="Desired Resolution">
            <p className="whitespace-pre-wrap text-sm">{r.desired_resolution || "—"}</p>
          </Field>
        </CardContent>
      </Card>

      {/* Section E: Open Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Open Tasks</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingTask(null);
              setTaskOpen(true);
            }}
          >
            + Add Task
          </Button>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((t) => {
                const overdue = t.due_date && t.due_date < today;
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "rounded-md border p-3",
                      overdue && "border-destructive/50 bg-destructive/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.task}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.owner_name} — {t.owner_type}
                          {t.due_date && (
                            <>
                              {" · Due "}
                              <span className={overdue ? "font-medium text-destructive" : ""}>
                                {new Date(t.due_date + "T00:00:00").toLocaleDateString()}
                              </span>
                            </>
                          )}
                          {" · "}
                          <Badge variant="outline" className="ml-1 text-xs">{t.status}</Badge>
                        </p>
                        {t.waiting_on && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            Waiting on: {t.waiting_on}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTask(t);
                            setTaskOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markTaskDone.mutate(t)}
                          disabled={markTaskDone.isPending}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section F: Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader
            className="flex cursor-pointer flex-row items-center justify-between"
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
          >
            <CardTitle className="text-base">
              Completed Tasks ({completedTasks.length})
            </CardTitle>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showCompletedTasks && "rotate-180")}
            />
          </CardHeader>
          {showCompletedTasks && (
            <CardContent>
              <ul className="space-y-2">
                {completedTasks.map((t) => (
                  <li key={t.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{t.task}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.owner_name} · Completed{" "}
                      {t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}
                    </p>
                    {t.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                        {t.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Section G: Quick Actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setEngagementOpen(true)}>+ Log Engagement</Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingTask(null);
              setTaskOpen(true);
            }}
          >
            + Add Task
          </Button>
          <Button variant="outline" onClick={() => setNoteOpen(true)}>+ Add Update</Button>
          <Button variant="outline" onClick={() => setStatusOpen(true)}>Change Status</Button>
          <Button variant="outline" onClick={() => setFollowUpOpen(true)}>+ Create Follow-up</Button>
          <Button variant="default" onClick={() => setMarkResolvedOpen(true)}>Mark Resolved</Button>
        </CardContent>
      </Card>

      {/* Section: Linked Engagements Thread */}
      <Card>
        <CardHeader><CardTitle className="text-base">Engagement Thread</CardTitle></CardHeader>
        <CardContent>
          {(linkedEngagements.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No engagements linked yet. Use "Log Engagement" to capture a call, visit, or note.
            </p>
          ) : (
            <ul className="space-y-2">
              {(linkedEngagements.data ?? []).map((row: any) => {
                const e = row.engagement;
                if (!e) return null;
                return (
                  <li key={row.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to="/engagements/$id"
                        params={{ id: e.id }}
                        className="text-sm font-medium hover:underline"
                      >
                        {e.summary || "(no summary)"}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {e.occurred_at ? new Date(e.occurred_at).toLocaleString() : ""}
                      </span>
                    </div>
                    {e.notes && (
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                        {e.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section: Status History Trail */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
        <CardContent>
          {(statusHistory.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No status changes yet.</p>
          ) : (
            <ul className="space-y-2">
              {(statusHistory.data ?? []).map((h: any) => (
                <li key={h.id} className="rounded-md border-l-2 border-l-primary bg-muted/30 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {h.from_status?.name ?? "—"} → <strong>{h.to_status?.name ?? "—"}</strong>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Section H: History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
        <CardContent>
          {(history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="rounded-md border-l-2 border-l-primary bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {h.event_type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{h.event_description}</p>
                  {(h.previous_value || h.new_value) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.previous_value ?? "—"} → {h.new_value ?? "—"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>


      <ResolutionDialog open={editOpen} onOpenChange={setEditOpen} resolution={r} />
      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        resolutionId={id}
        task={editingTask}
      />
      <PersonDialog
        open={personOpen}
        onOpenChange={setPersonOpen}
        resolutionId={id}
        linkedEntityIds={linkedEntityIds}
        person={editingPerson}
      />
      <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} resolutionId={id} />
      <StatusChangeDialog open={statusOpen} onOpenChange={setStatusOpen} resolution={r} />
      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        entityId={provider?.relationship_id ?? store?.relationship_id ?? null}
      />

      <EngagementDialog
        open={engagementOpen}
        onOpenChange={setEngagementOpen}
        defaults={{
          resolutionId: id,
          entityId: provider?.relationship_id ?? undefined,
          storeId: store?.relationship_id ?? undefined,
        }}
      />

      <AlertDialog open={markResolvedOpen} onOpenChange={setMarkResolvedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Resolved?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the status to Resolved and stamp today's date as the completed date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => markResolved.mutate()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resolution?</AlertDialogTitle>
            <AlertDialogDescription>
              The record is preserved but hidden from all views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => softDelete.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
