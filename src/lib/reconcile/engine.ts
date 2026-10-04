import type { Comparison, Dataset, FieldMapping, KeyIssue, Rules, Side } from "./types";

export function autoMappings(before: string[], after: string[]): FieldMapping[] {
  const names = new Set(after);
  return before.filter((name) => names.has(name)).map((name) => ({ before: name, after: name }));
}

export function validateRules(before: Pick<Dataset, "columns">, after: Pick<Dataset, "columns">, rules: Rules): void {
  const sources = rules.mappings.map((mapping) => mapping.before);
  const targets = rules.mappings.map((mapping) => mapping.after);
  if (!rules.keys.length) throw new Error("Choose at least one row identifier.");
  if (new Set(sources).size !== sources.length || new Set(targets).size !== targets.length) {
    throw new Error("Each column can be mapped only once.");
  }
  if (rules.mappings.some((mapping) => !before.columns.includes(mapping.before) || !after.columns.includes(mapping.after)) ||
      rules.keys.some((key) => !sources.includes(key)) || rules.excluded.some((key) => !sources.includes(key)) ||
      new Set(rules.keys).size !== rules.keys.length) {
    throw new Error("These rules do not match the current CSV columns. Review mappings and row identifiers.");
  }
}

export function validateKeys(before: Dataset, after: Dataset, rules: Rules) {
  validateRules(before, after, rules);
  const issues: KeyIssue[] = [];
  const blocked = new Set<string>();
  function index(dataset: Dataset, side: Side) {
    const keyColumns = rules.keys.map((key) => {
      const mapping = rules.mappings.find((item) => item.before === key)!;
      return dataset.columns.indexOf(mapping[side]);
    });
    const groups = new Map<string, number[]>();
    dataset.rows.forEach((row, rowIndex) => {
      const parts = keyColumns.map((column) => row[column]);
      const kind = parts.some((value) => value === undefined) ? "missing" : parts.some((value) => !value.trim()) ? "empty" : null;
      if (kind) {
        issues.push({ side, row: rowIndex, kind, key: parts.map((value) => value ?? "") });
      } else {
        // Tuple serialization prevents composite-key delimiter collisions.
        const key = JSON.stringify(parts);
        const group = groups.get(key);
        if (group) group.push(rowIndex);
        else groups.set(key, [rowIndex]);
      }
    });
    for (const [key, rows] of groups) if (rows.length > 1) blocked.add(key);
    return groups;
  }
  const beforeIndex = index(before, "before");
  const afterIndex = index(after, "after");
  for (const [side, groups] of [["before", beforeIndex], ["after", afterIndex]] as const) {
    for (const key of blocked) {
      const rows = groups.get(key);
      if (!rows) continue;
      for (const row of rows) issues.push({ side, row, kind: rows.length > 1 ? "duplicate" : "ambiguous", key: JSON.parse(key) as string[] });
      groups.delete(key);
    }
  }
  return { beforeIndex, afterIndex, issues };
}

export function countKeyIssues(issues: KeyIssue[]): Record<KeyIssue["kind"], number> {
  const counts = { missing: 0, empty: 0, duplicate: 0, ambiguous: 0 };
  for (const issue of issues) counts[issue.kind]++;
  return counts;
}

export function reconcile(before: Dataset, after: Dataset, rules: Rules): Comparison {
  const { beforeIndex, afterIndex, issues } = validateKeys(before, after, rules);
  const result: Comparison = { rows: [], issues, summary: { added: 0, removed: 0, changed: 0, unchanged: 0, issues: issues.length, keyIssues: countKeyIssues(issues) }, createdAt: new Date().toISOString() };
  let changeCount = 0;
  const fields = rules.mappings.filter((mapping) => !rules.keys.includes(mapping.before) && !rules.excluded.includes(mapping.before))
    .map((mapping) => ({ ...mapping, left: before.columns.indexOf(mapping.before), right: after.columns.indexOf(mapping.after) }));
  for (const [key, [left]] of beforeIndex) {
    const right = afterIndex.get(key)?.[0];
    const changes = right === undefined ? [] : fields.filter((field) => before.rows[left][field.left] !== after.rows[right][field.right])
      .map((field) => ({ beforeColumn: field.before, afterColumn: field.after, before: before.rows[left][field.left], after: after.rows[right][field.right] }));
    const status = right === undefined ? "removed" : changes.length ? "changed" : "unchanged";
    changeCount += changes.length;
    if (changeCount > 100_000) throw new Error("Beta limit: 100,000 changed cells. Compare fewer fields or smaller CSV files.");
    result.rows.push({ key: JSON.parse(key) as string[], status, before: left, after: right, changes });
    result.summary[status]++;
  }
  for (const [key, [right]] of afterIndex) {
    if (beforeIndex.has(key)) continue;
    result.rows.push({ key: JSON.parse(key) as string[], status: "added", after: right, changes: [] });
    result.summary.added++;
  }
  return result;
}
