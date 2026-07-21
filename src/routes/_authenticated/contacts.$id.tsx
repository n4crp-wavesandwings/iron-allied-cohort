import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Phone,
  MessageSquare,
  Mail,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { contactDisplayName, type ContactRow } from "@/lib/contacts";
import { ContactDialog } from "@/components/relationships/ContactDialog";
import { CoveragePanel } from "@/components/coverage/CoveragePanel";
import { EngagementDialog } from "@/components/engagements/EngagementDialog";
import { EngagementTimeline } from "@/components/engagements/EngagementTimeline";
import { engagementsByContactQuery } from "@/lib/engagements";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { quickStartsQuery, substituteQuickStart, contactFirstName, type QuickStart } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { programsListQuery, contactProgramMerchantsQuery } from "@/lib/programs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/contacts/$id")({
  component: ContactDetailPage,
});


const contactQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact", id],
    queryFn: async (): Promise<ContactRow | null> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const phonesQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact_phones", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_phones")
        .select("*")
        .eq("contact_id", id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

const emailsQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact_emails", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_emails")
        .select("*")
        .eq("contact_id", id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

const rolesQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact_roles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_roles")
        .select("*")
        .eq("contact_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

const orgsQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact_organizations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_organizations")
        .select("id, is_primary, organization_id, entities:organization_id (id, name, type)")
        .eq("contact_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

const storeCoverageQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact_store_coverage", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_store_coverage")
        .select("id, is_current, store:stores(id, store_number, name)")
        .eq("contact_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

const contactFollowUpsQuery = (id: string) =>
  queryOptions({
    queryKey: ["contact_follow_ups", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_up_people")
        .select("follow_up:follow_ups(id, title, due_date, priority, status, deleted_at)")
        .eq("contact_id", id);
      if (error) throw error;
      return ((data as any[]) ?? [])
        .map((r) => r.follow_up)
        .filter((f: any) => f && !f.deleted_at && f.status !== "completed" && f.status !== "done")
        .sort((a: any, b: any) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
    },
  });

const orgOptionsQuery = queryOptions({
  queryKey: ["entities", "org-options"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("entities")
      .select("id, name, type")
      .in("type", ["provider", "merchant", "internal"])
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as any[]) ?? [];
  },
});

/** Insert an engagement stamp for a touch with this contact. Returns the new engagement id. */
async function stampContactTouch(input: {
  contactId: string;
  entityId?: string | null;
  typeName: "Phone Call" | "Email" | string;
  note?: string | null;
}): Promise<string> {
  const { data: types, error: te } = await supabase
    .from("engagement_types")
    .select("id,name")
    .eq("active", true);
  if (te) throw te;
  const list = (types as any[]) ?? [];
  const match =
    list.find((t) => t.name?.toLowerCase() === input.typeName.toLowerCase()) ??
    list.find((t) => /phone/i.test(t.name)) ??
    list[0];
  if (!match) throw new Error("No engagement types available.");

  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id ?? null;

  const { data: eng, error } = await supabase
    .from("engagements")
    .insert({
      engagement_type_id: match.id,
      occurred_at: new Date().toISOString(),
      note: input.note ?? null,
      created_by: userId,
    } as any)
    .select("id, org_id")
    .single();
  if (error) throw error;
  const engagementId = (eng as any).id as string;
  const orgId = (eng as any).org_id as string;

  await Promise.all([
    supabase
      .from("engagement_type_links")
      .insert({ engagement_id: engagementId, engagement_type_id: match.id, org_id: orgId } as any),
    supabase
      .from("engagement_people")
      .insert({ engagement_id: engagementId, contact_id: input.contactId, org_id: orgId } as any),
    input.entityId
      ? supabase
          .from("engagement_organizations")
          .insert({ engagement_id: engagementId, entity_id: input.entityId, org_id: orgId } as any)
      : Promise.resolve({ error: null } as any),
  ]);
  return engagementId;
}


function ContactDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: c, isLoading } = useQuery(contactQuery(id));
  const phones = useQuery(phonesQuery(id));
  const emails = useQuery(emailsQuery(id));
  const roles = useQuery(rolesQuery(id));
  const orgs = useQuery(orgsQuery(id));
  const coverage = useQuery(storeCoverageQuery(id));
  const followUps = useQuery(contactFollowUpsQuery(id));
  const quickStarts = useQuery(quickStartsQuery);

  const [editOpen, setEditOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [qsPickerOpen, setQsPickerOpen] = useState(false);
  const [notePanelOpen, setNotePanelOpen] = useState(false);
  const [notePanelEngagementId, setNotePanelEngagementId] = useState<string | null>(null);
  const engagements = useQuery(engagementsByContactQuery(id));

  const openNotePanel = (engagementId: string) => {
    setNotePanelEngagementId(engagementId);
    setNotePanelOpen(true);
  };




  // add form state
  const [newPhoneLabel, setNewPhoneLabel] = useState("Mobile");
  const [newPhone, setNewPhone] = useState("");
  const [newEmailLabel, setNewEmailLabel] = useState("Work");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");

  const addPhone = useMutation({
    mutationFn: async () => {
      if (!newPhone.trim()) throw new Error("Phone required");
      const { error } = await supabase.from("contact_phones").insert({
        contact_id: id,
        label: newPhoneLabel.trim() || null,
        phone: newPhone.trim(),
        is_primary: (phones.data?.length ?? 0) === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPhone("");
      qc.invalidateQueries({ queryKey: ["contact_phones", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addEmail = useMutation({
    mutationFn: async () => {
      if (!newEmail.trim()) throw new Error("Email required");
      const { error } = await supabase.from("contact_emails").insert({
        contact_id: id,
        label: newEmailLabel.trim() || null,
        email: newEmail.trim(),
        is_primary: (emails.data?.length ?? 0) === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewEmail("");
      qc.invalidateQueries({ queryKey: ["contact_emails", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async () => {
      if (!newRole.trim()) throw new Error("Role required");
      const { error } = await supabase
        .from("contact_roles")
        .insert({ contact_id: id, role: newRole.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewRole("");
      qc.invalidateQueries({ queryKey: ["contact_roles", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePhone = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("contact_phones").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_phones", id] }),
  });
  const setPrimaryPhone = useMutation({
    mutationFn: async (rowId: string) => {
      await supabase.from("contact_phones").update({ is_primary: false }).eq("contact_id", id);
      const { error } = await supabase
        .from("contact_phones")
        .update({ is_primary: true })
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_phones", id] }),
  });

  const removeEmail = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("contact_emails").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_emails", id] }),
  });
  const setPrimaryEmail = useMutation({
    mutationFn: async (rowId: string) => {
      await supabase.from("contact_emails").update({ is_primary: false }).eq("contact_id", id);
      const { error } = await supabase
        .from("contact_emails")
        .update({ is_primary: true })
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_emails", id] }),
  });

  const removeRole = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("contact_roles").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contact_roles", id] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!c) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/relationships">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">Contact not found.</p>
      </div>
    );
  }

  const primaryOrg = orgs.data?.find((o: any) => o.is_primary) ?? orgs.data?.[0];
  const backTo = primaryOrg?.organization_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          {backTo ? (
            <Link to="/relationships/$id" params={{ id: backTo }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          ) : (
            <Link to="/relationships">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{contactDisplayName(c)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[c.job_title, c.department].filter(Boolean).join(" · ") || "—"}
        </p>
        <AffiliationLine
          orgs={orgs.data ?? []}
          coverage={coverage.data ?? []}
          roles={(roles.data ?? []).map((r: any) => r.role)}
        />
      </div>

      <ReachThemCard
        contact={c}
        primaryPhone={
          ((phones.data ?? []).find((p: any) => p.is_primary) ?? (phones.data ?? [])[0])?.phone ??
          c.mobile_phone ??
          c.office_phone ??
          null
        }
        primaryEmail={
          ((emails.data ?? []).find((e: any) => e.is_primary) ?? (emails.data ?? [])[0])?.email ??
          c.email ??
          null
        }
        primaryEntityId={primaryOrg?.organization_id ?? c.entity_id ?? null}
        quickStarts={(quickStarts.data ?? []).filter((q) => q.is_favorite)}
        onOpenQuickStart={() => setQsPickerOpen(true)}
        onStamped={() => qc.invalidateQueries({ queryKey: ["engagements", "contact", id] })}
      />


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Field label="First Name" value={c.first_name ?? "—"} />
          <Field label="Last Name" value={c.last_name ?? "—"} />
          <Field label="Preferred Name" value={(c as any).preferred_name ?? "—"} />
          <Field label="Job Title" value={c.job_title ?? "—"} />
          <Field
            label="Preferred Communication"
            value={
              (c as any).preferred_communication_method_v2 ??
              c.preferred_contact_method ??
              "—"
            }
          />
          <Field label="Active" value={c.active ? "Yes" : "No"} />
          {c.note && (
            <div className="pt-2">
              <div className="text-muted-foreground">Notes</div>
              <div className="mt-1 whitespace-pre-wrap">{c.note}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {phones.data?.length ? (
            <ul className="space-y-1">
              {phones.data.map((p: any) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {p.is_primary && (
                      <Star className="h-3 w-3 fill-current text-primary shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground">{p.label ?? ""}</span>
                    <a className="text-primary underline truncate" href={`tel:${p.phone}`}>
                      {p.phone}
                    </a>
                  </div>
                  <div className="flex gap-1">
                    {!p.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryPhone.mutate(p.id)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePhone.mutate(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No phones yet.</p>
          )}
          <div className="flex gap-2 pt-2">
            <Input
              className="w-24"
              value={newPhoneLabel}
              onChange={(e) => setNewPhoneLabel(e.target.value)}
              placeholder="Label"
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone number"
            />
            <Button size="sm" onClick={() => addPhone.mutate()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {emails.data?.length ? (
            <ul className="space-y-1">
              {emails.data.map((e: any) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {e.is_primary && (
                      <Star className="h-3 w-3 fill-current text-primary shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground">{e.label ?? ""}</span>
                    <a
                      className="text-primary underline truncate"
                      href={`mailto:${e.email}`}
                    >
                      {e.email}
                    </a>
                  </div>
                  <div className="flex gap-1">
                    {!e.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrimaryEmail.mutate(e.id)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmail.mutate(e.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No emails yet.</p>
          )}
          <div className="flex gap-2 pt-2">
            <Input
              className="w-24"
              value={newEmailLabel}
              onChange={(e) => setNewEmailLabel(e.target.value)}
              placeholder="Label"
            />
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email address"
            />
            <Button size="sm" onClick={() => addEmail.mutate()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {roles.data?.length ? (
            <ul className="space-y-1">
              {roles.data.map((r: any) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded border px-2 py-1 text-sm"
                >
                  <span>{r.role}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRole.mutate(r.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No roles yet.</p>
          )}
          <div className="flex gap-2 pt-2">
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="e.g. Owner, Manager"
            />
            <Button size="sm" onClick={() => addRole.mutate()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <OrganizationsAssignmentCard contactId={c.id} orgs={orgs.data ?? []} />

      <CoveragePanel mode={{ kind: "contact", contactId: c.id }} />

      <ProgramsAssignmentCard contactId={c.id} />



      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Interaction History</CardTitle>
          <Button size="sm" onClick={() => setEngagementOpen(true)}>+ New Engagement</Button>
        </CardHeader>
        <CardContent>
          {engagements.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (engagements.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
          ) : (
            <EngagementTimeline items={engagements.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Follow-ups</CardTitle>
          <Button size="sm" onClick={() => setTaskOpen(true)}>+ Add follow-up</Button>
        </CardHeader>
        <CardContent>
          {followUps.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (followUps.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No open follow-ups.</p>
          ) : (
            <ul className="space-y-2">
              {(followUps.data as any[]).map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Due {f.due_date ?? "—"} · {f.priority ?? "Medium"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EngagementDialog
        open={engagementOpen}
        onOpenChange={setEngagementOpen}
        defaults={{ contactId: c.id, entityId: c.entity_id ?? undefined }}
      />

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaults={{ contactId: c.id, entityId: c.entity_id ?? undefined }}
      />

      <QuickStartPickerDialog
        open={qsPickerOpen}
        onOpenChange={setQsPickerOpen}
        quickStarts={(quickStarts.data ?? []).filter((q) => q.is_favorite)}
        contact={c}
        primaryPhone={
          ((phones.data ?? []).find((p: any) => p.is_primary) ?? (phones.data ?? [])[0])?.phone ??
          c.mobile_phone ??
          c.office_phone ??
          null
        }
        primaryEmail={
          ((emails.data ?? []).find((e: any) => e.is_primary) ?? (emails.data ?? [])[0])?.email ??
          c.email ??
          null
        }
        primaryEntityId={primaryOrg?.organization_id ?? c.entity_id ?? null}
        onStamped={() => qc.invalidateQueries({ queryKey: ["engagements", "contact", id] })}
      />

      {c && c.entity_id && (
        <ContactDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          entityId={c.entity_id}
          contact={c}
        />
      )}
    </div>
  );
}


function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function AffiliationLine({
  orgs,
  coverage,
  roles,
}: {
  orgs: any[];
  coverage: any[];
  roles: string[];
}) {
  const primaryOrg = orgs.find((o) => o.is_primary) ?? orgs[0];
  const currentStore =
    coverage.find((r) => r.is_current && r.store)?.store ?? coverage[0]?.store ?? null;
  const roleText = roles.filter(Boolean).join(", ");
  const parts: string[] = [];
  if (primaryOrg?.entities?.name) parts.push(primaryOrg.entities.name);
  else if (currentStore)
    parts.push(
      `${currentStore.store_number}${currentStore.name ? ` ${currentStore.name}` : ""}`,
    );
  if (roleText) parts.push(roleText);
  if (parts.length === 0) return null;
  return <p className="mt-1 text-sm">{parts.join(" · ")}</p>;
}

function ReachThemCard({
  contact,
  primaryPhone,
  primaryEmail,
  primaryEntityId,
  quickStarts,
  onOpenQuickStart,
  onStamped,
}: {
  contact: ContactRow;
  primaryPhone: string | null;
  primaryEmail: string | null;
  primaryEntityId: string | null;
  quickStarts: QuickStart[];
  onOpenQuickStart: () => void;
  onStamped: () => void;
}) {
  const hasPhone = !!primaryPhone;
  const hasEmail = !!primaryEmail;
  const hasQuickStart = (hasPhone || hasEmail) && quickStarts.length > 0;

  const stamp = async (kind: "call" | "text" | "email", note: string) => {
    try {
      const typeName = kind === "email" ? "Email" : "Phone Call";
      await stampContactTouch({
        contactId: contact.id,
        entityId: primaryEntityId,
        typeName,
        note,
      });
      toast.success("Logged");
      onStamped();
    } catch (e: any) {
      toast.error(e.message ?? "Could not log");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reach Them</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            variant="outline"
            className={cn("h-11 gap-1", !hasPhone && "opacity-40")}
            disabled={!hasPhone}
            onClick={() => {
              if (!hasPhone) return;
              window.location.href = `tel:${primaryPhone}`;
              void stamp("call", "Phone call");
            }}
          >
            <Phone className="h-4 w-4" /> Call
          </Button>
          <Button
            variant="outline"
            className={cn("h-11 gap-1", !hasPhone && "opacity-40")}
            disabled={!hasPhone}
            onClick={() => {
              if (!hasPhone) return;
              window.location.href = `sms:${primaryPhone}`;
              void stamp("text", "Text message");
            }}
          >
            <MessageSquare className="h-4 w-4" /> Text
          </Button>
          <Button
            variant="outline"
            className={cn("h-11 gap-1", !hasEmail && "opacity-40")}
            disabled={!hasEmail}
            onClick={() => {
              if (!hasEmail) return;
              window.location.href = `mailto:${primaryEmail}`;
              void stamp("email", "Email");
            }}
          >
            <Mail className="h-4 w-4" /> Email
          </Button>
          <Button
            className={cn("h-11 gap-1", !hasQuickStart && "opacity-40")}
            disabled={!hasQuickStart}
            onClick={onOpenQuickStart}
          >
            <Zap className="h-4 w-4" /> Quick Start
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStartPickerDialog({
  open,
  onOpenChange,
  quickStarts,
  contact,
  primaryPhone,
  primaryEmail,
  primaryEntityId,
  onStamped,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quickStarts: QuickStart[];
  contact: ContactRow;
  primaryPhone: string | null;
  primaryEmail: string | null;
  primaryEntityId: string | null;
  onStamped: () => void;
}) {
  const send = async (qs: QuickStart) => {
    const body = substituteQuickStart(qs.body, contact);
    let channel: "text" | "email" | null = null;
    if (qs.channel === "email" && primaryEmail) {
      window.location.href = `mailto:${encodeURIComponent(primaryEmail)}?body=${encodeURIComponent(body)}`;
      channel = "email";
    } else if (primaryPhone) {
      window.location.href = `sms:${encodeURIComponent(primaryPhone)}?&body=${encodeURIComponent(body)}`;
      channel = "text";
    } else if (primaryEmail) {
      window.location.href = `mailto:${encodeURIComponent(primaryEmail)}?body=${encodeURIComponent(body)}`;
      channel = "email";
    } else {
      toast.error("No phone or email on file.");
      return;
    }
    onOpenChange(false);
    try {
      await stampContactTouch({
        contactId: contact.id,
        entityId: primaryEntityId,
        typeName: channel === "email" ? "Email" : "Phone Call",
        note: `Quick Start: ${qs.name} — ${body}`,
      });
      toast.success("Logged");
      onStamped();
    } catch (e: any) {
      toast.error(e.message ?? "Could not log");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Quick Start to {contactFirstName(contact)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {quickStarts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No favorite Quick Starts.</p>
          ) : (
            quickStarts.map((qs) => (
              <button
                key={qs.id}
                type="button"
                onClick={() => send(qs)}
                className="w-full rounded-md border p-3 text-left hover:bg-accent"
              >
                <div className="font-medium">
                  <span className="mr-1">{qs.icon}</span>
                  {qs.name}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {substituteQuickStart(qs.body, contact)}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationsAssignmentCard({
  contactId,
  orgs,
}: {
  contactId: string;
  orgs: any[];
}) {
  const qc = useQueryClient();
  const options = useQuery(orgOptionsQuery);
  const [pick, setPick] = useState<string>("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["contact_organizations", contactId] });

  const add = useMutation({
    mutationFn: async (entityId: string) => {
      if (!entityId) throw new Error("Pick an organization");
      if (orgs.some((o) => o.organization_id === entityId)) {
        throw new Error("Already linked");
      }
      const { error } = await supabase.from("contact_organizations").insert({
        contact_id: contactId,
        organization_id: entityId,
        is_primary: orgs.length === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPick("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase
        .from("contact_organizations")
        .delete()
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setPrimary = useMutation({
    mutationFn: async (rowId: string) => {
      await supabase
        .from("contact_organizations")
        .update({ is_primary: false })
        .eq("contact_id", contactId);
      const { error } = await supabase
        .from("contact_organizations")
        .update({ is_primary: true })
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const linkedIds = new Set(orgs.map((o) => o.organization_id));
  const available = (options.data ?? []).filter((e: any) => !linkedIds.has(e.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {orgs.length ? (
          <ul className="space-y-1">
            {orgs.map((o: any) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded border px-2 py-1 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {o.is_primary && (
                    <Star className="h-3 w-3 fill-current text-primary shrink-0" />
                  )}
                  <Link
                    to="/relationships/$id"
                    params={{ id: o.organization_id }}
                    className="text-primary underline truncate"
                  >
                    {o.entities?.name ?? "—"}
                  </Link>
                  {o.entities?.type && (
                    <span className="text-xs text-muted-foreground">
                      · {o.entities.type}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {!o.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPrimary.mutate(o.id)}
                      title="Set primary"
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(o.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not linked to any organization.</p>
        )}
        <div className="flex gap-2 pt-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Link organization…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} {e.type ? `(${e.type})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => add.mutate(pick)} disabled={!pick}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramsAssignmentCard({ contactId }: { contactId: string }) {
  const qc = useQueryClient();
  const links = useQuery(contactProgramMerchantsQuery(contactId));
  const programs = useQuery(programsListQuery);
  const [pick, setPick] = useState<string>("");
  const [role, setRole] = useState<"Primary" | "Secondary">("Primary");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["contact-program-merchants", contactId] });

  const add = useMutation({
    mutationFn: async () => {
      if (!pick) throw new Error("Pick a program");
      const { error } = await supabase.from("program_merchants" as any).insert({
        contact_id: contactId,
        program_id: pick,
        role,
        is_current: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPick("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase
        .from("program_merchants" as any)
        .delete()
        .eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const linkedProgramIds = new Set((links.data ?? []).map((l: any) => l.program_id));
  const available = (programs.data ?? []).filter((p: any) => !linkedProgramIds.has(p.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Programs (Merchant)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(links.data ?? []).length ? (
          <ul className="space-y-1">
            {(links.data as any[]).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded border px-2 py-1 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    to="/programs/$id"
                    params={{ id: l.program_id }}
                    className="text-primary underline truncate"
                  >
                    {l.program?.name ?? "—"}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {l.role}
                    {l.is_current ? "" : " · past"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(l.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not assigned as a merchant on any program.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1 min-w-[10rem]">
              <SelectValue placeholder="Link program…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => setRole(v as "Primary" | "Secondary")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Primary">Primary</SelectItem>
              <SelectItem value="Secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => add.mutate()} disabled={!pick}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

