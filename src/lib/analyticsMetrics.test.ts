import { describe, expect, it } from "vitest";
import { realCsvConversionRate, type MetricEvent } from "./analyticsMetrics";

const events: MetricEvent[] = [
  {
    eventName: "local_csv_parsed",
    visitorId: "visitor-1",
    sessionId: "session-1",
  },
  {
    eventName: "export_csv",
    visitorId: "visitor-1",
    sessionId: "session-1",
  },
  {
    eventName: "export_json",
    visitorId: "visitor-1",
    sessionId: "session-1",
  },
  {
    eventName: "local_csv_parsed",
    visitorId: "visitor-2",
    sessionId: "session-2",
  },
  {
    eventName: "sample_csv_parsed",
    visitorId: "visitor-3",
    sessionId: "session-3",
  },
];

describe("analytics metrics", () => {
  it("calculates conversion by unique real CSV sessions, not export count", () => {
    expect(realCsvConversionRate(events)).toBe(0.5);
  });

  it("returns zero when no real CSV sessions exist", () => {
    expect(
      realCsvConversionRate([
        {
          eventName: "sample_csv_parsed",
          visitorId: "visitor-1",
          sessionId: "session-1",
        },
      ]),
    ).toBe(0);
  });
});
