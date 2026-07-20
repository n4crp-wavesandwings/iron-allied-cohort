import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Phone, MessageSquare, Mail } from "lucide-react";
import {
  providersReconnectQuery,
  providerContactsWithMethodsQuery,
  contactDisplayName,
  type ProviderReconnectRow,
} from "@/lib/me";

const RECONNECT_THRESHOLD_DAYS = 9;

function lastContactedLabel(row: ProviderReconnectRow): string {
  if (row.gap_days === null) return "Never contacted";
  if (row.gap_days === 0) return "Contacted today";
  if (row.gap_days === 1) return "Last contacted 1 day ago";
  return `Last contacted ${row.gap_days} days ago`;
}

export function ProviderReconnect() {
  const { data, isLoading } = useQuery(providersReconnectQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = (data ?? []) as ProviderReconnectRow[];
    return all
      .filter(
        (r) => r.gap_days === null || r.gap_days >= RECONNECT_THRESHOLD_DAYS,
      )
      .sort((a, b) => {
        if (a.gap_days === null && b.gap_days !== null) return -1;
        if (b.gap_days === null && a.gap_days !== null) return 1;
        return (b.gap_days ?? 0) - (a.gap_days ?? 0);
      });
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Every provider has been engaged in the last {RECONNECT_THRESHOLD_DAYS} days.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((p) => {
        const isOpen = expandedId === p.id;
        return (
          <li key={p.id} className="rounded-md border">
            <button
              type="button"
              onClick={() => setExpandedId(isOpen ? null : p.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {lastContactedLabel(p)}
                </div>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {isOpen && <ProviderContactList providerId={p.id} providerName={p.name} />}
          </li>
        );
      })}
    </ul>
  );
}

function ProviderContactList({
  providerId,
  providerName,
}: {
  providerId: string;
  providerName: string;
}) {
  const { data, isLoading } = useQuery(providerContactsWithMethodsQuery(providerId));
  const contacts = data ?? [];

  if (isLoading) {
    return (
      <div className="border-t px-3 py-3 text-sm text-muted-foreground">Loading contacts…</div>
    );
  }
  if (contacts.length === 0) {
    return (
      <div className="border-t px-3 py-3 text-sm text-muted-foreground">
        No contacts yet —{" "}
        <Link
          to="/relationships/$id"
          params={{ id: providerId }}
          className="underline"
        >
          add one on {providerName}
        </Link>
        .
      </div>
    );
  }

  return (
    <ul className="divide-y border-t">
      {contacts.map((c) => (
        <li key={c.id} className="px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{contactDisplayName(c)}</div>
              {c.job_title && (
                <div className="text-xs text-muted-foreground truncate">{c.job_title}</div>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {c.primary_phone && (
              <Button asChild size="sm" variant="outline" className="h-9 gap-1">
                <a href={`tel:${c.primary_phone}`}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
            {c.primary_phone && (
              <Button asChild size="sm" variant="outline" className="h-9 gap-1">
                <a href={`sms:${c.primary_phone}`}>
                  <MessageSquare className="h-4 w-4" /> Text
                </a>
              </Button>
            )}
            {c.primary_email && (
              <Button asChild size="sm" variant="outline" className="h-9 gap-1">
                <a href={`mailto:${c.primary_email}`}>
                  <Mail className="h-4 w-4" /> Email
                </a>
              </Button>
            )}
            {!c.primary_phone && !c.primary_email && (
              <span className="text-xs text-muted-foreground">
                No phone or email on file.
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
