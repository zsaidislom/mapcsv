import { useEffect, useMemo, useState } from "react";
import { AdminDashboard } from "./admin/AdminDashboard";
import { UploadScreen } from "./features/upload/UploadScreen";
import { sampleCsv } from "./data/sampleCsv";
import { createAnalyticsClient } from "./lib/analyticsClient";
import { parseCsvFile, parseCsvText } from "./lib/csv";
import { createDefaultMappings } from "./lib/mapping";
import { Workspace } from "./Workspace";
import type { ColumnMapping, CsvDataset, StepId } from "./types";
import type { WorkflowType } from "./lib/analyticsSchema";

type ThemeMode = "system" | "light" | "dark";

const stepOrder: StepId[] = ["upload", "preview", "mapping", "validation", "export"];

function getInitialTheme(): ThemeMode {
  const saved = window.localStorage.getItem("mapcsv-theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
}

function datasetError(dataset: CsvDataset): string | null {
  if (dataset.columns.length === 0) {
    return "This CSV does not appear to contain a header row.";
  }

  if (dataset.rows.length === 0) {
    return "This CSV has headers but no data rows to map.";
  }

  return null;
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialTheme());
  const [dataset, setDataset] = useState<CsvDataset | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [currentStep, setCurrentStep] = useState<StepId>("upload");
  const [maxStepIndex, setMaxStepIndex] = useState(0);
  const [workflowType, setWorkflowType] = useState<WorkflowType>("none");
  const [error, setError] = useState<string>();
  const [isParsing, setIsParsing] = useState(false);
  const analytics = useMemo(() => createAnalyticsClient(), []);

  const resolvedTheme = useMemo(() => {
    if (themeMode !== "system") {
      return themeMode;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    window.localStorage.setItem("mapcsv-theme", themeMode);
  }, [resolvedTheme, themeMode]);

  useEffect(() => {
    if (!window.location.pathname.startsWith("/admin")) {
      analytics.track("page_view");
    }
  }, [analytics]);

  if (window.location.pathname.startsWith("/admin")) {
    return <AdminDashboard />;
  }

  function loadDataset(nextDataset: CsvDataset, nextWorkflowType: WorkflowType) {
    const problem = datasetError(nextDataset);
    if (problem) {
      setError(problem);
      return;
    }

    setDataset(nextDataset);
    setMappings(createDefaultMappings(nextDataset));
    setWorkflowType(nextWorkflowType);
    setCurrentStep("preview");
    setMaxStepIndex(1);
    setError(undefined);
    analytics.track(
      nextWorkflowType === "sample" ? "sample_csv_parsed" : "local_csv_parsed",
      { workflowType: nextWorkflowType },
    );
    analytics.track("preview_opened", { workflowType: nextWorkflowType });
  }

  async function handleFile(file: File) {
    setError(undefined);

    if (!isCsvFile(file)) {
      setError("Please choose a .csv file.");
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parseCsvFile(file);
      loadDataset(parsed, "local");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? `Could not parse the CSV: ${caughtError.message}`
          : "Could not parse the CSV.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSample() {
    setError(undefined);
    setIsParsing(true);
    try {
      const parsed = await parseCsvText(sampleCsv, "sample-customers.csv");
      loadDataset(parsed, "sample");
    } finally {
      setIsParsing(false);
    }
  }

  function updateStep(step: StepId) {
    const index = stepOrder.indexOf(step);
    if (index < 0 || index > maxStepIndex + 1) {
      return;
    }

    setCurrentStep(step);
    setMaxStepIndex((current) => Math.max(current, index));

    if (step === "preview") {
      analytics.track("preview_opened", { workflowType });
    }
    if (step === "mapping") {
      analytics.track("mapping_opened", { workflowType });
    }
    if (step === "validation") {
      analytics.track("validation_run", { workflowType });
    }
  }

  function reset() {
    setDataset(null);
    setMappings([]);
    setCurrentStep("upload");
    setMaxStepIndex(0);
    setWorkflowType("none");
    setError(undefined);
  }

  if (!dataset) {
    return (
      <UploadScreen
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        onFileSelected={handleFile}
        onSample={handleSample}
        error={error}
        isParsing={isParsing}
      />
    );
  }

  return (
    <Workspace
      dataset={dataset}
      mappings={mappings}
      currentStep={currentStep}
      maxStepIndex={maxStepIndex}
      themeMode={themeMode}
      onThemeChange={setThemeMode}
      onStepChange={updateStep}
      onMappingsChange={setMappings}
      onReset={reset}
      workflowType={workflowType}
      onTrack={analytics.track}
    />
  );
}
