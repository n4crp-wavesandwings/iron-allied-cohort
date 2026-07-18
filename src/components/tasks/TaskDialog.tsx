import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskStatus,
  allContactsQuery,
  providerEntitiesQuery,
  contactFullName,
  todayISO,
} from "@/lib/tasks";
import { storesQuery } from "@/lib/locations";
import { programsQuery } from "@/lib/engagements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: {
    contactId?: string;
    storeId?: string;
    entityId?: string;
    programId?: string;
    title?: string;
  };
}

function MultiPicker<T extends { id: string }>({
  label,
  options,
  labelFor,
  values,
  onChange,
}: {
  label: string;
  options: T[];
  labelFor: (o: T) => string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const selected = options.filter((o) => values.includes(o.id));
  const filtered = q
    ? options.filter((o) => labelFor(o).toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : [];
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {selected.map((o) => (
          <Badge key={o.id} variant="secondary" className="gap-1">
            {labelFor(o)}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== o.id))}
              className="hover:text-destructive"
              aria-label="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder={`Search ${label.toLowerCase()}…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length > 0 && (
        <div className="rounded-md border bg-popover p-1">
          {filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
              onClick={() => {
                if (!values.includes(o.id)) onChange([...values, o.id]);
                setQ("");
              }}
            >
              {labelFor(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskDialog({ open, onOpenChange, defaults }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>(todayISO());
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [status, setStatus] = useState<TaskStatus>("open");
  const [contactIds, setContactIds] = useState<string[]>([]);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [programIds, setProgramIds] = useState<string[]>([]);

  const contacts = useQuery({ ...allContactsQuery, enabled: open });
  const stores = useQuery({ ...storesQuery, enabled: open });
  const entities = useQuery({ ...providerEntitiesQuery, enabled: open });
  const programs = useQuery({ ...programsQuery, enabled: open });

  useEffect(() => {
    if (!open) return;
    setTitle(defaults?.title ?? "");
    setDueDate(todayISO());
    setPriority("Medium");
    setStatus("open");
    setContactIds(defaults?.contactId ? [defaults.contactId] : []);
    setStoreIds(defaults?.storeId ? [defaults.storeId] : []);
    setEntityIds(defaults?.entityId ? [defaults.entityId] : []);
    setProgramIds(defaults?.programId ? [defaults.programId] : []);
  }, [open, defaults]);

  const contactOptions = useMemo(
    () => (contacts.data ?? []).map((c: any) => ({ id: c.id, _label: contactFullName(c) })),
    [contacts.data],
  );
  const storeOptions = useMemo(
    () => (stores.data ?? []).map((s: any) => ({ id: s.id, _label: `#${s.store_number}${s.name ? " " + s.name : ""}` })),
    [stores.data],
  );
  const entityOptions = useMemo(
    () => (entities.data ?? []).map((e: any) => ({ id: e.id, _label: `${e.name} (${e.type})` })),
    [entities.data],
  );
  const programOptions = useMemo(
    () => (programs.data ?? []).map((p: any) => ({ id: p.id, _label: p.name })),
    [programs.data],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required.");
      const { data: prof } = await supabase.auth.getUser();
      const uid = prof.user?.id ?? null;

      // Choose primary entity_id for backward-compat convenience: first linked provider
      const primaryEntityId = entityIds[0] ?? null;

      const insert = {
        title: title.trim(),
        due_date: dueDate || todayISO(),
        status,
        priority,
        entity_id: primaryEntityId,
        assigned_to: uid,
      };
      const { data: fu, error } = await supabase
        .from("follow_ups")
        .insert(insert as any)
        .select("id")
        .single();
      if (error) throw error;
      const fuId = fu.id as string;

      // Link tables (client fills org_id via default? No — org_id is NOT NULL. We must include it.)
      const { data: prof2 } = await supabase.from("profiles").select("org_id").eq("id", uid ?? "").maybeSingle();
      const orgId = (prof2 as any)?.org_id;
      if (!orgId) throw new Error("Missing org context");

      const bulks: Promise<any>[] = [];
      if (contactIds.length)
        bulks.push(
          supabase.from("follow_up_people").insert(
            contactIds.map((cid) => ({ org_id: orgId, follow_up_id: fuId, contact_id: cid })),
          ),
        );
      if (storeIds.length)
        bulks.push(
          supabase.from("follow_up_stores").insert(
            storeIds.map((sid) => ({ org_id: orgId, follow_up_id: fuId, store_id: sid })),
          ),
        );
      if (entityIds.length)
        bulks.push(
          supabase.from("follow_up_organizations").insert(
            entityIds.map((eid) => ({ org_id: orgId, follow_up_id: fuId, entity_id: eid })),
          ),
        );
      if (programIds.length)
        bulks.push(
          supabase.from("follow_up_programs").insert(
            programIds.map((pid) => ({ org_id: orgId, follow_up_id: fuId, program_id: pid })),
          ),
        );
      const results = await Promise.all(bulks);
      for (const r of results) if (r?.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      toast.success("Task created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="t_title">Title *</Label>
            <Input
              id="t_title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Call Rob about install schedule"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Due</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <MultiPicker
            label="People"
            options={contactOptions as any}
            labelFor={(o: any) => o._label}
            values={contactIds}
            onChange={setContactIds}
          />
          <MultiPicker
            label="Stores"
            options={storeOptions as any}
            labelFor={(o: any) => o._label}
            values={storeIds}
            onChange={setStoreIds}
          />
          <MultiPicker
            label="Providers / Organizations"
            options={entityOptions as any}
            labelFor={(o: any) => o._label}
            values={entityIds}
            onChange={setEntityIds}
          />
          <MultiPicker
            label="Programs"
            options={programOptions as any}
            labelFor={(o: any) => o._label}
            values={programIds}
            onChange={setProgramIds}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
