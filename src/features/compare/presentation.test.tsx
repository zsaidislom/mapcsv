import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ResultPage, Rules, Summary } from "../../lib/reconcile/types";
import { buildComparisonScope } from "../../lib/reconcile/scope";
import { ColumnMappingSummary, ComparisonScopeDisclosure, NoDifferencesNotice } from "./ComparisonScope";
import { ResultsTable } from "./ResultsTable";
import {
  getDefaultResultView,
  identifierEntries,
  ROW_IDENTIFIER_LABEL,
  toggleRowIdentifier,
} from "./presentation";

const baseSummary: Summary = {
  added: 0,
  removed: 0,
  changed: 0,
  unchanged: 8,
  issues: 0,
  keyIssues: { missing: 0, empty: 0, duplicate: 0, ambiguous: 0 },
};

describe("Compare CSV presentation behavior", () => {
  it("uses nontechnical row identifier terminology", () => {
    expect(ROW_IDENTIFIER_LABEL).toBe("Row identifier");
  });

  it("selects multiple identifiers while preserving compare-field preferences", () => {
    const rules: Rules = {
      mappings: [
        { before: "email", after: "email_address" },
        { before: "company_id", after: "company_id" },
      ],
      keys: [],
      excluded: ["email"],
    };
    const withEmail = toggleRowIdentifier(rules, "email", true);
    const composite = toggleRowIdentifier(withEmail, "company_id", true);
    const withoutEmail = toggleRowIdentifier(composite, "email", false);

    expect(composite.keys).toEqual(["email", "company_id"]);
    expect(composite.excluded).toEqual(["email"]);
    expect(withoutEmail.keys).toEqual(["company_id"]);
    expect(withoutEmail.excluded).toEqual(["email"]);
  });

  it("prioritizes changed, then added, then removed results", () => {
    expect(getDefaultResultView({ ...baseSummary, changed: 2, added: 3, removed: 4 })).toBe("changed");
    expect(getDefaultResultView({ ...baseSummary, added: 3, removed: 4 })).toBe("added");
    expect(getDefaultResultView({ ...baseSummary, removed: 4 })).toBe("removed");
  });

  it("opens the no-differences summary when all records are unchanged", () => {
    expect(getDefaultResultView(baseSummary)).toBe("summary");
  });

  it("opens identifier issues instead of claiming there are no differences", () => {
    expect(getDefaultResultView({
      ...baseSummary,
      unchanged: 7,
      issues: 1,
      keyIssues: { ...baseSummary.keyIssues, empty: 1 },
    })).toBe("issues");
  });

  it("formats composite identifiers as labeled values", () => {
    expect(identifierEntries(
      ["alex@example.com", "ABC123"],
      [
        { before: "Email", after: "Email address" },
        { before: "Customer ID", after: "Customer ID" },
      ],
      "before",
    )).toEqual([
      { label: "Email", value: "alex@example.com" },
      { label: "Customer ID", value: "ABC123" },
    ]);
  });

  it("renders readable identifiers and prominent field-level changes", () => {
    const data: ResultPage = {
      total: 1,
      page: 0,
      issues: [],
      rows: [{
        status: "changed",
        key: ["alex@example.com", "ABC123"],
        before: 0,
        after: 0,
        beforeValues: ["alex@example.com", "ABC123", "inactive", "basic"],
        afterValues: ["alex@example.com", "ABC123", "active", "pro"],
        changes: [
          { beforeColumn: "Status", afterColumn: "Status", before: "inactive", after: "active" },
          { beforeColumn: "Plan", afterColumn: "Plan", before: "basic", after: "pro" },
        ],
      }],
    };
    const markup = renderToStaticMarkup(
      <ResultsTable
        data={data}
        before={{ name: "before.csv", columns: ["Email", "Customer ID", "Status", "Plan"], rowCount: 1 }}
        after={{ name: "after.csv", columns: ["Email address", "Customer ID", "Status", "Plan"], rowCount: 1 }}
        identifiers={[
          { before: "Email", after: "Email address" },
          { before: "Customer ID", after: "Customer ID" },
        ]}
        busy={false}
        onPage={() => undefined}
      />,
    );

    expect(markup).toContain("Status / identifier");
    expect(markup).toContain("alex@example.com");
    expect(markup).toContain("Customer ID");
    expect(markup).not.toContain("[&quot;alex@example.com&quot;");
    expect(markup).toContain("Changed fields");
    expect(markup).toContain("inactive");
    expect(markup).toContain("active");
    expect(markup).toContain("Full record details");
  });

  it("communicates unmapped columns and their consequence in the Columns step", () => {
    const scope = buildComparisonScope(
      { columns: ["customer_id", "email", "status"] },
      { columns: ["customer_id", "email_address", "status"] },
      { mappings: [{ before: "customer_id", after: "customer_id" }, { before: "status", after: "status" }], keys: [], excluded: [] },
    );
    const markup = renderToStaticMarkup(<ColumnMappingSummary scope={scope} />);

    expect(markup).toContain("2 field mappings");
    expect(markup).toContain("2 unmapped source columns");
    expect(markup).toContain("Unmapped columns will not be checked for changes.");
  });

  it("renders accessible comparison-scope details beside Results", () => {
    const scope = buildComparisonScope(
      { columns: ["customer_id", "email", "status", "updated_at"] },
      { columns: ["customer_id", "email_address", "status", "updated_at"] },
      {
        mappings: [
          { before: "customer_id", after: "customer_id" },
          { before: "status", after: "status" },
          { before: "updated_at", after: "updated_at" },
        ],
        keys: ["customer_id"],
        excluded: ["updated_at"],
      },
    );
    const markup = renderToStaticMarkup(<ComparisonScopeDisclosure scope={scope} />);

    expect(markup).toContain("Comparison scope");
    expect(markup).toContain("1 field compared");
    expect(markup).toContain("4 source columns not compared");
    expect(markup).toContain("customer_id");
    expect(markup).toContain("status");
    expect(markup).toContain("Excluded:");
    expect(markup).toContain("Before only:");
    expect(markup).toContain("email");
    expect(markup).toContain("After only:");
    expect(markup).toContain("email_address");
  });

  it("scopes the no-differences wording to fields that were checked", () => {
    const markup = renderToStaticMarkup(<NoDifferencesNotice />);
    expect(markup).toContain("No differences found in the compared fields");
    expect(markup).toContain("review exactly what was and was not checked");
  });
});
