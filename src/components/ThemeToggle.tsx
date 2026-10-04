import { Monitor, Moon, Sun } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";

type ThemeToggleProps = {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
};

export function ThemeToggle({ mode, onChange }: ThemeToggleProps) {
  const nextMode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
  const Icon = mode === "system" ? Monitor : mode === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => onChange(nextMode)}
      className="inline-flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950 hover:shadow-md active:translate-y-0 motion-reduce:transform-none focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100 dark:focus:ring-offset-zinc-950"
      aria-label={`Theme: ${mode}. Toggle theme`}
      title={`Theme: ${mode}`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
