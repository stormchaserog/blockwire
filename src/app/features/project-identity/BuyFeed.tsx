import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Text, IconButton, Chip, color, config } from 'folds';
import {
  CaretUp,
  CaretDown,
  Bell,
  BellSlash,
  ArrowSquareOut,
  sizedIcon,
} from '$components/icons/phosphor';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { useInterval } from '$hooks/useInterval';
import { fetchChainAssetTrades, type TradeEvent } from '$utils/blockwire/chainAssets';
import { getTransactionExplorerUrl } from '$utils/blockwire/chainExplorers';

function formatUsd(value: number | null): string {
  if (value === null) return '';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

/** UI Bible §14 controls: "Minimum amount, Whale threshold... Mute."
 *  Persisted per project+chain-asset in localStorage, matching the plain
 *  localStorage.getItem/setItem pattern already used throughout this
 *  codebase (see General.tsx's Sentry toggle) rather than inventing a new
 *  settings-storage abstraction for one feature.
 *
 *  Deliberately client-side-only, per-device preferences -- not
 *  server-synced project configuration. A founder configuring "whale
 *  threshold for MY view of the feed" is a personal viewing preference,
 *  not a project-wide setting other members should inherit (that would
 *  need a real project-settings API this phase doesn't build). */
const MIN_AMOUNT_KEY_PREFIX = 'blockwire_buyfeed_min_amount_';
const WHALE_THRESHOLD_KEY_PREFIX = 'blockwire_buyfeed_whale_threshold_';
const MUTED_KEY_PREFIX = 'blockwire_buyfeed_muted_';

/** Amounts with no known USD value (amountUsd === null -- true for every
 *  Helius-sourced trade today, see chain-adapter.ts's HeliusTradeProvider
 *  doc) can never be filtered by a USD threshold. They're always shown --
 *  hiding a real trade because its amount is unknown would be worse than
 *  showing it without a dollar figure, and is NOT the same as it being
 *  genuinely below the threshold. */
function passesMinAmount(trade: TradeEvent, minAmount: number): boolean {
  if (trade.amountUsd === null) return true;
  return trade.amountUsd >= minAmount;
}

function isWhale(trade: TradeEvent, whaleThreshold: number): boolean {
  return trade.amountUsd !== null && trade.amountUsd >= whaleThreshold;
}

export type BuyFeedStyle = 'Compact' | 'Standard' | 'Celebration';

/** UI Bible §14 "Compact" -- a single line, no tx link, no visual weight. */
function CompactTradeRow({ trade }: { trade: TradeEvent }) {
  const isBuy = trade.side === 'buy';
  const tone = isBuy ? color.Success.Main : color.Critical.Main;

  return (
    <Box alignItems="Center" gap="200">
      {isBuy
        ? sizedIcon(CaretUp, '50', { style: { color: tone } })
        : sizedIcon(CaretDown, '50', { style: { color: tone } })}
      <Text size="T300" style={{ color: tone }}>
        {isBuy ? 'Buy' : 'Sell'}
      </Text>
      {trade.amountUsd !== null && (
        <Text size="T300" style={{ color: color.Surface.OnContainer }}>
          {formatUsd(trade.amountUsd)}
        </Text>
      )}
    </Box>
  );
}

/** UI Bible §14 "Standard" -- "Purchase amount, Token amount, USD/native
 *  value, Transaction link." Token amount and native value are not part
 *  of TradeEvent's normalized shape yet (see chain-adapter.ts -- only
 *  amountUsd exists today), so this renders what's actually available
 *  (side, USD amount, tx link) rather than fabricating fields the wire
 *  contract doesn't carry. */
function StandardTradeRow({ trade }: { trade: TradeEvent }) {
  const isBuy = trade.side === 'buy';
  const tone = isBuy ? color.Success.Main : color.Critical.Main;
  const explorerUrl = getTransactionExplorerUrl(trade.chain, trade.id);

  return (
    <Box
      alignItems="Center"
      justifyContent="SpaceBetween"
      gap="200"
      style={{
        padding: `${config.space.S200} ${config.space.S300}`,
        borderRadius: config.radii.R300,
        backgroundColor: color.SurfaceVariant.Container,
      }}
    >
      <Box alignItems="Center" gap="200">
        {isBuy
          ? sizedIcon(CaretUp, '100', { style: { color: tone } })
          : sizedIcon(CaretDown, '100', { style: { color: tone } })}
        <Text size="T300" style={{ color: tone }}>
          {isBuy ? 'Buy' : 'Sell'}
        </Text>
        {trade.amountUsd !== null && (
          <Text size="T300" style={{ color: color.Surface.OnContainer }}>
            {formatUsd(trade.amountUsd)}
          </Text>
        )}
      </Box>
      {explorerUrl && (
        <IconButton
          size="300"
          variant="Background"
          radii="300"
          as="a"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View transaction"
        >
          {sizedIcon(ArrowSquareOut, '50')}
        </IconButton>
      )}
    </Box>
  );
}

/** UI Bible §14 "Celebration" -- "Optional project-branded treatment for
 *  significant purchases." Only ever applied to a BUY that clears the
 *  whale threshold -- a large SELL gets the plain Standard treatment,
 *  never a celebratory one (celebrating a large sell would be actively
 *  misleading). Explicitly avoids §15's banned manipulative language
 *  ("BUY NOW," "HUGE ALPHA," etc.) -- the visual weight is the
 *  celebration; the copy stays factual. */
function CelebrationTradeRow({ trade }: { trade: TradeEvent }) {
  const explorerUrl = getTransactionExplorerUrl(trade.chain, trade.id);

  return (
    <Box
      direction="Column"
      gap="100"
      style={{
        padding: config.space.S300,
        borderRadius: config.radii.R400,
        backgroundColor: color.Success.Container,
        border: `1px solid ${color.Success.Main}`,
      }}
    >
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Box alignItems="Center" gap="200">
          {sizedIcon(CaretUp, '200', { style: { color: color.Success.Main } })}
          <Text size="H4" style={{ color: color.Success.OnContainer }}>
            Buy
          </Text>
        </Box>
        {trade.amountUsd !== null && (
          <Text size="H4" style={{ color: color.Success.OnContainer }}>
            {formatUsd(trade.amountUsd)}
          </Text>
        )}
      </Box>
      {explorerUrl && (
        <Text
          as="a"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          size="T200"
          style={{ color: color.Success.OnContainer }}
        >
          View transaction
        </Text>
      )}
    </Box>
  );
}

function TradeRow({
  trade,
  style,
  whaleThreshold,
}: {
  trade: TradeEvent;
  style: BuyFeedStyle;
  whaleThreshold: number;
}) {
  if (style === 'Celebration' && trade.side === 'buy' && isWhale(trade, whaleThreshold)) {
    return <CelebrationTradeRow trade={trade} />;
  }
  if (style === 'Standard' || style === 'Celebration') {
    return <StandardTradeRow trade={trade} />;
  }
  return <CompactTradeRow trade={trade} />;
}

export type BuyFeedProps = {
  projectId: number;
  chainAssetId: number;
  pollIntervalMs?: number;
  /** Defaults to 'Compact' -- the lowest-visual-weight option, matching
   *  the prior behavior of this component exactly for any caller that
   *  doesn't opt into something louder. */
  defaultStyle?: BuyFeedStyle;
};

/** UI Bible §14 Buy Feed. Polls the trades endpoint and renders one of
 *  three DISTINCT states -- loading, "not available yet" (the honest,
 *  current reality: no configured provider supports per-trade data), and
 *  a real list of trades. These three must never look the same to a
 *  user: "still loading" and "this feature doesn't exist yet" are very
 *  different things to tell someone (Bible §31/§33).
 *
 *  Also implements the bible's required controls -- minimum amount,
 *  whale threshold, mute -- as a small Chip toolbar, and the three
 *  display styles (Compact/Standard/Celebration). "High-volume tokens
 *  must aggregate or rate-limit alerts" is intentionally NOT built here:
 *  this is a poll-and-render feed, not a push-alert system, so there is
 *  no notification volume to rate-limit yet -- true alert aggregation
 *  belongs with a future push/notification delivery mechanism, not this
 *  polling display component, and is tracked as such rather than faked
 *  with an arbitrary row-count cap.
 */
export function BuyFeed({
  projectId,
  chainAssetId,
  pollIntervalMs = 20_000,
  defaultStyle = 'Compact',
}: BuyFeedProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'ready' | 'error'>('loading');
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [style, setStyle] = useState<BuyFeedStyle>(defaultStyle);
  const [showControls, setShowControls] = useState(false);

  const storageKey = `${projectId}_${chainAssetId}`;
  const [minAmount, setMinAmount] = useState(() => {
    const raw = localStorage.getItem(`${MIN_AMOUNT_KEY_PREFIX}${storageKey}`);
    return raw ? Number(raw) : 0;
  });
  const [whaleThreshold, setWhaleThreshold] = useState(() => {
    const raw = localStorage.getItem(`${WHALE_THRESHOLD_KEY_PREFIX}${storageKey}`);
    return raw ? Number(raw) : 5000;
  });
  const [muted, setMuted] = useState(
    () => localStorage.getItem(`${MUTED_KEY_PREFIX}${storageKey}`) === 'true'
  );

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(`${MUTED_KEY_PREFIX}${storageKey}`, String(next));
      return next;
    });
  }, [storageKey]);

  const load = useCallback(async () => {
    try {
      const result = await fetchChainAssetTrades(mx, projectId, chainAssetId);
      if (!alive()) return;
      if (!result.supported) {
        setStatus('unsupported');
        return;
      }
      setTrades(result.trades);
      setStatus('ready');
    } catch {
      if (!alive()) return;
      setStatus((prev) => (prev === 'ready' ? prev : 'error'));
    }
  }, [mx, projectId, chainAssetId, alive]);

  useEffect(() => {
    setStatus('loading');
    setTrades([]);
    void load();
  }, [load]);

  // Muted: no polling at all (negative ms tells useInterval to stop), not
  // just a hidden render -- respects the bible's control as an actual
  // "stop bothering me," not a cosmetic one.
  useInterval(load, muted ? -1 : pollIntervalMs);

  const visibleTrades = useMemo(
    () => trades.filter((t) => passesMinAmount(t, minAmount)),
    [trades, minAmount]
  );

  if (muted) {
    return (
      <Box alignItems="Center" gap="200">
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Buy/sell activity is muted for you.
        </Text>
        <IconButton
          size="300"
          variant="Background"
          radii="300"
          onClick={toggleMuted}
          aria-label="Unmute"
        >
          {sizedIcon(Bell, '100')}
        </IconButton>
      </Box>
    );
  }

  return (
    <Box direction="Column" gap="200">
      <Box alignItems="Center" gap="100">
        <IconButton
          size="300"
          variant={showControls ? 'Primary' : 'Background'}
          radii="300"
          onClick={() => setShowControls((v) => !v)}
          aria-label="Buy feed settings"
          aria-pressed={showControls}
        >
          <Text size="T200">⋯</Text>
        </IconButton>
        <IconButton
          size="300"
          variant="Background"
          radii="300"
          onClick={toggleMuted}
          aria-label="Mute"
        >
          {sizedIcon(BellSlash, '100')}
        </IconButton>
      </Box>

      {showControls && (
        <Box gap="100" style={{ flexWrap: 'wrap' }}>
          {[0, 100, 500, 1000].map((amount) => (
            <Chip
              key={amount}
              variant={minAmount === amount ? 'Primary' : 'Secondary'}
              radii="Pill"
              onClick={() => {
                setMinAmount(amount);
                localStorage.setItem(`${MIN_AMOUNT_KEY_PREFIX}${storageKey}`, String(amount));
              }}
            >
              <Text size="T200">{amount === 0 ? 'All' : `Min ${formatUsd(amount)}`}</Text>
            </Chip>
          ))}
          {(['Compact', 'Standard', 'Celebration'] as const).map((s) => (
            <Chip
              key={s}
              variant={style === s ? 'Primary' : 'Secondary'}
              radii="Pill"
              onClick={() => setStyle(s)}
            >
              <Text size="T200">{s}</Text>
            </Chip>
          ))}
          {[1000, 5000, 25000].map((threshold) => (
            <Chip
              key={threshold}
              variant={whaleThreshold === threshold ? 'Primary' : 'Secondary'}
              radii="Pill"
              onClick={() => {
                setWhaleThreshold(threshold);
                localStorage.setItem(
                  `${WHALE_THRESHOLD_KEY_PREFIX}${storageKey}`,
                  String(threshold)
                );
              }}
            >
              <Text size="T200">Whale {formatUsd(threshold)}+</Text>
            </Chip>
          ))}
        </Box>
      )}

      {status === 'loading' && (
        <Box
          shrink="No"
          style={{
            height: 20,
            width: '70%',
            borderRadius: config.radii.R300,
            backgroundColor: color.SurfaceVariant.ContainerHover,
          }}
        />
      )}

      {status === 'unsupported' && (
        // Honest, not an error: this feature is simply not wired to a live
        // trade-data provider yet for this deployment.
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Live buy/sell activity isn&apos;t available for this token yet.
        </Text>
      )}

      {status === 'error' && (
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Couldn&apos;t load recent activity. We&apos;ll keep trying.
        </Text>
      )}

      {status === 'ready' && visibleTrades.length === 0 && (
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          {trades.length === 0
            ? 'No recent trades yet.'
            : 'No trades above your minimum amount yet.'}
        </Text>
      )}

      {status === 'ready' && visibleTrades.length > 0 && (
        <Box direction="Column" gap="100">
          {visibleTrades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} style={style} whaleThreshold={whaleThreshold} />
          ))}
        </Box>
      )}
    </Box>
  );
}
