import Papa from "papaparse";
import type { CsvDataset, CsvRow, ParseIssue } from "../types";

type PapaMetaWithRenamedHeaders = Papa.ParseMeta & {
  renamedHeaders?: Record<string, string>;
};

function normalizeRow(row: Record<string, unknown>, columns: string[]): CsvRow {
  return columns.reduce<CsvRow>((nextRow, column) => {
    const value = row[column];
    nextRow[column] = value == null ? "" : String(value);
    return nextRow;
  }, {});
}

function getDuplicateHeaders(meta: PapaMetaWithRenamedHeaders): string[] {
  if (!meta.renamedHeaders) {
    return [];
  }

  return Object.keys(meta.renamedHeaders);
}

export function parseCsvFile(file: File): Promise<CsvDataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const columns = result.meta.fields?.filter(Boolean) ?? [];
        const rows = result.data
          .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""))
          .map((row) => normalizeRow(row, columns));
        const issues: ParseIssue[] = result.errors.map((error) => ({
          row: typeof error.row === "number" ? error.row + 1 : undefined,
          code: error.code,
          message: error.message,
        }));

        resolve({
          fileName: file.name,
          columns,
          rows,
          delimiter: result.meta.delimiter,
          parseIssues: issues,
          duplicateHeaders: getDuplicateHeaders(result.meta as PapaMetaWithRenamedHeaders),
        });
      },
      error: (error) => reject(new Error(error.message)),
    });
  });
}

export function parseCsvText(text: string, fileName: string): Promise<CsvDataset> {
  const file = new File([text], fileName, { type: "text/csv" });
  return parseCsvFile(file);
}
