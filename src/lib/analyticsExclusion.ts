export const internalAnalyticsStorageKey = "mapcsv-exclude-internal-analytics";

type AnalyticsPreferenceStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function isAnalyticsExcluded(storage: AnalyticsPreferenceStorage): boolean {
  return storage.getItem(internalAnalyticsStorageKey) === "true";
}

export function setAnalyticsExcluded(
  storage: AnalyticsPreferenceStorage,
  excluded: boolean,
): void {
  if (excluded) {
    storage.setItem(internalAnalyticsStorageKey, "true");
    return;
  }

  storage.removeItem(internalAnalyticsStorageKey);
}
