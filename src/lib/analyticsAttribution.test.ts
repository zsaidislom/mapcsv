import { describe, expect, it } from "vitest";
import { getAttributionFromLocation } from "./analyticsAttribution";

describe("analytics attribution", () => {
  it("parses basic UTM metadata", () => {
    expect(
      getAttributionFromLocation(
        "?utm_source=linkedin&utm_medium=social&utm_campaign=launch",
      ),
    ).toEqual({
      source: "linkedin",
      medium: "social",
      campaign: "launch",
    });
  });

  it("falls back to known referrer sources", () => {
    expect(getAttributionFromLocation("", "https://news.ycombinator.com/item?id=1").source).toBe(
      "hackernews",
    );
  });

  it("sanitizes campaign values", () => {
    expect(
      getAttributionFromLocation(
        "?utm_source=reddit<script>&utm_medium=community&utm_campaign=john@example.com",
      ),
    ).toEqual({
      source: "redditscript",
      medium: "community",
      campaign: "johnexample.com",
    });
  });
});
