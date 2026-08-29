import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  HomeWatchlist,
  WATCHLIST_ACCOUNT_DATA_EVENT,
  clearTrendingCacheForTesting,
} from './HomeWatchlist';

const { getAccountDataMock, setAccountDataMock } = vi.hoisted(() => ({
  getAccountDataMock: vi.fn<(type: string) => { getContent: () => unknown } | undefined>(
    () => undefined
  ),
  setAccountDataMock: vi.fn<(type: string, content: unknown) => Promise<unknown>>(async () => ({})),
}));

const mockMatrixClient = {
  getAccountData: getAccountDataMock,
  setAccountData: setAccountDataMock,
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const stableAlive = () => true;
vi.mock('$hooks/useAlive', () => ({
  useAlive: () => stableAlive,
}));

/** Jupiter toptrending entries in the live API's shape. */
const trendingBody = [
  {
    id: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Wrapped SOL',
    icon: 'https://example.test/sol.png',
    usdPrice: 152.351,
    stats24h: { priceChange: 3.21 },
  },
  {
    id: 'mint-bonk',
    symbol: 'Bonk',
    name: 'Bonk',
    icon: 'https://example.test/bonk.png',
    usdPrice: 0.0048264,
    stats24h: { priceChange: -7.8 },
  },
  {
    id: 'mint-noicon',
    symbol: 'NOPIC',
    name: 'No Icon Token',
    icon: null,
    usdPrice: 1.5,
    stats24h: {},
  },
];

const fetchMock = vi.fn<typeof fetch>(
  async () => ({ ok: true, json: async () => trendingBody }) as Response
);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearTrendingCacheForTesting();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  getAccountDataMock.mockReturnValue(undefined);
});

describe('HomeWatchlist', () => {
  it('renders a card per trending token: symbol, tiered price, signed 24h change', async () => {
    render(<HomeWatchlist />);

    await waitFor(() => expect(screen.getByText('SOL')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      'https://lite-api.jup.ag/tokens/v2/toptrending/24h?limit=10'
    );
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    // Price tiers: dollars → 2dp, sub-cent → 6dp.
    expect(screen.getByText('$152.35')).toBeInTheDocument();
    expect(screen.getByText('$0.004826')).toBeInTheDocument();
    // Signed change, symbol uppercased.
    expect(screen.getByText('+3.2%')).toBeInTheDocument();
    expect(screen.getByText('-7.8%')).toBeInTheDocument();
    expect(screen.getByText('BONK')).toBeInTheDocument();
    // No icon URL → initials fallback, no change → fragment omitted.
    expect(screen.getByText('NO')).toBeInTheDocument();
    expect(screen.getByText('NOPIC')).toBeInTheDocument();
  });

  it('has no Manage link -- the star is the manage affordance', async () => {
    render(<HomeWatchlist />);
    await waitFor(() => expect(screen.getByText('SOL')).toBeInTheDocument());
    expect(screen.queryByText('Manage')).not.toBeInTheDocument();
  });

  it('star-tap removes the card and persists the removal as account data', async () => {
    render(<HomeWatchlist />);
    await waitFor(() => expect(screen.getByText('SOL')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Remove SOL from watchlist' }));

    expect(screen.queryByText('SOL')).not.toBeInTheDocument();
    expect(screen.getByText('BONK')).toBeInTheDocument();
    expect(setAccountDataMock).toHaveBeenCalledWith(WATCHLIST_ACCOUNT_DATA_EVENT, {
      removed: ['So11111111111111111111111111111111111111112'],
    });
  });

  it('filters out mints already removed in account data on mount', async () => {
    getAccountDataMock.mockReturnValue({
      getContent: () => ({ removed: ['mint-bonk'] }),
    });

    render(<HomeWatchlist />);

    await waitFor(() => expect(screen.getByText('SOL')).toBeInTheDocument());
    expect(screen.queryByText('BONK')).not.toBeInTheDocument();
  });

  it('renders nothing when the trending fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const { container } = render(<HomeWatchlist />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('shares one fetch across mounts within the cache TTL', async () => {
    const first = render(<HomeWatchlist />);
    await waitFor(() => expect(first.getByText('SOL')).toBeInTheDocument());
    first.unmount();

    render(<HomeWatchlist />);
    await waitFor(() => expect(screen.getByText('SOL')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
