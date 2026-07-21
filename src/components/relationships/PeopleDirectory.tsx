import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MessageSquare, Mail, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type PersonRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  name: string | null;
  roles: string[];
  organization: { id: string; name: string } | null;
  store: { id: string; store_number: string; name: string | null } | null;
  phone: string | null;
  email: string | null;
};

function displayName(p: PersonRow): string {
  if (p.preferred_name && p.last_name) return `${p.preferred_name} ${p.last_name}`;
  const parts = [p.first_name, p.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return p.name ?? "Unnamed";
}

export function PeopleDirectory() {
  const [text, setText] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people-directory"],
    queryFn: async (): Promise<PersonRow[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select(
          `id, first_name, last_name, preferred_name, name,
           contact_roles(role),
           contact_organizations(is_primary, organization:organization_id(id, name)),
           contact_store_coverage(is_current, store:store_id(id, store_number, name)),
           contact_phones(phone, is_primary),
           contact_emails(email, is_primary)`,
        )
        .is("deleted_at", null)
        .order("last_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => {
        const orgs = (c.contact_organizations ?? []).filter((o: any) => o.organization);
        const primaryOrg = orgs.find((o: any) => o.is_primary) ?? orgs[0];
        const stores = (c.contact_store_coverage ?? []).filter(
          (r: any) => r.is_current && r.store,
        );
        const phones = c.contact_phones ?? [];
        const primaryPhone = phones.find((p: any) => p.is_primary) ?? phones[0];
        const emails = c.contact_emails ?? [];
        const primaryEmail = emails.find((e: any) => e.is_primary) ?? emails[0];
        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          preferred_name: c.preferred_name,
          name: c.name,
          roles: (c.contact_roles ?? []).map((r: any) => r.role).filter(Boolean),
          organization: primaryOrg?.organization ?? null,
          store: stores[0]?.store ?? null,
          phone: primaryPhone?.phone ?? null,
          email: primaryEmail?.email ?? null,
        };
      });
    },
  });

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    people.forEach((p) => p.roles.forEach((r) => set.add(r)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [people]);

  const allOrgs = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((p) => p.organization && map.set(p.organization.id, p.organization.name));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [people]);

  const allStores = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((p) => {
      if (p.store) {
        const label = `#${p.store.store_number}${p.store.name ? ` ${p.store.name}` : ""}`;
        map.set(p.store.id, label);
      }
    });
    return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [people]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return people.filter((p) => {
      if (roleFilter !== "all" && !p.roles.includes(roleFilter)) return false;
      if (orgFilter !== "all" && p.organization?.id !== orgFilter) return false;
      if (storeFilter !== "all" && p.store?.id !== storeFilter) return false;
      if (q) {
        const hay = [
          displayName(p),
          p.organization?.name ?? "",
          p.store ? `#${p.store.store_number} ${p.store.name ?? ""}` : "",
          p.roles.join(" "),
          p.email ?? "",
          p.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [people, text, roleFilter, orgFilter, storeFilter]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Filter by name, company, role…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {allRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {allOrgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {allStores.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No people match the current filters.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((p) => {
              const where =
                p.organization?.name ??
                (p.store
                  ? `${p.store.store_number}${p.store.name ? ` ${p.store.name}` : ""}`
                  : "—");
              const role = p.roles[0] ?? "—";
              const hasPhone = !!p.phone;
              const hasEmail = !!p.email;
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      to="/contacts/$id"
                      params={{ id: p.id }}
                      className="font-medium truncate hover:underline"
                    >
                      {displayName(p)}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {where} · {role}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild={hasPhone}
                      disabled={!hasPhone}
                      aria-label="Call"
                      className={cn(!hasPhone && "opacity-40")}
                    >
                      {hasPhone ? (
                        <a href={`tel:${p.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild={hasPhone}
                      disabled={!hasPhone}
                      aria-label="Text"
                      className={cn(!hasPhone && "opacity-40")}
                    >
                      {hasPhone ? (
                        <a href={`sms:${p.phone}`}>
                          <MessageSquare className="h-4 w-4" />
                        </a>
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild={hasEmail}
                      disabled={!hasEmail}
                      aria-label="Email"
                      className={cn(!hasEmail && "opacity-40")}
                    >
                      {hasEmail ? (
                        <a href={`mailto:${p.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" asChild aria-label="Edit">
                      <Link to="/contacts/$id" params={{ id: p.id }}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
