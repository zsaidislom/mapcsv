import { useEffect, useRef } from "react";
import type { WorkerCommand, WorkerReply, WorkerValue } from "../../lib/reconcile/types";

export function useCompareWorker() {
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const pending = useRef(new Map<number, { resolve: (value: WorkerValue) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());

  useEffect(() => {
    const requests = pending.current;
    return () => {
      worker.current?.terminate();
      worker.current = null;
      requests.forEach(({ reject, timer }) => { clearTimeout(timer); reject(new Error("Comparison closed.")); });
      requests.clear();
    };
  }, []);

  function stop(message: string) {
    worker.current?.terminate();
    worker.current = null;
    pending.current.forEach(({ reject, timer }) => { clearTimeout(timer); reject(new Error(message)); });
    pending.current.clear();
  }

  function request<T extends WorkerValue>(command: WorkerCommand): Promise<T> {
    if (!worker.current) {
      worker.current = new Worker(new URL("./compare.worker.ts", import.meta.url), { type: "module" });
      worker.current.onmessage = (event: MessageEvent<WorkerReply>) => {
        const response = event.data;
        const task = pending.current.get(response.id);
        if (!task) return;
        clearTimeout(task.timer);
        pending.current.delete(response.id);
        if (response.ok) task.resolve(response.value);
        else task.reject(new Error(response.error));
      };
      worker.current.onerror = (event) => {
        event.preventDefault();
        stop("The local worker stopped. Return to Upload and choose both files again, or try smaller files.");
      };
      worker.current.onmessageerror = () => stop("The local worker could not return a result. Choose both files again.");
    }
    const id = ++sequence.current;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => stop("The local task timed out. Return to Upload and choose smaller files."), 60_000);
      pending.current.set(id, { resolve: (value) => resolve(value as T), reject, timer });
      try { worker.current!.postMessage({ ...command, id }); }
      catch { stop("Could not start the local task. Choose both CSV files again."); }
    });
  }
  return request;
}
