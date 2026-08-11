import { NewInvestmentTradeForm } from "@/features/finance/components/forms/NewInvestmentTradeForm";
import { getPortfolios } from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function NewInvestmentTradePage() {
  const portfolios = await getPortfolios();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Log Trade</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Record a buy or sell. New symbols are added to your securities catalog automatically.
        </p>
        <div className="mt-5">
          <NewInvestmentTradeForm portfolios={portfolios} />
        </div>
      </div>
    </section>
  );
}
