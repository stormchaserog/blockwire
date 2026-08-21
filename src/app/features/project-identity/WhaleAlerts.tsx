import { useEffect, useState, useCallback } from 'react';
import { Box, Text, IconButton, color, config } from 'folds';
import { ArrowSquareOut, sizedIcon } from '$components/icons/phosphor';
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

/** UI Bible §15: "Wallet shorthand" -- a truncated address, never the
 *  full string, matching ContractAddressBadge's own truncation
 *  convention exactly (first 6 / last 4 characters) so the same visual
 *  language means the same thing everywhere in the app. */
function walletShorthand(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export type WhaleAlertsProps = {
  projectId: number;
  chainAssetId: number;
  /** UI Bible §15: "Project-defined whale classification" -- the
   *  threshold is a property of THIS project's own configuration, passed
   *  in by the caller rather than hard-coded, so different projects can
   *  reasonably define "whale" differently (a $500K liquidity memecoin's
   *  whale bar is not a $50M-liquidity token's). Defaults to $5,000,
   *  matching BuyFeed's own default whale-threshold Chip option so the
   *  two surfaces agree absent an explicit project setting. */
  whaleThreshold?: number;
  pollIntervalMs?: number;
};

/** UI Bible §15 Whale Alerts -- a DISTINCT surface from the Buy Feed
 *  (§14), not a filtered view rendered by the same component: "Whale
 *  activity is an informational signal," shown as its own section with
 *  its own framing, separate from the general buy/sell feed.
 *
 *  Shows ONLY buys and sells that clear the whale threshold. Explicitly
 *  factual tone per §15's own rule ("Avoid manipulative language such as
 *  BUY NOW, GUARANTEED, HUGE ALPHA, CAN'T MISS -- BlockWire provides
 *  information, not investment promises") -- every line here is: wallet
 *  shorthand, buy-or-sell (not "BUY NOW"), an approximate dollar value,
 *  a real explorer link, nothing more.
 *
 *  Shares the SAME honest three-state model as BuyFeed (loading /
 *  unsupported / ready) for the identical underlying reason: no
 *  configured provider means no real whale data exists to show, and
 *  that must never be silently indistinguishable from "no whales
 *  trading right now."
 */
export function WhaleAlerts({
  projectId,
  chainAssetId,
  whaleThreshold = 5000,
  pollIntervalMs = 20_000,
}: WhaleAlertsProps) {
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

  const whales = trades.filter((t) => t.amountUsd !== null && t.amountUsd >= whaleThreshold);

  // Bible §3/§8 progressive disclosure, applied here too: while still
  // checking, render nothing rather than a flash of an empty section --
  // most tokens will have zero whale activity most of the time, and a
  // permanent "Whale Alerts" header with nothing under it would be noise.
  if (status === 'loading') return null;

  if (status === 'unsupported') {
    return (
      <Box direction="Column" gap="100">
        <Text size="L400" style={{ color: color.Surface.OnContainer }}>
          Whale Alerts
        </Text>
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Whale activity isn&apos;t available for this token yet.
        </Text>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box direction="Column" gap="100">
        <Text size="L400" style={{ color: color.Surface.OnContainer }}>
          Whale Alerts
        </Text>
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Couldn&apos;t load whale activity. We&apos;ll keep trying.
        </Text>
      </Box>
    );
  }

  // Ready, but genuinely no whale-sized trades right now -- render
  // nothing at all rather than an empty "Whale Alerts" section. Unlike
  // the unsupported/error states (which are worth explaining), "no
  // whales today" is a completely unremarkable, expected outcome for
  // most tokens most of the time and doesn't need its own message.
  if (whales.length === 0) return null;

  return (
    <Box direction="Column" gap="200">
      <Text size="L400" style={{ color: color.Surface.OnContainer }}>
        Whale Alerts
      </Text>
      <Box direction="Column" gap="100">
        {whales.map((trade) => {
          const tone = trade.side === 'buy' ? color.Success.Main : color.Critical.Main;
          const explorerUrl = getTransactionExplorerUrl(trade.chain, trade.id);
          return (
            <Box
              key={trade.id}
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
                <Text
                  size="T300"
                  style={{ fontFamily: 'monospace', color: color.Surface.OnContainer }}
                >
                  {trade.walletAddress ? walletShorthand(trade.walletAddress) : 'Unknown wallet'}
                </Text>
                <Text size="T300" style={{ color: tone }}>
                  {trade.side === 'buy' ? 'Buy' : 'Sell'}
                </Text>
                <Text size="T300" style={{ color: color.Surface.OnContainer }}>
                  {formatUsd(trade.amountUsd)}
                </Text>
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
        })}
      </Box>
    </Box>
  );
}
