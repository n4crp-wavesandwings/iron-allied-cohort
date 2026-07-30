import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Phone, MessageSquare, Mail } from "lucide-react";
import {
  providersReconnectQuery,
  providerContactsWithMethodsQuery,
  contactDisplayName,
  type ProviderReconnectRow,
} from "@/lib/me";
import { logTouch, invalidateTouchQueries, type TouchChannel } from "@/lib/logTouch";
import { PostTouchNotePanel } from "@/components/contacts/PostTouchNotePanel";

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
  const [noteEngagementId, setNoteEngagementId] = useState<string | null>(null);
  const [noteContactId, setNoteContactId] = useState<string | null>(null);
  const [noteEntityId, setNoteEntityId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);


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
    <>
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
              {isOpen && (
                <ProviderContactList
                  providerId={p.id}
                  providerName={p.name}
                  onLogged={(engagementId, contactId) => {
                    setNoteContactId(contactId);
                    setNoteEntityId(p.id);
                    setNoteEngagementId(engagementId);
                    setPanelOpen(true);
                  }}
                  onQuickLog={(contactId) => {
                    setNoteEngagementId(null);
                    setNoteContactId(contactId);
                    setNoteEntityId(p.id);
                    setPanelOpen(true);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <PostTouchNotePanel
        open={panelOpen}
        onOpenChange={(o) => {
          setPanelOpen(o);
          if (!o) {
            setNoteEngagementId(null);
            setNoteContactId(null);
            setNoteEntityId(null);
          }
        }}
        engagementId={noteEngagementId}
        contactId={noteContactId}
        entityId={noteEntityId}
      />

    </>
  );
}

function ProviderContactList({
  providerId,
  providerName,
  onLogged,
  onQuickLog,
}: {
  providerId: string;
  providerName: string;
  onLogged: (engagementId: string, contactId: string) => void;
  onQuickLog: (contactId: string) => void;
}) {

  const { data, isLoading } = useQuery(providerContactsWithMethodsQuery(providerId));
  const qc = useQueryClient();
  const contacts = data ?? [];

  const verb: Record<"Call" | "Text" | "Email", string> = {
    Call: "call",
    Text: "text",
    Email: "email",
  };

  const record = async (
    channel: "Call" | "Text" | "Email",
    contact: { id: string; first_name?: string | null; last_name?: string | null; name?: string | null },
  ) => {
    try {
      const engagementId = await logTouch({
        channel: channel as TouchChannel,
        contactId: contact.id,
        entityId: providerId,
      });
      invalidateTouchQueries(qc, { contactId: contact.id, entityId: providerId });
      toast.success(`Logged — ${verb[channel]} to ${contactDisplayName(contact as any)}`, {
        action: {
          label: "Add note",
          onClick: () => onLogged(engagementId, contact.id),
        },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not log engagement");
    }
  };

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
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => onQuickLog(c.id)}
            >
              <SquarePen className="h-4 w-4" /> Log
            </Button>

            {c.primary_phone && (
              <Button asChild size="sm" variant="outline" className="h-9 gap-1">
                <a href={`tel:${c.primary_phone}`} onClick={() => void record("Call", c)}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
            {c.primary_phone && (
              <Button asChild size="sm" variant="outline" className="h-9 gap-1">
                <a href={`sms:${c.primary_phone}`} onClick={() => void record("Text", c)}>
                  <MessageSquare className="h-4 w-4" /> Text
                </a>
              </Button>
            )}
            {c.primary_email && (
              <Button asChild size="sm" variant="outline" className="h-9 gap-1">
                <a href={`mailto:${c.primary_email}`} onClick={() => void record("Email", c)}>
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
