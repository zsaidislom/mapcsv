export type Side = "before" | "after";
export type Dataset = { name: string; columns: string[]; rows: string[][] };
export type DatasetInfo = { name: string; columns: string[]; rowCount: number };
export type FieldMapping = { before: string; after: string };
export type Rules = { mappings: FieldMapping[]; keys: string[]; excluded: string[] };
export type Status = "added" | "removed" | "changed" | "unchanged";
export type Filter = "all" | Status | "issues";
export type Change = { beforeColumn: string; afterColumn: string; before?: string; after?: string };
export type ResultRow = { status: Status; key: string[]; before?: number; after?: number; changes: Change[] };
export type KeyIssue = { side: Side; row: number; kind: "missing" | "empty" | "duplicate" | "ambiguous"; key: string[] };
export type Summary = Record<Status, number> & { issues: number; keyIssues: Record<KeyIssue["kind"], number> };
export type Comparison = { rows: ResultRow[]; issues: KeyIssue[]; summary: Summary; createdAt: string };
export type PageRow = ResultRow & { beforeValues?: string[]; afterValues?: string[] };
export type PageIssue = KeyIssue & { values: string[] };
export type ResultPage = { rows: PageRow[]; issues: PageIssue[]; total: number; page: number };
export type ExportFormat = "added" | "removed" | "changed" | "html";
export const PAGE_SIZE = 25;
export const LIMITS = { bytes: 10 * 1024 * 1024, rows: 50_000, columns: 100, cells: 1_000_000, cellLength: 20_000 };

export type WorkerCommand =
  | { type: "load"; side: Side; file: File }
  | { type: "validate"; rules: Rules }
  | { type: "compare"; rules: Rules }
  | { type: "page"; filter: Filter; page: number }
  | { type: "export"; format: ExportFormat };
export type WorkerValue = DatasetInfo | Summary | ResultPage | { blob: Blob; filename: string };
export type WorkerReply = { id: number } & ({ ok: true; value: WorkerValue } | { ok: false; error: string });
