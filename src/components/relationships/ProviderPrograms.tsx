import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Props {
  entityId: string;
  onLogEngagement?: () => void;
}

type Program = { id: string; name: string };

export function ProviderPrograms({ entityId, onLogEngagement }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ["active-programs"],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Program[];
    },
  });

  const { data: selectedIds = [], isLoading: loadingSelected } = useQuery({
    queryKey: ["provider-programs", entityId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("provider_programs")
        .select("program_id")
        .eq("provider_id", entityId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.program_id);
    },
  });

  const selectedSet = new Set(selectedIds);
  const selectedPrograms = programs.filter((p) => selectedSet.has(p.id));

  async function toggle(programId: string, checked: boolean) {
    setBusyId(programId);
    try {
      if (checked) {
        const { error } = await supabase
          .from("provider_programs")
          .insert({ provider_id: entityId, program_id: programId });
        // 23505 = unique violation — treat as already-linked, no-op
        if (error && (error as any).code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("provider_programs")
          .delete()
          .eq("provider_id", entityId)
          .eq("program_id", programId);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["provider-programs", entityId] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update program");
    } finally {
      setBusyId(null);
    }
  }

  const loading = loadingPrograms || loadingSelected;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Programs</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done" : "Edit"}
          </Button>
          {onLogEngagement && (
            <Button size="sm" variant="outline" onClick={onLogEngagement}>
              + Log
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : editing ? (
          <ul className="divide-y">
            {programs.map((p) => {
              const checked = selectedSet.has(p.id);
              return (
                <li key={p.id}>
                  <label className="flex items-center gap-3 py-3 cursor-pointer min-h-11">
                    <Checkbox
                      checked={checked}
                      disabled={busyId === p.id}
                      onCheckedChange={(v) => toggle(p.id, Boolean(v))}
                      className="h-5 w-5"
                    />
                    <span className="text-base">{p.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : selectedPrograms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {selectedPrograms.map((p) => (
              <li
                key={p.id}
                className="rounded-full border px-3 py-1 text-sm bg-muted/40"
              >
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
