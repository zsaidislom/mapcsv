import Papa from "papaparse";
import { issueRowIndexes } from "./validation";
import type { ColumnMapping, CsvDataset, OutputType, ValidationResult } from "../types";

function normalizeBoolean(value: string): boolean {
  return ["true", "yes", "1"].includes(value.trim().toLowerCase());
}

function transformValue(type: OutputType, value: string): string | number | boolean | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (type === "Number") {
    return Number(trimmed);
  }

  if (type === "Boolean") {
    return normalizeBoolean(trimmed);
  }

  return trimmed;
}

export function getTransformedRows(
  dataset: CsvDataset,
  mappings: ColumnMapping[],
  validation: ValidationResult,
): Record<string, string | number | boolean | null>[] {
  const invalidRows = issueRowIndexes(validation.issues);
  const activeMappings = mappings.filter((mapping) => !mapping.ignored);

  return dataset.rows
    .filter((_, rowIndex) => !invalidRows.has(rowIndex))
    .map((row) =>
      activeMappings.reduce<Record<string, string | number | boolean | null>>(
        (nextRow, mapping) => {
          nextRow[mapping.outputName] = transformValue(
            mapping.outputType,
            row[mapping.sourceColumn] ?? "",
          );
          return nextRow;
        },
        {},
      ),
    );
}

export function createJsonExport(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}

export function createCsvExport(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows, {
    quotes: false,
    delimiter: ",",
    header: true,
    newline: "\r\n",
  });
}

export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function cleanBaseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "") || "mapcsv-export";
}
