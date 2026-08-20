import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TokenPriceCard } from './TokenPriceCard';
import type { TokenSnapshot } from '$utils/blockwire/chainAssets';

function makeSnapshot(overrides: Partial<TokenSnapshot> = {}): TokenSnapshot {
  return {
    chain: 'solana',
    contractAddress: 'FakeAddr111',
    name: 'Fake Token',
    symbol: 'FAKE',
    priceUsd: 1.23,
    priceChangePercent: { m5: 0, h1: 0, h6: 0, h24: 5.5 },
    volumeUsd24h: 50_000,
    liquidityUsd: 250_000,
    pairAddress: 'Pair1',
    dexId: 'raydium',
    imageUrl: null,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('TokenPriceCard', () => {
  it('shows the symbol, formatted price, and dex provenance when ready', () => {
    render(<TokenPriceCard snapshot={makeSnapshot()} status="ready" />);
    expect(screen.getByText('FAKE')).toBeInTheDocument();
    expect(screen.getByText('$1.23')).toBeInTheDocument();
    expect(screen.getByText(/via raydium/i)).toBeInTheDocument();
  });

  it('renders a positive 24h change with a plus sign, not just the raw number', () => {
    render(<TokenPriceCard snapshot={makeSnapshot({ priceChangePercent: { m5: 0, h1: 0, h6: 0, h24: 12.5 } })} status="ready" />);
    expect(screen.getByText('+12.50%')).toBeInTheDocument();
  });

  it('renders a negative 24h change with its own minus sign (toFixed already includes it)', () => {
    render(<TokenPriceCard snapshot={makeSnapshot({ priceChangePercent: { m5: 0, h1: 0, h6: 0, h24: -8.25 } })} status="ready" />);
    expect(screen.getByText('-8.25%')).toBeInTheDocument();
  });

  it('shows a distinct, actionable empty state rather than a bare "no data"', () => {
    render(<TokenPriceCard snapshot={null} status="no-data" />);
    expect(screen.getByText(/no trading activity yet/i)).toBeInTheDocument();
    expect(screen.getByText(/will appear here once/i)).toBeInTheDocument();
  });

  it('shows a recoverable error message, never the raw error detail, when errorMessage is omitted', () => {
    render(<TokenPriceCard snapshot={null} status="error" />);
    expect(screen.getByText(/we'll keep trying/i)).toBeInTheDocument();
  });

  it('does not render the price content while loading (skeleton only)', () => {
    render(<TokenPriceCard snapshot={null} status="loading" />);
    expect(screen.queryByText('FAKE')).not.toBeInTheDocument();
    expect(screen.queryByText(/no trading activity/i)).not.toBeInTheDocument();
  });

  it('formats sub-dollar prices with enough precision to be distinguishable', () => {
    render(<TokenPriceCard snapshot={makeSnapshot({ priceUsd: 0.0000041 })} status="ready" />);
    expect(screen.getByText('$0.00000410')).toBeInTheDocument();
  });

  it('abbreviates large volume/liquidity figures (K/M) rather than printing every digit', () => {
    render(<TokenPriceCard snapshot={makeSnapshot({ volumeUsd24h: 4_200_000, liquidityUsd: 15_500 })} status="ready" />);
    expect(screen.getByText('$4.20M')).toBeInTheDocument();
    expect(screen.getByText('$15.5K')).toBeInTheDocument();
  });
});
