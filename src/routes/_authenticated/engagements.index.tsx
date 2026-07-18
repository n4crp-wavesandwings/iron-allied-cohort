import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { recentEngagementsQuery } from "@/lib/engagements";
import { EngagementTimeline } from "@/components/engagements/EngagementTimeline";
import { EngagementDialog } from "@/components/engagements/EngagementDialog";

export const Route = createFileRoute("/_authenticated/engagements/")({
  component: EngagementsIndex,
});

function EngagementsIndex() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useQuery(recentEngagementsQuery);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Engagements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every meaningful moment — capture once, appears everywhere it's linked.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> New Engagement
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <EngagementTimeline items={data ?? []} />
          )}
        </CardContent>
      </Card>

      <EngagementDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
