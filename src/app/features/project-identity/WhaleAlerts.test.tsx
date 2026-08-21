import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { WhaleAlerts } from './WhaleAlerts';
import type { ChainAssetTradesResponse } from '$utils/blockwire/chainAssets';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchChainAssetTrades } = vi.hoisted(() => ({
  fetchChainAssetTrades:
    vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<ChainAssetTradesResponse>>(),
}));

vi.mock('$utils/blockwire/chainAssets', () => ({
  fetchChainAssetTrades,
}));

afterEach(() => {
  vi.clearAllMocks();
});

const baseAsset: ChainAssetTradesResponse['asset'] = {
  id: 7,
  project_id: 42,
  chain: 'solana',
  contract_address: 'Sol1',
  token_symbol: 'TEST',
  token_decimals: 9,
  verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('WhaleAlerts', () => {
  it('renders nothing while still checking (no flash of an empty "Whale Alerts" header)', () => {
    fetchChainAssetTrades.mockReturnValue(new Promise(() => {}));
    const { container } = render(<WhaleAlerts projectId={42} chainAssetId={7} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is genuinely no whale-sized activity right now (the common case)', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 50,
          walletAddress: 'Wallet1111',
          id: 't1',
          occurredAt: null,
        },
      ],
    });
    const { container } = render(
      <WhaleAlerts projectId={42} chainAssetId={7} whaleThreshold={5000} />
    );
    await waitFor(() => expect(fetchChainAssetTrades).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a distinct "not available" message when the provider does not support trades', async () => {
    fetchChainAssetTrades.mockResolvedValue({ asset: baseAsset, trades: [], supported: false });
    render(<WhaleAlerts projectId={42} chainAssetId={7} />);
    expect(await screen.findByText(/whale activity isn't available/i)).toBeInTheDocument();
  });

  it('shows only trades clearing the whale threshold, using wallet shorthand and a factual buy/sell label', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 50,
          walletAddress: 'SmallWallet111',
          id: 'small',
          occurredAt: null,
        },
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 12_345,
          walletAddress: 'BigWhaleWallet11111111111111abcd',
          id: 'whale',
          occurredAt: null,
        },
      ],
    });
    render(<WhaleAlerts projectId={42} chainAssetId={7} whaleThreshold={5000} />);

    expect(await screen.findByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('BigWha…abcd')).toBeInTheDocument();
    expect(screen.getByText('$12.3K')).toBeInTheDocument();
    // The small (non-whale) trade must not appear at all in this surface.
    expect(screen.queryByText('$50.00')).not.toBeInTheDocument();
  });

  it('never uses hype/manipulative language (Bible §15 tone rule)', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 50_000,
          walletAddress: 'Whale1111111111',
          id: 'whale',
          occurredAt: null,
        },
      ],
    });
    render(<WhaleAlerts projectId={42} chainAssetId={7} whaleThreshold={5000} />);
    await screen.findByText('Buy');
    expect(
      screen.queryByText(/buy now|huge alpha|guaranteed|can't miss|trusted|safe|legit/i)
    ).not.toBeInTheDocument();
  });

  it('shows "Unknown wallet" rather than a fabricated address when walletAddress is null', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'sell',
          amountUsd: 8000,
          walletAddress: null,
          id: 'whale',
          occurredAt: null,
        },
      ],
    });
    render(<WhaleAlerts projectId={42} chainAssetId={7} whaleThreshold={5000} />);
    expect(await screen.findByText('Unknown wallet')).toBeInTheDocument();
  });

  it('renders a transaction explorer link for each whale trade', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 10_000,
          walletAddress: 'Whale1',
          id: 'whale-sig',
          occurredAt: null,
        },
      ],
    });
    render(<WhaleAlerts projectId={42} chainAssetId={7} whaleThreshold={5000} />);
    expect(await screen.findByRole('link', { name: /view transaction/i })).toHaveAttribute(
      'href',
      'https://solscan.io/tx/whale-sig'
    );
  });
});
