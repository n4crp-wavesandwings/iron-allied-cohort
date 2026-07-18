import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "open" | "in_progress" | "completed" | "done";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

export function taskStatusLabel(s: TaskStatus): string {
  if (s === "open") return "Open";
  if (s === "in_progress") return "In Progress";
  return "Completed"; // completed or done (legacy)
}

export function taskStatusIsOpen(s: TaskStatus): boolean {
  return s === "open" || s === "in_progress";
}

export function priorityRank(p: TaskPriority | null | undefined): number {
  switch (p) {
    case "Critical": return 0;
    case "High": return 1;
    case "Medium": return 2;
    case "Low": return 3;
    default: return 2;
  }
}

export function priorityBadgeClass(p: TaskPriority | null | undefined): string {
  switch (p) {
    case "Critical": return "bg-red-600 text-white";
    case "High": return "bg-orange-500 text-white";
    case "Medium": return "bg-blue-500 text-white";
    case "Low": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

const linkSelect = `
  people:follow_up_people(contact_id, contact:contacts(id,first_name,last_name,name)),
  stores:follow_up_stores(store_id, store:stores(id,store_number,name)),
  organizations:follow_up_organizations(entity_id, entity:entities(id,name,type)),
  programs:follow_up_programs(program_id, program:programs(id,name))
`;

export type TaskItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  engagement_id: string | null;
  entity_id: string | null;
  interaction_id: string | null;
  assigned_to: string | null;
  category: string | null;
  entity: { id: string; name: string; type: string } | null;
  people: { contact_id: string; contact: { id: string; first_name: string | null; last_name: string | null; name: string | null } | null }[];
  stores: { store_id: string; store: { id: string; store_number: string; name: string | null } | null }[];
  organizations: { entity_id: string; entity: { id: string; name: string; type: string } | null }[];
  programs: { program_id: string; program: { id: string; name: string } | null }[];
};

export const priorityTasksQuery = queryOptions({
  queryKey: ["tasks", "priority"],
  queryFn: async (): Promise<TaskItem[]> => {
    const { data, error } = await supabase
      .from("follow_ups")
      .select(`*, entity:entities(id,name,type), ${linkSelect}`)
      .is("deleted_at", null)
      .in("status", ["open", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export const allContactsQuery = queryOptions({
  queryKey: ["contacts", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, name, email, phone_mobile, phone_office")
      .is("deleted_at", null)
      .eq("active", true)
      .order("first_name", { ascending: true });
    if (error) throw error;
    return (data as any[]) ?? [];
  },
});

export const providerEntitiesQuery = queryOptions({
  queryKey: ["entities", "providers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("entities")
      .select("id,name,type")
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    return (data as any[]) ?? [];
  },
});

// Contacts + last engagement date (via engagement_people links)
export const contactsLastEngagementQuery = queryOptions({
  queryKey: ["contacts", "last_engagement"],
  queryFn: async () => {
    const { data: contacts, error: e1 } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, name, email, phone_mobile, phone_office")
      .is("deleted_at", null)
      .eq("active", true);
    if (e1) throw e1;
    const { data: links, error: e2 } = await supabase
      .from("engagement_people")
      .select("contact_id, engagement:engagements(id, occurred_at, deleted_at)");
    if (e2) throw e2;
    const lastByContact = new Map<string, string>();
    for (const row of (links as any[]) ?? []) {
      const e = row.engagement;
      if (!e || e.deleted_at) continue;
      const prev = lastByContact.get(row.contact_id);
      if (!prev || new Date(e.occurred_at) > new Date(prev)) {
        lastByContact.set(row.contact_id, e.occurred_at);
      }
    }
    return ((contacts as any[]) ?? []).map((c) => ({
      ...c,
      last_engagement_at: lastByContact.get(c.id) ?? null,
    }));
  },
});

export type QuickStart = {
  id: string;
  org_id: string;
  name: string;
  icon: string | null;
  body: string;
  channel: "text" | "email" | string;
  sort_order: number;
  is_favorite: boolean;
  active: boolean;
};

export const quickStartsQuery = queryOptions({
  queryKey: ["quick_starts"],
  queryFn: async (): Promise<QuickStart[]> => {
    const { data, error } = await supabase
      .from("quick_starts")
      .select("*")
      .is("deleted_at", null)
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as any) ?? [];
  },
});

export function contactFirstName(c: { first_name?: string | null; name?: string | null } | null | undefined): string {
  if (!c) return "there";
  if (c.first_name) return c.first_name;
  if (c.name) return c.name.split(" ")[0];
  return "there";
}

export function contactFullName(c: { first_name?: string | null; last_name?: string | null; name?: string | null } | null | undefined): string {
  if (!c) return "Unnamed";
  const p = [c.first_name, c.last_name].filter(Boolean);
  if (p.length) return p.join(" ");
  return c.name ?? "Unnamed";
}

export function substituteQuickStart(body: string, contact: { first_name?: string | null; name?: string | null } | null): string {
  return body.replace(/\{FirstName\}/g, contactFirstName(contact));
}

export function taskEntitySummary(t: TaskItem): string {
  const parts: string[] = [];
  if (t.entity?.name) parts.push(t.entity.name);
  for (const s of t.stores ?? []) if (s.store) parts.push(`#${s.store.store_number}`);
  for (const o of t.organizations ?? []) if (o.entity?.name && o.entity.name !== t.entity?.name) parts.push(o.entity.name);
  for (const p of t.people ?? []) {
    if (!p.contact) continue;
    const nm = [p.contact.first_name, p.contact.last_name].filter(Boolean).join(" ") || p.contact.name || "";
    if (nm) parts.push(nm);
  }
  for (const pr of t.programs ?? []) if (pr.program?.name) parts.push(pr.program.name);
  return parts.slice(0, 4).join(" · ");
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function dueLabel(due: string | null): { label: string; overdue: boolean; today: boolean } {
  if (!due) return { label: "No due date", overdue: false, today: false };
  const t = todayISO();
  const d = due.slice(0, 10);
  const overdue = d < t;
  const today = d === t;
  if (today) return { label: "Today", overdue: false, today: true };
  const dueD = new Date(d + "T00:00:00");
  return {
    label: dueD.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overdue,
    today: false,
  };
}
