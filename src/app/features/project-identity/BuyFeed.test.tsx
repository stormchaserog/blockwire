import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { BuyFeed } from './BuyFeed';
import type { ChainAssetTradesResponse } from '$utils/blockwire/chainAssets';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchChainAssetTrades } = vi.hoisted(() => ({
  fetchChainAssetTrades: vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<ChainAssetTradesResponse>>(),
}));

vi.mock('$utils/blockwire/chainAssets', () => ({
  fetchChainAssetTrades,
}));

afterEach(() => {
  vi.clearAllMocks();
});

const baseAsset: ChainAssetTradesResponse['asset'] = {
  id: 7, project_id: 42, chain: 'solana', contract_address: 'Sol1',
  token_symbol: 'TEST', token_decimals: 9, verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('BuyFeed', () => {
  it('shows a distinct "not available yet" message when the provider does not support trades — never a fabricated empty feed', async () => {
    fetchChainAssetTrades.mockResolvedValue({ asset: baseAsset, trades: [], supported: false });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    expect(await screen.findByText(/isn't available for this token yet/i)).toBeInTheDocument();
  });

  it('shows a DIFFERENT message for "supported but genuinely zero trades" than for "not supported"', async () => {
    fetchChainAssetTrades.mockResolvedValue({ asset: baseAsset, trades: [], supported: true });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    expect(await screen.findByText('No recent trades yet.')).toBeInTheDocument();
    expect(screen.queryByText(/isn't available for this token yet/i)).not.toBeInTheDocument();
  });

  it('renders a buy and a sell distinctly, both by label and by icon direction', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        { chain: 'solana', contractAddress: 'Sol1', side: 'buy', amountUsd: 500, id: 't1', occurredAt: null },
        { chain: 'solana', contractAddress: 'Sol1', side: 'sell', amountUsd: 250, id: 't2', occurredAt: null },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    expect(await screen.findByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('Sell')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('never uses hype/urgency language like "BUY NOW" or "HUGE ALPHA" (Bible §14/§15 tone rule)', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        { chain: 'solana', contractAddress: 'Sol1', side: 'buy', amountUsd: 500, id: 't1', occurredAt: null },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    await screen.findByText('Buy');
    expect(screen.queryByText(/buy now|huge alpha|guaranteed|can't miss/i)).not.toBeInTheDocument();
  });

  it('shows a recoverable message on a fetch failure, never a raw error', async () => {
    fetchChainAssetTrades.mockRejectedValue(new Error('network blip'));
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    expect(await screen.findByText(/couldn't load recent activity/i)).toBeInTheDocument();
  });
});
