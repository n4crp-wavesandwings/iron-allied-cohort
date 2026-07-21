import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Plus, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Channel mechanism
// ---------------------------------------------------------------------------
// A "channel" is which Relationships tab a person appears under. The app
// already backs that with `entities.type` + `organization_type`, joined to
// contacts through `contact_organizations`. Merchant is the one exception —
// it's a flag on the contact record.
export const PERSON_CHANNELS = [
  "Internal",
  "Service Provider",
  "Merchant",
  "Program",
  "Third-party Partner",
] as const;
export type PersonChannel = (typeof PERSON_CHANNELS)[number];

type EntityType = "internal" | "provider" | "merchant" | "program" | "store";

const CHANNEL_BUCKET: Record<
  PersonChannel,
  { type: EntityType; organization_type: string; bucketName: string } | null
> = {
  Internal: { type: "internal", organization_type: "Internal", bucketName: "Internal" },
  "Service Provider": {
    type: "provider",
    organization_type: "Service Provider",
    bucketName: "Service Provider",
  },
  Merchant: null, // handled via contacts.is_merchant
  Program: { type: "program", organization_type: "Program", bucketName: "Program" },
  "Third-party Partner": {
    type: "internal",
    organization_type: "Third-party Partner",
    bucketName: "Third-party Partner",
  },
};

export type PersonValue = { id: string; name: string } | null;

export type PersonFieldLinkTarget =
  | { kind: "store"; storeId: string }
  | { kind: "none" }
  | undefined;

interface Props {
  value: PersonValue;
  onChange: (v: PersonValue) => void;
  roleLabel: string;
  defaultChannel?: PersonChannel;
  linkTarget?: PersonFieldLinkTarget;
  placeholder?: string;
  label?: string;
  id?: string;
}

type ContactMatch = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  job_title: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getOrgId(): Promise<string> {
  const { data } = await supabase.from("profiles").select("org_id").single();
  const orgId = (data as any)?.org_id;
  if (!orgId) throw new Error("No organization");
  return orgId as string;
}

function displayNameFor(c: {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
}) {
  const composed = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  return composed || c.name || "(no name)";
}

async function ensureRole(contactId: string, role: string) {
  const trimmed = role.trim();
  if (!trimmed) return;
  const { data: existing } = await supabase
    .from("contact_roles")
    .select("id")
    .eq("contact_id", contactId)
    .ilike("role", trimmed)
    .maybeSingle();
  if (existing?.id) return;
  const { error } = await supabase
    .from("contact_roles")
    .insert({ contact_id: contactId, role: trimmed });
  if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
}

async function ensureChannel(contactId: string, channel: PersonChannel, orgId: string) {
  if (channel === "Merchant") {
    await supabase.from("contacts").update({ is_merchant: true } as any).eq("id", contactId);
    return;
  }
  const spec = CHANNEL_BUCKET[channel];
  if (!spec) return;

  // Find-or-create the channel bucket entity (org-scoped, well-known name).
  const { data: found } = await supabase
    .from("entities")
    .select("id")
    .eq("type", spec.type)
    .eq("name", spec.bucketName)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  let entityId = (found as any)?.id as string | undefined;
  if (!entityId) {
    const { data: created, error } = await supabase
      .from("entities")
      .insert({
        type: spec.type,
        organization_type: spec.organization_type,
        name: spec.bucketName,
        status: "Active",
        active: true,
      } as any)
      .select("id")
      .single();
    if (error) throw error;
    entityId = (created as any).id as string;
  }

  // Link contact ↔ bucket entity (idempotent).
  const { data: link } = await supabase
    .from("contact_organizations")
    .select("id")
    .eq("contact_id", contactId)
    .eq("organization_id", entityId)
    .maybeSingle();
  if (!link) {
    await supabase
      .from("contact_organizations")
      .insert({ contact_id: contactId, organization_id: entityId } as any);
  }
  // Also mirror on contacts.entity_id if it's null (keeps existing UIs happy).
  await supabase
    .from("contacts")
    .update({ entity_id: entityId } as any)
    .eq("id", contactId)
    .is("entity_id", null);
  void orgId;
}

async function ensureStoreCoverage(contactId: string, storeId: string, orgId: string) {
  const { data: existing } = await supabase
    .from("contact_store_coverage")
    .select("id")
    .eq("contact_id", contactId)
    .eq("store_id", storeId)
    .eq("is_current", true)
    .maybeSingle();
  if (existing) return;
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("contact_store_coverage").insert({
    org_id: orgId,
    contact_id: contactId,
    store_id: storeId,
    is_current: true,
    start_date: today,
  } as any);
}

export async function linkContactToChannelAndTarget(
  contactId: string,
  channel: PersonChannel,
  role: string,
  linkTarget: PersonFieldLinkTarget,
) {
  const orgId = await getOrgId();
  await ensureRole(contactId, role);
  await ensureChannel(contactId, channel, orgId);
  if (linkTarget?.kind === "store") {
    await ensureStoreCoverage(contactId, linkTarget.storeId, orgId);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PersonField({
  value,
  onChange,
  roleLabel,
  defaultChannel = "Internal",
  linkTarget,
  placeholder = "Search a person by name…",
  label,
  id,
}: Props) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<ContactMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<PersonChannel>(defaultChannel);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  // create-form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roleLabel);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setChannel(defaultChannel), [defaultChannel]);
  useEffect(() => setRole(roleLabel), [roleLabel]);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Search
  useEffect(() => {
    let cancel = false;
    async function run() {
      if (!debounced) {
        setResults([]);
        return;
      }
      setSearching(true);
      const like = `%${debounced}%`;
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, name, job_title")
        .is("deleted_at", null)
        .or(
          `first_name.ilike.${like},last_name.ilike.${like},name.ilike.${like}`,
        )
        .order("last_name", { ascending: true, nullsFirst: false })
        .limit(8);
      if (cancel) return;
      setSearching(false);
      if (error) {
        setResults([]);
        return;
      }
      setResults((data ?? []) as ContactMatch[]);
    }
    run();
    return () => {
      cancel = true;
    };
  }, [debounced]);

  // Close popover on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const closeExactMatch = useMemo(() => {
    const q = debounced.toLowerCase();
    if (!q) return null;
    return (
      results.find((r) => displayNameFor(r).toLowerCase() === q) ??
      results.find((r) => displayNameFor(r).toLowerCase().startsWith(q)) ??
      null
    );
  }, [debounced, results]);

  const pickExisting = async (c: ContactMatch) => {
    setBusy(true);
    try {
      await linkContactToChannelAndTarget(c.id, channel, roleLabel, linkTarget);
      const name = displayNameFor(c);
      onChange({ id: c.id, name });
      setOpen(false);
      setShowCreate(false);
      setQuery("");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Linked ${name}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to link contact");
    } finally {
      setBusy(false);
    }
  };

  const createAndLink = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      toast.error("First and last name required");
      return;
    }
    setBusy(true);
    try {
      const orgId = await getOrgId();
      const payload: any = {
        first_name: fn,
        last_name: ln,
        name: `${fn} ${ln}`,
        active: true,
      };
      const { data, error } = await supabase
        .from("contacts")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      const contactId = (data as any).id as string;
      const { writeCanonicalContactDetails } = await import("@/lib/contacts");
      await writeCanonicalContactDetails(contactId, {
        mobilePhone: phone,
        email,
        role: role || roleLabel,
      });
      await ensureChannel(contactId, channel, orgId);
      if (linkTarget?.kind === "store") {
        await ensureStoreCoverage(contactId, linkTarget.storeId, orgId);
      }
      const name = `${fn} ${ln}`;
      onChange({ id: contactId, name });
      setOpen(false);
      setShowCreate(false);
      setQuery("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Added ${name}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create contact");
    } finally {
      setBusy(false);
    }
  };


  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  // ------- render -------
  if (value && !open) {
    return (
      <div className="space-y-2" ref={rootRef}>
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{value.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {roleLabel} · {channel}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(true);
              setQuery("");
            }}
          >
            Change
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clear}
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setShowCreate(false);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-11"
          autoComplete="off"
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {/* Channel selector */}
            <div className="flex items-center gap-2 border-b border-border p-2">
              <span className="text-xs text-muted-foreground shrink-0">Channel</span>
              <Select value={channel} onValueChange={(v) => setChannel(v as PersonChannel)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSON_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results */}
            {!showCreate && (
              <div className="max-h-72 overflow-y-auto py-1">
                {searching && (
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </div>
                )}
                {!searching && debounced && results.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No matches for &ldquo;{debounced}&rdquo;.
                  </div>
                )}
                {closeExactMatch && (
                  <div className="mx-2 my-1 rounded border border-primary/40 bg-primary/5 px-2 py-1 text-xs text-primary flex items-center gap-1">
                    <Check className="h-3 w-3" /> Close match — prefer this to avoid duplicates.
                  </div>
                )}
                {results.map((c) => {
                  const name = displayNameFor(c);
                  const isClose = closeExactMatch?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy}
                      onClick={() => pickExisting(c)}
                      className={`w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent focus:outline-none flex items-center gap-2 min-h-11 ${
                        isClose ? "bg-primary/5" : ""
                      }`}
                    >
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{name}</div>
                        {c.job_title && (
                          <div className="truncate text-xs text-muted-foreground">
                            {c.job_title}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-1"
                    onClick={() => {
                      // Pre-fill split of query as first/last if possible
                      const parts = query.trim().split(/\s+/);
                      if (parts[0]) setFirstName(parts[0]);
                      if (parts.length > 1) setLastName(parts.slice(1).join(" "));
                      setShowCreate(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Create new contact
                    {query.trim() && ` “${query.trim()}”`}
                  </Button>
                </div>
              </div>
            )}

            {/* Compact create form */}
            {showCreate && (
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">First name *</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last name *</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      inputMode="email"
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreate(false)}
                    disabled={busy}
                  >
                    Back
                  </Button>
                  <Button type="button" size="sm" onClick={createAndLink} disabled={busy}>
                    {busy ? "Saving…" : "Create & link"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
