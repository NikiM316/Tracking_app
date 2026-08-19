export type LiveCryptoPrices = {
  ethereumEur: number | null;
};

const COINGECKO_ETH_EUR_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur";

export function isEthereumHolding(symbol: string, name?: string): boolean {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (normalizedSymbol === "ETH" || normalizedSymbol === "ETHEREUM") {
    return true;
  }
  return (name ?? "").trim().toLowerCase() === "ethereum";
}

/**
 * Fetches the current Ethereum spot price in EUR from CoinGecko.
 * Returns `ethereumEur: null` when the request fails or the payload is invalid.
 */
export async function getLiveCryptoPrices(): Promise<LiveCryptoPrices> {
  try {
    const response = await fetch(COINGECKO_ETH_EUR_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return { ethereumEur: null };
    }

    const data: unknown = await response.json();
    const price = parseEthereumEurPrice(data);
    if (price == null) {
      return { ethereumEur: null };
    }

    return { ethereumEur: price };
  } catch {
    return { ethereumEur: null };
  }
}

function parseEthereumEurPrice(data: unknown): number | null {
  if (typeof data !== "object" || data === null || !("ethereum" in data)) {
    return null;
  }

  const ethereum = (data as { ethereum: unknown }).ethereum;
  if (typeof ethereum !== "object" || ethereum === null || !("eur" in ethereum)) {
    return null;
  }

  const eur = (ethereum as { eur: unknown }).eur;
  if (typeof eur !== "number" || !Number.isFinite(eur) || eur <= 0) {
    return null;
  }

  return eur;
}
