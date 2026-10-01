const reservedFallback = "field";

export function toOutputFieldName(header: string): string {
  const normalized = header
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  if (!normalized) {
    return reservedFallback;
  }

  if (/^\d/.test(normalized)) {
    return `${reservedFallback}_${normalized}`;
  }

  return normalized;
}

export function makeUniqueFieldNames(headers: string[]): string[] {
  const seen = new Map<string, number>();

  return headers.map((header) => {
    const base = toOutputFieldName(header);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

export function findDuplicateOutputNames(names: string[]): string[] {
  const counts = new Map<string, number>();

  names
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1));

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
}
