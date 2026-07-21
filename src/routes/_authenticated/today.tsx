import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  priorityTasksQuery,
  contactsLastEngagementQuery,
  priorityRank,
  priorityBadgeClass,
  taskStatusLabel,
  taskEntitySummary,
  dueLabel,
  todayISO,
  contactFullName,
  type TaskItem,
  type TaskStatus,
} from "@/lib/tasks";
import { todayResolutionsQueryOptions, customerIdentifier, priorityBadgeClass as crPriorityBadge } from "@/lib/resolutions";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { QuickStartsStrip } from "@/components/quickstarts/QuickStartsStrip";
import { RelationshipDialog } from "@/components/relationships/RelationshipDialog";
import { EngagementDialog } from "@/components/engagements/EngagementDialog";
import { EngagementTimeline } from "@/components/engagements/EngagementTimeline";
import { recentEngagementsQuery } from "@/lib/engagements";
import { MyStoresCard } from "@/components/today/MyStoresCard";
import { ProviderQuickEngage } from "@/components/today/ProviderQuickEngage";
import { ProviderReconnect } from "@/components/today/ProviderReconnect";


export const Route = createFileRoute("/_authenticated/today")({
  component: TodayPage,
});

// --- Collapsible card with per-user persisted state ------------------------
function useCollapsed(key: string, defaultCollapsed = false) {
  const storageKey = `ia27.today.card.${key}`;
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v != null) setCollapsed(v === "1");
    } catch {}
  }, [storageKey]);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {}
      return next;
    });
  };
  return { collapsed, toggle };
}

function CollapsibleCard({
  cardKey,
  title,
  count,
  defaultCollapsed = false,
  children,
}: {
  cardKey: string;
  title: string;
  count?: number;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const { collapsed, toggle } = useCollapsed(cardKey, defaultCollapsed);
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={toggle}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {title}
          </span>
          {typeof count === "number" && count > 0 && (
            <Badge variant="secondary">{count}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      {!collapsed && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// --- Follow-up filter state + card ----------------------------------------

type FollowUpFilter = "overdue" | "today" | "upcoming" | null;

function FollowUpFilterCard({
  counts,
  active,
  onChange,
}: {
  counts: { overdue: number; today: number; upcoming: number };
  active: FollowUpFilter;
  onChange: (f: FollowUpFilter) => void;
}) {
  const items = [
    { key: "overdue" as const, label: "Overdue", count: counts.overdue },
    { key: "today" as const, label: "Due today", count: counts.today },
    { key: "upcoming" as const, label: "Upcoming", count: counts.upcoming },
  ];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChange(isActive ? null : item.key)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border p-4 text-center transition-colors active:scale-95",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted/50",
                )}
              >
                <span className="text-3xl font-semibold">{item.count}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </button>
            );
          })}
        </div>
        {active && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {active === "overdue" ? "overdue" : active === "today" ? "due today" : "upcoming"} follow-ups
            </span>
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Priority list (unified tasks + follow-ups) ---------------------------

function sortTasks(a: TaskItem, b: TaskItem): number {
  const t = todayISO();
  const aOverdue = a.due_date && a.due_date < t ? 0 : 1;
  const bOverdue = b.due_date && b.due_date < t ? 0 : 1;
  if (aOverdue !== bOverdue) return aOverdue - bOverdue;
  const aDate = a.due_date ?? "9999-12-31";
  const bDate = b.due_date ?? "9999-12-31";
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function TaskRow({ task, onStatus }: { task: TaskItem; onStatus: (id: string, s: TaskStatus) => void }) {
  const { label, overdue, today } = dueLabel(task.due_date);
  const summary = taskEntitySummary(task);
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between",
        overdue && "border-destructive/50 bg-destructive/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{task.title}</span>
          <Badge className={priorityBadgeClass(task.priority)}>{task.priority}</Badge>
          {task.status === "in_progress" && (
            <Badge variant="outline">In Progress</Badge>
          )}
          <Badge variant={overdue ? "destructive" : today ? "default" : "secondary"}>
            {overdue ? "Overdue · " : ""}
            {label}
          </Badge>
          {task.engagement_id && (
            <Badge variant="outline" className="text-xs">from engagement</Badge>
          )}
        </div>
        {summary && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{summary}</p>
        )}
      </div>
      <div className="flex flex-shrink-0 gap-2">
        {task.status !== "in_progress" && (
          <Button size="sm" variant="outline" onClick={() => onStatus(task.id, "in_progress")}>
            In Progress
          </Button>
        )}
        <Button size="sm" onClick={() => onStatus(task.id, "completed")}>
          Complete
        </Button>
      </div>
    </li>
  );
}

// --- Page ------------------------------------------------------------------

function TodayPage() {
  const qc = useQueryClient();
  const tasks = useQuery(priorityTasksQuery);
  const engagements = useQuery(recentEngagementsQuery);
  const resolutions = useQuery(todayResolutionsQueryOptions);
  const contactsLast = useQuery(contactsLastEngagementQuery);

  const [taskOpen, setTaskOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [engOpen, setEngOpen] = useState(false);
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>(null);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const patch: any = { status };
      if (status === "completed" || status === "done") patch.completed_at = new Date().toISOString();
      else patch.completed_at = null;
      const { error } = await supabase.from("follow_ups").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      toast.success(vars.status === "completed" ? "Marked complete" : "Marked in progress");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sorted = useMemo(() => (tasks.data ?? []).slice().sort(sortTasks), [tasks.data]);

  const today = todayISO();
  const overdueOrToday = sorted.filter((t) => !t.due_date || t.due_date <= today);
  const upcoming = sorted.filter((t) => t.due_date && t.due_date > today);
  const overdueCount = sorted.filter((t) => t.due_date && t.due_date < today).length;

  // --- Focus area data ---
  const csRows = sorted.filter((t) =>
    (t.category ?? "").toLowerCase().includes("customer") ||
    (t.title ?? "").toLowerCase().match(/hvc|customer/i),
  );

  const openResolutions = (resolutions.data ?? []) as any[];
  const providerRows = sorted.filter((t) =>
    (t.organizations ?? []).some((o) => o.entity?.type === "provider"),
  );

  // Relationships gap (30/60 day)
  const now = Date.now();
  const gapPeople = ((contactsLast.data ?? []) as any[])
    .map((c) => {
      const last = c.last_engagement_at ? new Date(c.last_engagement_at).getTime() : null;
      const days = last ? Math.floor((now - last) / 86_400_000) : null;
      return { ...c, gap_days: days };
    })
    .filter((c) => c.gap_days === null || c.gap_days >= 30)
    .sort((a, b) => {
      // never engaged first, then most-overdue
      if (a.gap_days === null && b.gap_days !== null) return -1;
      if (b.gap_days === null && a.gap_days !== null) return 1;
      return (b.gap_days ?? 0) - (a.gap_days ?? 0);
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prepare. Prioritize. Perform. Record. Follow through.
          </p>
        </div>
        <Button onClick={() => setTaskOpen(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Task
        </Button>
      </div>

      {/* Priority list — centerpiece */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Priority List</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {overdueCount > 0 && (
              <Badge variant="destructive">{overdueCount} overdue</Badge>
            )}
            <span>{sorted.length} open</span>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing on the board. Add a task to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {overdueOrToday.map((t) => (
                <TaskRow key={t.id} task={t} onStatus={(id, s) => setStatus.mutate({ id, status: s })} />
              ))}
              {upcoming.length > 0 && overdueOrToday.length > 0 && (
                <li className="pt-2 text-xs uppercase tracking-wide text-muted-foreground">Upcoming</li>
              )}
              {upcoming.map((t) => (
                <TaskRow key={t.id} task={t} onStatus={(id, s) => setStatus.mutate({ id, status: s })} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Starts */}
      <QuickStartsStrip />

      {/* My Stores glance card */}
      <MyStoresCard />

      {/* Provider Quick-Engage */}
      <CollapsibleCard cardKey="providers_quick" title="👷 Providers — Quick Engage">
        <ProviderQuickEngage />
      </CollapsibleCard>


      {/* Focus areas */}
      <CollapsibleCard cardKey="followup" title="🔄 Follow-up" count={sorted.length}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md border p-3">
            <div className="text-2xl font-semibold">{overdueCount}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-semibold">
              {sorted.filter((t) => t.due_date === today).length}
            </div>
            <div className="text-xs text-muted-foreground">Due today</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-semibold">{upcoming.length}</div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard cardKey="customer_service" title="❤️ Customer Service" count={csRows.length}>
        {csRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing flagged.</p>
        ) : (
          <ul className="space-y-2">
            {csRows.slice(0, 6).map((t) => (
              <li key={t.id} className="rounded-md border p-2 text-sm">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{taskEntitySummary(t)}</div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      <CollapsibleCard cardKey="customer_resolution" title="🛠 Customer Resolution" count={openResolutions.length}>
        {openResolutions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open resolutions.</p>
        ) : (
          <ul className="space-y-2">
            {openResolutions.slice(0, 8).map((r: any) => {
              const waitingTasks = (r.tasks ?? []).filter((t: any) => t.status === "Waiting");
              const waitingOn =
                waitingTasks.length > 0
                  ? Array.from(new Set(waitingTasks.map((t: any) => t.waiting_on ?? t.owner_name).filter(Boolean))).join(", ")
                  : null;
              return (
                <li key={r.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {customerIdentifier(r)} — {r.title}
                      </span>
                      <Badge className={crPriorityBadge(r.priority)}>{r.priority}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: {r.status}
                      {waitingOn && <> · Waiting on {waitingOn}</>}
                    </div>
                  </div>
                  <Link to="/resolutions/$id" params={{ id: r.id }} className="text-xs underline">
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleCard>

      <CollapsibleCard cardKey="providers" title="👷 Service Provider Management" count={providerRows.length}>
        {providerRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No provider action items right now.</p>
        ) : (
          <ul className="space-y-2">
            {providerRows.slice(0, 6).map((t) => (
              <li key={t.id} className="rounded-md border p-2 text-sm">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{taskEntitySummary(t)}</div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      <CollapsibleCard cardKey="relationships" title="🤝 Relationships (Reconnect)">
        <ProviderReconnect />
      </CollapsibleCard>


      <CollapsibleCard cardKey="recent_engagements" title="💬 Recent Engagements" defaultCollapsed>
        {engagements.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <EngagementTimeline items={(engagements.data ?? []).slice(0, 10)} />
        )}
      </CollapsibleCard>

      {/* Quick Add row */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Add</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setEngOpen(true)}>+ New Engagement</Button>
          <Button variant="outline" onClick={() => setTaskOpen(true)}>+ New Task</Button>
          <Button variant="outline" onClick={() => setRelOpen(true)}>+ New Relationship</Button>
        </CardContent>
      </Card>

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
      <EngagementDialog open={engOpen} onOpenChange={setEngOpen} />
      <RelationshipDialog open={relOpen} onOpenChange={setRelOpen} />
    </div>
  );
}
