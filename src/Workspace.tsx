import { RotateCcw } from "lucide-react";
import { Logo } from "./components/Logo";
import { StepNav } from "./components/StepNav";
import { ThemeToggle } from "./components/ThemeToggle";
import { Button, Stat } from "./components/ui";
import { ExportStep } from "./features/export/ExportStep";
import { MappingStep } from "./features/mapping/MappingStep";
import { PreviewStep } from "./features/preview/PreviewStep";
import { ValidationStep } from "./features/validation/ValidationStep";
import { steps } from "./lib/steps";
import { validateDataset } from "./lib/validation";
import type { ColumnMapping, CsvDataset, StepId } from "./types";
import type { AnalyticsClient } from "./lib/analyticsClient";
import type { WorkflowType } from "./lib/analyticsSchema";

type ThemeMode = "system" | "light" | "dark";

type WorkspaceProps = {
  dataset: CsvDataset;
  mappings: ColumnMapping[];
  currentStep: StepId;
  maxStepIndex: number;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onStepChange: (step: StepId) => void;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onReset: () => void;
  workflowType: WorkflowType;
  onTrack: AnalyticsClient["track"];
};

export function Workspace({
  dataset,
  mappings,
  currentStep,
  maxStepIndex,
  themeMode,
  onThemeChange,
  onStepChange,
  onMappingsChange,
  onReset,
  workflowType,
  onTrack,
}: WorkspaceProps) {
  const validation = validateDataset(dataset, mappings);
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  function goToStep(step: StepId) {
    onStepChange(step);
  }

  return (
    <div className="app-bg min-h-screen text-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-850 dark:bg-zinc-950/90">
        <div className="flex h-16 items-center justify-between px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Logo />
            <div className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />
            <div className="min-w-0 max-w-[42vw] sm:max-w-sm">
              <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {dataset.fileName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {dataset.rows.length.toLocaleString()} rows
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle mode={themeMode} onChange={onThemeChange} />
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (window.confirm("Reset MapCSV and choose a new file?")) {
                  onReset();
                }
              }}
              aria-label="Reset and choose a new file"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">New file</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
        <StepNav currentStep={currentStep} maxStepIndex={maxStepIndex} onSelect={goToStep} />
        <main className="min-w-0 flex-1">
          <div key={currentStep} className="animate-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-5 text-xs font-medium text-zinc-500 dark:text-zinc-400 lg:hidden">
              Step {currentIndex + 1} of {steps.length}
            </div>
            {currentStep === "upload" ? (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-medium text-accent-600 dark:text-accent-500">
                      Upload
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
                      CSV loaded
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {dataset.fileName} is ready for preview, mapping, validation, and local
                      export.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={() => onStepChange("preview")}>
                      View preview
                    </Button>
                    <Button type="button" variant="danger" onClick={onReset}>
                      New file
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Rows" value={dataset.rows.length.toLocaleString()} />
                  <Stat label="Columns" value={dataset.columns.length.toLocaleString()} />
                  <Stat label="Processing" value="Local" tone="good" />
                </div>
              </div>
            ) : null}
            {currentStep === "preview" ? (
              <PreviewStep dataset={dataset} onContinue={() => onStepChange("mapping")} />
            ) : null}
            {currentStep === "mapping" ? (
              <MappingStep
                dataset={dataset}
                mappings={mappings}
                onMappingsChange={onMappingsChange}
                onContinue={() => onStepChange("validation")}
              />
            ) : null}
            {currentStep === "validation" ? (
              <ValidationStep validation={validation} onContinue={() => onStepChange("export")} />
            ) : null}
            {currentStep === "export" ? (
              <ExportStep
                dataset={dataset}
                mappings={mappings}
                validation={validation}
                workflowType={workflowType}
                onTrack={onTrack}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
