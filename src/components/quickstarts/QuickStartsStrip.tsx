import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  quickStartsQuery,
  allContactsQuery,
  substituteQuickStart,
  contactFullName,
  type QuickStart,
} from "@/lib/tasks";

function launchComposer(qs: QuickStart, contact: any) {
  const body = substituteQuickStart(qs.body, contact);
  if (qs.channel === "email" && contact?.email) {
    const url = `mailto:${encodeURIComponent(contact.email)}?body=${encodeURIComponent(body)}`;
    window.location.href = url;
    return;
  }
  const phone = contact?.phone_mobile || contact?.phone_office || "";
  if (phone) {
    const url = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    return;
  }
  if (contact?.email) {
    const url = `mailto:${encodeURIComponent(contact.email)}?body=${encodeURIComponent(body)}`;
    window.location.href = url;
    return;
  }
  // Fallback: copy to clipboard
  navigator.clipboard?.writeText(body);
}

export function QuickStartsStrip({ defaultContactId }: { defaultContactId?: string }) {
  const qs = useQuery(quickStartsQuery);
  const [selected, setSelected] = useState<QuickStart | null>(null);
  const items = (qs.data ?? []).filter((q) => q.is_favorite).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Starts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {items.map((q) => (
            <Button
              key={q.id}
              variant="outline"
              size="sm"
              onClick={() => setSelected(q)}
              className="gap-1"
            >
              <span>{q.icon}</span>
              <span>{q.name}</span>
            </Button>
          ))}
        </div>
      </CardContent>
      <RecipientPicker
        quickStart={selected}
        defaultContactId={defaultContactId}
        onClose={() => setSelected(null)}
      />
    </Card>
  );
}

function RecipientPicker({
  quickStart,
  defaultContactId,
  onClose,
}: {
  quickStart: QuickStart | null;
  defaultContactId?: string;
  onClose: () => void;
}) {
  const contacts = useQuery({ ...allContactsQuery, enabled: !!quickStart });
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const all = (contacts.data ?? []) as any[];
    if (!q) return all.slice(0, 30);
    return all
      .filter((c) => contactFullName(c).toLowerCase().includes(q.toLowerCase()))
      .slice(0, 30);
  }, [q, contacts.data]);

  const open = !!quickStart;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {quickStart?.icon} {quickStart?.name} — pick recipient
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search contacts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Message preview: {quickStart ? substituteQuickStart(quickStart.body, { first_name: "{name}" }).slice(0, 100) : ""}
          …
        </p>
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {list.map((c) => {
            const label = contactFullName(c);
            const hint = c.phone_mobile || c.phone_office || c.email || "no contact info";
            const isDefault = c.id === defaultContactId;
            return (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center justify-between border-b px-3 py-2 text-left hover:bg-accent last:border-b-0"
                onClick={() => {
                  if (!quickStart) return;
                  launchComposer(quickStart, c);
                  onClose();
                }}
              >
                <div>
                  <div className="text-sm font-medium">
                    {label} {isDefault && <span className="text-xs text-muted-foreground">(suggested)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{hint}</div>
                </div>
              </button>
            );
          })}
          {list.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
