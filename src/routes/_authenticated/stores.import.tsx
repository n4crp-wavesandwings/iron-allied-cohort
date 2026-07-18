import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stores/import")({
  component: StoresImportPage,
});

type CsvRow = Record<string, string>;

interface ParsedRow {
  raw: CsvRow;
  storeNumber: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  main_phone: string | null;
  store_manager: string | null;
  action: "update" | "insert" | "skip";
  reason?: string;
  existingId?: string;
  existing?: Record<string, any>;
}

const HEADERS = [
  "StoreNumber",
  "StoreName",
  "Address",
  "City",
  "State",
  "Zip",
  "Phone",
  "StoreManager",
];

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function normalizeStoreNumber(v: unknown): string {
  if (v === null || v === undefined) return "";
  // Preserve leading zeros: keep as text.
  return String(v).trim();
}

function StoresImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ updated: number; inserted: number; skipped: number } | null>(null);

  async function handleFile(file: File) {
    setParsing(true);
    setResult(null);
    setRows(null);
    setFileName(file.name);
    try {
      const parsed = await new Promise<Papa.ParseResult<CsvRow>>((resolve, reject) => {
        Papa.parse<CsvRow>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: resolve,
          error: reject,
        });
      });

      const missingHeaders = HEADERS.filter((h) => !(parsed.meta.fields ?? []).includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing columns: ${missingHeaders.join(", ")}`);
        setParsing(false);
        return;
      }

      const csvRows: ParsedRow[] = parsed.data.map((r) => ({
        raw: r,
        storeNumber: normalizeStoreNumber(r.StoreNumber),
        name: clean(r.StoreName),
        address: clean(r.Address),
        city: clean(r.City),
        state: clean(r.State),
        zip: clean(r.Zip),
        main_phone: clean(r.Phone),
        store_manager: clean(r.StoreManager),
        action: "insert",
      }));

      const numbers = Array.from(
        new Set(csvRows.map((r) => r.storeNumber).filter((n) => n.length > 0)),
      );

      let existing: any[] = [];
      if (numbers.length > 0) {
        const { data, error } = await supabase
          .from("stores")
          .select("id, store_number, name, address, city, state, zip, main_phone, store_manager")
          .is("deleted_at", null)
          .in("store_number", numbers);
        if (error) throw error;
        existing = data ?? [];
      }
      const byNum = new Map(existing.map((s) => [s.store_number, s]));

      const seen = new Set<string>();
      for (const row of csvRows) {
        if (!row.storeNumber) {
          row.action = "skip";
          row.reason = "Missing StoreNumber";
          continue;
        }
        if (seen.has(row.storeNumber)) {
          row.action = "skip";
          row.reason = "Duplicate StoreNumber in file";
          continue;
        }
        seen.add(row.storeNumber);
        const match = byNum.get(row.storeNumber);
        if (match) {
          row.action = "update";
          row.existingId = match.id;
          row.existing = match;
        } else {
          row.action = "insert";
        }
      }

      setRows(csvRows);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to parse CSV");
    } finally {
      setParsing(false);
    }
  }

  async function runImport() {
    if (!rows) return;
    setImporting(true);
    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    try {
      for (const row of rows) {
        if (row.action === "skip") {
          skipped++;
          continue;
        }
        if (row.action === "update" && row.existingId && row.existing) {
          const patch: Record<string, any> = {};
          const fields = ["name", "address", "city", "state", "zip", "main_phone", "store_manager"] as const;
          for (const f of fields) {
            const incoming = (row as any)[f] as string | null;
            const current = row.existing[f];
            // Do not overwrite an existing non-empty field with a blank CSV cell.
            if (incoming === null || incoming === "") continue;
            if (current === incoming) continue;
            patch[f] = incoming;
          }
          if (Object.keys(patch).length === 0) {
            skipped++;
            continue;
          }
          const { error } = await (supabase.from("stores") as any)
            .update(patch)
            .eq("id", row.existingId);
          if (error) throw error;
          updated++;
        } else if (row.action === "insert") {
          const payload: Record<string, any> = {
            store_number: row.storeNumber,
            name: row.name,
            address: row.address,
            city: row.city,
            state: row.state,
            zip: row.zip,
            main_phone: row.main_phone,
            store_manager: row.store_manager,
          };
          const { error } = await (supabase.from("stores") as any).insert(payload);
          if (error) throw error;
          inserted++;
        }
      }
      setResult({ updated, inserted, skipped });
      toast.success(`Import complete: ${updated} updated, ${inserted} inserted, ${skipped} skipped`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const counts = rows
    ? {
        update: rows.filter((r) => r.action === "update").length,
        insert: rows.filter((r) => r.action === "insert").length,
        skip: rows.filter((r) => r.action === "skip").length,
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/locations">
            <ArrowLeft className="h-4 w-4 mr-1" /> Locations
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Stores</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV to add or update stores. Matches on StoreNumber within your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Required headers: {HEADERS.join(", ")}
          </p>
          <Input
            type="file"
            accept=".csv,text/csv"
            disabled={parsing || importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          {fileName && <p className="text-xs text-muted-foreground">Selected: {fileName}</p>}
        </CardContent>
      </Card>

      {rows && counts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold">{counts.update}</div>
                <div className="text-xs text-muted-foreground">Will update</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold">{counts.insert}</div>
                <div className="text-xs text-muted-foreground">Will insert</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-2xl font-semibold">{counts.skip}</div>
                <div className="text-xs text-muted-foreground">Will skip</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-2 py-1.5">Action</th>
                    <th className="text-left px-2 py-1.5">Store #</th>
                    <th className="text-left px-2 py-1.5">Name</th>
                    <th className="text-left px-2 py-1.5">Address</th>
                    <th className="text-left px-2 py-1.5">City, ST</th>
                    <th className="text-left px-2 py-1.5">Zip</th>
                    <th className="text-left px-2 py-1.5">Manager</th>
                    <th className="text-left px-2 py-1.5">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1.5">
                        {r.action === "update" && <span className="text-blue-500">Update</span>}
                        {r.action === "insert" && <span className="text-emerald-500">Insert</span>}
                        {r.action === "skip" && (
                          <span className="text-amber-500 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Skip
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 font-mono">{r.storeNumber || "—"}</td>
                      <td className="px-2 py-1.5">{r.name ?? "—"}</td>
                      <td className="px-2 py-1.5">{r.address ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-2 py-1.5">{r.zip ?? "—"}</td>
                      <td className="px-2 py-1.5">{r.store_manager ?? "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.reason ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 200 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Showing first 200 of {rows.length} rows.
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={runImport} disabled={importing || counts.update + counts.insert === 0}>
                <Upload className="h-4 w-4 mr-1" />
                {importing ? "Importing…" : `Import ${counts.update + counts.insert} rows`}
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
          <CardContent className="text-sm space-y-1">
            <div>{result.updated} updated</div>
            <div>{result.inserted} inserted</div>
            <div>{result.skipped} skipped</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
