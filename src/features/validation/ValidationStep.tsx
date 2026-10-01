import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, Stat } from "../../components/ui";
import type { ValidationResult } from "../../types";

type ValidationStepProps = {
  validation: ValidationResult;
  onContinue: () => void;
};

export function ValidationStep({ validation, onContinue }: ValidationStepProps) {
  const issuePreview = validation.issues.slice(0, 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-accent-600 dark:text-accent-500">Validate</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
            Validation results
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Issues are shown with source row numbers from the original CSV. Export will include only
            rows that pass validation.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={onContinue}>
          Continue to export
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total rows" value={validation.totalRows.toLocaleString()} />
        <Stat label="Valid rows" value={validation.validRows.toLocaleString()} tone="good" />
        <Stat
          label="Rows with issues"
          value={validation.issueRows.toLocaleString()}
          tone={validation.issueRows ? "warn" : "good"}
        />
      </div>

      {validation.issues.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-accent-100 bg-accent-50 p-4 text-sm text-accent-700 dark:border-accent-900/50 dark:bg-accent-950/20 dark:text-accent-100">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          All rows passed validation.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            Row-level issues
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm dark:divide-zinc-800">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Row</th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Field</th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Value</th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {issuePreview.map((issue, index) => (
                  <tr key={`${issue.rowNumber}-${issue.outputName}-${index}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {issue.rowNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      <div>{issue.outputName}</div>
                      <div className="text-xs text-zinc-400">{issue.sourceColumn}</div>
                    </td>
                    <td className="max-w-64 truncate px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {issue.value || "empty"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{issue.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validation.issues.length > issuePreview.length ? (
            <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Showing first {issuePreview.length} issues of {validation.issues.length}.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
