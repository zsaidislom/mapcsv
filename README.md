# MapCSV

MapCSV is a privacy-first browser tool for making messy CSVs usable. It helps developers and technical users upload a CSV, preview the data, map columns to clean output fields, validate rows, and export structured JSON or clean CSV.

Tagline: **Make messy CSVs usable.**

## Privacy

MapCSV runs entirely in the browser. CSV files are parsed and transformed on the user’s device, and the app does not include a backend, analytics, authentication, cloud storage, or AI/API calls. User CSV contents are not uploaded anywhere by this MVP.

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
- Responsive desktop and mobile workflow UI

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Papa Parse
- Zod
- Lucide React

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Run linting:

```bash
pnpm lint
```

## Project Structure

```text
src/
  components/        Shared UI and navigation
  data/              Local sample CSV data
  features/          Upload, preview, mapping, validation, and export screens
  lib/               CSV parsing, mapping, validation, and export logic
  types/             Shared TypeScript types
```

## Current MVP Limitations

- CSV only; XLS and XLSX are not supported.
- No saved projects or browser persistence for mapping sessions.
- Exports include only rows that pass validation.
- Date validation accepts ISO-style dates and dates with month names; ambiguous numeric dates are rejected.
- Very large CSV files are parsed locally and previewed in a limited table, but the MVP does not include virtualized rendering.
