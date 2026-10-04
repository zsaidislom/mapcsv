import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui";
import { PAGE_SIZE, type DatasetInfo, type FieldMapping, type ResultPage, type Side } from "../../lib/reconcile/types";
import { identifierEntries } from "./presentation";

function Value({ value }: { value?: string }) {
  return value === undefined ? <em className="text-zinc-500">Missing cell</em> : value === "" ? <em className="text-zinc-500">Empty</em> : <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{value}</span>;
}

function RecordFields({ columns, values }: { columns: string[]; values: string[] }) {
  return <dl className="mt-2 space-y-2">{columns.map((column, index) => <div key={column}><dt className="font-medium [overflow-wrap:anywhere]">{column}</dt><dd><Value value={values[index]} /></dd></div>)}</dl>;
}

function RecordValues({ columns, values, label = "Record values" }: { columns: string[]; values?: string[]; label?: string }) {
  if (!values) return <span className="text-zinc-500">Not present</span>;
  return <details><summary className="cursor-pointer rounded py-2 focus:outline-none focus:ring-2 focus:ring-accent-500">{label}</summary><RecordFields columns={columns} values={values} /></details>;
}

function Identifier({ values, mappings, side }: { values: string[]; mappings: FieldMapping[]; side: Side }) {
  return <dl className="mt-2 space-y-2">{identifierEntries(values, mappings, side).map((entry) => <div key={entry.label}><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{entry.label}</dt><dd className="whitespace-pre-wrap font-mono text-xs [overflow-wrap:anywhere]"><Value value={entry.value} /></dd></div>)}</dl>;
}

function ChangedFields({ changes }: { changes: ResultPage["rows"][number]["changes"] }) {
  return <div><p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Changed fields</p><dl className="mt-3 grid gap-4 lg:grid-cols-2">{changes.map((change) => <div key={change.beforeColumn} className="min-w-0 border-l-2 border-amber-400 pl-3"><dt className="font-medium [overflow-wrap:anywhere]">{change.beforeColumn === change.afterColumn ? change.beforeColumn : `${change.beforeColumn} → ${change.afterColumn}`}</dt><dd className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2"><span className="rounded bg-red-50 px-2 py-1 text-red-800 dark:bg-red-950/40 dark:text-red-200"><Value value={change.before} /></span><span aria-hidden="true" className="py-1 text-zinc-400">→</span><span className="rounded bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><Value value={change.after} /></span></dd></div>)}</dl></div>;
}

export function ResultsTable({ data, before, after, identifiers, busy, onPage }: { data: ResultPage; before: DatasetInfo; after: DatasetInfo; identifiers: FieldMapping[]; busy: boolean; onPage: (page: number) => void }) {
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" tabIndex={0} role="region" aria-label="Comparison records">
        <table className="w-full text-left text-sm sm:min-w-[650px] sm:table-fixed">
          <thead className="hidden bg-zinc-50 dark:bg-zinc-900 sm:table-header-group"><tr><th className="w-1/4 p-4">Status / identifier</th><th className="p-4">Before</th><th className="p-4">After</th></tr></thead>
          <tbody className="block divide-y divide-zinc-200 dark:divide-zinc-800 sm:table-row-group">
            {data.rows.map((row) => <tr key={JSON.stringify(row.key)} className="block sm:table-row">
              <td className="block p-4 align-top [overflow-wrap:anywhere] sm:table-cell"><strong className={row.status === "changed" ? "text-amber-700 dark:text-amber-400" : row.status === "added" ? "text-accent-700 dark:text-accent-400" : ""}>{row.status}</strong><Identifier values={row.key} mappings={identifiers} side={row.status === "added" ? "after" : "before"} /><div className="mt-3 text-xs text-zinc-500">Before record: {row.before === undefined ? "-" : row.before + 2}<br />After record: {row.after === undefined ? "-" : row.after + 2}</div></td>
              {row.changes.length ? <td colSpan={2} className="block p-4 pt-0 align-top sm:table-cell sm:pt-4"><ChangedFields changes={row.changes} /><details className="mt-4 border-t border-zinc-200 pt-2 dark:border-zinc-800"><summary className="cursor-pointer rounded py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500">Full record details</summary><div className="grid gap-5 pt-2 md:grid-cols-2"><section><h3 className="text-xs font-semibold uppercase text-zinc-500">Before</h3>{row.beforeValues ? <RecordFields columns={before.columns} values={row.beforeValues} /> : <span className="text-zinc-500">Not present</span>}</section><section><h3 className="text-xs font-semibold uppercase text-zinc-500">After</h3>{row.afterValues ? <RecordFields columns={after.columns} values={row.afterValues} /> : <span className="text-zinc-500">Not present</span>}</section></div></details></td> : <><td className="block px-4 pb-2 align-top sm:table-cell sm:p-4"><RecordValues label="Before record values" columns={before.columns} values={row.beforeValues} /></td><td className="block px-4 pb-4 align-top sm:table-cell sm:p-4"><RecordValues label="After record values" columns={after.columns} values={row.afterValues} /></td></>}
            </tr>)}
            {data.issues.map((issue) => <tr key={`${issue.side}-${issue.row}`} className="block sm:table-row">
              <td className="block p-4 align-top sm:table-cell"><strong className="text-amber-700 dark:text-amber-400">{issue.kind} identifier</strong><div className="mt-1">{issue.side} / record {issue.row + 2}</div><Identifier values={issue.key} mappings={identifiers} side={issue.side} /></td>
              <td className="block px-4 pb-2 align-top sm:table-cell sm:p-4">{issue.side === "before" ? <RecordValues label="Before record values" columns={before.columns} values={issue.values} /> : "-"}</td>
              <td className="block px-4 pb-4 align-top sm:table-cell sm:p-4">{issue.side === "after" ? <RecordValues label="After record values" columns={after.columns} values={issue.values} /> : "-"}</td>
            </tr>)}
            {!data.total && <tr className="block sm:table-row"><td colSpan={3} className="block p-8 text-center text-zinc-500 sm:table-cell">No records in this view.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{data.total ? `${data.page * PAGE_SIZE + 1}-${Math.min((data.page + 1) * PAGE_SIZE, data.total)} of ${data.total}` : "0 records"}</span>
        <div className="flex items-center gap-2"><Button title="Previous page" aria-label="Previous page" disabled={busy || data.page === 0} onClick={() => onPage(data.page - 1)}><ChevronLeft className="size-4" /></Button><span>Page {data.page + 1}</span><Button title="Next page" aria-label="Next page" disabled={busy || (data.page + 1) * PAGE_SIZE >= data.total} onClick={() => onPage(data.page + 1)}><ChevronRight className="size-4" /></Button></div>
      </div>
    </div>
  );
}
