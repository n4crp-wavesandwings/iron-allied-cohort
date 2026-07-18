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
import {
  CR_ESCALATION_LEVELS,
  CR_PRIORITIES,
  CR_RESOLUTION_TYPES,
  CR_SEVERITIES,
  CR_STATUSES,
  logHistory,
  type CrEscalationLevel,
  type CrPriority,
  type CrResolutionType,
  type CrSeverity,
  type CrStatus,
  type ResolutionRow,
} from "@/lib/resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolution?: ResolutionRow | null;
}

const NONE = "__none__";

export function ResolutionDialog({ open, onOpenChange, resolution = null }: Props) {
  const isEdit = !!resolution;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [customerLastName, setCustomerLastName] = useState("");
  const [customerFirstInitial, setCustomerFirstInitial] = useState("");
  const [title, setTitle] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [priority, setPriority] = useState<CrPriority>("Normal");
  const [status, setStatus] = useState<CrStatus>("New");
  const [serviceProviderId, setServiceProviderId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [desiredResolution, setDesiredResolution] = useState("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [severity, setSeverity] = useState<CrSeverity | "">("");
  const [resolutionType, setResolutionType] = useState<CrResolutionType | "">("");
  const [escalationLevel, setEscalationLevel] = useState<CrEscalationLevel | "">("");

  const relationships = useQuery({ ...relationshipsQueryOptions("all"), enabled: open });
  const storesData = useQuery({ ...storesQuery, enabled: open });
  const districtsData = useQuery({ ...districtsQuery, enabled: open });
  const [storeSearch, setStoreSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    if (resolution) {
      setCustomerLastName(resolution.customer_last_name ?? "");
      setCustomerFirstInitial(resolution.customer_first_initial ?? "");
      setTitle(resolution.title);
      setReferenceNumber(resolution.reference_number ?? "");
      setPriority(resolution.priority ?? "Normal");
      setStatus(resolution.status ?? "New");
      setSummary(resolution.summary ?? "");
      setDesiredResolution(resolution.desired_resolution ?? "");
      setTargetDate(resolution.target_date ?? "");
      setSeverity(((resolution as any).severity as CrSeverity) ?? "");
      setResolutionType(((resolution as any).resolution_type as CrResolutionType) ?? "");
      setEscalationLevel(((resolution as any).escalation_level as CrEscalationLevel) ?? "");
      setStoreId(((resolution as any).store_id as string) ?? null);
    } else {
      setCustomerLastName("");
      setCustomerFirstInitial("");
      setTitle("");
      setReferenceNumber("");
      setPriority("Normal");
      setStatus("New");
      setServiceProviderId(null);
      setStoreId(null);
      setSummary("");
      setDesiredResolution("");
      setTargetDate("");
      setSeverity("");
      setResolutionType("");
      setEscalationLevel("");
    }
  }, [open, resolution]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!customerLastName.trim()) throw new Error("Customer last name is required.");
      if (!customerFirstInitial.trim()) throw new Error("Customer first initial is required.");
      if (!title.trim()) throw new Error("Title is required.");

      const payload = {
        title: title.trim(),
        customer_last_name: customerLastName.trim(),
        customer_first_initial: customerFirstInitial.trim().charAt(0).toUpperCase(),
        reference_number: referenceNumber.trim() || null,
        priority,
        status,
        summary: summary.trim() || null,
        desired_resolution: desiredResolution.trim() || null,
        target_date: targetDate || null,
        severity: severity || null,
        resolution_type: resolutionType || null,
        escalation_level: escalationLevel || null,
        store_id: storeId,
        completed_date:
          status === "Resolved" || status === "Closed"
            ? resolution?.completed_date ?? new Date().toISOString().slice(0, 10)
            : null,
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

      const { data, error } = await supabase
        .from("customer_resolutions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const newId = data.id;

      // Link Service Provider (Store is now stored on store_id, not the relationship link)
      const links: { resolution_id: string; relationship_id: string; role: "Service Provider" }[] = [];
      if (serviceProviderId)
        links.push({ resolution_id: newId, relationship_id: serviceProviderId, role: "Service Provider" });
      if (links.length) {
        const { error: relErr } = await supabase
          .from("customer_resolution_relationships")
          .insert(links);
        if (relErr) throw relErr;
      }

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr_last">Customer Last Name *</Label>
              <Input
                id="cr_last"
                value={customerLastName}
                onChange={(e) => setCustomerLastName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr_init">First Initial *</Label>
              <Input
                id="cr_init"
                maxLength={1}
                value={customerFirstInitial}
                onChange={(e) => setCustomerFirstInitial(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr_title">Title *</Label>
            <Input id="cr_title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr_ref">Reference Number</Label>
            <Input id="cr_ref" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CrPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CR_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CrStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CR_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Service Provider</Label>
                <Select
                  value={serviceProviderId ?? NONE}
                  onValueChange={(v) => setServiceProviderId(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {(relationships.data ?? [])
                      .filter((r) => r.type === "provider")
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Store</Label>
                <Input
                  placeholder="Search by store # or name…"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                />
                <Select
                  value={storeId ?? NONE}
                  onValueChange={(v) => setStoreId(v === NONE ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
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
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cr_summary">Summary</Label>
            <Textarea id="cr_summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr_desired">Desired Resolution</Label>
            <Textarea
              id="cr_desired"
              rows={3}
              value={desiredResolution}
              onChange={(e) => setDesiredResolution(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr_target">Target Date</Label>
            <Input
              id="cr_target"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as CrSeverity)}>
                <SelectTrigger>
                  <SelectValue placeholder="Not categorized" />
                </SelectTrigger>
                <SelectContent>
                  {CR_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution Type</Label>
              <Select
                value={resolutionType}
                onValueChange={(v) => setResolutionType(v as CrResolutionType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not categorized" />
                </SelectTrigger>
                <SelectContent>
                  {CR_RESOLUTION_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Escalation Level</Label>
            <Select
              value={escalationLevel}
              onValueChange={(v) => setEscalationLevel(v as CrEscalationLevel)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not escalated" />
              </SelectTrigger>
              <SelectContent>
                {CR_ESCALATION_LEVELS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              Opened Date: {new Date().toLocaleDateString()}
            </p>
          )}
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
