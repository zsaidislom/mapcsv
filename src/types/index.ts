export const outputTypes = ["String", "Number", "Email", "Date", "Boolean"] as const;

export type OutputType = (typeof outputTypes)[number];

export type CsvRow = Record<string, string>;

export type ParseIssue = {
  row?: number;
  code: string;
  message: string;
};

export type CsvDataset = {
  fileName: string;
  columns: string[];
  rows: CsvRow[];
  delimiter?: string;
  parseIssues: ParseIssue[];
  duplicateHeaders: string[];
};

export type ColumnMapping = {
  sourceColumn: string;
  outputName: string;
  outputType: OutputType;
  required: boolean;
  ignored: boolean;
};

export type ValidationIssue = {
  rowNumber: number;
  sourceColumn: string;
  outputName: string;
  value: string;
  reason: string;
};

export type ValidationResult = {
  totalRows: number;
  validRows: number;
  issueRows: number;
  issues: ValidationIssue[];
};

export type StepId = "upload" | "preview" | "mapping" | "validation" | "export";
