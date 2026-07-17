import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/today")({
  component: TodayPage,
});

function TodayPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Prepare. Prioritize. Perform. Record. Follow through.
      </p>
      <div className="mt-10 rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      </div>
    </div>
  );
}
