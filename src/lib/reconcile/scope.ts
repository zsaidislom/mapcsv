import type { Dataset, FieldMapping, Rules } from "./types";

type ColumnsOnly = Pick<Dataset, "columns">;

export type ComparisonScope = {
  identifiers: FieldMapping[];
  compared: FieldMapping[];
  excludedMappings: FieldMapping[];
  unmappedBefore: string[];
  unmappedAfter: string[];
  mappedFields: number;
  notComparedSourceColumns: number;
};

export function buildComparisonScope(before: ColumnsOnly, after: ColumnsOnly, rules: Rules): ComparisonScope {
  const mappedBefore = new Set(rules.mappings.map((mapping) => mapping.before));
  const mappedAfter = new Set(rules.mappings.map((mapping) => mapping.after));
  const identifiers = rules.mappings.filter((mapping) => rules.keys.includes(mapping.before));
  const excludedMappings = rules.mappings.filter(
    (mapping) => !rules.keys.includes(mapping.before) && rules.excluded.includes(mapping.before),
  );
  const compared = rules.mappings.filter(
    (mapping) => !rules.keys.includes(mapping.before) && !rules.excluded.includes(mapping.before),
  );
  const unmappedBefore = before.columns.filter((column) => !mappedBefore.has(column));
  const unmappedAfter = after.columns.filter((column) => !mappedAfter.has(column));

  return {
    identifiers,
    compared,
    excludedMappings,
    unmappedBefore,
    unmappedAfter,
    mappedFields: rules.mappings.length,
    notComparedSourceColumns: excludedMappings.length * 2 + unmappedBefore.length + unmappedAfter.length,
  };
}
