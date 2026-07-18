import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ChevronRight } from "lucide-react";
import { myStoresQuery } from "@/lib/me";

export function MyStoresCard() {
  const stores = useQuery(myStoresQuery);
  const rows = stores.data ?? [];
  const districts = new Set(rows.map((r) => r.district_name ?? "—"));
  const districtCount = districts.size;

  return (
    <Link
      to="/locations"
      search={{ tab: "stores", mine: 1 } as any}
      className="block"
    >
      <Card className="transition hover:bg-accent/40">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border p-2">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">My Stores</div>
              <div className="text-xs text-muted-foreground">
                {stores.isLoading
                  ? "Loading…"
                  : rows.length === 0
                    ? "No stores assigned yet"
                    : `${rows.length} stores across ${districtCount} district${districtCount === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
