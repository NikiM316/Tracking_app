"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { createAccount } from "@/features/finance/actions";
import { DecimalField } from "@/features/finance/components/forms/DecimalField";
import { parseDecimal } from "@/features/finance/utils";
import type { FinanceAccountType } from "@/lib/supabase/finance-types";

const ACCOUNT_TYPES: { value: FinanceAccountType; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
  { value: "brokerage", label: "Brokerage Cash" },
  { value: "other", label: "Other" },
];

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-zinc-500";

export function NewAccountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<FinanceAccountType>("checking");
  const [currency, setCurrency] = useState("EUR");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedBalance = parseDecimal(openingBalance);
    if (!Number.isFinite(parsedBalance)) {
      setError("Opening balance must be a number.");
      return;
    }

    startTransition(async () => {
      const result = await createAccount({
        name,
        accountType,
        currency,
        openingBalance: parsedBalance,
      });

      if (result.error || !result.account) {
        setError(result.error ?? "Failed to create account.");
        return;
      }

      router.push("/finance");
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="account-name">
          Name
        </label>
        <input
          id="account-name"
          required
          autoComplete="off"
          className={fieldClassName}
          placeholder="e.g. Revolut EUR"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="account-type">
          Account Type
        </label>
        <select
          id="account-type"
          className={fieldClassName}
          value={accountType}
          onChange={(event) => setAccountType(event.target.value as FinanceAccountType)}
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="account-currency">
          Currency
        </label>
        <input
          id="account-currency"
          required
          maxLength={3}
          className={`${fieldClassName} uppercase`}
          placeholder="EUR"
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="opening-balance">
          Opening Balance
        </label>
        <DecimalField
          id="opening-balance"
          required
          className={fieldClassName}
          placeholder="0.00"
          value={openingBalance}
          onChange={setOpeningBalance}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Creating…" : "Create Account"}
      </Button>
    </form>
  );
}
