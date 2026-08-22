import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDexScreenerTokenImage,
  toDexScreenerChainId,
  clearDexScreenerTokenImageCacheForTesting,
} from './useDexScreenerTokenImage';

const stableAlive = () => true;
vi.mock('$hooks/useAlive', () => ({
  useAlive: () => stableAlive,
}));

const fetchMock = vi.fn<typeof fetch>();

function pairResponse(imageUrl?: string) {
  return {
    ok: true,
    json: async () => [{ info: imageUrl ? { imageUrl } : {} }],
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearDexScreenerTokenImageCacheForTesting();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('toDexScreenerChainId', () => {
  it('passes chain names through lowercased', () => {
    expect(toDexScreenerChainId('Solana')).toBe('solana');
    expect(toDexScreenerChainId(' solana ')).toBe('solana');
  });
});

describe('useDexScreenerTokenImage', () => {
  it("returns the first pair's info.imageUrl when DexScreener has one", async () => {
    fetchMock.mockResolvedValueOnce(pairResponse('https://dd.dexscreener.com/token.png'));
    const { result } = renderHook(() => useDexScreenerTokenImage('solana', 'TokenAddr111'));
    await waitFor(() => expect(result.current).toBe('https://dd.dexscreener.com/token.png'));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.dexscreener.com/tokens/v1/solana/TokenAddr111'
    );
  });

  it('returns null when the pair has no imageUrl', async () => {
    fetchMock.mockResolvedValueOnce(pairResponse(undefined));
    const { result } = renderHook(() => useDexScreenerTokenImage('solana', 'NoImageAddr'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('returns null (never throws) when the fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useDexScreenerTokenImage('solana', 'FailAddr'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('serves repeat mounts for the same token from the cache: one fetch total', async () => {
    fetchMock.mockResolvedValue(pairResponse('https://dd.dexscreener.com/cached.png'));
    const first = renderHook(() => useDexScreenerTokenImage('solana', 'CachedAddr'));
    await waitFor(() => expect(first.result.current).toBe('https://dd.dexscreener.com/cached.png'));
    first.unmount();

    const second = renderHook(() => useDexScreenerTokenImage('solana', 'CachedAddr'));
    await waitFor(() =>
      expect(second.result.current).toBe('https://dd.dexscreener.com/cached.png')
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch at all when chain or address is missing', () => {
    const { result } = renderHook(() => useDexScreenerTokenImage(null, 'Addr'));
    expect(result.current).toBeNull();
    renderHook(() => useDexScreenerTokenImage('solana', null));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
