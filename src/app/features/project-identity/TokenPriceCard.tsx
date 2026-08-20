import { Box, Text, color, config } from 'folds';
import { CaretDown, CaretUp, sizedIcon } from '$components/icons/phosphor';
import type { TokenSnapshot } from '$utils/blockwire/chainAssets';

/** Project Identity Page price display (UI Bible §12, §14).
 *
 *  Deliberately narrow: name, symbol, price, 24h change, liquidity, an
 *  explorer-style provenance line. This is informational display, NOT a
 *  buy alert (that is its own bible-specified surface — §14 — with its
 *  own compact/standard/celebration styles and its own thresholds/mute
 *  controls, not built here).
 *
 *  §43 (accessibility): up/down is never color-only — an arrow icon carries
 *  the same information a colorblind user, or someone in a
 *  reduced-motion/high-contrast mode, still needs to read at a glance.
 *  §15 (whale alerts) and §14 both apply the same "information, not
 *  investment promise" tone here: no "TO THE MOON", no urgency language,
 *  just the numbers.
 */

function formatUsd(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  // Sub-$1 tokens routinely need more precision than 2dp to be
  // distinguishable at all (e.g. $0.0000041 vs $0.0000039).
  return `$${value.toPrecision(3)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

type PriceChangeProps = { value: number | null; label: string };

function PriceChange({ value, label }: PriceChangeProps) {
  const isUp = value !== null && value > 0;
  const isDown = value !== null && value < 0;
  const tone = isUp ? color.Success.Main : isDown ? color.Critical.Main : color.Surface.OnContainer;

  return (
    <Box direction="Column" gap="100" alignItems="Center">
      <Text size="L400" style={{ color: color.Surface.OnContainer }}>
        {label}
      </Text>
      <Box alignItems="Center" gap="100">
        {isUp && sizedIcon(CaretUp, '50', { style: { color: tone } })}
        {isDown && sizedIcon(CaretDown, '50', { style: { color: tone } })}
        <Text size="T300" style={{ color: tone }}>
          <b>{formatPercent(value)}</b>
        </Text>
      </Box>
    </Box>
  );
}

export type TokenPriceCardProps = {
  snapshot: TokenSnapshot | null;
  /** Distinguishes "still loading" from "checked, and there is genuinely
   *  no trading data yet" (UI Bible §31/§33: an empty state and an error
   *  state must never look identical, or the user can't tell whether to
   *  wait or give up). */
  status: 'loading' | 'ready' | 'no-data' | 'error';
  errorMessage?: string;
};

export function TokenPriceCard({ snapshot, status, errorMessage }: TokenPriceCardProps) {
  if (status === 'loading') {
    // §32: skeleton for content-heavy screens, not a full-screen blank.
    return (
      <Box
        direction="Column"
        gap="300"
        style={{
          padding: config.space.S400,
          borderRadius: config.radii.R400,
          backgroundColor: color.SurfaceVariant.Container,
        }}
      >
        <Box
          shrink="No"
          style={{
            height: 20,
            width: '40%',
            borderRadius: config.radii.R300,
            backgroundColor: color.SurfaceVariant.ContainerHover,
          }}
        />
        <Box
          shrink="No"
          style={{
            height: 32,
            width: '60%',
            borderRadius: config.radii.R300,
            backgroundColor: color.SurfaceVariant.ContainerHover,
          }}
        />
      </Box>
    );
  }

  if (status === 'error') {
    // §33: explain what happened and whether the app will recover — never
    // surface the raw upstream error (rate-limit codes, network errors).
    return (
      <Box
        direction="Column"
        gap="200"
        style={{
          padding: config.space.S400,
          borderRadius: config.radii.R400,
          backgroundColor: color.SurfaceVariant.Container,
        }}
      >
        <Text size="T300" style={{ color: color.Surface.OnContainer }}>
          Couldn&apos;t load live price data. We&apos;ll keep trying.
        </Text>
        {errorMessage && (
          <Text size="T200" style={{ color: color.Surface.OnContainer }}>
            {errorMessage}
          </Text>
        )}
      </Box>
    );
  }

  if (status === 'no-data' || !snapshot) {
    // §31: explain what happens next, not a bare "No data."
    return (
      <Box
        direction="Column"
        gap="100"
        style={{
          padding: config.space.S400,
          borderRadius: config.radii.R400,
          backgroundColor: color.SurfaceVariant.Container,
        }}
      >
        <Text size="T300" style={{ color: color.Surface.OnContainer }}>
          No trading activity yet.
        </Text>
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Price and volume will appear here once this token starts trading.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      direction="Column"
      gap="300"
      style={{
        padding: config.space.S400,
        borderRadius: config.radii.R400,
        backgroundColor: color.SurfaceVariant.Container,
      }}
    >
      <Box justifyContent="SpaceBetween" alignItems="Center">
        <Box direction="Column" gap="100">
          <Text size="L400" style={{ color: color.Surface.OnContainer }}>
            {snapshot.symbol ?? 'Token'}
          </Text>
          <Text size="H3">{formatUsd(snapshot.priceUsd)}</Text>
        </Box>
        <PriceChange value={snapshot.priceChangePercent.h24} label="24h" />
      </Box>

      <Box gap="500">
        <Box direction="Column" gap="100">
          <Text size="L400" style={{ color: color.Surface.OnContainer }}>
            24h Volume
          </Text>
          <Text size="T300">{formatUsd(snapshot.volumeUsd24h)}</Text>
        </Box>
        <Box direction="Column" gap="100">
          <Text size="L400" style={{ color: color.Surface.OnContainer }}>
            Liquidity
          </Text>
          <Text size="T300">{formatUsd(snapshot.liquidityUsd)}</Text>
        </Box>
      </Box>

      {snapshot.dexId && (
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          via {snapshot.dexId}
        </Text>
      )}
    </Box>
  );
}
