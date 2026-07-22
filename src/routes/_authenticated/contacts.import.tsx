import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contacts/import")({
  component: ContactsImportPage,
});

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type Row = Record<string, unknown>;

type PhoneEntry = { phone: string; digits: string; label: string; isPrimary: boolean };
type EmailEntry = { email: string; label: string; isPrimary: boolean };

type ParsedContact = {
  rowIndex: number;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  normalizedName: string; // for match keys
  company: string | null;
  companyNorm: string | null;
  jobTitle: string | null;
  notes: string | null;
  phones: PhoneEntry[];
  emails: EmailEntry[];

  // Resolution results filled during preview:
  matchedEntity: { id: string; name: string } | null;
  matchedContactId: string | null;
  action: "insert" | "update" | "skip";
  reason?: string;
};

type EntityLite = { id: string; name: string; type: string };

// ------------------------------------------------------------------
// Normalization helpers
// ------------------------------------------------------------------
function collapseSpaces(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}
function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = collapseSpaces(String(v));
  return s.length === 0 ? null : s;
}
function normalizeName(v: string): string {
  return collapseSpaces(v).toLowerCase();
}
function digitsOf(v: string): string {
  return v.replace(/\D/g, "");
}
function phoneKey(digits: string): string {
  // Last 10 digits is the compare key (handles country code 1).
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

// ------------------------------------------------------------------
// Header lookup — tolerate reordering / extras
// ------------------------------------------------------------------
function pick(row: Row, ...names: string[]): unknown {
  for (const n of names) {
    if (n in row && row[n] !== undefined && row[n] !== null && String(row[n]).length > 0) {
      return row[n];
    }
  }
  return null;
}

function parseRow(row: Row, idx: number): ParsedContact {
  const firstName = cleanStr(pick(row, "First Name"));
  const lastName = cleanStr(pick(row, "Last Name"));
  const displayName = cleanStr(pick(row, "Display Name"));
  const company = cleanStr(pick(row, "Company"));
  const jobTitle = cleanStr(pick(row, "Job Title"));
  const notes = cleanStr(pick(row, "Notes"));

  const phones: PhoneEntry[] = [];
  const seenPhoneKeys = new Set<string>();
  for (let i = 1; i <= 3; i++) {
    const raw = cleanStr(pick(row, `Phone ${i}`));
    if (!raw) continue;
    const d = digitsOf(raw);
    if (d.length < 7) continue;
    const k = phoneKey(d);
    if (seenPhoneKeys.has(k)) continue;
    seenPhoneKeys.add(k);
    const lbl = cleanStr(pick(row, `Phone ${i} Label`)) ?? "";
    phones.push({
      phone: raw,
      digits: d,
      label: mapPhoneLabel(lbl),
      isPrimary: /PREF/i.test(lbl),
    });
  }
  // Ensure exactly one primary if any phones
  if (phones.length && !phones.some((p) => p.isPrimary)) phones[0].isPrimary = true;

  const emails: EmailEntry[] = [];
  const seenEmailKeys = new Set<string>();
  for (let i = 1; i <= 3; i++) {
    const raw = cleanStr(pick(row, `Email ${i}`));
    if (!raw) continue;
    const k = emailKey(raw);
    if (seenEmailKeys.has(k)) continue;
    seenEmailKeys.add(k);
    const lbl = cleanStr(pick(row, `Email ${i} Label`)) ?? "";
    emails.push({
      email: raw,
      label: mapEmailLabel(lbl),
      isPrimary: /PREF/i.test(lbl),
    });
  }
  if (emails.length && !emails.some((e) => e.isPrimary)) emails[0].isPrimary = true;

  const nameForKey =
    [firstName, lastName].filter(Boolean).join(" ") || displayName || "";
  return {
    rowIndex: idx,
    firstName,
    lastName,
    displayName,
    normalizedName: normalizeName(nameForKey),
    company,
    companyNorm: company ? normalizeName(company) : null,
    jobTitle,
    notes,
    phones,
    emails,
    matchedEntity: null,
    matchedContactId: null,
    action: "insert",
  };
}

function mapPhoneLabel(raw: string): string {
  const s = raw.toUpperCase();
  if (s.includes("MOBILE") || s.includes("CELL") || s.includes("IPHONE")) return "Mobile";
  if (s.includes("WORK") || s.includes("OFFICE")) return "Office";
  if (s.includes("HOME")) return "Home";
  if (s.includes("FAX")) return "Fax";
  return "Mobile";
}
function mapEmailLabel(raw: string): string {
  const s = raw.toUpperCase();
  if (s.includes("WORK")) return "Work";
  if (s.includes("HOME")) return "Personal";
  return "Work";
}

// ------------------------------------------------------------------
// Company matching — confident-or-null
// ------------------------------------------------------------------
function resolveCompany(
  companyNorm: string | null,
  entities: EntityLite[],
): EntityLite | null {
  if (!companyNorm) return null;
  // The Home Depot exception (any casing/spacing)
  if (companyNorm === "the home depot" || companyNorm === "home depot") {
    const hd = entities.find(
      (e) => e.type === "internal" && normalizeName(e.name) === "the home depot",
    );
    if (hd) return hd;
  }
  // Exact match
  const exact = entities.find((e) => normalizeName(e.name) === companyNorm);
  if (exact) return exact;
  // Containment (either direction) — with high-confidence guard: shorter name must be
  // at least 3 tokens or 6 chars, and appear as whole substring at a word boundary.
  const candidates = entities.filter((e) => {
    const en = normalizeName(e.name);
    if (en === companyNorm) return true;
    const [shorter, longer] = en.length < companyNorm.length ? [en, companyNorm] : [companyNorm, en];
    if (shorter.length < 6) return false;
    // Word-boundary containment
    const re = new RegExp(`(^|\\s)${shorter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`);
    return re.test(longer);
  });
  if (candidates.length === 1) return candidates[0];
  return null;
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
function ContactsImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: Row[] }[] | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedContact[] | null>(null);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    linked: number;
    unassigned: number;
    skipped: { row: number; reason: string }[];
  } | null>(null);

  async function loadFile(file: File) {
    setBusy(true);
    setResult(null);
    setParsed(null);
    setSheets(null);
    setSheetName(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      let out: { name: string; rows: Row[] }[] = [];
      if (/\.csv$/i.test(file.name)) {
        const text = new TextDecoder().decode(buf);
        const parsedCsv = Papa.parse<Row>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
        });
        out = [{ name: "CSV", rows: (parsedCsv.data as Row[]) ?? [] }];
      } else {
        const wb = XLSX.read(buf, { type: "array" });
        out = wb.SheetNames.map((n) => ({
          name: n,
          rows: XLSX.utils.sheet_to_json<Row>(wb.Sheets[n], { defval: null, raw: true }),
        }));
      }
      setSheets(out);
      // Auto-pick the sheet that looks like contacts (has First Name + Company)
      const best =
        out.find((s) =>
          s.rows.length > 0 &&
          "First Name" in (s.rows[0] as any) &&
          "Company" in (s.rows[0] as any),
        ) ?? out[0];
      setSheetName(best?.name ?? null);
      if (best) await runPreview(best.rows);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to read file");
    } finally {
      setBusy(false);
    }
  }

  async function pickSheet(name: string) {
    setSheetName(name);
    const s = sheets?.find((x) => x.name === name);
    if (s) {
      setBusy(true);
      try {
        await runPreview(s.rows);
      } finally {
        setBusy(false);
      }
    }
  }

  async function runPreview(rows: Row[]) {
    // 1) Parse rows
    const p = rows.map((r, i) => parseRow(r, i + 2)); // +2 for header + 1-index

    // 2) Load candidate entities (providers + internal) for the org
    const { data: ents, error: entsErr } = await supabase
      .from("entities")
      .select("id, name, type")
      .in("type", ["provider", "internal"])
      .is("deleted_at", null);
    if (entsErr) throw entsErr;
    const entList: EntityLite[] = (ents ?? []) as any;
    setEntities(entList);

    // 3) Company resolution
    for (const c of p) {
      c.matchedEntity = resolveCompany(c.companyNorm, entList);
    }

    // 4) Existing-contact matching (normalized name + matching phone OR email)
    const { data: existing, error: exErr } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, name, contact_phones(phone), contact_emails(email)",
      )
      .is("deleted_at", null);
    if (exErr) throw exErr;

    type Ex = {
      id: string;
      normName: string;
      phoneKeys: Set<string>;
      emailKeys: Set<string>;
    };
    const existingList: Ex[] = (existing ?? []).map((c: any) => {
      const nm =
        [c.first_name, c.last_name].filter(Boolean).join(" ") || c.name || "";
      return {
        id: c.id,
        normName: normalizeName(nm),
        phoneKeys: new Set(
          (c.contact_phones ?? [])
            .map((x: any) => phoneKey(digitsOf(x.phone ?? "")))
            .filter((k: string) => k.length >= 7),
        ),
        emailKeys: new Set(
          (c.contact_emails ?? [])
            .map((x: any) => emailKey(x.email ?? ""))
            .filter(Boolean),
        ),
      };
    });

    for (const c of p) {
      if (!c.normalizedName && c.phones.length === 0 && c.emails.length === 0) {
        c.action = "skip";
        c.reason = "No name or contact info";
        continue;
      }
      const myPhoneKeys = c.phones.map((x) => phoneKey(x.digits));
      const myEmailKeys = c.emails.map((x) => emailKey(x.email));
      const match = existingList.find((e) => {
        if (!e.normName || e.normName !== c.normalizedName) return false;
        if (myPhoneKeys.some((k) => e.phoneKeys.has(k))) return true;
        if (myEmailKeys.some((k) => e.emailKeys.has(k))) return true;
        return false;
      });
      if (match) {
        c.matchedContactId = match.id;
        c.action = "update";
      } else {
        c.action = "insert";
      }
    }
    setParsed(p);
  }

  async function runImport() {
    if (!parsed) return;
    setImporting(true);
    const skipped: { row: number; reason: string }[] = [];
    let created = 0;
    let updated = 0;
    let linked = 0;
    let unassigned = 0;
    try {
      const { data: profile } = await supabase.from("profiles").select("org_id").single();
      const orgId = (profile as any)?.org_id;
      if (!orgId) throw new Error("No organization for current user");

      for (const c of parsed) {
        if (c.action === "skip") {
          skipped.push({ row: c.rowIndex, reason: c.reason ?? "skipped" });
          continue;
        }
        try {
          let contactId = c.matchedContactId;
          const nameCombo =
            [c.firstName, c.lastName].filter(Boolean).join(" ") ||
            c.displayName ||
            "Unnamed";

          if (contactId) {
            // Update: only fill blanks / update notes if new provided
            const patch: Record<string, unknown> = {};
            if (c.firstName) patch.first_name = c.firstName;
            if (c.lastName) patch.last_name = c.lastName;
            if (c.jobTitle) patch.job_title = c.jobTitle;
            if (c.notes) patch.note = c.notes;
            patch.name = nameCombo;
            if (Object.keys(patch).length) {
              await (supabase.from("contacts") as any).update(patch).eq("id", contactId);
            }
            updated++;
          } else {
            const insertPayload: Record<string, unknown> = {
              org_id: orgId,
              first_name: c.firstName,
              last_name: c.lastName,
              name: nameCombo,
              job_title: c.jobTitle,
              note: c.notes,
              active: true,
            };
            const { data: ins, error: insErr } = await (supabase.from("contacts") as any)
              .insert(insertPayload)
              .select("id")
              .single();
            if (insErr) throw insErr;
            contactId = (ins as any).id as string;
            created++;
          }
          if (!contactId) continue;

          // Phones
          if (c.phones.length) {
            const { data: existingPhones } = await supabase
              .from("contact_phones")
              .select("id, phone, is_primary")
              .eq("contact_id", contactId);
            const existingKeys = new Set(
              (existingPhones ?? []).map((r: any) => phoneKey(digitsOf(r.phone ?? ""))),
            );
            const hasAnyPrimary = (existingPhones ?? []).some((r: any) => r.is_primary);
            let firstInsert = !((existingPhones ?? []).length) && !hasAnyPrimary;
            for (const ph of c.phones) {
              const k = phoneKey(ph.digits);
              if (existingKeys.has(k)) continue;
              const isPrimary = ph.isPrimary || firstInsert;
              firstInsert = false;
              await (supabase.from("contact_phones") as any).insert({
                contact_id: contactId,
                phone: ph.phone,
                label: ph.label,
                is_primary: isPrimary && !hasAnyPrimary,
              });
              existingKeys.add(k);
            }
          }

          // Emails
          if (c.emails.length) {
            const { data: existingEmails } = await supabase
              .from("contact_emails")
              .select("id, email, is_primary")
              .eq("contact_id", contactId);
            const existingKeys = new Set(
              (existingEmails ?? []).map((r: any) => emailKey(r.email ?? "")),
            );
            const hasAnyPrimary = (existingEmails ?? []).some((r: any) => r.is_primary);
            let firstInsert = !((existingEmails ?? []).length) && !hasAnyPrimary;
            for (const em of c.emails) {
              const k = emailKey(em.email);
              if (existingKeys.has(k)) continue;
              const isPrimary = em.isPrimary || firstInsert;
              firstInsert = false;
              await (supabase.from("contact_emails") as any).insert({
                contact_id: contactId,
                email: em.email,
                label: em.label,
                is_primary: isPrimary && !hasAnyPrimary,
              });
              existingKeys.add(k);
            }
          }

          // Role
          if (c.jobTitle) {
            const { data: existingRoles } = await supabase
              .from("contact_roles")
              .select("id, role")
              .eq("contact_id", contactId);
            const has = (existingRoles ?? []).some(
              (r: any) =>
                (r.role ?? "").trim().toLowerCase() === c.jobTitle!.trim().toLowerCase(),
            );
            if (!has) {
              await (supabase.from("contact_roles") as any).insert({
                contact_id: contactId,
                role: c.jobTitle,
              });
            }
          }

          // Org link
          if (c.matchedEntity) {
            const { data: existingLinks } = await supabase
              .from("contact_organizations")
              .select("id, organization_id, is_primary")
              .eq("contact_id", contactId);
            const already = (existingLinks ?? []).some(
              (l: any) => l.organization_id === c.matchedEntity!.id,
            );
            if (!already) {
              const isPrimary = !((existingLinks ?? []).some((l: any) => l.is_primary));
              await (supabase.from("contact_organizations") as any).insert({
                contact_id: contactId,
                organization_id: c.matchedEntity.id,
                is_primary: isPrimary,
              });
            }
            linked++;
          } else {
            unassigned++;
          }
        } catch (rowErr: any) {
          skipped.push({ row: c.rowIndex, reason: rowErr?.message ?? "error" });
        }
      }
      setResult({ created, updated, linked, unassigned, skipped });
      toast.success(`Import complete: ${created} created, ${updated} updated`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  // Summary values
  const summary = useMemo(() => {
    if (!parsed) return null;
    const linkedByProvider = new Map<string, number>();
    let toLink = 0;
    let toHomeDepot = 0;
    let toUnassigned = 0;
    let toInsert = 0;
    let toUpdate = 0;
    let toSkip = 0;
    const unmatchedCompanies = new Map<string, number>();
    for (const c of parsed) {
      if (c.action === "skip") toSkip++;
      else if (c.action === "insert") toInsert++;
      else if (c.action === "update") toUpdate++;
      if (c.action === "skip") continue;
      if (c.matchedEntity) {
        toLink++;
        if (normalizeName(c.matchedEntity.name) === "the home depot") toHomeDepot++;
        linkedByProvider.set(
          c.matchedEntity.name,
          (linkedByProvider.get(c.matchedEntity.name) ?? 0) + 1,
        );
      } else {
        toUnassigned++;
        if (c.company) {
          unmatchedCompanies.set(c.company, (unmatchedCompanies.get(c.company) ?? 0) + 1);
        }
      }
    }
    return {
      total: parsed.length,
      toInsert,
      toUpdate,
      toSkip,
      toLink,
      toHomeDepot,
      toUnassigned,
      linkedByProvider: Array.from(linkedByProvider.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
      unmatchedCompanies: Array.from(unmatchedCompanies.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
    };
  }, [parsed]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/relationships">
            <ArrowLeft className="h-4 w-4 mr-1" /> Relationships
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Upload an Apple iCloud Contacts export (.xlsx or .csv). Contacts are matched to
          existing providers only when the company name is a confident match — otherwise
          they import unassigned and can be linked from the Contact Hub.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".xlsx,.csv,text/csv"
            disabled={busy || importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
            }}
          />
          {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
          {sheets && sheets.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sheet:</span>
              <Select value={sheetName ?? ""} onValueChange={pickSheet}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sheets.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name} ({s.rows.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {busy && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Analyzing…</CardContent>
        </Card>
      )}

      {summary && parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Preview ({summary.total} rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <Stat label="New contacts" value={summary.toInsert} />
              <Stat label="Updates" value={summary.toUpdate} />
              <Stat label="Linked to provider" value={summary.toLink} />
              <Stat label="Unassigned" value={summary.toUnassigned} />
            </div>
            {summary.toHomeDepot > 0 && (
              <p className="text-xs text-muted-foreground">
                {summary.toHomeDepot} will link to <strong>The Home Depot</strong>.
              </p>
            )}
            {summary.linkedByProvider.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Providers that will receive contacts</div>
                <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
                  {summary.linkedByProvider.map(([n, c]) => (
                    <div key={n} className="flex justify-between">
                      <span>{n}</span>
                      <span className="text-muted-foreground">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {summary.unmatchedCompanies.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">
                  Companies without a confident match ({summary.unmatchedCompanies.length}) — will import UNASSIGNED
                </div>
                <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
                  {summary.unmatchedCompanies.map(([n, c]) => (
                    <div key={n} className="flex justify-between">
                      <span>{n}</span>
                      <span className="text-muted-foreground">{c}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can assign the correct provider later from each Contact Hub.
                </p>
              </div>
            )}
            {summary.toSkip > 0 && (
              <p className="text-xs text-amber-500 inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {summary.toSkip} row(s) will be skipped (missing name and contact info).
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={runImport}
                disabled={importing || summary.toInsert + summary.toUpdate === 0}
              >
                <Upload className="h-4 w-4 mr-1" />
                {importing
                  ? "Importing…"
                  : `Import ${summary.toInsert + summary.toUpdate} contacts`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{result.created} created</div>
            <div>{result.updated} updated</div>
            <div>{result.linked} linked to a provider</div>
            <div>{result.unassigned} unassigned</div>
            {result.skipped.length > 0 && (
              <div>
                <div className="font-medium">Skipped ({result.skipped.length})</div>
                <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
                  {result.skipped.map((s) => (
                    <div key={s.row} className="flex justify-between">
                      <span>Row {s.row}</span>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/relationships">Go to People</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Entities considered for matching: {entities.length} providers + internal orgs.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
