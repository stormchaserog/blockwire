import { useCallback, useMemo, useState } from 'react';
import type { AsyncSearchHandler } from '$utils/AsyncSearch';
import { fetch } from '$utils/fetch';
import { useClientConfig } from '$hooks/useClientConfig';
import type { GifData } from './types';

const SIZE_LIMIT = 3 * 1024 * 1024;

type KlipyFile = {
  url?: string;
  width?: number;
  height?: number;
  size?: number;
};

/** Klipy serves each size as a bag of encodings; we only ever want the gif. */
type KlipyFormat = { gif?: KlipyFile };

type KlipyResult = {
  id?: string;
  title?: string;
  file?: Partial<Record<'xs' | 'sm' | 'md' | 'hd', KlipyFormat>>;
};

type KlipySearchResponse = { data?: { data?: KlipyResult[] } };

const parseKlipyResult = (klipyResult: KlipyResult): GifData => {
  const formats = klipyResult.file ?? {};
  const preview = formats.xs?.gif ?? formats.sm?.gif ?? formats.md?.gif;

  // Full resolution, dropped to medium when it would be too large to send.
  let fullRes = formats.hd?.gif;
  if (fullRes?.size && fullRes.size > SIZE_LIMIT && formats.md?.gif) {
    fullRes = formats.md.gif;
  }
  fullRes ??= formats.md?.gif ?? preview;

  return {
    id: klipyResult.id ?? '',
    title: klipyResult.title || 'GIF',
    url: fullRes?.url ?? '',
    preview_url: preview?.url ?? fullRes?.url ?? '',
    width: fullRes?.width ?? preview?.width ?? 0,
    height: fullRes?.height ?? preview?.height ?? 0,
    size: fullRes?.size ?? preview?.size ?? 0,
    mimetype: 'image/gif',
  };
};

export function useGifSearch(
  favoriteGifs: GifData[],
  showGifPicker: boolean,
  gifSearch: AsyncSearchHandler
) {
  const [searchResults, setSearchResults] = useState<GifData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientConfig = useClientConfig();
  const klipyApiKey = clientConfig.gifs?.klipyApiKey ?? '';

  /** One request shape for both endpoints — they differ only in path and query. */
  const load = useCallback(
    async (endpoint: 'search' | 'trending', query: string) => {
      if (!showGifPicker) return;

      if (!klipyApiKey) {
        // No key configured, so the request would build a URL with an empty
        // path segment and fail with a meaningless "HTTP 404". Say what is
        // actually wrong instead of looking broken.
        setSearchResults([]);
        setLoading(false);
        setError('GIF search is not set up on this server yet.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = new URL('https://api.klipy.com');
        url.pathname = `/api/v1/${klipyApiKey}/gifs/${endpoint}`;
        if (endpoint === 'search') url.searchParams.set('q', query);
        url.searchParams.set('per_page', '50'); // TODO: infinite scroll?

        const response = await fetch(url.toString());

        if (response.status === 200) {
          const data = (await response.json()) as KlipySearchResponse;
          const results = data.data?.data;

          setSearchResults(results ? results.map(parseKlipyResult) : []);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch {
        setError(endpoint === 'trending' ? 'Could not load GIFs' : 'Failed to search GIFs');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    [klipyApiKey, showGifPicker]
  );

  const searchGifs = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      gifSearch(trimmedQuery);
      await load('search', trimmedQuery);
    },
    [gifSearch, load]
  );

  /**
   * What the picker shows before anyone types.
   *
   * It used to show only your favourites, which on a new account is nothing
   * at all — so opening the GIF tab said "No GIFs found!" and the feature
   * looked broken until you guessed that you had to search first. Every
   * messenger opens this panel with something to look at.
   */
  const loadTrending = useCallback(async () => {
    gifSearch('');
    await load('trending', '');
  }, [gifSearch, load]);

  const gifs = useMemo(
    () => ({ gifs: searchResults, favorites: favoriteGifs }),
    [searchResults, favoriteGifs]
  );

  return { gifs, loading, error, searchGifs, loadTrending };
}
