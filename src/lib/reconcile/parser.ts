import Papa from "papaparse";
import { LIMITS, type Dataset } from "./types";

export function parseComparisonCsv(text: string, name: string): Dataset {
  if (new Blob([text]).size > LIMITS.bytes) throw new Error("Beta limit: 10 MiB per CSV.");
  const dataset: Dataset = { name, columns: [], rows: [] };
  let failure = "";
  let cells = 0;
  const source = text.replace(/^\uFEFF/, "");
  let cursor = 0;
  const delimiter = Papa.parse<string[]>(source, { preview: 10, skipEmptyLines: true }).meta.delimiter;
  Papa.parse<string[]>(source, {
    delimiter,
    skipEmptyLines: false,
    dynamicTyping: false,
    step(result, parser) {
      const rawRecord = source.slice(cursor, result.meta.cursor);
      cursor = result.meta.cursor;
      // Skip physical blank lines, not an explicitly quoted empty key ("").
      if (/^(?:\r\n|\r|\n)?$/.test(rawRecord)) return;
      const row = result.data;
      if (result.errors.some((error) => error.code !== "UndetectableDelimiter")) {
        failure = "Malformed CSV quoting. Fix the CSV before comparing.";
      } else if (row.some((value) => value.length > LIMITS.cellLength)) {
        failure = "Beta limit: 20,000 characters per cell.";
      } else if (!dataset.columns.length) {
        if (row.some((header) => !header.trim()) || new Set(row).size !== row.length) {
          failure = "Headers must be nonempty and unique. Rename blank or duplicate headers.";
        } else if (row.length > LIMITS.columns) {
          failure = "Beta limit: 100 columns per CSV.";
        } else {
          dataset.columns = row;
        }
      } else {
        cells += row.length;
        if (dataset.rows.length >= LIMITS.rows || cells > LIMITS.cells) {
          failure = "Beta limit: 50,000 rows and 1,000,000 cells per CSV.";
        } else if (row.length > dataset.columns.length) {
          failure = `CSV record ${dataset.rows.length + 2} has more cells than headers.`;
        } else {
          dataset.rows.push(row);
        }
      }
      if (failure) parser.abort();
    },
  });
  if (failure) throw new Error(failure);
  if (!dataset.columns.length) throw new Error("This CSV is empty. A header row is required.");
  return dataset;
}
