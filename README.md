# MapCSV

MapCSV is a privacy-first browser tool for making messy CSVs usable. It helps developers and technical users upload a CSV, preview the data, map columns to clean output fields, validate rows, and export structured JSON or clean CSV.

Tagline: **Make messy CSVs usable.**

## Privacy

MapCSV runs CSV parsing, mapping, validation, and export generation locally in the browser.

MapCSV v0.2 adds anonymous product analytics, but the core promise remains true:

**Your CSV data never leaves your browser.**

Analytics events never include CSV contents, file names, headers, cell values, mapped field names, validation values, exported CSV, exported JSON, names, emails, phone numbers, or other CSV-derived text.

## Features

- Drag-and-drop or file-picker CSV upload
- Local sample CSV for trying the workflow
- Client-side CSV parsing with Papa Parse
- Preview of detected columns, row count, delimiter, and parser warnings
- Deterministic default output field names from source headers
- Column mapping with output name, type, required, and ignore controls
- Duplicate output field name warning
- Row validation for string, number, email, date, boolean, and required fields
- Row-level validation issue table
- Export of valid rows as JSON or clean CSV
- Copy JSON to clipboard
- Light, dark, and system theme modes
- Anonymous privacy-safe product analytics
- Private admin analytics dashboard at `/admin`

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Papa Parse
- Zod
- Lucide React
- Cloudflare Worker with Static Assets
- Cloudflare D1
- Worker Secret based admin sessions

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the Vite public app only:

```bash
pnpm dev
```

For Worker/API local testing, build first and then run Wrangler:

```bash
pnpm build
pnpm wrangler dev
```

Run checks:

```bash
pnpm test
pnpm lint
pnpm typecheck:worker
pnpm build
```

## Project Structure

```text
src/
  admin/             Private analytics dashboard UI
  components/        Shared UI and navigation
  data/              Local sample CSV data
  features/          Upload, preview, mapping, validation, and export screens
  lib/               CSV, validation, export, and analytics logic
  types/             Shared TypeScript types
  worker.ts          Cloudflare Worker API routes + static asset fallback
migrations/
  0001_analytics_events.sql
```

## Deployment Architecture

MapCSV deploys as one Cloudflare Worker named `mapcsv` with static assets and API routes in the same Worker.

```text
Browser
  -> Worker static assets: /, /admin, JS/CSS
  -> Worker API: POST /api/events, POST /api/admin/login, POST /api/admin/logout, GET /api/admin/summary
  -> D1 binding: env.DB
```

The Worker uses:

```toml
main = "src/worker.ts"
workers_dev = true

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

This preserves the existing workers.dev style URL instead of creating a separate Pages project.

## Analytics Architecture

The public frontend sends small anonymous events to:

```text
POST /api/events
```

The Cloudflare Worker validates the event, rejects unknown fields, rate-limits obvious per-session spam, and stores accepted events in D1.

The admin dashboard at `/admin` reads aggregated metrics from:

```text
GET /api/admin/summary?range=7d
```

The admin API uses a password login backed by Worker Secrets and a signed HttpOnly session cookie. `GET /api/admin/summary` returns `401` unless the request has a valid untampered session.

## Event Schema

Allowed event names:

- `page_view`
- `sample_csv_parsed`
- `local_csv_parsed`
- `preview_opened`
- `mapping_opened`
- `validation_run`
- `export_csv`
- `export_json`
- `copy_json`

Allowed payload fields:

- `eventName`
- `visitorId`
- `sessionId`
- `appVersion`
- `workflowType`
- `exportFormat`
- `attribution.source`
- `attribution.medium`
- `attribution.campaign`
- `occurredAt`

Do not add event fields that can contain CSV-derived data.

## Anonymous Visitor And Session Model

MapCSV generates:

- `visitorId`: random UUID stored in `localStorage`
- `sessionId`: random UUID stored in `sessionStorage`

This allows approximate returning-user and session metrics without accounts, fingerprinting, IP storage, or device profiling.

## UTM Support

MapCSV supports:

- `utm_source`
- `utm_medium`
- `utm_campaign`

Values are lowercased, length-limited, and stripped to a conservative character set. If no UTM source exists, MapCSV stores a simple source derived from known referrer hosts where possible, otherwise `direct` or `other`.

## Core Metric

The main product metric is:

**Successful exports from real CSV workflows per week.**

In the dashboard this is counted as unique sessions with export events where `workflowType = "local"` over the last 7 days.

The Real CSV -> Export conversion rate is:

```text
unique sessions with local_csv_parsed and at least one export
/
unique sessions with local_csv_parsed
```

One session exporting multiple times counts as one converted session for conversion-rate purposes.

## Cloudflare Setup

D1 database expected by this project:

```text
database_name = "mapcsv_analytics"
binding = "DB"
```

In `wrangler.toml`, set the existing D1 id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mapcsv_analytics"
database_id = "YOUR_DATABASE_ID"
```

The first migration is:

```text
migrations/0001_analytics_events.sql
```

Apply migrations only if needed:

```bash
pnpm wrangler d1 migrations apply mapcsv_analytics --remote
```

Deploy the existing Worker/static-assets app:

```bash
pnpm build
pnpm wrangler deploy
```

Do not create a second unrelated Pages project for this app.

## Admin Authentication

Admin authentication is handled inside the existing Worker. The frontend never stores the password or session in `localStorage`; the Worker sets a signed session cookie with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and a roughly 24 hour lifetime.

Set the secrets before deploying:

```bash
pnpm wrangler secret put ADMIN_PASSWORD
pnpm wrangler secret put ADMIN_SESSION_SECRET
```

Do not put these values in `wrangler.toml`, source files, D1, logs, or chat messages.

The Worker also checks same-origin `Origin` headers on admin login/logout requests and includes a simple in-memory failed-login limiter per Worker isolate. That limiter is free and requires no schema changes, but it is not a durable global rate limit across all Cloudflare isolates.

Use a long random value for `ADMIN_SESSION_SECRET`; changing it invalidates existing admin sessions.

## Local Admin Development

For local Worker testing only, set:

```toml
[vars]
ADMIN_DEV_BYPASS = "true"
```

Only use that locally. Production should keep `ADMIN_DEV_BYPASS = "false"` and rely on `ADMIN_PASSWORD` plus `ADMIN_SESSION_SECRET` Worker Secrets.

## Adding Analytics Events Safely

1. Add the event name to `analyticsEventNames` in `src/lib/analyticsSchema.ts`.
2. Add only non-sensitive metadata.
3. Update tests in `src/lib/*analytics*.test.ts`.
4. Search for the event payload and verify no CSV-derived data can enter it.
5. Run:

```bash
pnpm test
pnpm lint
pnpm typecheck:worker
pnpm build
```

## Current MVP Limitations

- CSV only; XLS and XLSX are not supported.
- No saved projects or browser persistence for mapping sessions.
- Exports include only rows that pass validation.
- Date validation accepts ISO-style dates and dates with month names; ambiguous numeric dates are rejected.
- The dashboard is intentionally small and decision-focused.
- Analytics requires D1 binding `DB` and admin auth Worker Secrets after deployment.
