import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { InteractionForm } from "@/components/relationships/InteractionForm";
import { InteractionTimeline } from "@/components/relationships/InteractionTimeline";

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
    <div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/relationships">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1">
            <Pencil className="h-4 w-4" /> Edit
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
      </div>

      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {typeLabel(r.type)} · {r.status ?? "—"}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Relationship Type" value={typeLabel(r.type)} />
            <Field label="Name" value={r.name} />
            <Field label="Status" value={r.status ?? "—"} />
            <Field label="District" value={r.district ?? "—"} />
            <div>
              <div className="text-muted-foreground">Notes</div>
              <div className="mt-1 whitespace-pre-wrap">{r.notes ?? "—"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log Interaction</CardTitle>
            </CardHeader>
            <CardContent>
              <InteractionForm entityId={r.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <InteractionTimeline entityId={r.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <RelationshipDialog open={editOpen} onOpenChange={setEditOpen} relationship={r} />

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
