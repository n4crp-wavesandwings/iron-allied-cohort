import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/relationships")({
  component: RelationshipsPage,
});

function RelationshipsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Relationships</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stores, providers, merchants, programs, internal partners.
      </p>
      <div className="mt-10 rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      </div>
    </div>
  );
}
