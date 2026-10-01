import type { StepId } from "../types";

export const steps: { id: StepId; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "preview", label: "Preview" },
  { id: "mapping", label: "Map" },
  { id: "validation", label: "Validate" },
  { id: "export", label: "Export" },
];
