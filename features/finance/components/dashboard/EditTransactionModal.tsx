"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/features/core/components/Button";
import { deleteTransaction, updateTransaction } from "@/features/finance/actions";
import { DateField } from "@/features/finance/components/forms/DateField";
import type { RecentTransaction } from "@/features/finance/types";
import type { FinanceCategory } from "@/lib/supabase/finance-types";

type EditTransactionModalProps = {
  transaction: RecentTransaction;
  categories: FinanceCategory[];
  onClose: () => void;
};

const fieldClassName =
  "min-h-12 w-full min-w-0 max-w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-zinc-500";

export function EditTransactionModal({
  transaction,
  categories,
  onClose,
}: EditTransactionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(transaction.amount));
  const [date, setDate] = useState(transaction.date);
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const matchingCategories = useMemo(() => {
    const ofKind = categories.filter((category) => category.kind === transaction.type);
    const nameById = new Map(ofKind.map((category) => [category.id, category.name]));

    return [...ofKind].sort((a, b) => {
      const labelA = a.parent_id
        ? `${nameById.get(a.parent_id) ?? ""} / ${a.name}`
        : a.name;
      const labelB = b.parent_id
        ? `${nameById.get(b.parent_id) ?? ""} / ${b.name}`
        : b.name;
      return labelA.localeCompare(labelB);
    });
  }, [categories, transaction.type]);

  const canEditCategory = transaction.type !== "transfer";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    if (canEditCategory && !categoryId) {
      setError("Select a category.");
      return;
    }

    startTransition(async () => {
      const result = await updateTransaction(transaction.id, {
        amount: parsedAmount,
        date,
        ...(canEditCategory ? { category_id: categoryId.trim() } : {}),
      });

      if (result.error || !result.transaction) {
        setError(result.error ?? "Failed to update transaction.");
        return;
      }

      router.refresh();
      onClose();
    });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setError(null);
      setConfirmDelete(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);

      if (!result.success) {
        setError(result.error ?? "Failed to delete transaction.");
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dismiss edit transaction"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-transaction-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl shadow-black/40 sm:rounded-2xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="edit-transaction-title" className="text-lg font-semibold text-zinc-50">
              Edit Transaction
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-400">
              {transaction.payee || transaction.categoryName || transaction.accountName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className={labelClassName} htmlFor="edit-tx-amount">
              Amount ({transaction.currency})
            </label>
            <input
              id="edit-tx-amount"
              required
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              className={fieldClassName}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClassName} htmlFor="edit-tx-date">
              Date
            </label>
            <DateField
              id="edit-tx-date"
              required
              value={date}
              onChange={setDate}
            />
          </div>

          {canEditCategory ? (
            <div className="space-y-1.5">
              <label className={labelClassName} htmlFor="edit-tx-category">
                Category
              </label>
              <select
                id="edit-tx-category"
                required
                className={fieldClassName}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Select a category</option>
                {matchingCategories.map((category) => {
                  const parentName = matchingCategories.find(
                    (item) => item.id === category.parent_id,
                  )?.name;
                  return (
                    <option key={category.id} value={category.id}>
                      {parentName ? `${parentName} / ${category.name}` : category.name}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Transfers do not have a category.</p>
          )}

          {confirmDelete ? (
            <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              This cannot be undone. Tap Delete again to remove this transaction.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isPending}
              onClick={() => {
                if (confirmDelete) {
                  setConfirmDelete(false);
                  return;
                }
                onClose();
              }}
            >
              {confirmDelete ? "Keep" : "Cancel"}
            </Button>
            <Button type="submit" fullWidth disabled={isPending || confirmDelete}>
              {isPending && !confirmDelete ? "Saving…" : "Save"}
            </Button>
          </div>
          <Button
            type="button"
            variant="danger"
            fullWidth
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending && confirmDelete ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </div>
    </div>
  );
}
