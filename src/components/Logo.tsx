import { Braces } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5" aria-label="MapCSV">
      <div className="grid size-8 place-items-center rounded-md border border-zinc-200 bg-white text-accent-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-accent-500">
        <Braces className="size-4" aria-hidden="true" />
      </div>
      <span className="text-sm font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
        MapCSV
      </span>
    </div>
  );
}
