"use client";

import { useRef, useState } from "react";
import { importLeadsCsv } from "@/lib/actions/leads";
import { parseCsv } from "@/lib/csv";
import { Button, Label, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

const FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "company", label: "Company", required: false },
  { key: "source", label: "Source", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function CsvImport() {
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setHeaders(null);
    setRows([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onFileSelected(file: File) {
    setError(null);
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError("That file doesn't look like it has a header row plus at least one data row.");
      return;
    }
    const [headerRow, ...dataRows] = parsed;
    setHeaders(headerRow);
    setRows(dataRows);

    // Best-effort auto-map by matching header names to field labels.
    const auto: Record<FieldKey, string> = { name: "", email: "", phone: "", company: "", source: "", notes: "" };
    for (const field of FIELDS) {
      const match = headerRow.find((h) => h.trim().toLowerCase() === field.label.toLowerCase());
      if (match) auto[field.key] = match;
    }
    setMapping(auto);
  }

  async function runImport() {
    if (!headers || !mapping.name) return;
    setImporting(true);
    setError(null);
    try {
      const colIndex = (col: string) => headers.indexOf(col);
      const mapped = rows.map((r) => ({
        name: colIndex(mapping.name) >= 0 ? r[colIndex(mapping.name)] ?? "" : "",
        email: mapping.email && colIndex(mapping.email) >= 0 ? r[colIndex(mapping.email)] || null : null,
        phone: mapping.phone && colIndex(mapping.phone) >= 0 ? r[colIndex(mapping.phone)] || null : null,
        company: mapping.company && colIndex(mapping.company) >= 0 ? r[colIndex(mapping.company)] || null : null,
        source: mapping.source && colIndex(mapping.source) >= 0 ? r[colIndex(mapping.source)] || null : null,
        notes: mapping.notes && colIndex(mapping.notes) >= 0 ? r[colIndex(mapping.notes)] || null : null,
      }));
      const outcome = await importLeadsCsv(mapped);
      setResult(outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true);
          reset();
        }}
      >
        Import CSV
      </Button>
    );
  }

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[0.85rem] font-bold">Import leads from CSV</h2>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          Close
        </Button>
      </div>

      {!headers && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelected(file);
            }}
            className="text-[0.83rem] text-text-dim"
          />
          <p className="mt-2 text-[0.76rem] text-text-faint">
            First row must be column headers. Rows whose email or phone already exists in the CRM (or repeats
            earlier in the file) are skipped automatically.
          </p>
        </div>
      )}

      {headers && !result && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.78rem] text-text-dim">
            {rows.length} row{rows.length === 1 ? "" : "s"} found. Map each CRM field to a column from your file.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <Label>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                <Select
                  value={mapping[field.key]}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                >
                  <option value="">— Don&rsquo;t import —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          {error && <p className="text-[0.78rem] text-critical">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={runImport} disabled={!mapping.name || importing}>
              {importing ? "Importing…" : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Choose a different file
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.85rem] font-semibold text-good">
            Imported {result.created} lead{result.created === 1 ? "" : "s"}
            {result.skipped > 0 ? ` — skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.` : "."}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
            <Button variant="ghost" onClick={reset}>
              Import another file
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
