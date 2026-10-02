import type { Attribution } from "./analyticsSchema";

const sourceAliases = new Map<string, string>([
  ["hn", "hackernews"],
  ["hacker-news", "hackernews"],
  ["hacker_news", "hackernews"],
  ["news.ycombinator.com", "hackernews"],
  ["linkedin.com", "linkedin"],
  ["www.linkedin.com", "linkedin"],
  ["reddit.com", "reddit"],
  ["www.reddit.com", "reddit"],
]);

function cleanCampaignValue(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._ -]/g, "")
    .slice(0, 48);

  return cleaned || undefined;
}

function sourceFromReferrer(referrer: string): string | undefined {
  if (!referrer) {
    return undefined;
  }

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return sourceAliases.get(host) ?? "other";
  } catch {
    return undefined;
  }
}

function normalizeSource(source: string | undefined): string {
  if (!source) {
    return "direct";
  }

  return sourceAliases.get(source) ?? source;
}

export function getAttributionFromLocation(
  search: string,
  referrer = "",
): Attribution {
  const params = new URLSearchParams(search);
  const utmSource = cleanCampaignValue(params.get("utm_source"));
  const referrerSource = sourceFromReferrer(referrer);

  return {
    source: normalizeSource(utmSource ?? referrerSource),
    medium: cleanCampaignValue(params.get("utm_medium")),
    campaign: cleanCampaignValue(params.get("utm_campaign")),
  };
}
