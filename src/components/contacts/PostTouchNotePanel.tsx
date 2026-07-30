import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { engagementTagsQuery, engagementTypesQuery } from "@/lib/engagements";
import { activeProgramsQuery, providerProgramIdsQuery } from "@/lib/programs";
import { logTouch, invalidateTouchQueries, type TouchChannel } from "@/lib/logTouch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementId?: string | null;
  contactId?: string | null;
  entityId?: string | null;
  storeId?: string | null;
  programId?: string | null;
  defaultChannel?: string;
}

function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function toOccurredAt(dateStr: string): string {
  if (dateStr === todayInput()) return new Date().toISOString();
  const d = new Date(`${dateStr}T12:00:00`);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function prettyDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Map an engagement type name onto the coarse TouchChannel used by logTouch. */
function channelFromTypeName(name: string): TouchChannel {
  const n = name.toLowerCase();
  if (n.includes("text")) return "Text";
  if (n.includes("email")) return "Email";
  if (n.includes("call") || n.includes("phone")) return "Call";
  if (n.includes("visit")) return "Visit";
  if (n.includes("follow")) return "Follow-up";
  return "Note";
}

export function PostTouchNotePanel({
  open,
  onOpenChange,
  engagementId,
  contactId,
  entityId,
  storeId,
  programId,
  defaultChannel,
}: Props) {
  const qc = useQueryClient();
  const createMode = !engagementId;

  const [note, setNote] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [wantFollowUp, setWantFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDue, setFollowUpDue] = useState(todayInput());
  const [typeId, setTypeId] = useState<string>("");
  const [occurredDate, setOccurredDate] = useState(todayInput());
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const tags = useQuery({ ...engagementTagsQuery, enabled: open });
  const types = useQuery({ ...engagementTypesQuery, enabled: open && createMode });
  const allPrograms = useQuery({ ...activeProgramsQuery, enabled: open && createMode });
  const providerProgramIds = useQuery({
    ...providerProgramIdsQuery(entityId ?? ""),
    enabled: open && createMode && !!entityId,
  });

  // Names used only for the copy-out text.
  const names = useQuery({
    queryKey: ["quicklog-names", contactId, entityId],
    enabled: open && (!!contactId || !!entityId),
    queryFn: async () => {
      let contact: { name: string; job_title: string | null } | null = null;
      let provider: string | null = null;
      if (contactId) {
        const { data } = await supabase
          .from("contacts")
          .select("first_name,last_name,name,job_title")
          .eq("id", contactId)
          .maybeSingle();
        if (data) {
          const d = data as any;
          contact = {
            name:
              [d.first_name, d.last_name].filter(Boolean).join(" ").trim() || d.name || "",
            job_title: d.job_title ?? null,
          };
        }
      }
      if (entityId) {
        const { data } = await supabase
          .from("entities")
          .select("name")
          .eq("id", entityId)
          .maybeSingle();
        provider = (data as any)?.name ?? null;
      }
      return { contact, provider };
    },
  });

  const existing = useQuery({
    queryKey: ["engagement-note-panel", engagementId],
    enabled: open && !!engagementId,
    queryFn: async () => {
      const { data: eng, error } = await supabase
        .from("engagements")
        .select("id, org_id, note")
        .eq("id", engagementId!)
        .maybeSingle();
      if (error) throw error;
      const { data: links, error: le } = await supabase
        .from("engagement_tag_links")
        .select("tag_id")
        .eq("engagement_id", engagementId!);
      if (le) throw le;
      return {
        engagement: eng,
        tagIds: (links ?? []).map((l: any) => l.tag_id as string),
      };
    },
  });

  useEffect(() => {
    if (!open) return;
    if (existing.data) {
      setNote(existing.data.engagement?.note ?? "");
      setTagIds(existing.data.tagIds);
    } else {
      setNote("");
      setTagIds([]);
    }
    setWantFollowUp(false);
    setFollowUpTitle("");
    setFollowUpDue(todayInput());
  }, [open, existing.data]);

  useEffect(() => {
    if (!open || !createMode) return;
    setOccurredDate(todayInput());
    setSelectedProgramId(programId ?? "");
  }, [open, createMode, programId]);

  // Default the channel selector once types load.
  useEffect(() => {
    if (!open || !createMode) return;
    const list = types.data ?? [];
    if (list.length === 0) return;
    setTypeId((cur) => {
      if (cur && list.some((t) => t.id === cur)) return cur;
      const want = (defaultChannel ?? "Call").toLowerCase();
      const hit =
        list.find((t) => (t.name ?? "").toLowerCase() === want) ??
        list.find((t) => (t.name ?? "").toLowerCase().includes(want)) ??
        list.find((t) => (t.name ?? "").toLowerCase().includes("call"));
      return hit?.id ?? list[0].id;
    });
  }, [open, createMode, types.data, defaultChannel]);

  // Preselect the provider's only program.
  useEffect(() => {
    if (!open || !createMode || programId) return;
    const ids = providerProgramIds.data ?? [];
    if (ids.length === 1) setSelectedProgramId(ids[0]);
  }, [open, createMode, programId, providerProgramIds.data]);

  const programOptions = useMemo(() => {
    const all = allPrograms.data ?? [];
    const ids = providerProgramIds.data ?? [];
    if (programId) return all.filter((p) => p.id === programId);
    if (!entityId) return [];
    return all.filter((p) => ids.includes(p.id));
  }, [allPrograms.data, providerProgramIds.data, entityId, programId]);

  const showProgramPicker = createMode && programOptions.length > 1;

  const tagsByGroup = useMemo(() => {
    const m = new Map<string, typeof tags.data>();
    for (const t of tags.data ?? []) {
      const g = t.group ?? "Other";
      const arr = m.get(g) ?? [];
      arr.push(t);
      m.set(g, arr);
    }
    return Array.from(m.entries());
  }, [tags.data]);

  const toggleTag = (id: string) =>
    setTagIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const channelName = useMemo(
    () => (types.data ?? []).find((t) => t.id === typeId)?.name ?? defaultChannel ?? "Call",
    [types.data, typeId, defaultChannel],
  );

  const programName = useMemo(
    () => (allPrograms.data ?? []).find((p) => p.id === selectedProgramId)?.name ?? null,
    [allPrograms.data, selectedProgramId],
  );

  // ---- Copy-out -----------------------------------------------------------
  const buildText = (kind: "chatter" | "email") => {
    const provider = names.data?.provider ?? null;
    const contact = names.data?.contact ?? null;
    const date = prettyDate(createMode ? occurredDate : todayInput());
    const header = [provider, channelName, date].filter(Boolean).join(" — ");
    const contactLine = contact?.name
      ? `Contact: ${contact.name}${kind === "chatter" && contact.job_title ? `, ${contact.job_title}` : ""}`
      : null;
    const nextLine =
      wantFollowUp && followUpTitle.trim()
        ? kind === "chatter"
          ? `Next: ${followUpTitle.trim()} (due ${prettyDate(followUpDue)})`
          : `Next step: ${followUpTitle.trim()} — due ${prettyDate(followUpDue)}`
        : null;

    const lines: (string | null)[] =
      kind === "chatter"
        ? [
            header,
            contactLine,
            programName,
            "",
            note.trim() || null,
            note.trim() ? "" : null,
            nextLine,
          ]
        : [
            `Subject: ${header}`,
            "",
            contactLine,
            programName,
            contactLine || programName ? "" : null,
            note.trim() ? "Discussed:" : null,
            note.trim() || null,
            note.trim() ? "" : null,
            nextLine,
          ];

    return lines
      .filter((l) => l !== null && l !== undefined)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const copy = async (kind: "chatter" | "email") => {
    const text = buildText(kind);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(kind === "chatter" ? "Copied for Chatter" : "Copied for Email");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id ?? null;

      let targetId = engagementId ?? null;
      let orgId: string;

      if (!targetId) {
        // CREATE MODE — make the engagement first.
        targetId = await logTouch({
          channel: channelFromTypeName(channelName),
          engagementTypeId: typeId || null,
          contactId: contactId ?? null,
          entityId: entityId ?? null,
          storeId: storeId ?? null,
          programId: selectedProgramId || null,
          note: note.trim() || null,
          occurredAt: toOccurredAt(occurredDate),
        });
        const { data: eng, error } = await supabase
          .from("engagements")
          .select("org_id")
          .eq("id", targetId)
          .single();
        if (error) throw error;
        orgId = (eng as any).org_id as string;
      } else {
        const { data: eng, error: uErr } = await supabase
          .from("engagements")
          .update({ note: note.trim() || null } as any)
          .eq("id", targetId)
          .select("id, org_id")
          .single();
        if (uErr) throw uErr;
        orgId = (eng as any).org_id as string;
      }

      // Sync tag links (replace)
      const existingIds = engagementId ? (existing.data?.tagIds ?? []) : [];
      const toAdd = tagIds.filter((t) => !existingIds.includes(t));
      const toRemove = existingIds.filter((t) => !tagIds.includes(t));
      if (toRemove.length) {
        const { error } = await supabase
          .from("engagement_tag_links")
          .delete()
          .eq("engagement_id", targetId)
          .in("tag_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from("engagement_tag_links").insert(
          toAdd.map((tag_id) => ({
            engagement_id: targetId,
            tag_id,
            org_id: orgId,
          })) as any,
        );
        if (error) throw error;
      }

      // Optional follow-up
      if (wantFollowUp && followUpTitle.trim()) {
        const { data: fu, error: fErr } = await supabase
          .from("follow_ups")
          .insert({
            engagement_id: targetId,
            title: followUpTitle.trim(),
            due_date: followUpDue,
            status: "open",
            assigned_to: userId,
            org_id: orgId,
            entity_id: entityId ?? null,
          } as any)
          .select("id")
          .single();
        if (fErr) throw fErr;
        const followUpId = (fu as any).id as string;
        if (contactId) {
          const { error: pErr } = await supabase.from("follow_up_people").insert({
            follow_up_id: followUpId,
            contact_id: contactId,
            org_id: orgId,
          } as any);
          if (pErr) throw pErr;
        }
        if (entityId) {
          const { error: oErr } = await supabase.from("follow_up_organizations").insert({
            follow_up_id: followUpId,
            entity_id: entityId,
            org_id: orgId,
          } as any);
          if (oErr) throw oErr;
        }
        if (storeId) {
          const { error: sErr } = await supabase.from("follow_up_stores").insert({
            follow_up_id: followUpId,
            store_id: storeId,
            org_id: orgId,
          } as any);
          if (sErr) throw sErr;
        }
        if (selectedProgramId) {
          const { error: prErr } = await supabase.from("follow_up_programs").insert({
            follow_up_id: followUpId,
            program_id: selectedProgramId,
            org_id: orgId,
          } as any);
          if (prErr) throw prErr;
        }
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidateTouchQueries(qc, { contactId, entityId, storeId });
      if (contactId) {
        qc.invalidateQueries({ queryKey: ["contact_follow_ups", contactId] });
      }
      qc.invalidateQueries({ queryKey: ["engagements", "recent"] });
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{createMode ? "Quick Log" : "Log what happened"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {createMode && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  {(types.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={occurredDate}
                onChange={(e) => setOccurredDate(e.target.value)}
              />
            </div>
          )}

          {showProgramPicker && (
            <Select
              value={selectedProgramId}
              onValueChange={(v) => setSelectedProgramId(v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Program (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No program</SelectItem>
                {programOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="space-y-2">
            <Label htmlFor="ptn_note">What was discussed?</Label>
            <Textarea
              id="ptn_note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes from this touch…"
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            {tagsByGroup.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags available.</p>
            ) : (
              <div className="space-y-3">
                {tagsByGroup.map(([group, groupTags]) => (
                  <div key={group}>
                    <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {group}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(groupTags ?? []).map((t) => {
                        const on = tagIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTag(t.id)}
                            className="focus:outline-none"
                          >
                            <Badge
                              variant={on ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                            >
                              {t.name}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border p-3">
            {!wantFollowUp ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setWantFollowUp(true)}
              >
                + Add follow-up
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ptn_expectation">Expectation for next meeting</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setWantFollowUp(false);
                      setFollowUpTitle("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  id="ptn_expectation"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder="What needs to be true by then…"
                />
                <Input
                  type="date"
                  value={followUpDue}
                  onChange={(e) => setFollowUpDue(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Close
            </Button>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => void copy("chatter")}>
              Copy for Chatter
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void copy("email")}>
              Copy for Email
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
