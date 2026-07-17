import { useQuery } from "@tanstack/react-query";
import { interactionsQueryOptions, interactionTypeLabel } from "@/lib/interactions";
import { followUpsQueryOptions } from "@/lib/followups";
import { typeLabel, type EntityRow } from "@/lib/relationships";

export function RelationshipSummary({ relationship }: { relationship: EntityRow }) {
  const interactions = useQuery(interactionsQueryOptions(relationship.id));
  const followUps = useQuery(followUpsQueryOptions(relationship.id));

  const lastInteraction = interactions.data?.[0];
  const nextFollowUp = (followUps.data ?? [])
    .filter((f) => f.status === "open")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <SummaryField label="Type" value={typeLabel(relationship.type)} />
      <SummaryField label="Status" value={relationship.status ?? "—"} />
      <SummaryField
        label="Last Interaction"
        value={
          lastInteraction
            ? `${interactionTypeLabel(lastInteraction.type)} · ${new Date(
                lastInteraction.occurred_at,
              ).toLocaleDateString()}`
            : "None"
        }
      />
      <SummaryField
        label="Next Follow-up"
        value={
          nextFollowUp
            ? `${nextFollowUp.title} · ${new Date(
                nextFollowUp.due_date,
              ).toLocaleDateString()}`
            : "None"
        }
        wide
      />
    </dl>
  );
}

function SummaryField({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
