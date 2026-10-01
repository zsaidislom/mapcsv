import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button, Stat } from "../../components/ui";
import type { CsvDataset } from "../../types";

type PreviewStepProps = {
  dataset: CsvDataset;
  onContinue: () => void;
};

export function PreviewStep({ dataset, onContinue }: PreviewStepProps) {
  const previewRows = dataset.rows.slice(0, 50);
  const hasIssues = dataset.parseIssues.length > 0 || dataset.duplicateHeaders.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-accent-600 dark:text-accent-500">Preview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
            {dataset.fileName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Review the detected structure before mapping output fields. The preview is limited to
            the first 50 rows to keep the workspace fast.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={onContinue}>
          Continue to mapping
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Rows" value={dataset.rows.length.toLocaleString()} />
        <Stat label="Columns" value={dataset.columns.length.toLocaleString()} />
        <Stat label="Delimiter" value={dataset.delimiter || "Detected"} />
        <Stat
          label="Parser issues"
          value={String(dataset.parseIssues.length + dataset.duplicateHeaders.length)}
          tone={hasIssues ? "warn" : "good"}
        />
      </div>

      {hasIssues ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">The CSV loaded with warnings.</p>
              <ul className="mt-2 space-y-1">
                {dataset.duplicateHeaders.map((header) => (
                  <li key={header}>Duplicate header detected: {header}</li>
                ))}
                {dataset.parseIssues.slice(0, 5).map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>
                    {issue.row ? `Row ${issue.row}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          Table preview
        </div>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900/70">
              <tr>
                {dataset.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50">
                  {dataset.columns.map((column) => (
                    <td
                      key={column}
                      className="max-w-64 truncate px-4 py-3 text-zinc-600 dark:text-zinc-400"
                      title={row[column]}
                    >
                      {row[column] || <span className="text-zinc-400">empty</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
