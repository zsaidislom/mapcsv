import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { autoMappings, reconcile, validateKeys, validateRules } from "./engine";
import { parseComparisonCsv as parse } from "./parser";
import { exportComparisonCsv, exportComparisonHtml } from "./export";
import { createProfile, PROFILE_KEY, readProfiles, writeProfiles } from "./profiles";
import { buildComparisonScope } from "./scope";
import type { Dataset, Rules } from "./types";

function compare(left: string, right: string, patch: Partial<Rules> = {}) {
  const before = parse(left, "before.csv");
  const after = parse(right, "after.csv");
  const rules: Rules = { mappings: autoMappings(before.columns, after.columns), keys: ["id"], excluded: [], ...patch };
  return { before, after, rules, result: reconcile(before, after, rules) };
}

describe("exact CSV reconciliation", () => {
  it("leaves a renamed column unmapped and does not compare its changed value", () => {
    const before = parse("customer_id,email,name\n103,jo@example.com,Jo", "before.csv");
    const after = parse("customer_id,email_address,name\n103,changed@example.com,Jo", "after.csv");
    const rules: Rules = { mappings: autoMappings(before.columns, after.columns), keys: ["customer_id"], excluded: [] };
    const scope = buildComparisonScope(before, after, rules);
    const result = reconcile(before, after, rules);

    expect(rules.mappings).toEqual([
      { before: "customer_id", after: "customer_id" },
      { before: "name", after: "name" },
    ]);
    expect(scope.unmappedBefore).toEqual(["email"]);
    expect(scope.unmappedAfter).toEqual(["email_address"]);
    expect(scope.notComparedSourceColumns).toBe(2);
    expect(result.summary).toMatchObject({ changed: 0, unchanged: 1 });
  });

  it("detects the renamed-column change after an explicit mapping", () => {
    const before = parse("customer_id,email,name\n103,jo@example.com,Jo", "before.csv");
    const after = parse("customer_id,email_address,name\n103,changed@example.com,Jo", "after.csv");
    const rules: Rules = {
      mappings: [...autoMappings(before.columns, after.columns), { before: "email", after: "email_address" }],
      keys: ["customer_id"],
      excluded: [],
    };
    const scope = buildComparisonScope(before, after, rules);
    const result = reconcile(before, after, rules);

    expect(scope.unmappedBefore).toEqual([]);
    expect(scope.unmappedAfter).toEqual([]);
    expect(scope.compared).toContainEqual({ before: "email", after: "email_address" });
    expect(result.summary).toMatchObject({ changed: 1, unchanged: 0 });
    expect(result.rows[0].changes).toContainEqual({
      beforeColumn: "email",
      afterColumn: "email_address",
      before: "jo@example.com",
      after: "changed@example.com",
    });
  });

  it("classifies identical files as unchanged", () => {
    const { result } = compare("id,name\n1,Alex", "id,name\n1,Alex");
    expect(result.summary).toMatchObject({ unchanged: 1, added: 0, removed: 0, changed: 0, issues: 0 });
  });
  it("classifies added and removed rows", () => {
    const { result } = compare("id,name\n1,Alex\n2,Jo", "id,name\n2,Jo\n3,Sam");
    expect(result.rows.map((row) => [row.key, row.status])).toEqual([[["1"], "removed"], [["2"], "unchanged"], [["3"], "added"]]);
  });
  it("keeps multiple field-level changes", () => {
    const { result } = compare("id,name,status\n1,Alex,inactive", "id,name,status\n1,Alexa,active");
    expect(result.rows[0].changes).toEqual([
      { beforeColumn: "name", afterColumn: "name", before: "Alex", after: "Alexa" },
      { beforeColumn: "status", afterColumn: "status", before: "inactive", after: "active" },
    ]);
  });
  it("matches composite keys without delimiter collisions", () => {
    const { result } = compare('id,org,name\n"a|b",c,Alex\na,"b|c",Jo', 'id,org,name\na,"b|c",Jo\n"a|b",c,Alex', { keys: ["id", "org"] });
    expect(result.summary.unchanged).toBe(2);
    expect(result.summary.issues).toBe(0);
  });
  it("ignores row and column ordering", () => {
    expect(compare("id,name\n1,Alex\n2,Jo", "name,id\nJo,2\nAlex,1").result.summary.unchanged).toBe(2);
  });
  it("compares renamed columns including the key", () => {
    const { result } = compare("id,email\n1,a@example.com", "contact_id,email_address\n1,b@example.com", { mappings: [{ before: "id", after: "contact_id" }, { before: "email", after: "email_address" }] });
    expect(result.summary.changed).toBe(1);
    expect(result.rows[0].changes[0].afterColumn).toBe("email_address");
  });
  it("does not compare excluded or unmapped columns", () => {
    expect(compare("id,name,timestamp,old\n1,Alex,1,x", "id,name,timestamp,new\n1,Alex,2,y", { excluded: ["timestamp"] }).result.summary.unchanged).toBe(1);
  });
  it.each(["before", "after"])("quarantines duplicate keys and their counterpart (%s)", (side) => {
    const duplicated = "id,name\n1,Alex\n1,Other\n2,Jo";
    const unique = "id,name\n1,Alex\n2,Jo";
    const { result } = compare(side === "before" ? duplicated : unique, side === "before" ? unique : duplicated);
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 0, unchanged: 1, issues: 3, keyIssues: { duplicate: 2, ambiguous: 1 } });
    expect(result.issues).toHaveLength(3);
  });
  it("reports missing, empty and whitespace-only keys without guessing matches", () => {
    const { result } = compare("name,id\nAlex\nSam,\nJo,   ", "name,id\nAlex,1");
    expect(result.summary.keyIssues).toEqual({ missing: 1, empty: 2, duplicate: 0, ambiguous: 0 });
    expect(result.summary.added).toBe(1);
  });
  it("supports empty datasets with headers, rejects an entirely empty file", () => {
    expect(compare("id,name", "id,name").result.rows).toHaveLength(0);
    expect(compare("id,name", "id,name\n1,Alex").result.summary.added).toBe(1);
    expect(() => parse("", "empty.csv")).toThrow(/empty/);
  });
  it("reports explicitly quoted empty single-column keys but skips physical blank lines", () => {
    const { before, result } = compare('id\n\n""\n1\n', 'id\n1\n');
    expect(before.rows).toEqual([[""], ["1"]]);
    expect(result.summary.keyIssues.empty).toBe(1);
    expect(result.summary.unchanged).toBe(1);
  });
  it("preserves quoted commas, quotes, multiline cells and Unicode", () => {
    const csv = 'id,name,note\n1,\u00c9lodie,"Hello, ""friend""\n\u4f60\u597d"';
    const { result, before } = compare(csv, csv);
    expect(before.rows[0][2]).toBe('Hello, "friend"\n\u4f60\u597d');
    expect(result.summary.unchanged).toBe(1);
  });
  it("does not trim, coerce, or normalize compared values or keys", () => {
    const { result } = compare("id,value\n01,TRUE\n2, word", "id,value\n1,true\n2,word");
    expect(result.summary).toMatchObject({ added: 1, removed: 1, changed: 1 });
  });
  it("distinguishes a missing cell from an empty value", () => {
    const { result } = compare("id,name\n1", "id,name\n1,");
    expect(result.rows[0].changes[0]).toMatchObject({ before: undefined, after: "" });
  });
  it("handles prototype-like headers and keys safely", () => {
    const { result } = compare("id,__proto__,constructor\n__proto__,a,b", "id,__proto__,constructor\n__proto__,a,c");
    expect(result.rows[0].changes[0].beforeColumn).toBe("constructor");
  });
  it("validates keys before running the comparison", () => {
    const data = parse("id,name\n1,Alex\n1,Jo", "test.csv");
    const rules = { mappings: autoMappings(data.columns, data.columns), keys: ["id"], excluded: [] };
    expect(validateKeys(data, data, rules).issues).toHaveLength(4);
    expect(() => validateRules(data, data, { ...rules, keys: [] })).toThrow(/identifier/);
    expect(() => validateRules(data, data, { ...rules, mappings: [{ before: "id", after: "name" }, { before: "name", after: "name" }] })).toThrow(/once/);
    expect(() => validateRules(data, data, { ...rules, keys: ["absent"] })).toThrow(/rules/);
    expect(() => validateRules(data, data, { ...rules, excluded: ["id"] })).not.toThrow();
  });
});

describe("CSV parser limits and structural safety", () => {
  it.each(["id,id\n1,2", "id,\n1,2", "id,name\n1,Alex,extra", 'id,name\n1,"unfinished']) ("rejects malformed or ambiguous CSV: %s", (csv) => {
    expect(() => parse(csv, "bad.csv")).toThrow();
  });
  it("accepts UTF-8 BOM, CRLF, semicolons, and header-only single-column files", () => {
    expect(parse("\uFEFFid;name\r\n1;Alex\r\n", "bom.csv").rows).toEqual([["1", "Alex"]]);
    expect(parse("id", "header.csv").rows).toEqual([]);
  });
  it("enforces row, column, cell, and file limits", () => {
    expect(() => parse(`id\n${"a\n".repeat(50_001)}`, "rows.csv")).toThrow(/50,000/);
    expect(() => parse(Array.from({ length: 101 }, (_, index) => `c${index}`).join(","), "columns.csv")).toThrow(/100 columns/);
    expect(() => parse(`id\n${"a".repeat(20_001)}`, "cell.csv")).toThrow(/20,000/);
    expect(() => parse("a".repeat(10 * 1024 * 1024 + 1), "large.csv")).toThrow(/10 MiB/);
  });
  it("bounds diff growth even when the input row limit is respected", () => {
    const columns = ["id", ...Array.from({ length: 100 }, (_, i) => `c${i}`)];
    const before: Dataset = { name: "before.csv", columns, rows: Array.from({ length: 1001 }, (_, i) => [String(i), ...Array(100).fill("a") as string[]]) };
    const after: Dataset = { name: "after.csv", columns, rows: before.rows.map((row) => [row[0], ...Array(100).fill("b") as string[]]) };
    expect(() => reconcile(before, after, { mappings: autoMappings(columns, columns), keys: ["id"], excluded: [] })).toThrow(/100,000 changed cells/);
  });
  it("enforces the total cell limit", () => {
    const header = Array.from({ length: 100 }, (_, i) => `c${i}`).join(",");
    const row = Array(100).fill("x").join(",");
    expect(() => parse(`${header}\n${`${row}\n`.repeat(10_001)}`, "cells.csv")).toThrow(/1,000,000/);
  });
});

describe("local-only exports", () => {
  it("exports correct rows and per-field changes", () => {
    const { before, after, result } = compare("id,name\n1,Alex\n2,Jo", "id,name\n1,Alexa\n3,Sam");
    expect(Papa.parse(exportComparisonCsv("added", before, after, result)).data).toEqual([["id", "name"], ["3", "Sam"]]);
    expect(Papa.parse(exportComparisonCsv("removed", before, after, result)).data).toEqual([["id", "name"], ["2", "Jo"]]);
    const changed = Papa.parse<Record<string, string>>(exportComparisonCsv("changed", before, after, result), { header: true }).data;
    expect(changed[0]).toMatchObject({ before_value: "Alex", after_value: "Alexa", before_present: "true", after_present: "true" });
  });
  it("neutralizes spreadsheet formulas, including headers", () => {
    const { before, after, result } = compare("id,=header", 'id,=header\n1,"=HYPERLINK(""example.com"")"');
    const rows = Papa.parse<string[]>(exportComparisonCsv("added", before, after, result)).data;
    expect(rows[0][1]).toBe("'=header");
    expect(rows[1][1]).toMatch(/^'=/);
    after.rows[0][1] = "   =1+1";
    expect(Papa.parse<string[]>(exportComparisonCsv("added", before, after, result)).data[1][1]).toBe("'   =1+1");
  });
  it("exports a standalone escaped report without scripts or remote resources", () => {
    const { before, after, rules, result } = compare('id,name\n1,"<script>alert(1)</script>"\n2,Jo\n2,Jo', 'id,name\n1,"<img src=x onerror=alert(1)>"');
    before.name = '<script>filename</script>.csv';
    const html = exportComparisonHtml(before, after, rules, result);
    expect(html).not.toMatch(/<script|<img|<iframe|<link|<[^>]+\ssrc=/i);
    expect(html).toContain("&lt;script&gt;filename&lt;/script&gt;.csv");
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("duplicate");
    expect(html).toContain("changed: 1");
    expect(html).not.toContain("[object Object]");
  });
  it("renders composite row identifiers as labeled values in the HTML report", () => {
    const { before, after, rules, result } = compare(
      "id,region,status\n1,EU,inactive",
      "id,region,status\n1,EU,active",
      { keys: ["id", "region"] },
    );
    const html = exportComparisonHtml(before, after, rules, result);
    expect(html).toContain("<dt>id</dt><dd>1</dd>");
    expect(html).toContain("<dt>region</dt><dd>EU</dd>");
    expect(html).not.toContain('["1","EU"]');
  });
  it("includes compared and unmapped fields in the HTML report scope", () => {
    const before = parse("customer_id,email,name\n103,jo@example.com,Jo", "before.csv");
    const after = parse("customer_id,email_address,name\n103,changed@example.com,Jo", "after.csv");
    const rules: Rules = { mappings: autoMappings(before.columns, after.columns), keys: ["customer_id"], excluded: [] };
    const html = exportComparisonHtml(before, after, rules, reconcile(before, after, rules));

    expect(html).toContain("<h2>Comparison scope</h2>");
    expect(html).toContain("1 field compared; 2 source columns not compared.");
    expect(html).toContain("<h3>Compared fields</h3>");
    expect(html).toContain("name &rarr; name");
    expect(html).toContain("Before only: email (unmapped)");
    expect(html).toContain("After only: email_address (unmapped)");
  });
  it("exports headers even when a category is empty", () => {
    const { before, after, result } = compare("id,name", "id,name");
    expect(exportComparisonCsv("added", before, after, result)).toBe("id,name\r\n");
  });
  it("bounds report and CSV output size before huge repeated headers exhaust memory", () => {
    const header = `id,${"long_header".repeat(1500)}`;
    const left = `${header}\n${Array.from({ length: 700 }, (_, i) => `${i},a`).join("\n")}`;
    const right = `${header}\n${Array.from({ length: 700 }, (_, i) => `${i},b`).join("\n")}`;
    const { before, after, rules, result } = compare(left, right);
    expect(() => exportComparisonCsv("changed", before, after, result)).toThrow(/20 MB/);
    expect(() => exportComparisonHtml(before, after, rules, result)).toThrow(/20 MB/);
  });
});

describe("local rule profiles", () => {
  it("persists only name/id/mappings/keys/excluded rules, never row data", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const rules = { mappings: [{ before: "id", after: "id" }], keys: ["id"], excluded: [], rows: [["secret row"]], filename: "private.csv" };
    const profile = createProfile("CRM check", rules);
    writeProfiles(storage, [profile]);
    expect(readProfiles(storage)).toEqual([profile]);
    expect(values.get(PROFILE_KEY)).not.toMatch(/secret row|private.csv|filename|rows/);
  });
  it("restores comparison-scope metadata from a saved profile", () => {
    const before = { columns: ["customer_id", "email", "status"] };
    const after = { columns: ["customer_id", "email_address", "status"] };
    const profile = createProfile("Customer audit", {
      mappings: [
        { before: "customer_id", after: "customer_id" },
        { before: "email", after: "email_address" },
        { before: "status", after: "status" },
      ],
      keys: ["customer_id"],
      excluded: ["status"],
    });
    const scope = buildComparisonScope(before, after, profile.rules);

    expect(scope.compared).toEqual([{ before: "email", after: "email_address" }]);
    expect(scope.excludedMappings).toEqual([{ before: "status", after: "status" }]);
    expect(scope.notComparedSourceColumns).toBe(2);
  });
  it("rejects corrupt or extra stored data instead of silently applying it", () => {
    expect(() => readProfiles({ getItem: () => "{bad" })).toThrow(/could not be read/);
    expect(() => readProfiles({ getItem: () => JSON.stringify({ version: 1, profiles: [], rows: [] }) })).toThrow();
  });
});
