import type { FieldMapping, Filter, Rules, Side, Summary } from "../../lib/reconcile/types";

export type ResultView = Filter | "summary";

export const ROW_IDENTIFIER_LABEL = "Row identifier";

export function toggleRowIdentifier(rules: Rules, column: string, selected: boolean): Rules {
  return {
    ...rules,
    keys: selected
      ? rules.keys.includes(column) ? rules.keys : [...rules.keys, column]
      : rules.keys.filter((key) => key !== column),
  };
}

export function getDefaultResultView(summary: Summary): ResultView {
  if (summary.changed > 0) return "changed";
  if (summary.added > 0) return "added";
  if (summary.removed > 0) return "removed";
  if (summary.issues > 0) return "issues";
  return "summary";
}

export function identifierEntries(
  values: string[],
  mappings: FieldMapping[],
  side: Side,
): Array<{ label: string; value: string }> {
  return values.map((value, index) => ({
    label: mappings[index]?.[side] ?? `Identifier ${index + 1}`,
    value,
  }));
}
