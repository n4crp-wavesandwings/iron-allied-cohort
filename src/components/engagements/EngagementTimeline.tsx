import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import type { EngagementListItem } from "@/lib/engagements";
import { contactLabel, engagementTypeLabel } from "@/lib/engagements";

export function EngagementTimeline({ items }: { items: EngagementListItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No engagements yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((e) => {
        const openFollowUps = (e.follow_ups ?? []).filter((f) => f.status === "open").length;
        const primaryLabel =
          e.store?.store_number
            ? `Store ${e.store.store_number}${e.store.name ? ` — ${e.store.name}` : ""}`
            : e.organizations?.[0]?.entity?.name ?? "";
        const peopleNames = (e.people ?? []).map((p) => contactLabel(p.contact)).filter(Boolean);
        return (
          <li key={e.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {e.type?.name ?? "Engagement"}
                  </Badge>
                  {primaryLabel && (
                    <span className="text-sm font-medium truncate">{primaryLabel}</span>
                  )}
                  {e.outcome && (
                    <Badge variant="outline" className="text-xs">{e.outcome.name}</Badge>
                  )}
                  {openFollowUps > 0 && (
                    <Badge className="gap-1 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">
                      <Bell className="h-3 w-3" /> {openFollowUps} follow-up{openFollowUps > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {peopleNames.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    With: {peopleNames.join(", ")}
                  </div>
                )}
                {(e.tags?.length ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.tags.map((t) => (
                      <span key={t.tag_id} className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        #{t.tag?.name}
                      </span>
                    ))}
                  </div>
                )}
                {e.note && <p className="mt-1 line-clamp-2 text-sm">{e.note}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {new Date(e.occurred_at).toLocaleString()}
                </span>
                <Link
                  to="/engagements/$id"
                  params={{ id: e.id }}
                  className="text-xs underline"
                >
                  Open
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
