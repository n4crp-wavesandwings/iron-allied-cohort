import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  programDetailQuery,
  programMerchantsQuery,
  programsListQuery,
} from "@/lib/programs";
import { ProgramDialog } from "@/components/programs/ProgramDialog";

export const Route = createFileRoute("/_authenticated/programs/$id")({
  component: ProgramDetailPage,
});

function ProgramDetailPage() {
  const { id } = useParams({ from: "/_authenticated/programs/$id" });
  const [editOpen, setEditOpen] = useState(false);

  const { data: program, isLoading } = useQuery(programDetailQuery(id));
  const { data: links = [] } = useQuery(programMerchantsQuery(id));
  const { data: allPrograms = [] } = useQuery(programsListQuery);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!program) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">Program not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/relationships">Back to Relationships</Link>
        </Button>
      </div>
    );
  }

  const currentPrimary = links.find((l) => l.is_current && l.role === "Primary");
  const currentSecondaries = links.filter((l) => l.is_current && l.role === "Secondary");
  const history = links.filter((l) => !l.is_current);
  const subPrograms = allPrograms.filter((p) => p.parent_program_id === program.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
            <Link to="/relationships">
              <ArrowLeft className="h-4 w-4" /> Relationships
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Program</Badge>
            <Badge variant={program.status === "Active" ? "default" : "secondary"}>
              {program.status}
            </Badge>
            {program.parent && (
              <span>
                Parent:{" "}
                <Link
                  to="/programs/$id"
                  params={{ id: program.parent.id }}
                  className="underline"
                >
                  {program.parent.name}
                </Link>
              </span>
            )}
            {program.sub_category && <span>Sub-category: {program.sub_category}</span>}
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)} className="gap-1">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <section className="rounded-lg border border-border p-4">
        <h2 className="text-lg font-medium">Current Merchants</h2>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Primary</div>
            {currentPrimary?.merchant ? (
              <Link
                to="/relationships/$id"
                params={{ id: currentPrimary.merchant.id }}
                className="font-medium hover:underline"
              >
                {currentPrimary.merchant.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Secondary</div>
            {currentSecondaries.length === 0 ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              <ul className="mt-1 space-y-1">
                {currentSecondaries.map((s) => (
                  <li key={s.id}>
                    {s.merchant ? (
                      <Link
                        to="/relationships/$id"
                        params={{ id: s.merchant.id }}
                        className="hover:underline"
                      >
                        {s.merchant.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {history.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">Merchant History</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {h.merchant?.name ?? "—"}
                </span>
                <span>· {h.role}</span>
                <span>· {h.start_date ?? "?"} → {h.end_date ?? "?"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {subPrograms.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">Sub-programs</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {subPrograms.map((sp) => (
              <li key={sp.id}>
                <Link
                  to="/programs/$id"
                  params={{ id: sp.id }}
                  className="hover:underline"
                >
                  {sp.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {program.notes && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{program.notes}</p>
        </section>
      )}

      <ProgramDialog open={editOpen} onOpenChange={setEditOpen} program={program} />
    </div>
  );
}
