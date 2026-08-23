import { useEffect, useState } from 'react';
import { useAlive } from '$hooks/useAlive';

/** GeckoTerminal network ids are NOT the same strings as our stored chain
 *  names for every chain (e.g. ethereum is 'eth' there). Only chains with
 *  a verified mapping are listed; anything else returns null rather than
 *  guessing a URL that would 404 on every open of the sheet. */
const GECKO_NETWORK_IDS: Record<string, string> = {
  solana: 'solana',
};

const GECKO_BASE = 'https://api.geckoterminal.com/api/v2';

/** 5 minutes: hourly candles only gain a new point once an hour, so
 *  re-fetching on every sheet open would be pure waste. Short enough that
 *  a sheet left open across a session still refreshes eventually. */
const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = {
  fetchedAt: number;
  promise: Promise<number[] | null>;
};

/** Module-level cache keyed by `${network}:${address}`, caching the
 *  in-flight promise (same pattern as useDexScreenerTokenImage) so two
 *  mounts for the same token produce exactly one request pair. */
const priceHistoryCache = new Map<string, CacheEntry>();

async function fetchPriceHistory(network: string, address: string): Promise<number[] | null> {
  try {
    // Step 1: the token's top pool -- OHLCV is a per-pool endpoint.
    const poolsRes = await fetch(
      `${GECKO_BASE}/networks/${network}/tokens/${encodeURIComponent(address)}/pools?page=1`
    );
    if (!poolsRes.ok) return null;
    const poolsBody = (await poolsRes.json()) as {
      data?: { attributes?: { address?: unknown } }[];
    };
    const poolAddress = poolsBody.data?.[0]?.attributes?.address;
    if (typeof poolAddress !== 'string' || poolAddress.length === 0) return null;

    // Step 2: last 24 hourly candles for that pool (newest first).
    const ohlcvRes = await fetch(
      `${GECKO_BASE}/networks/${network}/pools/${encodeURIComponent(
        poolAddress
      )}/ohlcv/hour?aggregate=1&limit=24`
    );
    if (!ohlcvRes.ok) return null;
    const ohlcvBody = (await ohlcvRes.json()) as {
      data?: { attributes?: { ohlcv_list?: unknown } };
    };
    const list = ohlcvBody.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list)) return null;
    const closes = list
      .map((candle) => (Array.isArray(candle) ? Number(candle[4]) : NaN))
      .filter((close) => Number.isFinite(close));
    if (closes.length < 2) return null;
    // ohlcv_list is newest-first; the sparkline wants chronological order.
    return closes.toReversed();
  } catch {
    // Network failure or malformed JSON: a sheet without a sparkline is a
    // fine answer. Never throw -- the price block renders regardless.
    return null;
  }
}

/** Last-24h hourly close prices for a token from GeckoTerminal's public
 *  API (no key). Returns null while loading, for unsupported chains, and
 *  on any failure -- callers simply omit the sparkline in those cases. */
export function useTokenPriceHistory(
  chain: string | null | undefined,
  contractAddress: string | null | undefined
): number[] | null {
  const alive = useAlive();
  const [history, setHistory] = useState<number[] | null>(null);

  useEffect(() => {
    setHistory(null);
    if (!chain || !contractAddress) return;
    const network = GECKO_NETWORK_IDS[chain.trim().toLowerCase()];
    if (!network) return;
    const key = `${network}:${contractAddress}`;
    const now = Date.now();
    let entry = priceHistoryCache.get(key);
    if (!entry || now - entry.fetchedAt > CACHE_TTL_MS) {
      entry = { fetchedAt: now, promise: fetchPriceHistory(network, contractAddress) };
      priceHistoryCache.set(key, entry);
    }
    entry.promise.then((closes) => {
      if (alive()) setHistory(closes);
    });
  }, [chain, contractAddress, alive]);

  return history;
}

/** Test-only escape hatch, mirroring useDexScreenerTokenImage's. */
export function clearTokenPriceHistoryCacheForTesting(): void {
  priceHistoryCache.clear();
}
