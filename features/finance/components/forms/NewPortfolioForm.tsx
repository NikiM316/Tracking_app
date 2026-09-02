"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { createPortfolio } from "@/features/finance/actions";

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-zinc-500";

export function NewPortfolioForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPortfolio({ name, baseCurrency });

      if (result.error || !result.portfolio) {
        setError(result.error ?? "Failed to create portfolio.");
        return;
      }

      router.push("/finance");
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="portfolio-name">
          Name
        </label>
        <input
          id="portfolio-name"
          required
          autoComplete="off"
          className={fieldClassName}
          placeholder='e.g. "Revolut Crypto"'
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="portfolio-currency">
          Base Currency
        </label>
        <input
          id="portfolio-currency"
          required
          maxLength={3}
          className={`${fieldClassName} uppercase`}
          placeholder="EUR"
          value={baseCurrency}
          onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Creating…" : "Create Portfolio"}
      </Button>
    </form>
  );
}
