import { z } from "zod";
import { makeUniqueFieldNames } from "./fieldNames";
import type { ColumnMapping, CsvDataset, OutputType } from "../types";

export const outputTypeSchema = z.enum(["String", "Number", "Email", "Date", "Boolean"]);

export const columnMappingSchema = z.object({
  sourceColumn: z.string().min(1),
  outputName: z.string().min(1),
  outputType: outputTypeSchema,
  required: z.boolean(),
  ignored: z.boolean(),
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const numericPattern = /^[-+]?(?:\d+|\d*\.\d+)(?:e[-+]?\d+)?$/i;
const booleanValues = new Set(["true", "false", "yes", "no", "1", "0"]);

function sampleValues(dataset: CsvDataset, column: string): string[] {
  return dataset.rows
    .map((row) => row[column]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 12);
}

function inferType(header: string, samples: string[]): OutputType {
  const lowerHeader = header.toLowerCase();
  const lowerSamples = samples.map((value) => value.toLowerCase());

  if (lowerHeader.includes("email") || samples.some((value) => emailPattern.test(value))) {
    return "Email";
  }

  if (
    lowerHeader.includes("date") ||
    lowerHeader.includes("created") ||
    lowerHeader.includes("updated")
  ) {
    return "Date";
  }

  if (
    lowerSamples.length > 0 &&
    lowerSamples.every((value) => booleanValues.has(value))
  ) {
    return "Boolean";
  }

  if (
    /age|amount|count|price|total|qty|quantity|score|number/.test(lowerHeader) &&
    samples.some((value) => numericPattern.test(value))
  ) {
    return "Number";
  }

  if (samples.length > 2 && samples.every((value) => numericPattern.test(value))) {
    return "Number";
  }

  return "String";
}

export function createDefaultMappings(dataset: CsvDataset): ColumnMapping[] {
  const outputNames = makeUniqueFieldNames(dataset.columns);

  return dataset.columns.map((column, index) => ({
    sourceColumn: column,
    outputName: outputNames[index],
    outputType: inferType(column, sampleValues(dataset, column)),
    required: false,
    ignored: false,
  }));
}

export function getExampleValue(dataset: CsvDataset, column: string): string {
  return dataset.rows.find((row) => row[column]?.trim())?.[column] ?? "";
}
