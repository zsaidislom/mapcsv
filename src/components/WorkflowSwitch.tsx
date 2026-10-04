import { Columns3, GitCompareArrows } from "lucide-react";

export function WorkflowSwitch({ value, onChange }: { value: "map" | "compare"; onChange: (value: "map" | "compare") => void }) {
  return (
    <div className="inline-flex max-w-full gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900" role="group" aria-label="Workflow">
      {([ ["map", "Map CSV", Columns3], ["compare", "Compare CSV", GitCompareArrows] ] as const).map(([mode, label, Icon]) => (
        <button key={mode} type="button" aria-pressed={value === mode} onClick={() => onChange(mode)} className={`flex min-h-10 items-center justify-center gap-2 rounded px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 ${value === mode ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"}`}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
        </button>
      ))}
    </div>
  );
}
