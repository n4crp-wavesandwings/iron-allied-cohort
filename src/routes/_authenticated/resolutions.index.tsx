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
import { customerIdentifier, resolutionsListQueryOptions } from "@/lib/resolutions";
import {
  resolutionPrioritiesQuery,
  resolutionStatusesQuery,
} from "@/lib/resolutionLookups";
import { relationshipsQueryOptions } from "@/lib/relationships";
import { ResolutionDialog } from "@/components/resolutions/ResolutionDialog";

export const Route = createFileRoute("/_authenticated/resolutions/")({
  component: ResolutionsList,
});

const ALL = "All";
type Grouping = "Open" | "Resolved/Closed" | "All";
type YesNo = "All" | "Yes" | "No";

function ResolutionsList() {
  const list = useQuery(resolutionsListQueryOptions);
  const priorities = useQuery(resolutionPrioritiesQuery);
  const statuses = useQuery(resolutionStatusesQuery);
  const relationships = useQuery(relationshipsQueryOptions("all"));
  const [openCreate, setOpenCreate] = useState(false);

  const [group, setGroup] = useState<Grouping>("Open");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [providerFilter, setProviderFilter] = useState<string>(ALL);
  const [waitingMe, setWaitingMe] = useState<YesNo>("All");
  const [waitingOthers, setWaitingOthers] = useState<YesNo>("All");

  const providers = (relationships.data ?? []).filter((r) => r.type === "provider");

  const rows = useMemo(() => {
    const data: any[] = list.data ?? [];
    return data
      .filter((r) => {
        const isClosed = r.status_lookup?.is_closed ?? false;
        if (group === "Open") return !isClosed;
        if (group === "Resolved/Closed") return isClosed;
        return true;
      })
      .filter((r) => (statusFilter === ALL ? true : r.status_id === statusFilter))
      .filter((r) => (priorityFilter === ALL ? true : r.priority_id === priorityFilter))
      .filter((r) => {
        if (providerFilter === ALL) return true;
        if (r.service_provider_id === providerFilter) return true;
        return (r.relationships ?? []).some(
          (rel: any) => rel.role === "Service Provider" && rel.relationship_id === providerFilter,
        );
      })
      .filter((r) => {
        if (waitingMe === "All") return true;
        const has = (r.tasks ?? []).some(
          (t: any) => t.owner_type === "Me" && (t.status === "Open" || t.status === "Waiting"),
        );
        return waitingMe === "Yes" ? has : !has;
      })
      .filter((r) => {
        if (waitingOthers === "All") return true;
        const has = (r.tasks ?? []).some(
          (t: any) => t.owner_type !== "Me" && (t.status === "Open" || t.status === "Waiting"),
        );
        return waitingOthers === "Yes" ? has : !has;
      })
      .sort((a, b) => {
        const ap = a.priority_lookup?.sort_order ?? 999;
        const bp = b.priority_lookup?.sort_order ?? 999;
        // higher priority (Critical=40) surfaces first — descending sort_order
        if (ap !== bp) return bp - ap;
        const at = a.opened_at ?? a.opened_date ?? "";
        const bt = b.opened_at ?? b.opened_date ?? "";
        return bt.localeCompare(at);
      });
  }, [list.data, group, statusFilter, priorityFilter, providerFilter, waitingMe, waitingOthers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Resolutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Coordinate and track customer issues from open through resolved.
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
            <Label className="text-xs">View</Label>
            <Select value={group} onValueChange={(v) => setGroup(v as Grouping)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Resolved/Closed">Resolved / Closed</SelectItem>
                <SelectItem value="All">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(statuses.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {(priorities.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
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
              No resolutions match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to="/resolutions/$id" params={{ id: r.id }} className="font-medium hover:underline">
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customerIdentifier(r)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.category?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.store ? `Store ${r.store.store_number}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.provider?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.priority_lookup ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: r.priority_lookup.severity_color ?? undefined,
                            color: r.priority_lookup.severity_color ?? undefined,
                          }}
                        >
                          {r.priority_lookup.name}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status_lookup?.is_closed ? "secondary" : "outline"}>
                        {r.status_lookup?.name ?? r.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.opened_at
                        ? new Date(r.opened_at).toLocaleDateString()
                        : r.opened_date
                          ? new Date(r.opened_date + "T00:00:00").toLocaleDateString()
                          : "—"}
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
