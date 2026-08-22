import { useEffect, useState } from 'react';
import { useAlive } from '$hooks/useAlive';

/** Maps a project chain asset's stored chain name to DexScreener's
 *  chainId path segment. They already match for every chain the app
 *  stores today ('solana' etc.), so this is a lowercase pass-through --
 *  kept as a named function so any future divergence (a chain whose
 *  stored name differs from DexScreener's id) has exactly one place to
 *  add a mapping. */
export function toDexScreenerChainId(chain: string): string {
  return chain.trim().toLowerCase();
}

/** Module-level cache keyed by `${chainId}:${address}`. Caches the
 *  in-flight promise (not just the resolved value) so two components
 *  mounting for the same token at the same time still produce exactly
 *  one network request. Failed lookups resolve to null and are cached
 *  too -- a token with no DexScreener image should not be re-fetched on
 *  every re-render of the Home page. */
const tokenImageCache = new Map<string, Promise<string | null>>();

async function fetchTokenImage(chainId: string, address: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/${chainId}/${address}`);
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return null;
    const first = body[0] as { info?: { imageUrl?: unknown } } | undefined;
    const imageUrl = first?.info?.imageUrl;
    return typeof imageUrl === 'string' && imageUrl.length > 0 ? imageUrl : null;
  } catch {
    // Network failure or bad JSON: no image is a fine answer here -- the
    // callers all have an initials fallback. Never throw, never retry.
    return null;
  }
}

/** Resolves a token's profile image from DexScreener's public token
 *  endpoint (the first pair's info.imageUrl), for use as an avatar
 *  fallback when a project has no avatar_url of its own. Returns null
 *  while loading, when either argument is missing, and when DexScreener
 *  has no image for the token. */
export function useDexScreenerTokenImage(
  chain: string | null | undefined,
  contractAddress: string | null | undefined
): string | null {
  const alive = useAlive();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(null);
    if (!chain || !contractAddress) return;
    const chainId = toDexScreenerChainId(chain);
    const key = `${chainId}:${contractAddress}`;
    let pending = tokenImageCache.get(key);
    if (!pending) {
      pending = fetchTokenImage(chainId, contractAddress);
      tokenImageCache.set(key, pending);
    }
    pending.then((url) => {
      if (alive()) setImageUrl(url);
    });
  }, [chain, contractAddress, alive]);

  return imageUrl;
}

/** Test-only escape hatch: the module-level cache is a feature in the
 *  app (repeat renders never refetch) but a hazard across test cases. */
export function clearDexScreenerTokenImageCacheForTesting(): void {
  tokenImageCache.clear();
}
