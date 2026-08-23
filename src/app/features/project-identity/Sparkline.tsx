import { useId } from 'react';
import { color } from 'folds';

export type SparklineProps = {
  /** Chronological price series (oldest first). */
  history: number[];
  width?: number;
  height?: number;
};

/** Tiny dependency-free SVG sparkline: a normalized polyline with a
 *  subtle gradient fill under it. Green when the series ends at or above
 *  where it started, red otherwise (matching the 24h change tone next to
 *  it). Purely presentational -- callers omit it when there is no data. */
export function Sparkline({ history, width = 100, height = 40 }: SparklineProps) {
  const gradientId = useId();
  if (history.length < 2) return null;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min;
  // 2px vertical inset so the stroke never clips at the extremes.
  const inset = 2;
  const usableHeight = height - inset * 2;
  const points = history.map((value, index) => {
    const x = (index / (history.length - 1)) * width;
    const normalized = range === 0 ? 0.5 : (value - min) / range;
    const y = inset + (1 - normalized) * usableHeight;
    return [x, y] as const;
  });
  const polylinePoints = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const first = points[0] ?? [0, height];
  const last = points[points.length - 1] ?? [width, height];
  const areaPath = `M ${first[0].toFixed(2)} ${height} L ${points
    .map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' L ')} L ${last[0].toFixed(2)} ${height} Z`;

  const up = (history[history.length - 1] ?? 0) >= (history[0] ?? 0);
  const tone = up ? color.Success.Main : color.Critical.Main;

  return (
    <svg
      data-testid="price-sparkline"
      data-trend={up ? 'up' : 'down'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone} stopOpacity="0.25" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polylinePoints}
        stroke={tone}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
