import { describe, expect, it } from "vitest";
import {
  internalAnalyticsStorageKey,
  isAnalyticsExcluded,
  setAnalyticsExcluded,
} from "./analyticsExclusion";

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("analytics exclusion preference", () => {
  it("persists internal mode across fresh reads and removes it when disabled", () => {
    const storage = createStorage();

    setAnalyticsExcluded(storage, true);

    expect(storage.getItem(internalAnalyticsStorageKey)).toBe("true");
    expect(isAnalyticsExcluded(storage)).toBe(true);

    setAnalyticsExcluded(storage, false);

    expect(storage.getItem(internalAnalyticsStorageKey)).toBeNull();
    expect(isAnalyticsExcluded(storage)).toBe(false);
  });
});
