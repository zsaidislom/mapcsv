import { Check, Clipboard, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Stat } from "../../components/ui";
import {
  cleanBaseName,
  createCsvExport,
  createJsonExport,
  downloadTextFile,
  getTransformedRows,
} from "../../lib/export";
import type { ColumnMapping, CsvDataset, ValidationResult } from "../../types";

type ExportStepProps = {
  dataset: CsvDataset;
  mappings: ColumnMapping[];
  validation: ValidationResult;
};

export function ExportStep({ dataset, mappings, validation }: ExportStepProps) {
  const [copied, setCopied] = useState(false);
  const rows = useMemo(
    () => getTransformedRows(dataset, mappings, validation),
    [dataset, mappings, validation],
  );
  const json = useMemo(() => createJsonExport(rows), [rows]);
  const csv = useMemo(() => createCsvExport(rows), [rows]);
  const baseName = cleanBaseName(dataset.fileName);

  async function copyJson() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-accent-600 dark:text-accent-500">Export</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
          Export clean data
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Downloads are generated locally from validated rows. Ignored columns are excluded and
          mapped field names are used.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Rows ready" value={rows.length.toLocaleString()} tone="good" />
        <Stat
          label="Rows excluded"
          value={(validation.totalRows - rows.length).toLocaleString()}
          tone={validation.totalRows - rows.length ? "warn" : "good"}
        />
        <Stat
          label="Output fields"
          value={mappings.filter((mapping) => !mapping.ignored).length.toLocaleString()}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="primary"
          onClick={() => downloadTextFile(json, `${baseName}.json`, "application/json")}
          disabled={rows.length === 0}
        >
          <Download className="size-4" aria-hidden="true" />
          Download JSON
        </Button>
        <Button
          type="button"
          onClick={() => downloadTextFile(csv, `${baseName}-clean.csv`, "text/csv")}
          disabled={rows.length === 0}
        >
          <Download className="size-4" aria-hidden="true" />
          Download clean CSV
        </Button>
        <Button type="button" onClick={copyJson} disabled={rows.length === 0}>
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Clipboard className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          Output preview
        </div>
        <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-6 text-zinc-700 dark:text-zinc-300">
          {json}
        </pre>
      </div>
    </div>
  );
}
