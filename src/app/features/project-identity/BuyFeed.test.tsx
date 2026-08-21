import { render, screen, fireEvent } from '@testing-library/react';
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
  fetchChainAssetTrades:
    vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<ChainAssetTradesResponse>>(),
}));

vi.mock('$utils/blockwire/chainAssets', () => ({
  fetchChainAssetTrades,
}));

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 500,
          walletAddress: null,
          id: 't1',
          occurredAt: null,
        },
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'sell',
          amountUsd: 250,
          walletAddress: null,
          id: 't2',
          occurredAt: null,
        },
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
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 500,
          walletAddress: null,
          id: 't1',
          occurredAt: null,
        },
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

  it('mutes on click, stops fetching further, and offers a distinct unmute control', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 500,
          walletAddress: null,
          id: 't1',
          occurredAt: null,
        },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    await screen.findByText('Buy');

    fireEvent.click(screen.getByRole('button', { name: /^mute$/i }));
    expect(await screen.findByText(/muted for you/i)).toBeInTheDocument();
    expect(screen.queryByText('Buy')).not.toBeInTheDocument();

    // Unmuting resumes polling on the normal interval (not an immediate
    // forced refetch) and, crucially, immediately shows the trades already
    // held in state rather than blanking back to a loading skeleton --
    // muting/unmuting is a display toggle over data that's still fresh,
    // not a full remount.
    fireEvent.click(screen.getByRole('button', { name: /^unmute$/i }));
    expect(await screen.findByText('Buy')).toBeInTheDocument();
  });

  it('persists mute across remounts (per-device preference, not just component state)', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 500,
          walletAddress: null,
          id: 't1',
          occurredAt: null,
        },
      ],
    });
    const { unmount } = render(<BuyFeed projectId={42} chainAssetId={7} />);
    await screen.findByText('Buy');
    fireEvent.click(screen.getByRole('button', { name: /^mute$/i }));
    await screen.findByText(/muted for you/i);
    unmount();

    render(<BuyFeed projectId={42} chainAssetId={7} />);
    expect(await screen.findByText(/muted for you/i)).toBeInTheDocument();
  });

  it('a min-amount filter hides trades below the threshold without hiding trades of unknown amount', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 50,
          walletAddress: null,
          id: 'small',
          occurredAt: null,
        },
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 5000,
          walletAddress: null,
          id: 'big',
          occurredAt: null,
        },
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: null,
          walletAddress: null,
          id: 'unknown',
          occurredAt: null,
        },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    await screen.findByText('$5.0K');

    // Open controls, select the $1,000 minimum.
    fireEvent.click(screen.getByRole('button', { name: /buy feed settings/i }));
    fireEvent.click(screen.getByText('Min $1.0K'));

    // The $50 trade disappears; the $5,000 and unknown-amount trades stay.
    expect(screen.queryByText('$50.00')).not.toBeInTheDocument();
    expect(screen.getByText('$5.0K')).toBeInTheDocument();
    expect(screen.getAllByText('Buy')).toHaveLength(2); // $5,000 + unknown-amount
  });

  it('Standard style renders a transaction explorer link, Compact does not', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 500,
          walletAddress: null,
          id: 'txsig123',
          occurredAt: null,
        },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} defaultStyle="Standard" />);
    expect(await screen.findByRole('link', { name: /view transaction/i })).toHaveAttribute(
      'href',
      'https://solscan.io/tx/txsig123'
    );
  });

  it('Celebration style only applies its treatment to a BUY that clears the whale threshold, never a sell', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: 10_000,
          walletAddress: null,
          id: 'whale-buy',
          occurredAt: null,
        },
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'sell',
          amountUsd: 10_000,
          walletAddress: null,
          id: 'whale-sell',
          occurredAt: null,
        },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} defaultStyle="Celebration" />);
    await screen.findAllByText('$10.0K');

    // Both trades show plain "Buy"/"Sell" text; the whale BUY additionally
    // gets the celebration container background+border, but a SELL never
    // does regardless of size -- assert on the container structure rather
    // than a semantic heading role folds' Text component doesn't actually
    // map size to (confirmed: size="H4" renders a <p>, not an <h4>).
    const buyLabel = screen.getAllByText('Buy')[0]!;
    const sellLabel = screen.getByText('Sell');
    const buyContainer = buyLabel.closest('[style*="border: 1px"]');
    const sellContainer = sellLabel.closest('[style*="border: 1px"]');
    expect(buyContainer).not.toBeNull();
    expect(sellContainer).toBeNull();
  });

  it('shows wallet shorthand instead of nothing when amountUsd is unknown but a wallet is known -- real screenshot QA found a wall of bare Buy/Sell text was unhelpful for a high-volume token with no per-trade USD data', async () => {
    fetchChainAssetTrades.mockResolvedValue({
      asset: baseAsset,
      supported: true,
      trades: [
        {
          chain: 'solana',
          contractAddress: 'Sol1',
          side: 'buy',
          amountUsd: null,
          walletAddress: 'EQbcrkr7nxkVVpFe3Knh9yMq5AmSyEEwhcYo19mSFXCw',
          id: 'no-amount',
          occurredAt: null,
        },
      ],
    });
    render(<BuyFeed projectId={42} chainAssetId={7} />);
    expect(await screen.findByText('EQbcrk\u2026FXCw')).toBeInTheDocument();
  });
});
