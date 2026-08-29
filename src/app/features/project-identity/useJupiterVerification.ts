import { useEffect, useState } from 'react';
import { useAlive } from '$hooks/useAlive';

/** Jupiter's token search endpoint carries per-token verification
 *  (`isVerified`) for Solana mints. Only solana is supported -- Jupiter
 *  is a Solana aggregator, so asking it about any other chain's address
 *  would produce garbage matches, never real verification data. */
const JUPITER_SEARCH_URL = 'https://lite-api.jup.ag/tokens/v2/search?query=';

/** 5 minutes, same TTL reasoning as useTokenPriceHistory: verification
 *  state changes rarely, so re-fetching on every sheet open is waste, but
 *  a session left open still refreshes eventually. */
const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = {
  fetchedAt: number;
  promise: Promise<boolean | null>;
};

/** Module-level cache keyed by mint, caching the in-flight promise (same
 *  pattern as useDexScreenerTokenImage / useTokenPriceHistory) so two
 *  mounts for the same token produce exactly one request. */
const verificationCache = new Map<string, CacheEntry>();

async function fetchJupiterVerification(mint: string): Promise<boolean | null> {
  try {
    const res = await fetch(`${JUPITER_SEARCH_URL}${encodeURIComponent(mint)}`);
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return null;
    const first = body[0] as { isVerified?: unknown } | undefined;
    // Only a real boolean from the API counts -- anything else means the
    // caller omits the row entirely rather than guessing (never fabricate
    // a verification state).
    return typeof first?.isVerified === 'boolean' ? first.isVerified : null;
  } catch {
    // Network failure or malformed JSON: "unknown" is the honest answer,
    // and callers render nothing for it. Never throw, never retry.
    return null;
  }
}

/** Whether Jupiter lists the token as verified. Returns null while
 *  loading, for non-solana chains, and on any fetch failure -- callers
 *  must omit their verification UI entirely for null (a missing row,
 *  never a guessed one). */
export function useJupiterVerification(
  chain: string | null | undefined,
  contractAddress: string | null | undefined
): boolean | null {
  const alive = useAlive();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(null);
    if (!chain || !contractAddress) return;
    if (chain.trim().toLowerCase() !== 'solana') return;
    const now = Date.now();
    let entry = verificationCache.get(contractAddress);
    if (!entry || now - entry.fetchedAt > CACHE_TTL_MS) {
      entry = { fetchedAt: now, promise: fetchJupiterVerification(contractAddress) };
      verificationCache.set(contractAddress, entry);
    }
    entry.promise.then((value) => {
      if (alive()) setVerified(value);
    });
  }, [chain, contractAddress, alive]);

  return verified;
}

/** Test-only escape hatch, mirroring useDexScreenerTokenImage's. */
export function clearJupiterVerificationCacheForTesting(): void {
  verificationCache.clear();
}
