"use client";

import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { bulkInsertTransactions } from "@/features/finance/actions";
import { parseCsvRows } from "@/features/finance/lib/csv";
import type {
  AccountWithBalance,
  BulkImportTransactionRow,
} from "@/features/finance/types";

type ImportCsvFormProps = {
  accounts: AccountWithBalance[];
};

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-zinc-500";

function formatSignedAmount(amount: number): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toFixed(2)}`;
}

export function ImportCsvForm({ accounts }: ImportCsvFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [rows, setRows] = useState<BulkImportTransactionRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please upload a .csv file.");
      return;
    }

    setParseError(null);
    setImportError(null);
    setFileName(file.name);
    setIsParsing(true);
    setRows([]);

    // header: false — Revolut's Consolidated Statement export has 100+ lines
    // of account summaries and balances before the transaction table, so
    // there's no single reliable header row. We instead read every line as a
    // raw string[] and let parseCsvRows pick out the real transaction rows.
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        const parsedRows = parseCsvRows(results.data);
        if (parsedRows.length === 0) {
          setParseError(
            "No transactions could be read. Make sure this is a Revolut Consolidated Statement export.",
          );
        }
        setRows(parsedRows);
      },
      error: (error) => {
        setIsParsing(false);
        setParseError(error.message);
      },
    });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    setImportError(null);

    if (!accountId) {
      setImportError("Select an account to import into.");
      return;
    }
    if (rows.length === 0) {
      setImportError("Upload a CSV with transactions first.");
      return;
    }

    startTransition(async () => {
      const result = await bulkInsertTransactions(accountId, rows);

      if (result.error) {
        setImportError(result.error);
        return;
      }

      router.push("/finance");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="import-account">
          Account
        </label>
        <select
          id="import-account"
          className={fieldClassName}
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          disabled={accounts.length === 0}
        >
          {accounts.length === 0 ? (
            <option value="">No accounts yet</option>
          ) : (
            accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))
          )}
        </select>
      </div>

      <div className="space-y-1.5">
        <p className={labelClassName}>Bank Statement CSV</p>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            isDraggingOver
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-zinc-700 bg-zinc-950 hover:border-zinc-600"
          }`}
        >
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-zinc-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
          >
            <path
              d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {fileName ? (
            <p className="text-sm font-medium text-zinc-200">{fileName}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-300">
                Drag & drop a CSV, or click to browse
              </p>
              <p className="text-xs text-zinc-500">
                Supports Revolut&apos;s Consolidated Statement export
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
              event.target.value = "";
            }}
          />
        </div>
        {isParsing ? <p className="text-xs text-zinc-500">Parsing…</p> : null}
        {parseError ? (
          <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {parseError}
          </p>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className={labelClassName}>Preview</p>
            <span className="text-xs text-zinc-500">
              {rows.length} row{rows.length === 1 ? "" : "s"} found
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {previewRows.map((row, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-300">{row.date}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-medium tabular-nums ${
                        row.amount > 0 ? "text-emerald-400" : "text-zinc-100"
                      }`}
                    >
                      {formatSignedAmount(row.amount)}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-zinc-300">
                      {row.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > previewRows.length ? (
            <p className="text-xs text-zinc-500">
              Showing first {previewRows.length} of {rows.length} rows.
            </p>
          ) : null}
        </div>
      ) : null}

      {importError ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {importError}
        </p>
      ) : null}

      <Button
        fullWidth
        disabled={isPending || rows.length === 0 || !accountId}
        onClick={handleImport}
      >
        {isPending ? "Importing…" : `Confirm & Import${rows.length > 0 ? ` (${rows.length})` : ""}`}
      </Button>
    </div>
  );
}
