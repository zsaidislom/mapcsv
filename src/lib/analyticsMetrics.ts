import type { AnalyticsEventName } from "./analyticsSchema";

export type MetricEvent = {
  eventName: AnalyticsEventName;
  visitorId: string;
  sessionId: string;
  source?: string;
  day?: string;
};

export function realCsvConversionRate(events: MetricEvent[]): number {
  const realCsvSessions = new Set(
    events
      .filter((event) => event.eventName === "local_csv_parsed")
      .map((event) => event.sessionId),
  );
  const exportedSessions = new Set(
    events
      .filter((event) =>
        ["export_csv", "export_json", "copy_json"].includes(event.eventName),
      )
      .map((event) => event.sessionId),
  );
  const converted = [...realCsvSessions].filter((sessionId) =>
    exportedSessions.has(sessionId),
  ).length;

  return realCsvSessions.size === 0 ? 0 : converted / realCsvSessions.size;
}
