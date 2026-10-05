import Papa from "papaparse";
import { buildComparisonScope } from "./scope";
import type { Comparison, Dataset, ExportFormat, Rules } from "./types";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function boundedText() {
  const parts: string[] = [];
  const encoder = new TextEncoder();
  let bytes = 0;
  return {
    append(part: string) {
      bytes += encoder.encode(part).byteLength;
      if (bytes > 20_000_000) throw new Error("This export exceeds the 20 MB beta limit. Compare fewer fields or smaller files.");
      parts.push(part);
    },
    finish: () => parts.join(""),
  };
}

export function exportComparisonCsv(format: Exclude<ExportFormat, "html">, before: Dataset, after: Dataset, result: Comparison): string {
  const text = boundedText();
  const line = (values: (string | number | boolean | undefined)[]) => Papa.unparse([values], { escapeFormulae: /^(?:\s*[=+\-@]|[\t\r\n])/ });
  let count = 0;
  const appendRow = (values: (string | number | boolean | undefined)[]) => { text.append(`\r\n${line(values)}`); count++; };
  if (format === "changed") {
    text.append(line(["key", "before_record", "after_record", "before_column", "after_column", "before_value", "after_value", "before_present", "after_present"]));
    for (const row of result.rows) {
      if (row.status !== "changed") continue;
      for (const change of row.changes) appendRow([JSON.stringify(row.key), row.before! + 2, row.after! + 2, change.beforeColumn, change.afterColumn, change.before ?? "", change.after ?? "", change.before !== undefined, change.after !== undefined]);
    }
  } else {
    const dataset = format === "added" ? after : before;
    text.append(line(dataset.columns));
    for (const row of result.rows) if (row.status === format) appendRow(dataset.rows[format === "added" ? row.after! : row.before!]);
  }
  if (!count) text.append("\r\n");
  return text.finish();
}

export function exportComparisonHtml(before: Dataset, after: Dataset, rules: Rules, result: Comparison): string {
  const e = escapeHtml;
  const text = boundedText();
  const { append } = text;
  const scope = buildComparisonScope(before, after, rules);
  const value = (text: string | undefined) => text === undefined ? "<em>Missing cell</em>" : text === "" ? "<em>Empty</em>" : e(text);
  const record = (dataset: Dataset, index: number) => `<dl>${dataset.columns.map((column, i) => `<dt>${e(column)}</dt><dd>${value(dataset.rows[index][i])}</dd>`).join("")}</dl>`;
  const identifier = (values: string[], side: "before" | "after") => `<dl>${values.map((entry, index) => {
    const beforeColumn = rules.keys[index] ?? `Identifier ${index + 1}`;
    const mapping = rules.mappings.find((field) => field.before === beforeColumn);
    return `<dt>${e(side === "after" ? mapping?.after ?? beforeColumn : beforeColumn)}</dt><dd>${value(entry)}</dd>`;
  }).join("")}</dl>`;
  append(`<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
    <title>MapCSV comparison report</title><style>
    body{font:15px system-ui,sans-serif;max-width:1100px;margin:32px auto;padding:0 20px;color:#18181b}
    h1{font-size:28px}table{border-collapse:collapse;width:100%;table-layout:fixed}
    th,td{border:1px solid #d4d4d8;text-align:left;padding:12px;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}
    th{background:#f4f4f5}dt{font-weight:600}dd{margin:0 0 8px;white-space:pre-wrap}li{margin:5px 0}
    del{background:#fee2e2;text-decoration:none}ins{background:#d1fae5;text-decoration:none}section{margin-top:28px}
    </style></head><body><h1>MapCSV comparison report</h1>
    <p>Before: ${e(before.name)}<br>After: ${e(after.name)}<br>Compared: ${e(result.createdAt)}</p>
    <p>${Object.entries(result.summary).filter(([, count]) => typeof count === "number").map(([key, count]) => `${e(key)}: ${count}`).join(" | ")}</p>
    <p>Exact, case-sensitive comparison. Missing, empty and ambiguous key records are excluded from the result counts. Record numbers include the header and count CSV records, not physical lines; blank lines are skipped.</p>`);
  const mappingItems = (mappings: typeof scope.compared) => mappings.map((mapping) => `<li>${e(mapping.before)} &rarr; ${e(mapping.after)}</li>`).join("") || "<li>None</li>";
  const notCompared = [
    ...scope.excludedMappings.map((mapping) => `<li>Excluded mapping: ${e(mapping.before)} &rarr; ${e(mapping.after)}</li>`),
    ...scope.unmappedBefore.map((column) => `<li>Before only: ${e(column)} (unmapped)</li>`),
    ...scope.unmappedAfter.map((column) => `<li>After only: ${e(column)} (unmapped)</li>`),
  ].join("") || "<li>None</li>";
  append(`<section><h2>Comparison scope</h2><p>${scope.compared.length} ${scope.compared.length === 1 ? "field" : "fields"} compared; ${scope.notComparedSourceColumns} ${scope.notComparedSourceColumns === 1 ? "source column" : "source columns"} not compared.</p><h3>Row identifiers</h3><ul>${mappingItems(scope.identifiers)}</ul><h3>Compared fields</h3><ul>${mappingItems(scope.compared)}</ul><h3>Not compared</h3><ul>${notCompared}</ul></section>`);
  append(`<p>Identifier issues: ${Object.entries(result.summary.keyIssues).map(([kind, count]) => `${kind}: ${count}`).join(" | ")}</p>`);
  append("<section><h2>Changes</h2><table><thead><tr><th>Status / identifier</th><th>Before</th><th>After</th></tr></thead><tbody>");
  for (const row of result.rows) {
    if (row.status === "unchanged") continue;
    const left = row.status === "changed" ? row.changes.map((change) => `<dt>${e(change.beforeColumn)}</dt><dd><del>${value(change.before)}</del></dd>`).join("") : row.before === undefined ? "Not present" : record(before, row.before);
    const right = row.status === "changed" ? row.changes.map((change) => `<dt>${e(change.afterColumn)}</dt><dd><ins>${value(change.after)}</ins></dd>`).join("") : row.after === undefined ? "Not present" : record(after, row.after);
    append(`<tr><td>${row.status}${identifier(row.key, row.status === "added" ? "after" : "before")}</td><td>${row.status === "changed" ? `<dl>${left}</dl>` : left}</td><td>${row.status === "changed" ? `<dl>${right}</dl>` : right}</td></tr>`);
  }
  append("</tbody></table></section><section><h2>Issues (excluded records)</h2><table><thead><tr><th>File / record</th><th>Issue</th><th>Record values</th></tr></thead><tbody>");
  for (const issue of result.issues) append(`<tr><td>${issue.side} / ${issue.row + 2}</td><td>${issue.kind}${identifier(issue.key, issue.side)}</td><td>${record(issue.side === "before" ? before : after, issue.row)}</td></tr>`);
  append("</tbody></table></section></body></html>");
  return text.finish();
}
