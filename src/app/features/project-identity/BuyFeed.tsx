import { useEffect, useState, useCallback } from 'react';
import { Box, Text, color, config } from 'folds';
import { CaretUp, CaretDown, sizedIcon } from '$components/icons/phosphor';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { useInterval } from '$hooks/useInterval';
import { fetchChainAssetTrades, type TradeEvent } from '$utils/blockwire/chainAssets';

function formatUsd(value: number | null): string {
  if (value === null) return '';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

/** UI Bible §14 "Compact" style -- a simple one-line event. Starting point
 *  only: Standard (amounts + tx link) and Celebration (large-purchase
 *  treatment) styles, plus the min-amount/whale-threshold/aggregation/
 *  mute controls the bible also calls for, are explicit follow-up work,
 *  not built here. §15's tone rule applies identically to buys: no
 *  "BUY NOW"/"HUGE ALPHA" language -- this is a plain factual line. */
function TradeRow({ trade }: { trade: TradeEvent }) {
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

export type BuyFeedProps = {
  projectId: number;
  chainAssetId: number;
  pollIntervalMs?: number;
};

/** UI Bible §14 Buy Feed. Polls the trades endpoint and renders one of
 *  three DISTINCT states -- loading, "not available yet" (the honest,
 *  current reality: no configured provider supports per-trade data), and
 *  a real list of trades. These three must never look the same to a
 *  user: "still loading" and "this feature doesn't exist yet" are very
 *  different things to tell someone (Bible §31/§33).
 */
export function BuyFeed({ projectId, chainAssetId, pollIntervalMs = 20_000 }: BuyFeedProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'ready' | 'error'>('loading');
  const [trades, setTrades] = useState<TradeEvent[]>([]);

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

  useInterval(load, pollIntervalMs);

  if (status === 'loading') {
    return (
      <Box
        shrink="No"
        style={{
          height: 20,
          width: '70%',
          borderRadius: config.radii.R300,
          backgroundColor: color.SurfaceVariant.ContainerHover,
        }}
      />
    );
  }

  if (status === 'unsupported') {
    // Honest, not an error: this feature is simply not wired to a live
    // trade-data provider yet for this deployment.
    return (
      <Text size="T200" style={{ color: color.Surface.OnContainer }}>
        Live buy/sell activity isn&apos;t available for this token yet.
      </Text>
    );
  }

  if (status === 'error') {
    return (
      <Text size="T200" style={{ color: color.Surface.OnContainer }}>
        Couldn&apos;t load recent activity. We&apos;ll keep trying.
      </Text>
    );
  }

  if (trades.length === 0) {
    return (
      <Text size="T200" style={{ color: color.Surface.OnContainer }}>
        No recent trades yet.
      </Text>
    );
  }

  return (
    <Box direction="Column" gap="100">
      {trades.map((trade) => (
        <TradeRow key={trade.id} trade={trade} />
      ))}
    </Box>
  );
}
