"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/features/core/components/Button";
import { SegmentedControl } from "@/features/core/components/SegmentedControl";
import { createInvestmentTransaction } from "@/features/finance/actions";
import { DecimalField } from "@/features/finance/components/forms/DecimalField";
import { parseDecimal } from "@/features/finance/utils";
import type {
  FinanceInvestmentTxType,
  FinancePortfolio,
  FinanceSecurityType,
} from "@/lib/supabase/finance-types";

type NewInvestmentTradeFormProps = {
  portfolios: FinancePortfolio[];
};

const SECURITY_TYPES: { value: FinanceSecurityType; label: string }[] = [
  { value: "crypto", label: "Crypto" },
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "bond", label: "Bond" },
  { value: "commodity", label: "Commodity" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-emerald-500";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-zinc-500";

type TradeType = Extract<FinanceInvestmentTxType, "buy" | "sell">;

export function NewInvestmentTradeForm({ portfolios }: NewInvestmentTradeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? "");
  const [type, setType] = useState<TradeType>("buy");
  const [symbol, setSymbol] = useState("");
  const [securityType, setSecurityType] = useState<FinanceSecurityType>("crypto");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedQuantity = parseDecimal(quantity);
    const parsedPrice = parseDecimal(price);

    if (!portfolioId) {
      setError("Select a portfolio.");
      return;
    }
    if (!symbol.trim()) {
      setError("Asset symbol is required.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Price must be zero or greater.");
      return;
    }

    const selectedPortfolio = portfolios.find((portfolio) => portfolio.id === portfolioId);

    startTransition(async () => {
      const result = await createInvestmentTransaction({
        portfolioId,
        type,
        symbol,
        name: symbol.trim().toUpperCase(),
        securityType,
        quantity: parsedQuantity,
        price: parsedPrice,
        currency: selectedPortfolio?.base_currency,
      });

      if (result.error || !result.transaction) {
        setError(result.error ?? "Failed to log trade.");
        return;
      }

      router.push("/finance");
      router.refresh();
    });
  }

  if (portfolios.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-sm leading-relaxed text-zinc-400">
          Create a portfolio before logging trades.
        </p>
        <Button
          className="mt-4"
          fullWidth
          onClick={() => router.push("/finance/portfolios/new")}
        >
          Add Portfolio
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="trade-portfolio">
          Portfolio
        </label>
        <select
          id="trade-portfolio"
          required
          className={fieldClassName}
          value={portfolioId}
          onChange={(event) => setPortfolioId(event.target.value)}
        >
          {portfolios.map((portfolio) => (
            <option key={portfolio.id} value={portfolio.id}>
              {portfolio.name} ({portfolio.base_currency})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <p className={labelClassName}>Trade Type</p>
        <SegmentedControl
          ariaLabel="Trade type"
          size="sm"
          options={[
            { value: "buy", label: "Buy" },
            { value: "sell", label: "Sell" },
          ]}
          value={type}
          onChange={setType}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="trade-symbol">
          Asset Symbol
        </label>
        <input
          id="trade-symbol"
          required
          autoComplete="off"
          className={`${fieldClassName} uppercase`}
          placeholder="e.g. ETH"
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="trade-security-type">
          Asset Type
        </label>
        <select
          id="trade-security-type"
          className={fieldClassName}
          value={securityType}
          onChange={(event) => setSecurityType(event.target.value as FinanceSecurityType)}
        >
          {SECURITY_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="trade-quantity">
          Quantity
        </label>
        <DecimalField
          id="trade-quantity"
          required
          className={fieldClassName}
          placeholder="0"
          value={quantity}
          onChange={setQuantity}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClassName} htmlFor="trade-price">
          Price per unit
        </label>
        <DecimalField
          id="trade-price"
          required
          className={fieldClassName}
          placeholder="0.00"
          value={price}
          onChange={setPrice}
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Saving…" : type === "buy" ? "Log Buy" : "Log Sell"}
      </Button>
    </form>
  );
}
