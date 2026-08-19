"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { SegmentedControl } from "@/features/core/components/SegmentedControl";
import { createTransaction } from "@/features/finance/actions";
import type { AccountWithBalance } from "@/features/finance/types";
import type {
  FinanceCategory,
  FinanceTransactionType,
} from "@/lib/supabase/finance-types";

type NewTransactionFormProps = {
  accounts: AccountWithBalance[];
  categories: FinanceCategory[];
};

const fieldClassName =
  "min-h-12 w-full min-w-0 max-w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-zinc-500";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewTransactionForm({ accounts, categories }: NewTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<FinanceTransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [transferAccountId, setTransferAccountId] = useState(
    accounts.find((account) => account.id !== accounts[0]?.id)?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.kind === type),
    [categories, type],
  );

  const destinationAccounts = useMemo(
    () => accounts.filter((account) => account.id !== accountId),
    [accounts, accountId],
  );

  function handleTypeChange(nextType: FinanceTransactionType) {
    setType(nextType);
    setCategoryId("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    if (!accountId) {
      setError("Select an account.");
      return;
    }

    const selectedAccount = accounts.find((account) => account.id === accountId);
    const currency = selectedAccount?.currency ?? "EUR";

    startTransition(async () => {
      const result =
        type === "transfer"
          ? await createTransaction({
              type: "transfer",
              accountId,
              transferAccountId,
              amount: parsedAmount,
              currency,
              date,
              notes: description.trim() || undefined,
            })
          : await createTransaction({
              type,
              accountId,
              categoryId,
              amount: parsedAmount,
              currency,
              date,
              payee: description.trim() || undefined,
            });

      if (result.error || !result.transaction) {
        setError(result.error ?? "Failed to create transaction.");
        return;
      }

      router.push("/finance");
      router.refresh();
    });
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-sm leading-relaxed text-zinc-400">
          Add an account before logging transactions.
        </p>
        <Button
          className="mt-4"
          fullWidth
          onClick={() => router.push("/finance/accounts/new")}
        >
          Add Account
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <p className={labelClassName}>Type</p>
        <SegmentedControl
          ariaLabel="Transaction type"
          size="sm"
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
            { value: "transfer", label: "Transfer" },
          ]}
          value={type}
          onChange={handleTypeChange}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="tx-amount">
          Amount
        </label>
        <input
          id="tx-amount"
          required
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          className={fieldClassName}
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="tx-account">
          {type === "transfer" ? "From Account" : "Account"}
        </label>
        <select
          id="tx-account"
          required
          className={fieldClassName}
          value={accountId}
          onChange={(event) => {
            const nextAccountId = event.target.value;
            setAccountId(nextAccountId);
            if (transferAccountId === nextAccountId) {
              setTransferAccountId(
                accounts.find((account) => account.id !== nextAccountId)?.id ?? "",
              );
            }
          }}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </div>

      {type === "transfer" ? (
        <div className="space-y-1.5">
          <label className={labelClassName} htmlFor="tx-transfer-account">
            To Account
          </label>
          <select
            id="tx-transfer-account"
            required
            className={fieldClassName}
            value={transferAccountId}
            onChange={(event) => setTransferAccountId(event.target.value)}
          >
            {destinationAccounts.length === 0 ? (
              <option value="">Need another account</option>
            ) : (
              destinationAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))
            )}
          </select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className={labelClassName} htmlFor="tx-category">
            Category
          </label>
          <select
            id="tx-category"
            required
            className={fieldClassName}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Select a category</option>
            {filteredCategories.map((category) => {
              const parentName = filteredCategories.find(
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
      )}

      <div className="min-w-0 space-y-1.5">
        <label className={labelClassName} htmlFor="tx-date">
          Date
        </label>
        <input
          id="tx-date"
          required
          type="date"
          className={fieldClassName}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="tx-description">
          Description
        </label>
        <input
          id="tx-description"
          autoComplete="off"
          className={fieldClassName}
          placeholder={type === "transfer" ? "Optional note" : "e.g. Grocery store"}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        fullWidth
        disabled={isPending || (type === "transfer" && destinationAccounts.length === 0)}
      >
        {isPending ? "Saving…" : "Save Transaction"}
      </Button>
    </form>
  );
}
