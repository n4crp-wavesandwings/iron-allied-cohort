import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type TouchChannel = "Call" | "Text" | "Email" | "Visit" | "Follow-up" | "Note";

export type LogTouchParams = {
  channel: TouchChannel;
  contactId?: string | null;
  entityId?: string | null;
  storeId?: string | null;
  programId?: string | null;
  note?: string | null;
  occurredAt?: string;
  /** Explicit engagement_types.id — skips name-based resolution when provided. */
  engagementTypeId?: string | null;
};

/** Preferred engagement_types names per channel, best match first. */
const CHANNEL_TYPE_NAMES: Record<TouchChannel, string[]> = {
  Call: ["Phone Call"],
  Text: ["Text Message", "Phone Call"],
  Email: ["Email"],
  Visit: ["Job-Site Visit", "Customer Visit"],
  "Follow-up": ["Follow-up", "General Note"],
  Note: ["General Note"],
};

async function resolveEngagementTypeId(channel: TouchChannel): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("engagement_types")
      .select("id,name")
      .eq("active", true);
    if (error) throw error;
    const list = (data as { id: string; name: string | null }[]) ?? [];
    for (const wanted of CHANNEL_TYPE_NAMES[channel]) {
      const hit = list.find((t) => (t.name ?? "").toLowerCase() === wanted.toLowerCase());
      if (hit) return hit.id;
    }
    return null;
  } catch {
    // Never block the write on type resolution.
    return null;
  }
}

/**
 * Insert one engagement plus its link rows. Returns the new engagement id.
 * org_id comes from the table default (current_org_id()) — same pattern as
 * logQuickEngagement in src/lib/me.ts.
 */
export async function logTouch(params: LogTouchParams): Promise<string> {
  const typeId = params.engagementTypeId ?? (await resolveEngagementTypeId(params.channel));

  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id ?? null;

  const { data: eng, error } = await supabase
    .from("engagements")
    .insert({
      engagement_type_id: typeId,
      occurred_at: params.occurredAt ?? new Date().toISOString(),
      store_id: params.storeId ?? null,
      note: params.note ?? null,
      created_by: userId,
    } as any)
    .select("id, org_id")
    .single();
  if (error) throw error;

  const engagementId = (eng as any).id as string;
  const orgId = (eng as any).org_id as string;

  const links: { table: string; row: Record<string, unknown> }[] = [];
  if (params.contactId)
    links.push({
      table: "engagement_people",
      row: { engagement_id: engagementId, contact_id: params.contactId, org_id: orgId },
    });
  if (params.entityId)
    links.push({
      table: "engagement_organizations",
      row: { engagement_id: engagementId, entity_id: params.entityId, org_id: orgId },
    });
  if (params.storeId)
    links.push({
      table: "engagement_stores",
      row: { engagement_id: engagementId, store_id: params.storeId, org_id: orgId },
    });
  if (params.programId)
    links.push({
      table: "engagement_programs",
      row: { engagement_id: engagementId, program_id: params.programId, org_id: orgId },
    });
  if (typeId)
    links.push({
      table: "engagement_type_links",
      row: { engagement_id: engagementId, engagement_type_id: typeId, org_id: orgId },
    });

  // Links are best-effort: the engagement record surviving matters more.
  await Promise.all(
    links.map(async ({ table, row }) => {
      try {
        const { error: le } = await supabase.from(table as any).insert(row as any);
        if (le) throw le;
      } catch (e: any) {
        toast.error(`Logged, but couldn't link ${table.replace("engagement_", "")}.`);
        console.error(`[logTouch] link insert failed for ${table}`, e);
      }
    }),
  );

  return engagementId;
}

/** Invalidate every view that should reflect a fresh touch. */
export function invalidateTouchQueries(
  queryClient: QueryClient,
  params: Pick<LogTouchParams, "contactId" | "entityId" | "storeId">,
) {
  queryClient.invalidateQueries({ queryKey: ["engagements", "recent"] });
  if (params.contactId)
    queryClient.invalidateQueries({ queryKey: ["engagements", "contact", params.contactId] });
  if (params.entityId)
    queryClient.invalidateQueries({ queryKey: ["engagements", "entity", params.entityId] });
  if (params.storeId)
    queryClient.invalidateQueries({ queryKey: ["engagements", "store", params.storeId] });
  queryClient.invalidateQueries({ queryKey: ["providers", "reconnect"] });
  queryClient.invalidateQueries({ queryKey: ["contacts", "last_engagement"] });
}
