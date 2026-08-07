import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Clock, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PersonField, type PersonValue } from "@/components/people/PersonField";
import { engagementTagsQuery, engagementTypesQuery } from "@/lib/engagements";
import { invalidateTouchQueries } from "@/lib/logTouch";

export const FAST_LOG_CHANNELS = ["Call", "Text", "Email", "In-Person", "Internal"] as const;
export type FastLogChannel = (typeof FAST_LOG_CHANNELS)[number];

/** Preferred engagement_types names per channel, best match first. */
const CHANNEL_TYPE_NAMES: Record<FastLogChannel, string[]> = {
  Call: ["Phone Call"],
  Text: ["Text Message", "Phone Call"],
  Email: ["Email"],
  "In-Person": ["Service-Provider Office Meeting", "Job-Site Visit", "Customer Visit"],
  Internal: ["Leadership Meeting", "Peer Meeting", "General Note"],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName?: string | null;
  contactId?: string | null;
  contactName?: string | null;
  defaultChannel?: FastLogChannel;
  storeId?: string | null;
  /** Upsert into an engagement that was already stamped (e.g. post-call prompt). */
  engagementId?: string | null;
}

function isoDate(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function prettyDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function localDateTimeValue(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

async function getOrgId(): Promise<string> {
  const { data } = await supabase.from("profiles").select("org_id").single();
  const orgId = (data as any)?.org_id;
  if (!orgId) throw new Error("No organization");
  return orgId as string;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function FastLogSheet(props: Props) {
  const isMobile = useIsMobile();
  const body = <FastLogForm key={props.open ? "open" : "closed"} {...props} />;

  if (isMobile) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent side="bottom" className="flex max-h-[92vh] flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle>Fast Log</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>Fast Log</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function FastLogForm({
  open,
  onOpenChange,
  providerId,
  providerName,
  contactId,
  contactName,
  defaultChannel,
  storeId,
  engagementId,
}: Props) {
  const qc = useQueryClient();

  const [person, setPerson] = useState<PersonValue>(
    contactId ? { id: contactId, name: contactName ?? "Contact" } : null,
  );
  const [channel, setChannel] = useState<FastLogChannel>(defaultChannel ?? "Call");
  const [notes, setNotes] = useState("");
  const [nextExpectation, setNextExpectation] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString());
  const [showTime, setShowTime] = useState(false);
  const [rowId] = useState(() => engagementId ?? newId());
  const [followUpId] = useState(() => newId());

  const tags = useQuery({ ...engagementTagsQuery, enabled: open });
  const types = useQuery({ ...engagementTypesQuery, enabled: open });

  const provider = useQuery({
    queryKey: ["fastlog", "provider", providerId],
    enabled: open && !!providerId && !providerName,
    queryFn: async () => {
      const { data } = await supabase
        .from("entities")
        .select("name")
        .eq("id", providerId)
        .maybeSingle();
      return (data as any)?.name ?? null;
    },
  });

  const providerLabel = providerName ?? provider.data ?? "Provider";

  // Keep the contact prefill in sync when relaunched for a different person.
  useEffect(() => {
    if (!open) return;
    if (contactId) setPerson({ id: contactId, name: contactName ?? "Contact" });
  }, [open, contactId, contactName]);

  useEffect(() => {
    if (open && defaultChannel) setChannel(defaultChannel);
  }, [open, defaultChannel]);

  const resolveTypeId = (): string | null => {
    const list = types.data ?? [];
    for (const wanted of CHANNEL_TYPE_NAMES[channel]) {
      const hit = list.find((t) => (t.name ?? "").toLowerCase() === wanted.toLowerCase());
      if (hit) return hit.id;
    }
    return null;
  };

  const buildCopyText = () => {
    const lines = [
      `${prettyDate(isoDate(new Date(occurredAt)))} — ${channel} with ${person?.name ?? "—"}, ${providerLabel}`,
    ];
    if (notes.trim()) lines.push(notes.trim());
    if (nextExpectation.trim() || nextDate) {
      const what = nextExpectation.trim() || "Follow up";
      lines.push(nextDate ? `Next: ${what} by ${prettyDate(nextDate)}` : `Next: ${what}`);
    }
    return lines.join("\n");
  };

  const save = useMutation({
    mutationFn: async () => {
      const orgId = await getOrgId();
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id ?? null;
      const typeId = resolveTypeId();

      const { error: eErr } = await supabase.from("engagements").upsert(
        {
          id: rowId,
          org_id: orgId,
          engagement_type_id: typeId,
          occurred_at: occurredAt,
          store_id: storeId ?? null,
          note: notes.trim() || null,
          created_by: userId,
        } as any,
        { onConflict: "id" },
      );
      if (eErr) throw eErr;

      const links: { table: string; row: Record<string, unknown> }[] = [
        {
          table: "engagement_organizations",
          row: { engagement_id: rowId, entity_id: providerId, org_id: orgId },
        },
      ];
      if (person?.id)
        links.push({
          table: "engagement_people",
          row: { engagement_id: rowId, contact_id: person.id, org_id: orgId },
        });
      if (storeId)
        links.push({
          table: "engagement_stores",
          row: { engagement_id: rowId, store_id: storeId, org_id: orgId },
        });
      if (typeId)
        links.push({
          table: "engagement_type_links",
          row: { engagement_id: rowId, engagement_type_id: typeId, org_id: orgId },
        });
      for (const tagId of tagIds)
        links.push({
          table: "engagement_tag_links",
          row: { engagement_id: rowId, tag_id: tagId, org_id: orgId },
        });

      // Retry-safe: clear this engagement's link rows, then rewrite them.
      for (const table of [
        "engagement_organizations",
        "engagement_people",
        "engagement_stores",
        "engagement_type_links",
        "engagement_tag_links",
      ]) {
        await supabase.from(table as any).delete().eq("engagement_id", rowId);
      }
      for (const { table, row } of links) {
        const { error } = await supabase.from(table as any).insert(row as any);
        if (error) console.error(`[fastLog] link failed ${table}`, error);
      }

      if (nextExpectation.trim() || nextDate) {
        const { error: fErr } = await supabase.from("follow_ups").upsert(
          {
            id: followUpId,
            org_id: orgId,
            engagement_id: rowId,
            entity_id: providerId,
            title: nextExpectation.trim() || "Follow up",
            due_date: nextDate || addDays(7),
            status: "open",
            assigned_to: userId,
            created_by: userId,
          } as any,
          { onConflict: "id" },
        );
        if (fErr) throw fErr;

        await supabase.from("follow_up_organizations").delete().eq("follow_up_id", followUpId);
        await supabase
          .from("follow_up_organizations")
          .insert({ follow_up_id: followUpId, entity_id: providerId, org_id: orgId } as any);
        if (person?.id) {
          await supabase.from("follow_up_people").delete().eq("follow_up_id", followUpId);
          await supabase
            .from("follow_up_people")
            .insert({ follow_up_id: followUpId, contact_id: person.id, org_id: orgId } as any);
        }
      }
    },
    onSuccess: () => {
      const text = buildCopyText();
      invalidateTouchQueries(qc, { contactId: person?.id ?? null, entityId: providerId, storeId });
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["providers", "reconnect"] });
      toast.success("Logged", {
        action: {
          label: "Copy",
          onClick: () => {
            navigator.clipboard
              .writeText(text)
              .then(() => toast.success("Copied"))
              .catch(() => toast.error("Could not copy"));
          },
        },
      });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not save"),
  });

  return (
    <>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Provider — locked */}
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
            {providerLabel}
          </div>
        </div>

        {/* Contact */}
        <PersonField
          value={person}
          onChange={setPerson}
          roleLabel="Contact"
          label="Contact"
          defaultChannel="Service Provider"
          placeholder="Search people…"
        />

        {/* Channel */}
        <div className="space-y-1.5">
          <Label>Channel</Label>
          <div className="grid grid-cols-5 gap-1 rounded-md bg-muted p-1">
            {FAST_LOG_CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={cn(
                  "rounded-sm px-1 py-2 text-xs font-medium transition-colors",
                  channel === c
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="fastlog_notes">Discussion notes</Label>
          <Textarea
            id="fastlog_notes"
            autoFocus
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was discussed?"
            className="min-h-24 resize-y"
          />
        </div>

        {/* Next expectation */}
        <div className="space-y-1.5">
          <Label htmlFor="fastlog_next">Next expectation</Label>
          <Input
            id="fastlog_next"
            value={nextExpectation}
            onChange={(e) => setNextExpectation(e.target.value)}
            placeholder="What happens next?"
          />
        </div>

        {/* Next date */}
        <div className="space-y-1.5">
          <Label>Next date</Label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Tomorrow", days: 1 },
              { label: "+3 days", days: 3 },
              { label: "Next week", days: 7 },
              { label: "+2 weeks", days: 14 },
            ].map((chip) => {
              const value = addDays(chip.days);
              return (
                <button key={chip.label} type="button" onClick={() => setNextDate(value)}>
                  <Badge
                    variant={nextDate === value ? "default" : "outline"}
                    className="cursor-pointer"
                  >
                    {chip.label}
                  </Badge>
                </button>
              );
            })}
            {nextDate && (
              <button type="button" onClick={() => setNextDate("")}>
                <Badge variant="secondary" className="cursor-pointer">
                  Clear
                </Badge>
              </button>
            )}
          </div>
          <Input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="pointer-events-auto"
          />
        </div>

        {/* Tags */}
        <TagPicker value={tagIds} onChange={setTagIds} options={tags.data ?? []} />

        {/* Occurred at */}
        <div className="space-y-1.5">
          {showTime ? (
            <Input
              type="datetime-local"
              value={localDateTimeValue(occurredAt)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setOccurredAt(d.toISOString());
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowTime(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
            >
              <Clock className="h-3 w-3" />
              {new Date(occurredAt).toLocaleString()} · change time
            </button>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          className="h-12 w-full text-base"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save log"}
        </Button>
      </div>
    </>
  );
}

function TagPicker({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { id: string; name: string; group: string | null }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = useMemo(
    () => options.filter((t) => value.includes(t.id)),
    [options, value],
  );

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const createTag = async () => {
    const name = search.trim();
    if (!name) return;
    setCreating(true);
    try {
      const orgId = await getOrgId();
      const { data, error } = await supabase
        .from("engagement_tags")
        .insert({ org_id: orgId, name, is_custom: true, sort_order: 999 } as any)
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: engagementTagsQuery.queryKey });
      onChange([...value, (data as any).id as string]);
      setSearch("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create tag");
    } finally {
      setCreating(false);
    }
  };

  const exactMatch = options.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <div className="space-y-1.5">
      <Label>Tags</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate text-left">
              {selected.length ? selected.map((t) => t.name).join(", ") : "Add tags…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="pointer-events-auto w-[min(22rem,90vw)] p-0" align="start">
          <Command shouldFilter>
            <CommandInput placeholder="Search or create…" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty className="p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start gap-1"
                  disabled={!search.trim() || creating}
                  onClick={() => void createTag()}
                >
                  <Plus className="h-4 w-4" /> Create “{search.trim()}”
                </Button>
              </CommandEmpty>
              <CommandGroup>
                {options.map((t) => (
                  <CommandItem key={t.id} value={t.name} onSelect={() => toggle(t.id)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(t.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {search.trim() && !exactMatch && (
                <CommandGroup>
                  <CommandItem value={`__create_${search}`} onSelect={() => void createTag()}>
                    <Plus className="mr-2 h-4 w-4" /> Create “{search.trim()}”
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <Badge key={t.id} variant="secondary" className="cursor-pointer" onClick={() => toggle(t.id)}>
              {t.name} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
