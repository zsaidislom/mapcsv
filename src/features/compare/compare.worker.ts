import { countKeyIssues, reconcile, validateKeys } from "../../lib/reconcile/engine";
import { parseComparisonCsv } from "../../lib/reconcile/parser";
import { exportComparisonCsv, exportComparisonHtml } from "../../lib/reconcile/export";
import { LIMITS, PAGE_SIZE, type Comparison, type Dataset, type Rules, type Side, type WorkerCommand, type WorkerReply, type WorkerValue } from "../../lib/reconcile/types";

const datasets: Partial<Record<Side, Dataset>> = {};
let comparison: Comparison | undefined;
let comparedRules: Rules | undefined;

async function handle(command: WorkerCommand): Promise<WorkerValue> {
  if (command.type === "load") {
    comparison = undefined;
    comparedRules = undefined;
    delete datasets[command.side];
    if (!command.file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a .csv file.");
    if (command.file.size > LIMITS.bytes) throw new Error("Beta limit: 10 MiB per CSV.");
    const dataset = parseComparisonCsv(await command.file.text(), command.file.name);
    datasets[command.side] = dataset;
    return { name: dataset.name, columns: dataset.columns, rowCount: dataset.rows.length };
  }
  const { before, after } = datasets;
  if (!before || !after) throw new Error("Choose both CSV files first.");
  if (command.type === "validate") {
    const { issues } = validateKeys(before, after, command.rules);
    comparedRules = undefined;
    comparison = { rows: [], issues, summary: { added: 0, removed: 0, changed: 0, unchanged: 0, issues: issues.length, keyIssues: countKeyIssues(issues) }, createdAt: new Date().toISOString() };
    return comparison.summary;
  }
  if (command.type === "compare") {
    comparison = undefined;
    comparedRules = undefined;
    comparison = reconcile(before, after, command.rules);
    comparedRules = command.rules;
    return comparison.summary;
  }
  if (!comparison) throw new Error("Validate keys or run a comparison first.");
  if (command.type === "page") {
    const filtered = command.filter === "all" ? comparison.rows : comparison.rows.filter((row) => row.status === command.filter);
    const total = command.filter === "issues" ? comparison.issues.length : filtered.length;
    const page = Math.max(0, Math.min(Math.floor(command.page), Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)));
    const offset = page * PAGE_SIZE;
    return {
      total, page,
      rows: command.filter === "issues" ? [] : filtered.slice(offset, offset + PAGE_SIZE).map((row) => ({ ...row, beforeValues: row.before === undefined ? undefined : before.rows[row.before], afterValues: row.after === undefined ? undefined : after.rows[row.after] })),
      issues: command.filter !== "issues" ? [] : comparison.issues.slice(offset, offset + PAGE_SIZE).map((issue) => ({ ...issue, values: datasets[issue.side]!.rows[issue.row] })),
    };
  }
  if (!comparedRules) throw new Error("Run the comparison before exporting.");
  const html = command.format === "html";
  const content = html ? exportComparisonHtml(before, after, comparedRules, comparison) : exportComparisonCsv(command.format as "added" | "removed" | "changed", before, after, comparison);
  return { blob: new Blob([content], { type: html ? "text/html;charset=utf-8" : "text/csv;charset=utf-8" }), filename: html ? "mapcsv-comparison.html" : `${command.format}.csv` };
}

self.onmessage = async (event: MessageEvent<WorkerCommand & { id: number }>) => {
  const { id } = event.data;
  let reply: WorkerReply;
  try {
    reply = { id, ok: true, value: await handle(event.data) };
  } catch (error) {
    reply = { id, ok: false, error: error instanceof RangeError ? "Not enough memory. Try smaller CSV files." : error instanceof Error ? error.message : "Comparison failed. Try smaller CSV files." };
  }
  self.postMessage(reply);
};
