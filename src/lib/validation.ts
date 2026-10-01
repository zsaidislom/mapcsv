import { z } from "zod";
import type {
  ColumnMapping,
  CsvDataset,
  OutputType,
  ValidationIssue,
  ValidationResult,
} from "../types";

const emailSchema = z.string().email();
const numberPattern = /^[-+]?(?:\d+|\d*\.\d+)(?:e[-+]?\d+)?$/i;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const isoSlashDatePattern = /^\d{4}\/\d{2}\/\d{2}$/;
const monthNamePattern =
  /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}$/i;
const booleanValues = new Set(["true", "false", "yes", "no", "1", "0"]);

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

function isValidDate(value: string): boolean {
  const trimmed = value.trim();

  if (
    !isoDatePattern.test(trimmed) &&
    !isoSlashDatePattern.test(trimmed) &&
    !monthNamePattern.test(trimmed)
  ) {
    return false;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed);
}

function validateValue(type: OutputType, value: string): string | null {
  const trimmed = value.trim();

  if (type === "String") {
    return null;
  }

  if (type === "Number") {
    return numberPattern.test(trimmed) && Number.isFinite(Number(trimmed))
      ? null
      : "Must be a valid number";
  }

  if (type === "Email") {
    return emailSchema.safeParse(trimmed).success ? null : "Invalid email address";
  }

  if (type === "Date") {
    return isValidDate(trimmed)
      ? null
      : "Use an ISO-style date or a date with a month name";
  }

  if (type === "Boolean") {
    return booleanValues.has(trimmed.toLowerCase())
      ? null
      : "Use true/false, yes/no, or 1/0";
  }

  return null;
}

export function validateDataset(
  dataset: CsvDataset,
  mappings: ColumnMapping[],
): ValidationResult {
  const activeMappings = mappings.filter((mapping) => !mapping.ignored);
  const issues: ValidationIssue[] = [];
  const rowsWithIssues = new Set<number>();

  dataset.rows.forEach((row, rowIndex) => {
    activeMappings.forEach((mapping) => {
      const value = row[mapping.sourceColumn] ?? "";

      if (mapping.required && isEmpty(value)) {
        rowsWithIssues.add(rowIndex);
        issues.push({
          rowNumber: rowIndex + 2,
          sourceColumn: mapping.sourceColumn,
          outputName: mapping.outputName,
          value,
          reason: "Required value is empty",
        });
        return;
      }

      if (isEmpty(value)) {
        return;
      }

      const error = validateValue(mapping.outputType, value);
      if (error) {
        rowsWithIssues.add(rowIndex);
        issues.push({
          rowNumber: rowIndex + 2,
          sourceColumn: mapping.sourceColumn,
          outputName: mapping.outputName,
          value,
          reason: error,
        });
      }
    });
  });

  return {
    totalRows: dataset.rows.length,
    validRows: dataset.rows.length - rowsWithIssues.size,
    issueRows: rowsWithIssues.size,
    issues,
  };
}

export function issueRowIndexes(issues: ValidationIssue[]): Set<number> {
  return new Set(issues.map((issue) => issue.rowNumber - 2));
}
