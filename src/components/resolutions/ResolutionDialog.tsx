import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import { relationshipsQueryOptions } from "@/lib/relationships";
import { storesQuery, districtsQuery } from "@/lib/locations";
import { programsQuery } from "@/lib/engagements";
import {
  resolutionCategoriesQuery,
  resolutionPrioritiesQuery,
  resolutionStatusesQuery,
} from "@/lib/resolutionLookups";
import { logHistory, type ResolutionRow } from "@/lib/resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolution?: ResolutionRow | null;
}

const NONE = "__none__";

// Map new priority name -> legacy enum (kept in sync for back-compat)
function legacyPriority(name?: string): "Low" | "Normal" | "High" | "Urgent" {
  switch (name) {
    case "Critical": return "Urgent";
    case "High": return "High";
    case "Medium": return "Normal";
    case "Low": return "Low";
    default: return "Normal";
  }
}
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

export function ResolutionDialog({ open, onOpenChange, resolution = null }: Props) {
  const isEdit = !!resolution;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const categories = useQuery({ ...resolutionCategoriesQuery, enabled: open });
  const priorities = useQuery({ ...resolutionPrioritiesQuery, enabled: open });
  const statuses = useQuery({ ...resolutionStatusesQuery, enabled: open });
  const relationships = useQuery({ ...relationshipsQueryOptions("all"), enabled: open });
  const storesData = useQuery({ ...storesQuery, enabled: open });
  const districtsData = useQuery({ ...districtsQuery, enabled: open });
  const programs = useQuery({ ...programsQuery, enabled: open });

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [statusId, setStatusId] = useState<string>("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerFirstInitial, setCustomerFirstInitial] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [generalIssue, setGeneralIssue] = useState("");
  const [commitments, setCommitments] = useState("");
  const [serviceProviderId, setServiceProviderId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState("");

  // Set defaults once lookups load (for new records only)
  useEffect(() => {
    if (!open) return;
    if (resolution) {
      setTitle(resolution.title);
      setCategoryId((resolution as any).category_id ?? "");
      setPriorityId((resolution as any).priority_id ?? "");
      setStatusId((resolution as any).status_id ?? "");
      setCustomerLastName(resolution.customer_last_name ?? "");
      setCustomerFirstInitial(resolution.customer_first_initial ?? "");
      setPoNumber((resolution as any).po_number ?? "");
      setOrderNumber((resolution as any).order_number ?? "");
      setGeneralIssue((resolution as any).general_issue ?? "");
      setCommitments((resolution as any).commitments ?? "");
      setServiceProviderId((resolution as any).service_provider_id ?? null);
      setStoreId((resolution as any).store_id ?? null);
      setProgramId((resolution as any).program_id ?? null);
    } else {
      setTitle("");
      setCategoryId("");
      setStatusId("");
      setPriorityId("");
      setCustomerLastName("");
      setCustomerFirstInitial("");
      setPoNumber("");
      setOrderNumber("");
      setGeneralIssue("");
      setCommitments("");
      setServiceProviderId(null);
      setStoreId(null);
      setProgramId(null);
    }
  }, [open, resolution]);

  // Default status → "Open", default priority → "Medium" when creating.
  useEffect(() => {
    if (!open || resolution) return;
    if (!statusId && statuses.data?.length) {
      const openS = statuses.data.find((s) => s.name === "Open") ?? statuses.data[0];
      if (openS) setStatusId(openS.id);
    }
    if (!priorityId && priorities.data?.length) {
      const med = priorities.data.find((p) => p.name === "Medium") ?? priorities.data[0];
      if (med) setPriorityId(med.id);
    }
  }, [open, resolution, statuses.data, priorities.data, statusId, priorityId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required.");
      if (!categoryId) throw new Error("Category is required.");
      if (!statusId) throw new Error("Status is required.");

      const priorityName = priorities.data?.find((p) => p.id === priorityId)?.name;
      const statusName = statuses.data?.find((s) => s.id === statusId)?.name;

      const payload: any = {
        title: title.trim(),
        category_id: categoryId,
        priority_id: priorityId || null,
        status_id: statusId,
        customer_last_name: customerLastName.trim() || null,
        customer_first_initial: customerFirstInitial.trim().charAt(0).toUpperCase() || null,
        po_number: poNumber.trim() || null,
        order_number: orderNumber.trim() || null,
        general_issue: generalIssue.trim() || null,
        commitments: commitments.trim() || null,
        service_provider_id: serviceProviderId,
        store_id: storeId,
        program_id: programId,
        // Legacy enum columns kept in sync for back-compat filters
        priority: legacyPriority(priorityName),
        status: legacyStatus(statusName),
      };

      if (isEdit && resolution) {
        const { error } = await supabase
          .from("customer_resolutions")
          .update(payload)
          .eq("id", resolution.id);
        if (error) throw error;
        await logHistory(resolution.id, "resolution_updated", `Resolution updated`);
        return resolution.id;
      }

      const { data: userRes } = await supabase.auth.getUser();
      payload.owner = userRes.user?.id ?? null;

      const { data, error } = await supabase
        .from("customer_resolutions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const newId = data.id;
      await logHistory(newId, "resolution_updated", `Resolution created`);
      return newId;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["resolutions"] });
      toast.success(isEdit ? "Resolution updated" : "Resolution created");
      onOpenChange(false);
      if (!isEdit && id) navigate({ to: "/resolutions/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const providers = (relationships.data ?? []).filter((r) => r.type === "provider");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer Resolution" : "Create Customer Resolution"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="cr_title">Title *</Label>
            <Input id="cr_title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(priorities.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        {p.severity_color && (
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.severity_color }}
                          />
                        )}
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(statuses.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-dashed p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Minimal customer reference — first initial + last name only. No full name, address, phone, email, or payment data.
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cr_init">First Initial</Label>
                <Input
                  id="cr_init"
                  maxLength={1}
                  value={customerFirstInitial}
                  onChange={(e) => setCustomerFirstInitial(e.target.value)}
                />
              </div>
              <div className="col-span-3 space-y-2">
                <Label htmlFor="cr_last">Last Name</Label>
                <Input id="cr_last" value={customerLastName} onChange={(e) => setCustomerLastName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cr_po">PO #</Label>
                <Input id="cr_po" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cr_order">Order #</Label>
                <Input id="cr_order" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Service Provider</Label>
              <Select
                value={serviceProviderId ?? NONE}
                onValueChange={(v) => setServiceProviderId(v === NONE ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {providers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Select value={programId ?? NONE} onValueChange={(v) => setProgramId(v === NONE ? null : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(programs.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Store</Label>
            <Input
              placeholder="Search by store # or name…"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
            />
            <Select value={storeId ?? NONE} onValueChange={(v) => setStoreId(v === NONE ? null : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {(storesData.data ?? [])
                  .filter((s) => {
                    if (!storeSearch) return true;
                    const q = storeSearch.toLowerCase();
                    return s.store_number.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q);
                  })
                  .slice(0, 100)
                  .map((s) => {
                    const d = (districtsData.data ?? []).find((x) => x.id === s.district_id);
                    const label = `Store ${s.store_number}${s.name ? " — " + s.name : s.city ? " — " + s.city : ""}${d ? " — District " + d.name : ""}`;
                    return <SelectItem key={s.id} value={s.id}>{label}</SelectItem>;
                  })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cr_issue">General Issue</Label>
            <Textarea id="cr_issue" rows={2} value={generalIssue} onChange={(e) => setGeneralIssue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr_commit">Commitments</Label>
            <Textarea id="cr_commit" rows={2} value={commitments} onChange={(e) => setCommitments(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
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
