import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  RELATIONSHIP_TYPES,
  relationshipsQueryOptions,
  typeLabel,
  type EntityRow,
  type EntityType,
} from "@/lib/relationships";
import { RelationshipDialog } from "@/components/relationships/RelationshipDialog";
import { programsListQuery, type ProgramWithParent, contactLabel } from "@/lib/programs";
import { ProgramDialog } from "@/components/programs/ProgramDialog";
import { MerchantDialog, type MerchantEditable } from "@/components/merchants/MerchantDialog";
import { NewProviderDialog } from "@/components/relationships/NewProviderDialog";
import { InternalContactDialog } from "@/components/relationships/InternalContactDialog";
import { PeopleDirectory } from "@/components/relationships/PeopleDirectory";
import { TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/relationships/")({
  component: RelationshipsListPage,
});

type Filter = EntityType | "all" | "program" | "merchant";

type InternalPersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  job_title: string | null;
  active: boolean;
  stores: { id: string; store_number: string; name: string | null }[];
};


type MerchantListRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  job_title: string | null;
  active: boolean;
  primary_programs: { id: string; name: string }[];
};

function RelationshipsListPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntityRow | null>(null);

  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramWithParent | null>(null);
  const [deleteProgramTarget, setDeleteProgramTarget] = useState<ProgramWithParent | null>(null);

  const [merchantDialogOpen, setMerchantDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<MerchantEditable>(null);
  const [deleteMerchantTarget, setDeleteMerchantTarget] = useState<MerchantListRow | null>(null);
  const [newProviderOpen, setNewProviderOpen] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const isProgramTab = filter === "program";
  const isMerchantTab = filter === "merchant";
  const isInternalTab = filter === "internal";

  const { data: rows = [], isLoading } = useQuery({
    ...relationshipsQueryOptions(
      filter === "program" || filter === "merchant"
        ? "all"
        : (filter as EntityType | "all"),
    ),
    enabled: !isProgramTab && !isMerchantTab && !isInternalTab,
  });
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    ...programsListQuery,
    enabled: isProgramTab,
  });

  const { data: internalPeople = [], isLoading: internalLoading } = useQuery({
    queryKey: ["internal-contacts", "list"],
    enabled: isInternalTab,
    queryFn: async (): Promise<InternalPersonRow[]> => {
      const { data: ents } = await supabase
        .from("entities")
        .select("id")
        .eq("type", "internal")
        .is("deleted_at", null);
      const entityIds = (ents ?? []).map((e: any) => e.id as string);
      if (entityIds.length === 0) return [];
      const { data: links } = await supabase
        .from("contact_organizations")
        .select("contact_id")
        .in("organization_id", entityIds);
      const idsFromLinks = (links ?? []).map((l: any) => l.contact_id as string);
      const { data: byEntity } = await supabase
        .from("contacts")
        .select("id")
        .in("entity_id", entityIds)
        .is("deleted_at", null);
      const idsFromEntity = (byEntity ?? []).map((c: any) => c.id as string);
      const contactIds = Array.from(new Set([...idsFromLinks, ...idsFromEntity]));
      if (contactIds.length === 0) return [];
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select(
          "id, first_name, last_name, name, job_title, active, is_merchant, contact_store_coverage!left(is_current, store:store_id(id, store_number, name))",
        )
        .in("id", contactIds)
        .is("deleted_at", null)
        .order("last_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (contacts ?? [])
        .filter((c: any) => !c.is_merchant)
        .map((c: any) => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          name: c.name,
          job_title: c.job_title,
          active: c.active,
          stores: (c.contact_store_coverage ?? [])
            .filter((r: any) => r.is_current && r.store)
            .map((r: any) => r.store),
        }));
    },
  });


  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["merchants", "list"],
    enabled: isMerchantTab,
    queryFn: async (): Promise<MerchantListRow[]> => {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, name, job_title, active")
        .eq("is_merchant" as any, true)
        .is("deleted_at", null)
        .order("last_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const ids = (contacts ?? []).map((c: any) => c.id);
      let primaryMap = new Map<string, { id: string; name: string }[]>();
      if (ids.length) {
        const { data: links } = await supabase
          .from("program_merchants" as any)
          .select("contact_id, program:program_id(id, name)")
          .in("contact_id", ids)
          .eq("is_current", true)
          .eq("role", "Primary");
        (links ?? []).forEach((l: any) => {
          const arr = primaryMap.get(l.contact_id) ?? [];
          if (l.program) arr.push(l.program);
          primaryMap.set(l.contact_id, arr);
        });
      }
      return (contacts ?? []).map((c: any) => ({
        ...c,
        primary_programs: primaryMap.get(c.id) ?? [],
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entities")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      toast.success("Relationship deleted");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("programs")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted");
      setDeleteProgramTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Merchant removed");
      setDeleteMerchantTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    if (isProgramTab) {
      setEditingProgram(null);
      setProgramDialogOpen(true);
    } else if (isMerchantTab) {
      setEditingMerchant(null);
      setMerchantDialogOpen(true);
    } else if (isInternalTab) {
      setInternalDialogOpen(true);
    } else {
      setEditing(null);
      setDialogOpen(true);
    }
  };

  const createLabel = isProgramTab
    ? "New Program"
    : isMerchantTab
      ? "New Merchant"
      : isInternalTab
        ? "New Internal Contact"
        : "Create Relationship";


  const [topTab, setTopTab] = useState<"organizations" | "people">("organizations");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relationships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Providers, merchants, programs, internal partners. Numbered stores are managed under Locations.
          </p>
        </div>
        {topTab === "organizations" && (
          <div className="flex gap-2">
            <Button onClick={() => setNewProviderOpen(true)} variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              New Service Provider
            </Button>
            <Button onClick={openCreate} className="gap-1">
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as "organizations" | "people")} className="mt-6">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>
        <TabsContent value="people">
          <PeopleDirectory />
        </TabsContent>
        <TabsContent value="organizations">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {RELATIONSHIP_TYPES.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="merchant">Merchant</TabsTrigger>
              <TabsTrigger value="program">Program</TabsTrigger>
            </TabsList>
          </Tabs>
        </TabsContent>
      </Tabs>

      {topTab === "organizations" && (

      <div className="mt-6 rounded-lg border border-border">
        {isProgramTab ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Name</TableHead>
                <TableHead>Parent / Sub-category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                    No programs yet.
                  </TableCell>
                </TableRow>
              ) : (
                programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to="/programs/$id"
                        params={{ id: p.id }}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.parent?.name ?? p.sub_category ?? "—"}
                    </TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingProgram(p);
                          setProgramDialogOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteProgramTarget(p)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : isInternalTab ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Title / Role</TableHead>
                <TableHead>Store(s)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {internalLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : internalPeople.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                    No internal contacts yet.
                  </TableCell>
                </TableRow>
              ) : (
                internalPeople.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to="/contacts/$id"
                        params={{ id: p.id }}
                        className="font-medium hover:underline"
                      >
                        {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.job_title ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.stores.length === 0
                        ? "—"
                        : p.stores.map((s) => `#${s.store_number}`).join(", ")}
                    </TableCell>
                    <TableCell>{p.active ? "Active" : "Inactive"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : isMerchantTab ? (
          <Table>

            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Primary Program(s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merchantsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                    No merchants yet.
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        to="/contacts/$id"
                        params={{ id: m.id }}
                        className="font-medium hover:underline"
                      >
                        {contactLabel(m)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.job_title ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.primary_programs.length === 0
                        ? "—"
                        : m.primary_programs.map((p) => p.name).join(", ")}
                    </TableCell>
                    <TableCell>{m.active ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingMerchant({
                            id: m.id,
                            first_name: m.first_name,
                            last_name: m.last_name,
                            job_title: m.job_title,
                            email: null,
                            office_phone: null,
                            mobile_phone: null,
                            note: null,
                            active: m.active,
                          });
                          setMerchantDialogOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteMerchantTarget(m)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                    No relationships yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows
                  .filter((r) => r.type !== "merchant")
                  .map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link
                          to="/relationships/$id"
                          params={{ id: r.id }}
                          className="font-medium hover:underline"
                        >
                          {r.name}
                        </Link>
                      </TableCell>
                      <TableCell>{typeLabel(r.type)}</TableCell>
                      <TableCell>{r.status ?? "—"}</TableCell>
                      <TableCell>{r.district ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(r)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      )}

      <RelationshipDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        relationship={editing}
      />

      <ProgramDialog
        open={programDialogOpen}
        onOpenChange={setProgramDialogOpen}
        program={editingProgram}
      />

      <MerchantDialog
        open={merchantDialogOpen}
        onOpenChange={setMerchantDialogOpen}
        contact={editingMerchant}
      />

      <NewProviderDialog open={newProviderOpen} onOpenChange={setNewProviderOpen} />
      <InternalContactDialog open={internalDialogOpen} onOpenChange={setInternalDialogOpen} />


      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be hidden from all views.
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

      <AlertDialog
        open={!!deleteProgramTarget}
        onOpenChange={(o) => !o && setDeleteProgramTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this program?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteProgramTarget?.name} will be hidden from all views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteProgramTarget &&
                deleteProgramMutation.mutate(deleteProgramTarget.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteMerchantTarget}
        onOpenChange={(o) => !o && setDeleteMerchantTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this merchant?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMerchantTarget ? contactLabel(deleteMerchantTarget) : ""} will be hidden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteMerchantTarget &&
                deleteMerchantMutation.mutate(deleteMerchantTarget.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
