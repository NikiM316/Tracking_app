import "server-only";

import {
  getLiveCryptoPrices as fetchLiveCryptoPrices,
  isEthereumHolding,
} from "@/features/finance/lib/crypto-prices";
import type { HoldingWithDetails } from "@/features/finance/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlaceholderUserId } from "@/lib/utils/placeholder-user";

/**
 * Fetches every investment holding across the current user's portfolios,
 * enriched with portfolio and security details and a live ETH/EUR market value.
 */
export async function getPortfolioHoldings(): Promise<HoldingWithDetails[]> {
  const supabase = createServerSupabaseClient();
  const userId = getPlaceholderUserId();

  const [{ data: portfolios, error: portfoliosError }, prices] = await Promise.all([
    supabase.from("finance_portfolios").select("id, name").eq("user_id", userId),
    fetchLiveCryptoPrices(),
  ]);

  if (portfoliosError) {
    throw new Error(`Failed to fetch portfolios: ${portfoliosError.message}`);
  }

  if (!portfolios || portfolios.length === 0) {
    return [];
  }

  const portfolioIds = portfolios.map((portfolio) => portfolio.id);
  const portfolioNameById = new Map(portfolios.map((portfolio) => [portfolio.id, portfolio.name]));

  const { data: holdings, error: holdingsError } = await supabase
    .from("finance_holdings")
    .select("*")
    .in("portfolio_id", portfolioIds);

  if (holdingsError) {
    throw new Error(`Failed to fetch holdings: ${holdingsError.message}`);
  }

  if (!holdings || holdings.length === 0) {
    return [];
  }

  const securityIds = [...new Set(holdings.map((holding) => holding.security_id))];

  const { data: securities, error: securitiesError } = await supabase
    .from("finance_securities")
    .select("id, symbol, name, security_type")
    .in("id", securityIds);

  if (securitiesError) {
    throw new Error(`Failed to fetch securities: ${securitiesError.message}`);
  }

  const securityById = new Map((securities ?? []).map((security) => [security.id, security]));

  return holdings.map((holding) => {
    const security = securityById.get(holding.security_id);
    const symbol = security?.symbol ?? "?";
    const name = security?.name ?? "Unknown security";
    const quantity = Number(holding.quantity);
    const averageCost = Number(holding.average_cost);
    const isEth = isEthereumHolding(symbol, name);
    const livePriceEur = isEth ? prices.ethereumEur : null;
    const totalInvested = quantity * averageCost;
    const currentValue = livePriceEur != null ? quantity * livePriceEur : null;
    const pnlAmount = currentValue != null ? currentValue - totalInvested : null;
    const pnlPercentage =
      pnlAmount != null && totalInvested > 0 ? (pnlAmount / totalInvested) * 100 : 0;

    return {
      id: holding.id,
      portfolioId: holding.portfolio_id,
      portfolioName: portfolioNameById.get(holding.portfolio_id) ?? "Unknown portfolio",
      securityId: holding.security_id,
      symbol,
      name,
      securityType: security?.security_type ?? "other",
      quantity,
      averageCost,
      currency: holding.currency,
      livePriceEur,
      totalInvested,
      currentValue,
      pnlAmount,
      pnlPercentage: currentValue != null ? pnlPercentage : null,
    };
  });
}
