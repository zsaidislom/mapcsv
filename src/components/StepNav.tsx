import { Check, Circle } from "lucide-react";
import { steps } from "../lib/steps";
import type { StepId } from "../types";

type StepNavProps = {
  currentStep: StepId;
  maxStepIndex: number;
  onSelect: (step: StepId) => void;
};

export function StepNav({ currentStep, maxStepIndex, onSelect }: StepNavProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <>
      <nav className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white/55 px-4 py-6 backdrop-blur dark:border-zinc-850 dark:bg-zinc-950/55 lg:block">
        <ol className="relative space-y-1">
          <span
            className="absolute bottom-4 left-[1.375rem] top-4 w-px bg-zinc-200 dark:bg-zinc-800"
            aria-hidden="true"
          />
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isComplete = index < currentIndex;
            const isAvailable = index <= maxStepIndex;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelect(step.id)}
                  className={`relative flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 dark:focus:ring-offset-zinc-950 ${
                    isCurrent
                      ? "border border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-white hover:text-zinc-950 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-zinc-900/70 dark:hover:text-zinc-100"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={`z-10 grid size-5 place-items-center rounded-full border transition ${
                      isCurrent
                        ? "border-accent-500 bg-accent-50 text-accent-700 ring-4 ring-accent-50 dark:bg-accent-950/50 dark:text-accent-300 dark:ring-accent-950/30"
                        : isComplete
                          ? "border-accent-500 bg-accent-500 text-white"
                          : "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="size-3" aria-hidden="true" />
                    ) : (
                      <Circle className="size-2 fill-current" aria-hidden="true" />
                    )}
                  </span>
                  <span className="font-medium">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="border-b border-zinc-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-zinc-850 dark:bg-zinc-950/70 lg:hidden">
        <ol className="flex items-center justify-between gap-1 overflow-x-auto">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isAvailable = index <= maxStepIndex;

            return (
              <li key={step.id} className="shrink-0">
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelect(step.id)}
                  className={`min-h-10 shrink-0 rounded-full border px-2.5 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:opacity-45 dark:focus:ring-offset-zinc-950 ${
                    isCurrent
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {step.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
