import { useQuery } from "@tanstack/react-query";
import { interactionsQueryOptions, interactionTypeLabel } from "@/lib/interactions";

export function InteractionTimeline({ entityId }: { entityId: string }) {
  const { data, isLoading } = useQuery(interactionsQueryOptions(entityId));

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No interactions logged yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {data.map((i) => (
        <li key={i.id} className="border-l-2 border-border pl-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{interactionTypeLabel(i.type)}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(i.occurred_at).toLocaleString()}
            </span>
          </div>
          {i.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{i.body}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
