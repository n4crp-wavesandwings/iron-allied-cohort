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
import { engagementTagsQuery } from "@/lib/engagements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementId: string | null;
  contactId: string | null;
}

function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function PostTouchNotePanel({ open, onOpenChange, engagementId, contactId }: Props) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [wantFollowUp, setWantFollowUp] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDue, setFollowUpDue] = useState(todayInput());

  const tags = useQuery({ ...engagementTagsQuery, enabled: open });

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

  const save = useMutation({
    mutationFn: async () => {
      if (!engagementId) throw new Error("No engagement to save to.");
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id ?? null;

      // 1. Update engagement note
      const { data: eng, error: uErr } = await supabase
        .from("engagements")
        .update({ note: note.trim() || null } as any)
        .eq("id", engagementId)
        .select("id, org_id")
        .single();
      if (uErr) throw uErr;
      const orgId = (eng as any).org_id as string;

      // 2. Sync tag links (replace)
      const existingIds = existing.data?.tagIds ?? [];
      const toAdd = tagIds.filter((t) => !existingIds.includes(t));
      const toRemove = existingIds.filter((t) => !tagIds.includes(t));
      if (toRemove.length) {
        const { error } = await supabase
          .from("engagement_tag_links")
          .delete()
          .eq("engagement_id", engagementId)
          .in("tag_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from("engagement_tag_links").insert(
          toAdd.map((tag_id) => ({
            engagement_id: engagementId,
            tag_id,
            org_id: orgId,
          })) as any,
        );
        if (error) throw error;
      }

      // 3. Optional follow-up
      if (wantFollowUp && followUpTitle.trim()) {
        const { data: fu, error: fErr } = await supabase
          .from("follow_ups")
          .insert({
            engagement_id: engagementId,
            title: followUpTitle.trim(),
            due_date: followUpDue,
            status: "open",
            assigned_to: userId,
            org_id: orgId,
          } as any)
          .select("id")
          .single();
        if (fErr) throw fErr;
        if (contactId) {
          const { error: pErr } = await supabase.from("follow_up_people").insert({
            follow_up_id: (fu as any).id,
            contact_id: contactId,
            org_id: orgId,
          } as any);
          if (pErr) throw pErr;
        }
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      if (contactId) {
        qc.invalidateQueries({ queryKey: ["engagements", "contact", contactId] });
        qc.invalidateQueries({ queryKey: ["contact_follow_ups", contactId] });
      }
      qc.invalidateQueries({ queryKey: ["engagements", "recent"] });
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log what happened</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
                  <Label>Follow-up</Label>
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
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder="Next step…"
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
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !engagementId}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
