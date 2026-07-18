import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { engagementDetailQuery, contactLabel, engagementTypeLabel } from "@/lib/engagements";

export const Route = createFileRoute("/_authenticated/engagements/$id")({
  component: EngagementDetail,
});

function EngagementDetail() {
  const { id } = Route.useParams();
  const { data: e, isLoading } = useQuery(engagementDetailQuery(id));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!e) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/engagements"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">Engagement not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1">
        <Link to="/engagements"><ArrowLeft className="h-4 w-4" /> Back to Engagements</Link>
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{e.type?.name ?? "Engagement"}</Badge>
          {e.outcome && <Badge variant="outline">{e.outcome.name}</Badge>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {e.type?.name ?? "Engagement"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(e.occurred_at).toLocaleString()}
        </p>
      </div>

      {e.note && (
        <Card>
          <CardHeader><CardTitle className="text-base">Note</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{e.note}</p></CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Store</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {e.store ? (
              <div>
                Store {e.store.store_number}
                {e.store.name ? ` — ${e.store.name}` : ""}
              </div>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
            {(e.stores?.length ?? 0) > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-muted-foreground">Additional stores:</div>
                {e.stores.map((s) => (
                  <div key={s.store_id}>
                    Store {s.store?.store_number}
                    {s.store?.name ? ` — ${s.store.name}` : ""}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Organizations</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(e.organizations?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">—</p>
            ) : (
              e.organizations.map((o) =>
                o.entity ? (
                  <Link
                    key={o.entity_id}
                    to="/relationships/$id"
                    params={{ id: o.entity.id }}
                    className="block hover:underline"
                  >
                    {o.entity.name}
                  </Link>
                ) : null,
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">People</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(e.people?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">—</p>
            ) : (
              e.people.map((p) =>
                p.contact ? (
                  <Link
                    key={p.contact_id}
                    to="/contacts/$id"
                    params={{ id: p.contact.id }}
                    className="block hover:underline"
                  >
                    {contactLabel(p.contact)}
                  </Link>
                ) : null,
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Programs</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(e.programs?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">—</p>
            ) : (
              e.programs.map((p) => (
                <div key={p.program_id}>{p.program?.name}</div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
          <CardContent>
            {(e.tags?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {e.tags.map((t) => (
                  <Badge key={t.tag_id} variant="outline" className="text-xs">
                    {t.tag?.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {(e.follow_ups?.length ?? 0) > 0 && (
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Follow-ups</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {e.follow_ups.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-md border p-2">
                    <span>{f.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Due {new Date(f.due_date + "T00:00:00").toLocaleDateString()} · {f.status}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
