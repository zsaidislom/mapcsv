import { describe, expect, it } from "vitest";
import { APP_VERSION, parseAnalyticsPayload } from "./analyticsSchema";

const basePayload = {
  eventName: "local_csv_parsed",
  visitorId: "6b0c68c1-7ee5-4e93-8374-845359268c25",
  sessionId: "99c8d52e-ec72-430d-95d3-0ce7a25c0697",
  appVersion: APP_VERSION,
  workflowType: "local",
  attribution: {
    source: "direct",
  },
};

describe("analytics payload schema", () => {
  it("accepts known privacy-safe events", () => {
    expect(parseAnalyticsPayload(basePayload).eventName).toBe("local_csv_parsed");
  });

  it("rejects unknown events", () => {
    expect(() =>
      parseAnalyticsPayload({ ...basePayload, eventName: "csv_uploaded_with_filename" }),
    ).toThrow();
  });

  it("rejects arbitrary sensitive fields", () => {
    expect(() =>
      parseAnalyticsPayload({
        ...basePayload,
        fileName: "customers.csv",
        headers: ["Email Address"],
        rows: [{ email: "maya@example.com" }],
        exportedJson: "[{\"email\":\"maya@example.com\"}]",
      }),
    ).toThrow();
  });

  it("requires export formats only on export events", () => {
    expect(() =>
      parseAnalyticsPayload({ ...basePayload, exportFormat: "json" }),
    ).toThrow();
    expect(
      parseAnalyticsPayload({
        ...basePayload,
        eventName: "export_json",
        exportFormat: "json",
      }).exportFormat,
    ).toBe("json");
  });
});
