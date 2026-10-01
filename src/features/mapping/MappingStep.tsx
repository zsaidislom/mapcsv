import { ArrowRight, EyeOff, TriangleAlert } from "lucide-react";
import { Button } from "../../components/ui";
import { findDuplicateOutputNames } from "../../lib/fieldNames";
import { getExampleValue } from "../../lib/mapping";
import type { ColumnMapping, CsvDataset, OutputType } from "../../types";
import { outputTypes } from "../../types";

type MappingStepProps = {
  dataset: CsvDataset;
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onContinue: () => void;
};

export function MappingStep({
  dataset,
  mappings,
  onMappingsChange,
  onContinue,
}: MappingStepProps) {
  const duplicateNames = findDuplicateOutputNames(
    mappings.filter((mapping) => !mapping.ignored).map((mapping) => mapping.outputName),
  );
  const hasDuplicateNames = duplicateNames.length > 0;
  const activeCount = mappings.filter((mapping) => !mapping.ignored).length;

  function updateMapping(sourceColumn: string, patch: Partial<ColumnMapping>) {
    onMappingsChange(
      mappings.map((mapping) =>
        mapping.sourceColumn === sourceColumn ? { ...mapping, ...patch } : mapping,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-accent-600 dark:text-accent-500">Map</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
            Shape your output schema
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Rename fields, choose output types, mark required values, or ignore columns you do not
            need.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={onContinue}
          disabled={hasDuplicateNames || activeCount === 0}
        >
          Validate rows
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {hasDuplicateNames ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Duplicate output field names: {duplicateNames.join(", ")}. Rename or ignore duplicate
            fields before validating.
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-[minmax(180px,1fr)_minmax(260px,1.2fr)_160px_110px_100px] gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 max-xl:hidden">
          <span>Source</span>
          <span>Output field</span>
          <span>Type</span>
          <span>Required</span>
          <span>Ignore</span>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {mappings.map((mapping) => {
            const example = getExampleValue(dataset, mapping.sourceColumn);
            const isDuplicate =
              !mapping.ignored && duplicateNames.includes(mapping.outputName.trim());

            return (
              <div
                key={mapping.sourceColumn}
                className={`grid gap-4 px-4 py-4 transition xl:grid-cols-[minmax(180px,1fr)_minmax(260px,1.2fr)_160px_110px_100px] xl:items-center ${
                  mapping.ignored ? "bg-zinc-50/70 opacity-70 dark:bg-zinc-900/40" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {mapping.sourceColumn}
                    </p>
                    {mapping.ignored ? (
                      <EyeOff className="size-3.5 text-zinc-400" aria-hidden="true" />
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-xs truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {example || "No example value"}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400 xl:hidden">
                    Output field
                  </span>
                  <input
                    type="text"
                    value={mapping.outputName}
                    disabled={mapping.ignored}
                    onChange={(event) =>
                      updateMapping(mapping.sourceColumn, { outputName: event.target.value })
                    }
                    className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:bg-zinc-100 disabled:text-zinc-500 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900 ${
                      isDuplicate
                        ? "border-amber-400 dark:border-amber-500"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                    aria-invalid={isDuplicate}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400 xl:hidden">
                    Type
                  </span>
                  <select
                    value={mapping.outputType}
                    disabled={mapping.ignored}
                    onChange={(event) =>
                      updateMapping(mapping.sourceColumn, {
                        outputType: event.target.value as OutputType,
                      })
                    }
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900"
                  >
                    {outputTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={mapping.required}
                    disabled={mapping.ignored}
                    onChange={(event) =>
                      updateMapping(mapping.sourceColumn, { required: event.target.checked })
                    }
                    className="size-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  Required
                </label>

                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={mapping.ignored}
                    onChange={(event) =>
                      updateMapping(mapping.sourceColumn, { ignored: event.target.checked })
                    }
                    className="size-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  Ignore
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
