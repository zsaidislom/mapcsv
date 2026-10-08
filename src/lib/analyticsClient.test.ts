import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalyticsClient } from "./analyticsClient";
import { setAnalyticsExcluded } from "./analyticsExclusion";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const trackedWorkflowEvents = [
  "page_view",
  "sample_csv_parsed",
  "local_csv_parsed",
  "preview_opened",
  "mapping_opened",
  "validation_run",
  "export_csv",
  "export_json",
  "copy_json",
] as const;

describe("analytics client internal traffic exclusion", () => {
  let localStorage: MemoryStorage;
  let sessionStorage: MemoryStorage;
  let sendBeacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage = new MemoryStorage();
    sessionStorage = new MemoryStorage();
    sendBeacon = vi.fn(() => true);

    vi.stubGlobal("window", {
      localStorage,
      sessionStorage,
      location: { pathname: "/", search: "" },
    });
    vi.stubGlobal("document", { referrer: "" });
    vi.stubGlobal("navigator", { sendBeacon });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends normal browser analytics and creates visitor and session IDs", () => {
    createAnalyticsClient().track("page_view");

    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(localStorage.getItem("mapcsv-visitor-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionStorage.getItem("mapcsv-session-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("suppresses landing, workflow, and export events before IDs or payloads are created", () => {
    setAnalyticsExcluded(localStorage, true);
    const client = createAnalyticsClient();

    for (const eventName of trackedWorkflowEvents) {
      const exportFormat =
        eventName === "export_csv"
          ? "csv"
          : eventName === "export_json"
            ? "json"
            : eventName === "copy_json"
              ? "copy_json"
              : undefined;
      client.track(eventName, {
        workflowType: eventName === "page_view" ? "none" : "local",
        exportFormat,
      });
    }

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(localStorage.getItem("mapcsv-visitor-id")).toBeNull();
    expect(sessionStorage.getItem("mapcsv-session-id")).toBeNull();
  });

  it("resumes analytics immediately when internal mode is disabled", () => {
    setAnalyticsExcluded(localStorage, true);
    const client = createAnalyticsClient();

    client.track("page_view");
    setAnalyticsExcluded(localStorage, false);
    client.track("local_csv_parsed", { workflowType: "local" });

    expect(sendBeacon).toHaveBeenCalledOnce();
  });

  it("never sends product analytics from the admin route", () => {
    window.location.pathname = "/admin";

    createAnalyticsClient().track("page_view");

    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
