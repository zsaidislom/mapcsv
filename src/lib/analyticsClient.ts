import {
  APP_VERSION,
  type AnalyticsEventName,
  type AnalyticsPayload,
  type Attribution,
  type ExportFormat,
  type WorkflowType,
} from "./analyticsSchema";
import { getAttributionFromLocation } from "./analyticsAttribution";

const visitorKey = "mapcsv-visitor-id";
const sessionKey = "mapcsv-session-id";

function getStoredUuid(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  storage.setItem(key, next);
  return next;
}

function createPayload(
  eventName: AnalyticsEventName,
  workflowType: WorkflowType,
  attribution: Attribution,
  exportFormat?: ExportFormat,
): AnalyticsPayload {
  return {
    eventName,
    visitorId: getStoredUuid(window.localStorage, visitorKey),
    sessionId: getStoredUuid(window.sessionStorage, sessionKey),
    appVersion: APP_VERSION,
    workflowType,
    exportFormat,
    attribution,
    occurredAt: new Date().toISOString(),
  };
}

export type AnalyticsClient = {
  track: (
    eventName: AnalyticsEventName,
    options?: { workflowType?: WorkflowType; exportFormat?: ExportFormat },
  ) => void;
};

export function createAnalyticsClient(): AnalyticsClient {
  const attribution = getAttributionFromLocation(
    window.location.search,
    document.referrer,
  );

  return {
    track(eventName, options) {
      const payload = createPayload(
        eventName,
        options?.workflowType ?? "none",
        attribution,
        options?.exportFormat,
      );
      const body = JSON.stringify(payload);

      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/events",
            new Blob([body], { type: "application/json" }),
          );
          return;
        }

        void fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        }).catch((error: unknown) => {
          if (import.meta.env.DEV) {
            console.debug("MapCSV analytics unavailable", error);
          }
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.debug("MapCSV analytics unavailable", error);
        }
      }
    },
  };
}
