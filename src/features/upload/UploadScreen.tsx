import { useRef, useState } from "react";
import { FileSpreadsheet, Lock, Upload } from "lucide-react";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Button } from "../../components/ui";

type ThemeMode = "system" | "light" | "dark";

type UploadScreenProps = {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onFileSelected: (file: File) => void;
  onSample: () => void;
  error?: string;
  isParsing: boolean;
};

export function UploadScreen({
  themeMode,
  onThemeChange,
  onFileSelected,
  onSample,
  error,
  isParsing,
}: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <a
            href="#about"
            className="rounded-md px-2 py-1 text-sm text-zinc-600 transition hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            About
          </a>
          <ThemeToggle mode={themeMode} onChange={onThemeChange} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-14 pt-12 sm:px-8 lg:pt-20">
        <section className="mx-auto w-full max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <Lock className="size-3.5 text-accent-600" aria-hidden="true" />
            Your data never leaves your browser.
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50 sm:text-5xl md:text-6xl">
            Make messy CSVs usable.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Map columns, validate data, and export clean structured data — without uploading your
            files anywhere.
          </p>
        </section>

        <section className="mx-auto mt-10 w-full max-w-3xl">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => handleFiles(event.currentTarget.files)}
          />
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
            className={`group rounded-lg border border-dashed p-8 text-center shadow-soft transition sm:p-12 ${
              isDragging
                ? "border-accent-500 bg-accent-50 dark:bg-accent-950/20"
                : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            }`}
          >
            <div className="mx-auto grid size-12 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 transition group-hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
              <Upload className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Drop your CSV here
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Accepted file type: .csv
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                onClick={() => inputRef.current?.click()}
                disabled={isParsing}
              >
                <FileSpreadsheet className="size-4" aria-hidden="true" />
                Choose file
              </Button>
              <Button type="button" onClick={onSample} disabled={isParsing}>
                Try sample CSV
              </Button>
            </div>
            {isParsing ? (
              <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
                Parsing locally in your browser...
              </p>
            ) : null}
            {error ? (
              <p className="mx-auto mt-5 max-w-xl rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 sm:flex-row">
            <span>No signup • Private • Free</span>
            <span id="about">
              Files are parsed, mapped, validated, and exported locally on this device.
            </span>
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-zinc-500 dark:text-zinc-500">
            MapCSV collects anonymous product-usage events to understand how the product is used.
            File names, headers, cell contents, mapped fields, and exported data are never
            collected.
          </p>
        </section>
      </main>
    </div>
  );
}
