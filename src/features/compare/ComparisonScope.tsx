import type { ComparisonScope } from "../../lib/reconcile/scope";

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function MappingList({ mappings }: { mappings: ComparisonScope["compared"] }) {
  if (!mappings.length) return <p className="text-zinc-500 dark:text-zinc-400">None</p>;
  return <ul className="mt-2 space-y-1">{mappings.map((mapping) => <li key={mapping.before} className="break-words"><span className="font-medium">{mapping.before}</span> <span aria-hidden="true" className="text-zinc-400">&rarr;</span> <span className="font-medium">{mapping.after}</span></li>)}</ul>;
}

export function ColumnMappingSummary({ scope }: { scope: ComparisonScope }) {
  const unmapped = scope.unmappedBefore.length + scope.unmappedAfter.length;
  return (
    <div role="status" className={`rounded-md border px-4 py-3 text-sm ${unmapped ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"}`}>
      <p className="font-medium">{countLabel(scope.mappedFields, "field mapping")} &middot; {countLabel(unmapped, "unmapped source column")}</p>
      <p className="mt-1">Unmapped columns will not be checked for changes.</p>
    </div>
  );
}

export function ComparisonScopeDisclosure({ scope }: { scope: ComparisonScope }) {
  return (
    <details className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="cursor-pointer rounded font-medium focus:outline-none focus:ring-2 focus:ring-accent-500">
        Comparison scope <span className="font-normal text-zinc-500 dark:text-zinc-400">&middot; {countLabel(scope.compared.length, "field")} compared &middot; {countLabel(scope.notComparedSourceColumns, "source column")} not compared</span>
      </summary>
      <div className="mt-4 grid gap-5 md:grid-cols-3">
        <section>
          <h3 className="font-semibold">Row identifiers</h3>
          <MappingList mappings={scope.identifiers} />
        </section>
        <section>
          <h3 className="font-semibold">Compared fields</h3>
          <MappingList mappings={scope.compared} />
        </section>
        <section>
          <h3 className="font-semibold">Not compared</h3>
          {!scope.excludedMappings.length && !scope.unmappedBefore.length && !scope.unmappedAfter.length ? <p className="mt-2 text-zinc-500 dark:text-zinc-400">None</p> : <ul className="mt-2 space-y-1">
            {scope.excludedMappings.map((mapping) => <li key={`excluded-${mapping.before}`} className="break-words"><span className="font-medium">Excluded:</span> {mapping.before} &rarr; {mapping.after}</li>)}
            {scope.unmappedBefore.map((column) => <li key={`before-${column}`} className="break-words"><span className="font-medium">Before only:</span> {column} (unmapped)</li>)}
            {scope.unmappedAfter.map((column) => <li key={`after-${column}`} className="break-words"><span className="font-medium">After only:</span> {column} (unmapped)</li>)}
          </ul>}
        </section>
      </div>
    </details>
  );
}

export function NoDifferencesNotice() {
  return <div role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"><h2 className="font-semibold">No differences found in the compared fields</h2><p className="mt-1 text-sm">Open Comparison scope to review exactly what was and was not checked.</p></div>;
}
