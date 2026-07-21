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

function ContactDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: c, isLoading } = useQuery(contactQuery(id));
  const phones = useQuery(phonesQuery(id));
  const emails = useQuery(emailsQuery(id));
  const roles = useQuery(rolesQuery(id));
  const orgs = useQuery(orgsQuery(id));

  const [editOpen, setEditOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const engagements = useQuery(engagementsByContactQuery(id));

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
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.data?.length ? (
            <ul className="space-y-1">
              {orgs.data.map((o: any) => (
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
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Not linked to any organization.</p>
          )}
        </CardContent>
      </Card>

      <CoveragePanel mode={{ kind: "contact", contactId: c.id }} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Engagements</CardTitle>
          <Button size="sm" onClick={() => setEngagementOpen(true)}>+ New Engagement</Button>
        </CardHeader>
        <CardContent>
          {engagements.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <EngagementTimeline items={engagements.data ?? []} />
          )}
        </CardContent>
      </Card>

      <EngagementDialog
        open={engagementOpen}
        onOpenChange={setEngagementOpen}
        defaults={{ contactId: c.id, entityId: c.entity_id ?? undefined }}
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
