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
      <nav className="hidden w-56 shrink-0 border-r border-zinc-200 px-4 py-6 dark:border-zinc-850 lg:block">
        <ol className="space-y-1">
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
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-45 ${
                    isCurrent
                      ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={`grid size-5 place-items-center rounded-full border ${
                      isCurrent
                        ? "border-white/40 dark:border-zinc-950/30"
                        : isComplete
                          ? "border-accent-500 bg-accent-500 text-white"
                          : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="size-3" aria-hidden="true" />
                    ) : (
                      <Circle className="size-2 fill-current" aria-hidden="true" />
                    )}
                  </span>
                  {step.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-850 lg:hidden">
        <ol className="flex items-center gap-2 overflow-x-auto">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isAvailable = index <= maxStepIndex;

            return (
              <li key={step.id} className="shrink-0">
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelect(step.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-45 ${
                    isCurrent
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                      : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
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
