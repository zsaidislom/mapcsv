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
import type { AnalyticsClient } from "../../lib/analyticsClient";
import type { WorkflowType } from "../../lib/analyticsSchema";

type ExportStepProps = {
  dataset: CsvDataset;
  mappings: ColumnMapping[];
  validation: ValidationResult;
  workflowType: WorkflowType;
  onTrack: AnalyticsClient["track"];
};

export function ExportStep({
  dataset,
  mappings,
  validation,
  workflowType,
  onTrack,
}: ExportStepProps) {
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
    onTrack("copy_json", { workflowType, exportFormat: "copy_json" });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadJson() {
    downloadTextFile(json, `${baseName}.json`, "application/json");
    onTrack("export_json", { workflowType, exportFormat: "json" });
  }

  function downloadCsv() {
    downloadTextFile(csv, `${baseName}-clean.csv`, "text/csv");
    onTrack("export_csv", { workflowType, exportFormat: "csv" });
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

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="primary"
          onClick={downloadJson}
          disabled={rows.length === 0}
        >
          <Download className="size-4" aria-hidden="true" />
          Download JSON
        </Button>
        <Button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
        >
          <Download className="size-4" aria-hidden="true" />
          Download clean CSV
        </Button>
        <Button
          type="button"
          onClick={copyJson}
          disabled={rows.length === 0}
          className={copied ? "animate-soft-pop" : ""}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Clipboard className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-polished dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
          Output preview
        </div>
        <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-6 text-zinc-700 dark:text-zinc-300">
          {json}
        </pre>
      </div>
    </div>
  );
}
