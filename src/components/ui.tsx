import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-zinc-950 bg-zinc-950 text-white shadow-sm hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md active:translate-y-0 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200",
  secondary:
    "border-zinc-200 bg-white text-zinc-800 shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md active:translate-y-0 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
  ghost:
    "border-transparent bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 dark:active:bg-zinc-800",
  danger:
    "border-red-200 bg-red-50 text-red-700 shadow-sm hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md active:translate-y-0 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70",
};

export function Button({ className = "", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition duration-150 ease-out motion-reduce:transform-none focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none dark:focus:ring-offset-zinc-950 ${variants[variant]} ${className}`}
    />
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-accent-600 dark:text-accent-500"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-zinc-950 dark:text-zinc-50";

  return (
    <div className="group relative overflow-hidden rounded-md border border-zinc-200 bg-white p-4 shadow-sm transition duration-150 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          tone === "good" ? "bg-accent-500" : tone === "warn" ? "bg-amber-400" : "bg-zinc-200 dark:bg-zinc-800"
        }`}
      />
      <div className={`text-2xl font-semibold tracking-normal ${toneClass}`}>{value}</div>
      <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}
