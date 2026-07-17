import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CR_PRIORITIES,
  CR_STATUSES,
  customerIdentifier,
  priorityBadgeClass,
  priorityRank,
  resolutionsListQueryOptions,
  type CrPriority,
  type CrStatus,
} from "@/lib/resolutions";
import { relationshipsQueryOptions } from "@/lib/relationships";
import { ResolutionDialog } from "@/components/resolutions/ResolutionDialog";

export const Route = createFileRoute("/_authenticated/resolutions/")({
  component: ResolutionsList,
});

type StatusFilter = "All" | CrStatus;
type PriorityFilter = "All" | CrPriority;
type YesNo = "All" | "Yes" | "No";
const ALL = "All";

function ResolutionsList() {
  const list = useQuery(resolutionsListQueryOptions);
  const relationships = useQuery(relationshipsQueryOptions("all"));
  const [openCreate, setOpenCreate] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [providerFilter, setProviderFilter] = useState<string>(ALL);
  const [storeFilter, setStoreFilter] = useState<string>(ALL);
  const [waitingMe, setWaitingMe] = useState<YesNo>("All");
  const [waitingOthers, setWaitingOthers] = useState<YesNo>("All");

  const providers = (relationships.data ?? []).filter((r) => r.type === "provider");
  const stores = (relationships.data ?? []).filter((r) => r.type === "store");

  const rows = useMemo(() => {
    type Row = NonNullable<typeof list.data>[number];
    const data: Row[] = list.data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    return data
      .filter((r) => (statusFilter === "All" ? true : r.status === statusFilter))
      .filter((r) => (priorityFilter === "All" ? true : r.priority === priorityFilter))
      .filter((r) => {
        if (providerFilter === ALL) return true;
        return (r.relationships ?? []).some(
          (rel) => rel.role === "Service Provider" && rel.relationship_id === providerFilter,
        );
      })
      .filter((r) => {
        if (storeFilter === ALL) return true;
        return (r.relationships ?? []).some(
          (rel) => rel.role === "Store" && rel.relationship_id === storeFilter,
        );
      })
      .filter((r) => {
        if (waitingMe === "All") return true;
        const has = (r.tasks ?? []).some(
          (t) => t.owner_type === "Me" && (t.status === "Open" || t.status === "Waiting"),
        );
        return waitingMe === "Yes" ? has : !has;
      })
      .filter((r) => {
        if (waitingOthers === "All") return true;
        const has = (r.tasks ?? []).some(
          (t) => t.owner_type !== "Me" && (t.status === "Open" || t.status === "Waiting"),
        );
        return waitingOthers === "Yes" ? has : !has;
      })
      .sort((a, b) => {
        const at = a.target_date ?? "9999-12-31";
        const bt = b.target_date ?? "9999-12-31";
        if (at !== bt) return at.localeCompare(bt);
        return priorityRank(a.priority) - priorityRank(b.priority);
      })
      .map((r) => {
        const rels = r.relationships ?? [];
        const provider = rels.find((x) => x.role === "Service Provider")?.entity;
        const store = rels.find((x) => x.role === "Store")?.entity;
        const openTasks = (r.tasks ?? []).filter(
          (t) => t.status === "Open" || t.status === "Waiting",
        );
        const nextTask =
          openTasks.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0] ?? null;
        return { r, provider, store, nextTask, today };
      });
  }, [list.data, statusFilter, priorityFilter, providerFilter, storeFilter, waitingMe, waitingOthers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Resolutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coordinate and track customer issues.
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>+ Create Resolution</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {CR_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {CR_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Service Provider</Label>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Store</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Waiting on Me</Label>
            <Select value={waitingMe} onValueChange={(v) => setWaitingMe(v as YesNo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Waiting on Others</Label>
            <Select value={waitingOthers} onValueChange={(v) => setWaitingOthers(v as YesNo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No Customer Resolutions yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Service Provider</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Open Task</TableHead>
                  <TableHead>Task Owner</TableHead>
                  <TableHead>Target Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ r, provider, store, nextTask }) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      // navigate via anchor
                    }}
                  >
                    <TableCell>
                      <Link
                        to="/resolutions/$id"
                        params={{ id: r.id }}
                        className="font-medium hover:underline"
                      >
                        {customerIdentifier(r)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to="/resolutions/$id" params={{ id: r.id }} className="hover:underline">
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{provider?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{store?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={priorityBadgeClass(r.priority)}>{r.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{nextTask?.task ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {nextTask ? `${nextTask.owner_name} (${nextTask.owner_type})` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.target_date ? new Date(r.target_date + "T00:00:00").toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ResolutionDialog open={openCreate} onOpenChange={setOpenCreate} />
    </div>
  );
}
