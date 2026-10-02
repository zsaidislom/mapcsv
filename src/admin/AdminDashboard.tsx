import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  BarChart3,
  Download,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Users,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Button, Stat } from "../components/ui";
import { APP_VERSION } from "../lib/analyticsSchema";

type RangeKey = "today" | "7d" | "30d" | "all";

type DashboardSummary = {
  range: RangeKey;
  generatedAt: string;
  kpis: {
    visitors: number;
    sessions: number;
    realCsvUsers: number;
    sampleCsvUsers: number;
    successfulExports: number;
    realCsvExportConversion: number;
    returningUsers: number;
    weeklyRealCsvExports: number;
  };
  funnel: { step: string; count: number; previousRate: number | null }[];
  exports: { format: string; count: number; share: number }[];
  sources: { source: string; visitors: number; realCsvUsers: number; exports: number }[];
  trends: { day: string; visitors: number; realCsvUsers: number; exports: number }[];
  version: string;
};

const ranges: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function maxTrend(summary?: DashboardSummary): number {
  if (!summary) {
    return 1;
  }

  return Math.max(
    1,
    ...summary.trends.flatMap((item) => [
      item.visitors,
      item.realCsvUsers,
      item.exports,
    ]),
  );
}

export function AdminDashboard() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [refreshToken, setRefreshToken] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const trendMax = useMemo(() => maxTrend(summary), [summary]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/admin/summary?range=${range}`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error("Cloudflare Access authentication is required.");
        }
        if (!response.ok) {
          throw new Error("Analytics summary is unavailable.");
        }
        if (!response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("Analytics summary is unavailable.");
        }
        return response.json() as Promise<DashboardSummary>;
      })
      .then((nextSummary) => {
        setSummary(nextSummary);
        setError(undefined);
      })
      .catch((caughtError) => {
        if (!controller.signal.aborted) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load analytics.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [range, refreshToken]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-850 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div>
              <h1 className="text-xl font-semibold tracking-normal">MapCSV Analytics</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Private product usage dashboard · {APP_VERSION}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ranges.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                  range === option.key
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col justify-between gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <Lock className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
            <p>
              Dashboard access should be protected by Cloudflare Access. CSV data, file names,
              headers, values, mapped names, and exports are never collected.
            </p>
          </div>
          <Button type="button" onClick={() => setRefreshToken((current) => current + 1)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-md border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Loading analytics...
          </div>
        ) : summary ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Visitors" value={summary.kpis.visitors.toLocaleString()} />
              <Stat label="Sessions" value={summary.kpis.sessions.toLocaleString()} />
              <Stat
                label="Real CSV users"
                value={summary.kpis.realCsvUsers.toLocaleString()}
                tone="good"
              />
              <Stat
                label="Sample CSV users"
                value={summary.kpis.sampleCsvUsers.toLocaleString()}
              />
              <Stat
                label="Successful exports"
                value={summary.kpis.successfulExports.toLocaleString()}
                tone="good"
              />
              <Stat
                label="CSV -> Export conversion"
                value={percent(summary.kpis.realCsvExportConversion)}
                tone="good"
              />
              <Stat
                label="Returning users"
                value={summary.kpis.returningUsers.toLocaleString()}
              />
              <Stat
                label="Real CSV exports this week"
                value={summary.kpis.weeklyRealCsvExports.toLocaleString()}
                tone="good"
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-5 flex items-center gap-2">
                  <BarChart3 className="size-4 text-accent-600" aria-hidden="true" />
                  <h2 className="text-base font-semibold">Usage funnel</h2>
                </div>
                <div className="space-y-3">
                  {summary.funnel.map((item, index) => (
                    <div key={item.step}>
                      <div className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                        <span className="text-sm font-medium">{item.step}</span>
                        <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                          {item.count.toLocaleString()}
                          {item.previousRate == null ? "" : ` · ${percent(item.previousRate)}`}
                        </span>
                      </div>
                      {index < summary.funnel.length - 1 ? (
                        <ArrowDown className="mx-auto my-1 size-4 text-zinc-400" aria-hidden="true" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-5 flex items-center gap-2">
                  <Download className="size-4 text-accent-600" aria-hidden="true" />
                  <h2 className="text-base font-semibold">Exports</h2>
                </div>
                <div className="space-y-3">
                  {summary.exports.map((item) => (
                    <div key={item.format}>
                      <div className="flex justify-between text-sm">
                        <span>{item.format}</span>
                        <span className="font-mono">
                          {item.count.toLocaleString()} · {percent(item.share)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                        <div
                          className="h-full bg-accent-600"
                          style={{ width: `${Math.max(2, item.share * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-5 flex items-center gap-2">
                  <Users className="size-4 text-accent-600" aria-hidden="true" />
                  <h2 className="text-base font-semibold">Traffic sources</h2>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                      <tr>
                        <th className="py-2">Source</th>
                        <th className="py-2">Visitors</th>
                        <th className="py-2">Real CSV</th>
                        <th className="py-2">Exports</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                      {summary.sources.map((source) => (
                        <tr key={source.source}>
                          <td className="py-3 font-medium capitalize">{source.source}</td>
                          <td className="py-3 font-mono">{source.visitors}</td>
                          <td className="py-3 font-mono">{source.realCsvUsers}</td>
                          <td className="py-3 font-mono">{source.exports}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-5 flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-accent-600" aria-hidden="true" />
                  <h2 className="text-base font-semibold">Trends</h2>
                </div>
                <div className="space-y-4">
                  {summary.trends.map((item) => (
                    <div key={item.day} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
                      <span className="font-mono text-xs text-zinc-500">{item.day}</span>
                      <div className="space-y-1">
                        {[
                          ["Visitors", item.visitors, "bg-zinc-800 dark:bg-zinc-200"],
                          ["Real CSV", item.realCsvUsers, "bg-accent-600"],
                          ["Exports", item.exports, "bg-amber-500"],
                        ].map(([label, value, className]) => (
                          <div key={label} className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-900">
                              <div
                                className={`h-full rounded-full ${className}`}
                                style={{
                                  width: `${Math.max(2, (Number(value) / trendMax) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="w-16 text-right font-mono text-xs text-zinc-500">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
