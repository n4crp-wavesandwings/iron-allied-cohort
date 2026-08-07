import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Phone, MessageSquare, Mail, Zap, Plus, ChevronRight } from "lucide-react";
import {
  serviceProvidersQuery,
  providerContactsQuery,
  contactDisplayName,
  contactFirstName,
  type ProviderRow,
  type ProviderContactRow,
} from "@/lib/me";
import { quickStartsQuery, substituteQuickStart, type QuickStart } from "@/lib/tasks";
import { FastLogSheet, type FastLogChannel } from "@/components/engagements/FastLogSheet";
import { logTouch, invalidateTouchQueries, type TouchChannel } from "@/lib/logTouch";

export function ProviderQuickEngage() {
  const providers = useQuery(serviceProvidersQuery);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProviderRow | null>(null);
  const [quickLogProviderId, setQuickLogProviderId] = useState<string | null>(null);

  const items = useMemo(() => {
    const all = (providers.data ?? []) as ProviderRow[];
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter((p) => p.name.toLowerCase().includes(needle));
  }, [q, providers.data]);

  return (
    <>
      <div className="space-y-3">
        <Input
          placeholder="Search providers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10"
        />
        {providers.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No providers yet — add one from Relationships.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-accent"
                >
                  <span className="font-medium">{p.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProviderContactsDialog
        provider={selected}
        onClose={() => setSelected(null)}
        onLogEngagementFor={(p) => {
          setSelected(null);
          setQuickLogProviderId(p.id);
        }}
      />

      {quickLogProviderId && (
        <FastLogSheet
          open
          onOpenChange={(o) => {
            if (!o) setQuickLogProviderId(null);
          }}
          providerId={quickLogProviderId}
          providerName={items.find((p) => p.id === quickLogProviderId)?.name ?? null}
        />
      )}
    </>
  );
}

function ProviderContactsDialog({
  provider,
  onClose,
  onLogEngagementFor,
}: {
  provider: ProviderRow | null;
  onClose: () => void;
  onLogEngagementFor: (p: ProviderRow) => void;
}) {
  const open = !!provider;
  const contacts = useQuery({
    ...providerContactsQuery(provider?.id ?? ""),
    enabled: !!provider,
  });
  const quickStarts = useQuery(quickStartsQuery);
  const [qsPickerFor, setQsPickerFor] = useState<ProviderContactRow | null>(null);
  const [fastLog, setFastLog] = useState<{
    engagementId: string;
    contactId: string;
    contactName: string;
    channel: FastLogChannel;
  } | null>(null);
  const qc = useQueryClient();

  const verbLabel: Record<string, string> = {
    Call: "call",
    Text: "text",
    Email: "email",
  };

  const record = async (
    channel: TouchChannel,
    c: ProviderContactRow,
    opts?: { note?: string | null; label?: string },
  ) => {
    if (!provider) return;
    try {
      const engagementId = await logTouch({
        channel,
        contactId: c.id,
        entityId: provider.id,
        note: opts?.note ?? null,
      });
      invalidateTouchQueries(qc, { contactId: c.id, entityId: provider.id });
      const what = opts?.label ?? verbLabel[channel] ?? channel.toLowerCase();
      const fastChannel: FastLogChannel =
        channel === "Text" ? "Text" : channel === "Email" ? "Email" : "Call";
      toast.success(`Logged — ${what} to ${contactDisplayName(c)}`, {
        action: {
          label: "Add details",
          onClick: () =>
            setFastLog({
              engagementId,
              contactId: c.id,
              contactName: contactDisplayName(c),
              channel: fastChannel,
            }),
        },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not log engagement");
    }
  };

  const handleCall = (c: ProviderContactRow) => {
    const phone = c.mobile_phone || c.office_phone;
    if (!phone) {
      toast.error("No phone number on file.");
      return;
    }
    void record("Call", c);
    window.location.href = `tel:${phone}`;
  };

  const handleText = (c: ProviderContactRow) => {
    const phone = c.mobile_phone || c.office_phone;
    if (!phone) {
      toast.error("No phone number on file.");
      return;
    }
    void record("Text", c);
    window.location.href = `sms:${phone}`;
  };

  const handleEmail = (c: ProviderContactRow) => {
    if (!c.email) {
      toast.error("No email on file.");
      return;
    }
    void record("Email", c);
    window.location.href = `mailto:${c.email}`;
  };

  const handleQuickStart = (qs: QuickStart, c: ProviderContactRow) => {
    const body = substituteQuickStart(qs.body, c);
    const phone = c.mobile_phone || c.office_phone;
    if (qs.channel === "email" && c.email) {
      window.location.href = `mailto:${encodeURIComponent(c.email)}?body=${encodeURIComponent(body)}`;
    } else if (phone) {
      window.location.href = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(body)}`;
    } else if (c.email) {
      window.location.href = `mailto:${encodeURIComponent(c.email)}?body=${encodeURIComponent(body)}`;
    } else {
      toast.error("No phone or email on file.");
      return;
    }
    setQsPickerFor(null);
    void record("Text", c, { note: `Quick Start: ${qs.name}`, label: "Quick Start" });
  };

  const list = (contacts.data ?? []) as ProviderContactRow[];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{provider?.name}</DialogTitle>
          </DialogHeader>

          {contacts.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading contacts…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts yet for this provider.</p>
          ) : (
            <ul className="space-y-3">
              {list.map((c) => (
                <li key={c.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{contactDisplayName(c)}</div>
                      {c.job_title && (
                        <div className="text-xs text-muted-foreground">{c.job_title}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 gap-1"
                      onClick={() => handleCall(c)}
                      disabled={!(c.mobile_phone || c.office_phone)}
                    >
                      <Phone className="h-4 w-4" /> Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 gap-1"
                      onClick={() => handleText(c)}
                      disabled={!(c.mobile_phone || c.office_phone)}
                    >
                      <MessageSquare className="h-4 w-4" /> Text
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 gap-1"
                      onClick={() => handleEmail(c)}
                      disabled={!c.email}
                    >
                      <Mail className="h-4 w-4" /> Email
                    </Button>
                    <Button
                      size="sm"
                      className="h-10 gap-1"
                      onClick={() => setQsPickerFor(c)}
                    >
                      <Zap className="h-4 w-4" /> Quick Start
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="w-full gap-1"
              onClick={() => provider && onLogEngagementFor(provider)}
            >
              <Plus className="h-4 w-4" /> Quick Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Start picker */}
      <Dialog open={!!qsPickerFor} onOpenChange={(o) => !o && setQsPickerFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Send Quick Start
              {qsPickerFor ? ` to ${contactFirstName(qsPickerFor)}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(quickStarts.data ?? [])
              .filter((q) => q.is_favorite)
              .map((qs) => (
                <button
                  key={qs.id}
                  type="button"
                  onClick={() => qsPickerFor && handleQuickStart(qs, qsPickerFor)}
                  className="w-full rounded-md border p-3 text-left hover:bg-accent"
                >
                  <div className="font-medium">
                    <span className="mr-1">{qs.icon}</span>
                    {qs.name}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {qsPickerFor
                      ? substituteQuickStart(qs.body, qsPickerFor)
                      : qs.body}
                  </div>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {fastLog && provider && (
        <FastLogSheet
          open
          onOpenChange={(o) => {
            if (!o) setFastLog(null);
          }}
          providerId={provider.id}
          providerName={provider.name}
          engagementId={fastLog.engagementId}
          contactId={fastLog.contactId}
          contactName={fastLog.contactName}
          defaultChannel={fastLog.channel}
        />
      )}
    </>
  );
}
