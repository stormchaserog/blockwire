import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useTokenPriceHistory,
  clearTokenPriceHistoryCacheForTesting,
} from './useTokenPriceHistory';

const stableAlive = () => true;
vi.mock('$hooks/useAlive', () => ({
  useAlive: () => stableAlive,
}));

const fetchMock = vi.fn<typeof fetch>();

function poolsResponse(poolAddress: string) {
  return {
    ok: true,
    json: async () => ({ data: [{ attributes: { address: poolAddress } }] }),
  } as Response;
}

/** GeckoTerminal returns candles newest-first: [ts, o, h, l, close, vol]. */
function ohlcvResponse(closesNewestFirst: number[]) {
  return {
    ok: true,
    json: async () => ({
      data: {
        attributes: {
          ohlcv_list: closesNewestFirst.map((close, i) => [
            1700000000 - i * 3600,
            1,
            2,
            0.5,
            close,
            1000,
          ]),
        },
      },
    }),
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearTokenPriceHistoryCacheForTesting();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useTokenPriceHistory', () => {
  it('fetches the top pool then 24 hourly closes, chronological order', async () => {
    fetchMock
      .mockResolvedValueOnce(poolsResponse('PoolAddr111'))
      .mockResolvedValueOnce(ohlcvResponse([3, 2, 1]));
    const { result } = renderHook(() => useTokenPriceHistory('solana', 'TokenAddr111'));
    await waitFor(() => expect(result.current).toEqual([1, 2, 3]));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.geckoterminal.com/api/v2/networks/solana/tokens/TokenAddr111/pools?page=1'
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.geckoterminal.com/api/v2/networks/solana/pools/PoolAddr111/ohlcv/hour?aggregate=1&limit=24'
    );
  });

  it('serves repeat mounts for the same token from the cache: one fetch pair total', async () => {
    fetchMock
      .mockResolvedValueOnce(poolsResponse('PoolCached'))
      .mockResolvedValueOnce(ohlcvResponse([5, 4]));
    const first = renderHook(() => useTokenPriceHistory('solana', 'CachedAddr'));
    await waitFor(() => expect(first.result.current).toEqual([4, 5]));
    first.unmount();

    const second = renderHook(() => useTokenPriceHistory('solana', 'CachedAddr'));
    await waitFor(() => expect(second.result.current).toEqual([4, 5]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null without fetching for chains with no GeckoTerminal mapping', () => {
    const { result } = renderHook(() => useTokenPriceHistory('base', 'Addr'));
    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null (never throws) when the fetch rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useTokenPriceHistory('solana', 'FailAddr'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('returns null when the OHLCV payload is malformed', async () => {
    fetchMock
      .mockResolvedValueOnce(poolsResponse('PoolBad'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) } as Response);
    const { result } = renderHook(() => useTokenPriceHistory('solana', 'BadAddr'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current).toBeNull();
  });
});
