import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { relationshipQueryOptions, typeLabel } from "@/lib/relationships";
import { RelationshipDialog } from "@/components/relationships/RelationshipDialog";

import { RelationshipTimeline } from "@/components/relationships/RelationshipTimeline";
import { ContactsList } from "@/components/relationships/ContactsList";
import { RelationshipSummary } from "@/components/relationships/RelationshipSummary";
import { ContactDialog } from "@/components/relationships/ContactDialog";
import { FollowUpDialog } from "@/components/relationships/FollowUpDialog";
import { CoveragePanel } from "@/components/coverage/CoveragePanel";
import { EngagementDialog } from "@/components/engagements/EngagementDialog";
import { EngagementTimeline } from "@/components/engagements/EngagementTimeline";
import { engagementsByEntityQuery } from "@/lib/engagements";

export const Route = createFileRoute("/_authenticated/relationships/$id")({
  component: RelationshipDetailPage,
});

function RelationshipDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: r, isLoading } = useQuery(relationshipQueryOptions(id));

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const engagements = useQuery(engagementsByEntityQuery(id));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("entities")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      toast.success("Relationship deleted");
      navigate({ to: "/relationships" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!r) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/relationships">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">Relationship not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/relationships">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          className="gap-1"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {typeLabel(r.type)} · {r.status ?? "—"}
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setEngagementOpen(true)}>+ New Engagement</Button>
          
          <Button variant="outline" onClick={() => setFollowUpOpen(true)}>+ Create Follow-up</Button>
          <Button variant="outline" onClick={() => setAddContactOpen(true)}>+ Add Contact</Button>
        </CardContent>
      </Card>


      <div className="grid gap-4 md:grid-cols-2">
        {/* Section 1 — Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Basic Information</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1">
              <Pencil className="h-4 w-4" /> Edit Information
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Relationship Type" value={typeLabel(r.type)} />
            <Field label="Name" value={r.name} />
            <Field label="Legal Name" value={(r as any).legal_name ?? "—"} />
            <Field label="DBA / Common Name" value={(r as any).dba_name ?? "—"} />
            <Field label="Status" value={r.status ?? "—"} />
            <Field label="Active" value={(r as any).active === false ? "No" : "Yes"} />
            <Field label="District" value={r.district ?? "—"} />
            <Field label="Territory / Market" value={(r as any).territory ?? "—"} />
            <Field label="Primary Location" value={(r as any).primary_location ?? "—"} />
            <Field label="Website" value={(r as any).website ?? "—"} />
            <Field
              label="Preferred Communication"
              value={(r as any).preferred_communication_method ?? "—"}
            />
            <Field
              label="Internal Reference #"
              value={(r as any).internal_reference_number ?? "—"}
            />
            <div>
              <div className="text-muted-foreground">Notes</div>
              <div className="mt-1 whitespace-pre-wrap">{r.notes ?? "—"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5 — Relationship Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relationship Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <RelationshipSummary relationship={r} />
          </CardContent>
        </Card>
      </div>

      {/* Section 2 — Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactsList entityId={r.id} />
        </CardContent>
      </Card>

      {/* Coverage */}
      <CoveragePanel mode={{ kind: "entity", entityId: r.id }} />

      {/* Section 3 — Relationship Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relationship Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <RelationshipTimeline entityId={r.id} />
        </CardContent>
      </Card>

      {/* Engagements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagements</CardTitle>
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
        defaults={{ entityId: r.id }}
      />


      {/* Dialogs */}
      <RelationshipDialog open={editOpen} onOpenChange={setEditOpen} relationship={r} />


      <ContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        entityId={r.id}
      />

      <FollowUpDialog open={followUpOpen} onOpenChange={setFollowUpOpen} entityId={r.id} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              {r.name} will be hidden from all views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
