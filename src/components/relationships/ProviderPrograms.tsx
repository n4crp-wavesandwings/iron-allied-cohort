import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  entityId: string;
  onLogEngagement?: () => void;
}

export function ProviderPrograms({ entityId, onLogEngagement }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["provider-programs", entityId],
    queryFn: async () => {
      const { data: orgs } = await supabase
        .from("engagement_organizations")
        .select("engagement_id")
        .eq("entity_id", entityId);
      const engagementIds = (orgs ?? []).map((r: any) => r.engagement_id);
      if (!engagementIds.length) return [] as { id: string; name: string }[];
      const { data: links } = await supabase
        .from("engagement_programs")
        .select("program:program_id(id, name)")
        .in("engagement_id", engagementIds);
      const map = new Map<string, { id: string; name: string }>();
      (links ?? []).forEach((l: any) => {
        if (l.program) map.set(l.program.id, l.program);
      });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Programs</CardTitle>
        {onLogEngagement && (
          <Button size="sm" variant="outline" onClick={onLogEngagement}>
            + Log Engagement
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No programs yet — add by logging an engagement that links this provider to a program.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.map((p) => (
              <li key={p.id}>
                <Link to="/programs/$id" params={{ id: p.id }} className="hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
