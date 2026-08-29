import { useCallback, useEffect, useState } from 'react';
import { Box } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { sizedIcon, Star } from '$components/icons/phosphor';
import * as css from './HomeCommunityCards.css';

/** Account-data event holding the user's watchlist edits. The default
 *  watchlist is Jupiter's 24h top-trending list, so the only thing worth
 *  persisting is the set of mints the user has starred OFF of it. The
 *  content shape is registered in src/types/matrix-sdk-events.d.ts. */
export const WATCHLIST_ACCOUNT_DATA_EVENT = 'chat.blockwire.watchlist';

export type WatchlistToken = {
  /** Mint address -- the stable identity used for the removed-set. */
  id: string;
  symbol: string;
  name: string;
  iconUrl: string | null;
  priceUsd: number;
  /** 24h percent change; null when Jupiter omits it for the token. */
  change24h: number | null;
};

type JupiterTrendingEntry = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  icon?: unknown;
  usdPrice?: unknown;
  stats24h?: { priceChange?: unknown };
};

const TRENDING_URL = 'https://lite-api.jup.ag/tokens/v2/toptrending/24h?limit=10';
const TRENDING_TTL_MS = 60_000;

/** Module-level cache: a single in-flight promise shared by every mount,
 *  refreshed only once the TTL lapses (same pattern as
 *  useDexScreenerTokenImage, plus the TTL because trending is one shared
 *  list rather than per-token lookups). Failures resolve to [] and are
 *  cached for the TTL too -- Home must never spin on a flaky endpoint. */
const trendingCache = new Map<string, { at: number; promise: Promise<WatchlistToken[]> }>();

async function fetchTrendingTokens(): Promise<WatchlistToken[]> {
  try {
    const res = await fetch(TRENDING_URL);
    if (!res.ok) return [];
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return [];
    const tokens: WatchlistToken[] = [];
    (body as JupiterTrendingEntry[]).forEach((entry) => {
      const { id, symbol, name } = entry;
      const priceUsd = Number(entry.usdPrice);
      if (
        typeof id !== 'string' ||
        id.length === 0 ||
        typeof symbol !== 'string' ||
        symbol.length === 0 ||
        !Number.isFinite(priceUsd)
      ) {
        return;
      }
      const rawChange = entry.stats24h?.priceChange;
      const change24h =
        typeof rawChange === 'number' && Number.isFinite(rawChange) ? rawChange : null;
      const rawIcon = entry.icon;
      const iconUrl = typeof rawIcon === 'string' && rawIcon.length > 0 ? rawIcon : null;
      tokens.push({
        id,
        symbol: symbol.toUpperCase(),
        name: typeof name === 'string' ? name : symbol,
        iconUrl,
        priceUsd,
        change24h,
      });
    });
    return tokens;
  } catch {
    // Network failure: the section simply renders nothing -- never an
    // error state that breaks Home.
    return [];
  }
}

function getTrendingTokens(): Promise<WatchlistToken[]> {
  const cached = trendingCache.get(TRENDING_URL);
  if (cached && Date.now() - cached.at < TRENDING_TTL_MS) return cached.promise;
  const promise = fetchTrendingTokens();
  trendingCache.set(TRENDING_URL, { at: Date.now(), promise });
  return promise;
}

/** Test-only escape hatch, mirroring useDexScreenerTokenImage's. */
export function clearTrendingCacheForTesting(): void {
  trendingCache.clear();
}

/** Same tiering the community cards' formatPrice uses, extended one step
 *  down because trending memecoins routinely quote below a cent:
 *  $152.35 / $0.4826 / $0.004826. */
function formatWatchlistPrice(price: number): string {
  if (price < 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(price < 1 ? 4 : 2)}`;
}

function WatchlistTokenCard({
  token,
  onRemove,
}: {
  token: WatchlistToken;
  onRemove: (id: string) => void;
}) {
  // Graceful icon fallback: a broken/missing image URL degrades to the
  // same initials circle the community cards use.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = token.iconUrl !== null && !imageFailed;
  const up = token.change24h !== null && token.change24h >= 0;

  return (
    <Box className={css.WatchlistCard} direction="Column" gap="100">
      <Box alignItems="Center" gap="100">
        <div className={css.WatchTokenIcon}>
          {showImage ? (
            <img
              src={token.iconUrl ?? undefined}
              alt={token.symbol}
              onError={() => setImageFailed(true)}
              className={css.AvatarImg}
            />
          ) : (
            token.symbol.slice(0, 2)
          )}
        </div>
        <Box grow="Yes" style={{ minWidth: 0 }}>
          <span className={css.WatchSymbol}>{token.symbol}</span>
        </Box>
        <button
          type="button"
          className={css.WatchlistStarButton}
          aria-label={`Remove ${token.symbol} from watchlist`}
          onClick={() => onRemove(token.id)}
        >
          {sizedIcon(Star, '50', { weight: 'fill' })}
        </button>
      </Box>
      <span className={css.WatchPrice}>{formatWatchlistPrice(token.priceUsd)}</span>
      {token.change24h !== null && (
        <span className={css.WatchChange} style={{ color: up ? css.mock.green : css.mock.red }}>
          {up ? '+' : ''}
          {token.change24h.toFixed(1)}%
        </span>
      )}
    </Box>
  );
}

/** Design mock ("image 3"): "Watchlist" section under the Discover banner
 *  -- a horizontally scrollable row of small token cards (icon, symbol,
 *  price, 24h change). The default list for every user is Jupiter's 24h
 *  top-trending tokens; the filled star on each card unfavorites it, and
 *  removals persist as account data (WATCHLIST_ACCOUNT_DATA_EVENT) so the
 *  star itself is the manage affordance -- no "Manage" header link. When
 *  the fetch fails or everything is starred off, the section renders
 *  nothing rather than dead chrome. */
export function HomeWatchlist() {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [tokens, setTokens] = useState<WatchlistToken[]>([]);
  const [removed, setRemoved] = useState<string[]>(
    () => mx.getAccountData(WATCHLIST_ACCOUNT_DATA_EVENT)?.getContent().removed ?? []
  );

  useEffect(() => {
    getTrendingTokens().then((list) => {
      if (alive()) setTokens(list);
    });
  }, [alive]);

  const handleRemove = useCallback(
    (id: string) => {
      setRemoved((current) => {
        if (current.includes(id)) return current;
        const next = [...current, id];
        mx.setAccountData(WATCHLIST_ACCOUNT_DATA_EVENT, { removed: next }).catch(() => {
          // The card is already gone locally; a failed persist just means
          // the removal won't survive to the next session.
        });
        return next;
      });
    },
    [mx]
  );

  const visible = tokens.filter((token) => !removed.includes(token.id));
  if (visible.length === 0) return null;

  return (
    <Box direction="Column" gap="200">
      <span className={css.SectionHeader}>Watchlist</span>
      <div className={css.WatchlistRow}>
        {visible.map((token) => (
          <WatchlistTokenCard key={token.id} token={token} onRemove={handleRemove} />
        ))}
      </div>
    </Box>
  );
}
