import { useRef, useState } from "react";
import { ArrowRight, Download, FileSpreadsheet, Lock, Save, Trash2 } from "lucide-react";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { WorkflowSwitch } from "../../components/WorkflowSwitch";
import { Button, Stat } from "../../components/ui";
import { autoMappings, validateRules } from "../../lib/reconcile/engine";
import { createProfile, readProfiles, writeProfiles, type Profile } from "../../lib/reconcile/profiles";
import { buildComparisonScope } from "../../lib/reconcile/scope";
import type { DatasetInfo, ExportFormat, Filter, ResultPage, Rules, Side, Summary } from "../../lib/reconcile/types";
import { ResultsTable } from "./ResultsTable";
import { ColumnMappingSummary, ComparisonScopeDisclosure, NoDifferencesNotice } from "./ComparisonScope";
import { getDefaultResultView, ROW_IDENTIFIER_LABEL, toggleRowIdentifier, type ResultView } from "./presentation";
import { useCompareWorker } from "./useCompareWorker";

const inputClass = "min-h-10 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-950";
const steps = ["Upload", "Columns", "Identifiers & fields", "Results"];
const emptyPage: ResultPage = { rows: [], issues: [], total: 0, page: 0 };
const sampleBefore = "customer_id,email,name,status,updated_at\n101,alex@example.com,Alex,inactive,2026-10-01\n102,sam@example.com,Sam,active,2026-10-01\n103,jo@example.com,Jo,active,2026-10-01";
const sampleAfter = "customer_id,email_address,name,status,updated_at\n101,alex@example.com,Alex,active,2026-10-01\n103,jo@example.com,Jo,active,2026-10-01\n104,lee@example.com,Lee,active,2026-10-02";

function FileDrop({ side, info, busy, onFile }: { side: Side; info?: DatasetInfo; busy: boolean; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const label = side === "before" ? "Before CSV" : "After CSV";
  return <section className={`min-w-0 rounded-lg border border-dashed p-6 ${drag ? "border-accent-500 bg-accent-50 dark:bg-accent-950/20" : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(event) => { event.preventDefault(); setDrag(false); if (!busy && event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]); }}>
    <FileSpreadsheet className="mb-4 size-6 text-accent-600" aria-hidden="true" /><h2 className="text-lg font-semibold">{label}</h2>
    {info ? <>
      <p className="mt-3 break-all text-sm font-medium">{info.name}</p>
      <p className="mt-1 text-sm text-zinc-500">{info.rowCount.toLocaleString()} rows &middot; {info.columns.length} columns</p>
    </> : <p className="mt-3 text-sm text-zinc-500">Drop a .csv file here</p>}
    <input ref={input} type="file" accept=".csv,text/csv" aria-label={label} className="sr-only" tabIndex={-1} disabled={busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) onFile(file); event.currentTarget.value = ""; }} />
    <Button className="mt-5" disabled={busy} onClick={() => input.current?.click()}>{info ? "Replace file" : "Choose file"}<span className="sr-only">: {label}</span></Button>
  </section>;
}

export default function CompareWorkspace({ themeMode, onThemeChange, onMap }: { themeMode: "system" | "light" | "dark"; onThemeChange: (mode: "system" | "light" | "dark") => void; onMap: () => void }) {
  const request = useCompareWorker();
  const [datasets, setDatasets] = useState<Partial<Record<Side, DatasetInfo>>>({});
  const [rules, setRules] = useState<Rules>({ mappings: [], keys: [], excluded: [] });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState<Summary>();
  const [validated, setValidated] = useState(false);
  const [page, setPage] = useState<ResultPage>(emptyPage);
  const [filter, setFilter] = useState<ResultView>("summary");
  const [profileName, setProfileName] = useState("");
  const [profileState] = useState(() => {
    try { return { profiles: readProfiles(window.localStorage), error: "" }; }
    catch { return { profiles: [] as Profile[], error: "Local profiles are unavailable or invalid. CSV comparison still works." }; }
  });
  const [profiles, setProfiles] = useState(profileState.profiles);
  const [selectedProfile, setSelectedProfile] = useState("");
  const before = datasets.before;
  const after = datasets.after;
  const comparisonScope = before && after ? buildComparisonScope(before, after, rules) : undefined;
  const identifierMappings = rules.keys.flatMap((key) => {
    const mapping = rules.mappings.find((item) => item.before === key);
    return mapping ? [mapping] : [];
  });

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The local task failed. Try again with smaller CSV files."); }
    finally { lock.current = false; setBusy(false); }
  }

  function changeRules(next: Rules) {
    setRules(next); setValidated(false); setSummary(undefined); setPage(emptyPage); setError(""); setNotice("");
  }

  async function load(side: Side, file: File) {
    setDatasets((current) => ({ ...current, [side]: undefined }));
    changeRules({ mappings: [], keys: [], excluded: [] });
    const info = await request<DatasetInfo>({ type: "load", side, file });
    const next = { ...datasets, [side]: info };
    setDatasets(next);
    if (next.before && next.after) changeRules({ mappings: autoMappings(next.before.columns, next.after.columns), keys: [], excluded: [] });
  }

  async function loadSample() {
    setDatasets({}); changeRules({ mappings: [], keys: [], excluded: [] });
    const left = await request<DatasetInfo>({ type: "load", side: "before", file: new File([sampleBefore], "before-sample.csv") });
    const right = await request<DatasetInfo>({ type: "load", side: "after", file: new File([sampleAfter], "after-sample.csv") });
    setDatasets({ before: left, after: right });
    changeRules({ mappings: autoMappings(left.columns, right.columns), keys: [], excluded: [] });
  }

  async function showPage(nextFilter: Filter, nextPage = 0) {
    const result = await request<ResultPage>({ type: "page", filter: nextFilter, page: nextPage });
    setFilter(nextFilter); setPage(result);
  }

  function saveProfile() {
    if (!before || !after) return;
    try {
      validateRules(before, after, rules);
      if (!profileName.trim()) throw new Error("Enter a profile name.");
      if (profiles.length >= 20) throw new Error("You can save up to 20 profiles. Delete one before adding another.");
      const profile = createProfile(profileName, rules);
      const next = [...profiles, profile];
      writeProfiles(window.localStorage, next);
      setProfiles(next); setSelectedProfile(profile.id); setProfileName(""); setNotice("Profile saved on this browser. No CSV records were saved."); setError("");
    } catch { setError("Could not save the profile. Check the name, selected keys, 20-profile limit and browser storage permissions."); }
  }

  async function download(format: ExportFormat) {
    const result = await request<{ blob: Blob; filename: string }>({ type: "export", format });
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = result.filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${result.filename} is ready.`);
  }

  return <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8"><Logo /><div className="order-3 w-full sm:order-none sm:w-auto"><WorkflowSwitch value="compare" onChange={(value) => { if (value === "map" && (!before && !after || window.confirm("Leave this comparison? Unsaved CSV data will be cleared."))) onMap(); }} /></div><ThemeToggle mode={themeMode} onChange={onThemeChange} /></div></header>
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-accent-700 dark:text-accent-400">CSV Reconcile Beta</p><h1 className="mt-2 text-2xl font-semibold">Compare CSV</h1><p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">Find added, removed and changed records between two CSV exports.</p></div><span className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"><Lock className="size-4 text-accent-600" />Files stay in your browser</span></div>
      <nav aria-label="Comparison steps" className="my-7 grid grid-cols-2 gap-2 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:grid-cols-4">{steps.map((label, index) => <Button key={label} variant={step === index ? "primary" : "ghost"} aria-current={step === index ? "step" : undefined} disabled={busy || index > step} onClick={() => { setStep(index); setError(""); if (index < 3) { setValidated(false); setSummary(undefined); setPage(emptyPage); } }}><span className="text-xs opacity-60">0{index + 1}</span>{label}</Button>)}</nav>
      {error && <p role="alert" className="mb-5 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
      <p role="status" className="mb-3 min-h-5 break-words text-sm text-accent-700 dark:text-accent-400">{busy ? "Processing locally..." : notice}</p>
      {summary && (validated || step === 3) && summary.issues > 0 && <dl aria-label="Identifier issue counts" className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{Object.entries(summary.keyIssues).map(([kind, count]) => <div key={kind} className="border-l-2 border-amber-400 pl-3"><dt className="capitalize">{kind} identifiers</dt><dd className="mt-1 font-semibold">{count} {count === 1 ? "record" : "records"}</dd></div>)}</dl>}
      {step === 0 && <section className="space-y-6"><div className="grid gap-5 md:grid-cols-2"><FileDrop side="before" info={before} busy={busy} onFile={(file) => void run(() => load("before", file))} /><FileDrop side="after" info={after} busy={busy} onFile={(file) => void run(() => load("after", file))} /></div><p className="text-sm leading-6 text-zinc-500">Beta limits per file: 10 MiB, 50,000 rows, 100 columns, 1,000,000 cells; 20,000 characters per cell. Headers must be unique. Header-only CSVs are supported.</p><div className="flex flex-wrap justify-between gap-3"><Button disabled={busy} onClick={() => void run(loadSample)}>Try sample comparison</Button><Button variant="primary" disabled={busy || !before || !after} onClick={() => setStep(1)}>Continue to columns<ArrowRight className="size-4" /></Button></div></section>}
      {step === 1 && before && after && <section className="space-y-6">
        <div><h2 className="text-lg font-semibold">Match columns</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Match columns that represent the same data. Identical column names are matched automatically.</p></div>
        <details className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer rounded font-medium text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:text-zinc-300">Saved profiles</summary>
          <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1">Profile<select className={`${inputClass} mt-2`} value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}><option value="">Choose profile</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><Button disabled={!selectedProfile} onClick={() => { const profile = profiles.find((item) => item.id === selectedProfile); if (!profile) return; try { validateRules(before, after, profile.rules); changeRules(profile.rules); setNotice(`Applied profile: ${profile.name}`); } catch { setError("This profile does not match both files. Review the columns or choose another profile."); } }}>Apply</Button><Button title="Delete selected profile" aria-label="Delete selected profile" disabled={!selectedProfile} onClick={() => { if (!window.confirm("Delete this saved profile?")) return; try { const next = profiles.filter((profile) => profile.id !== selectedProfile); writeProfiles(window.localStorage, next); setProfiles(next); setSelectedProfile(""); } catch { setError("Could not update browser storage."); } }}><Trash2 className="size-4" /></Button></div>
        </details>
        {profileState.error && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{profileState.error}</p>}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800"><div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 pb-3 text-xs font-semibold uppercase text-zinc-500 sm:grid"><span>Before CSV column</span><ArrowRight className="size-4" aria-hidden="true" /><span>After CSV column</span></div>{before.columns.map((column, index) => { const mapping = rules.mappings.find((item) => item.before === column); return <div key={column} className={`grid min-w-0 gap-2 px-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-4 ${mapping ? "" : "border-l-2 border-amber-400 bg-amber-50/70 dark:bg-amber-950/20"}`}><label htmlFor={`mapping-${index}`} className="break-all text-sm font-medium"><span className="mb-1 block text-xs font-normal text-zinc-500 sm:hidden">Before CSV column</span>{column}</label><ArrowRight className="hidden size-4 text-zinc-400 sm:block" aria-hidden="true" /><label className="text-xs text-zinc-500 sm:contents"><span className="sm:hidden">After CSV column</span><select id={`mapping-${index}`} aria-label={`After CSV column for ${column}`} className={`${inputClass} mt-1 sm:mt-0 ${mapping ? "" : "border-amber-400 dark:border-amber-700"}`} value={mapping?.after ?? ""} onChange={(event) => { const remaining = rules.mappings.filter((item) => item.before !== column); const mappings = event.target.value ? [...remaining, { before: column, after: event.target.value }] : remaining; changeRules({ mappings, keys: rules.keys.filter((key) => mappings.some((item) => item.before === key)), excluded: rules.excluded.filter((key) => mappings.some((item) => item.before === key)) }); }}><option value="">Not mapped</option>{after.columns.map((target) => <option key={target} value={target} disabled={rules.mappings.some((item) => item.before !== column && item.after === target)}>{target}</option>)}</select></label></div>; })}</div>
        {comparisonScope && <ColumnMappingSummary scope={comparisonScope} />}
        <Button variant="primary" disabled={!rules.mappings.length} onClick={() => setStep(2)}>Continue to identifiers<ArrowRight className="size-4" /></Button>
      </section>}
      {step === 2 && before && after && <section className="space-y-6"><div><h2 className="text-lg font-semibold">Row identifiers & fields</h2><h3 className="mt-5 font-semibold">Which column identifies each record?</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Choose a unique value such as Customer ID, Order ID or Email. You can select multiple columns when one column is not enough.</p><h3 className="mt-5 font-semibold">What should MapCSV compare?</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Select the fields where you want to detect changes.</p></div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rules.mappings.map((mapping) => (
            <div key={mapping.before} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px_160px] sm:items-center">
              <span className="break-all text-sm font-medium">
                {mapping.before} <span className="text-zinc-400">&rarr;</span> {mapping.after}
              </span>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-teal-600"
                  checked={rules.keys.includes(mapping.before)}
                  disabled={busy}
                  onChange={(event) => changeRules(toggleRowIdentifier(rules, mapping.before, event.target.checked))}
                />
                {ROW_IDENTIFIER_LABEL}<span className="sr-only">: {mapping.before}</span>
              </label>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-teal-600"
                  checked={!rules.keys.includes(mapping.before) && !rules.excluded.includes(mapping.before)}
                  disabled={busy || rules.keys.includes(mapping.before)}
                  onChange={(event) => changeRules({
                    ...rules,
                    excluded: event.target.checked ? rules.excluded.filter((key) => key !== mapping.before) : [...rules.excluded, mapping.before],
                  })}
                />
                Compare field<span className="sr-only">: {mapping.before}</span>
              </label>
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-500">Exact comparison: case and whitespace matter. No type conversion or fuzzy matching. Missing cells differ from empty cells. With no comparison fields, only key existence is checked. Beta limit: 100,000 changed cells per comparison.</p>
        <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Profile name<input className={`${inputClass} mt-2`} value={profileName} maxLength={80} placeholder="Salesforce Contacts Check" onChange={(event) => setProfileName(event.target.value)} /></label><Button disabled={busy || !rules.keys.length || !profileName.trim()} onClick={saveProfile}><Save className="size-4" />Save profile</Button></div>
        <div className="flex flex-wrap gap-3"><Button disabled={busy || !rules.keys.length} onClick={() => void run(async () => { const stats = await request<Summary>({ type: "validate", rules }); setSummary(stats); await showPage("issues"); setValidated(true); setNotice(stats.issues ? "Review excluded records before continuing." : "Row identifiers are unique and complete in both files."); })}>Validate identifiers</Button><Button variant="primary" disabled={busy || !validated} onClick={() => void run(async () => { const stats = await request<Summary>({ type: "compare", rules }); const defaultView = getDefaultResultView(stats); setSummary(stats); if (defaultView === "summary") { setFilter("summary"); setPage(emptyPage); } else { await showPage(defaultView); } setStep(3); })}>Compare {summary?.issues ? "valid records" : "CSV"}<ArrowRight className="size-4" /></Button></div>
        {validated && summary && <div className="space-y-4"><h3 className="font-semibold">Excluded records: {summary.issues}</h3>{summary.issues > 0 && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">Missing, empty and duplicate identifiers are excluded. A unique record paired with a duplicate identifier is also excluded as ambiguous. No duplicate is chosen automatically.</p>}<ResultsTable data={page} before={before} after={after} identifiers={identifierMappings} busy={busy} onPage={(number) => void run(() => showPage("issues", number))} /></div>}
      </section>}
      {step === 3 && summary && before && after && <section className="space-y-6"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(["added", "removed", "changed", "unchanged"] as const).map((status) => <Stat key={status} label={status.charAt(0).toUpperCase() + status.slice(1)} value={summary[status].toLocaleString()} tone={status === "changed" ? "warn" : status === "added" ? "good" : "neutral"} />)}</div>
        {comparisonScope && <ComparisonScopeDisclosure scope={comparisonScope} />}
        {summary.added === 0 && summary.removed === 0 && summary.changed === 0 && summary.issues === 0 && <NoDifferencesNotice />}
        {summary.issues > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">{summary.issues} records excluded because of identifier issues. See Issues before relying on these results.</p>}
        <div className="flex flex-wrap gap-2">{(["added", "removed", "changed", "html"] as const).map((format) => <Button key={format} disabled={busy} onClick={() => void run(() => download(format))}><Download className="size-4" />{format === "html" ? "HTML report" : `${format}.csv`}</Button>)}</div>
        <p className="text-xs leading-5 text-zinc-500">Changed CSV contains one row per changed field. CSV exports escape formula-like cells for spreadsheet safety. Exports include local CSV data: share them carefully. Each export is limited to 20 MB.</p>
        <div role="group" aria-label="Result filter" className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">{(["all", "changed", "added", "removed", "unchanged", "issues"] as const).map((tab) => <Button key={tab} aria-pressed={filter === tab} variant={filter === tab ? "primary" : "ghost"} disabled={busy} onClick={() => void run(() => showPage(tab))}>{tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === "issues" ? ` (${summary.issues})` : ""}</Button>)}</div>
        {filter !== "summary" && <ResultsTable data={page} before={before} after={after} identifiers={identifierMappings} busy={busy} onPage={(number) => void run(() => showPage(filter, number))} />}
        <p className="text-xs text-zinc-500">Record numbers include the header; blank lines are skipped. Quoted multiline values count as one record.</p>
      </section>}
    </main>
  </div>;
}
