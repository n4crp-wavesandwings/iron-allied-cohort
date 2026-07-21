import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { contactsQueryOptions, contactDisplayName, type ContactRow } from "@/lib/contacts";
import { ContactDialog } from "./ContactDialog";

export function ContactsList({ entityId }: { entityId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(contactsQueryOptions(entityId));

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", entityId] });
      toast.success("Contact deleted");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add Contact
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No contacts added yet. Add one to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((c) => {
            const isOpen = !!expanded[c.id];
            return (
              <li key={c.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/contacts/$id"
                    params={{ id: c.id }}
                    className="flex-1 min-w-0 hover:underline"
                  >
                    <div className="font-medium truncate">{contactDisplayName(c)}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[c.job_title, c.mobile_phone ?? c.office_phone]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </Link>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [c.id]: !prev[c.id] }))
                      }
                    >
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/contacts/$id" params={{ id: c.id }} aria-label="Edit contact">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                    {c.email && (
                      <div>
                        Email:{" "}
                        <a className="text-primary underline" href={`mailto:${c.email}`}>
                          {c.email}
                        </a>
                      </div>
                    )}
                    {c.office_phone && (
                      <div>
                        Office:{" "}
                        <a className="text-primary underline" href={`tel:${c.office_phone}`}>
                          {c.office_phone}
                        </a>
                      </div>
                    )}
                    {c.mobile_phone && (
                      <div>
                        Mobile:{" "}
                        <a className="text-primary underline" href={`tel:${c.mobile_phone}`}>
                          {c.mobile_phone}
                        </a>
                      </div>
                    )}
                    {c.preferred_contact_method && (
                      <div>Preferred: {c.preferred_contact_method}</div>
                    )}
                    {c.best_time_to_contact && (
                      <div>Best Time: {c.best_time_to_contact}</div>
                    )}
                    {c.note && (
                      <div className="whitespace-pre-wrap text-muted-foreground">
                        {c.note}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ContactDialog open={addOpen} onOpenChange={setAddOpen} entityId={entityId} />


      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? contactDisplayName(deleteTarget) : ""} will be hidden from all
              views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
