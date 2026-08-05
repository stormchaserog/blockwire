import { useCallback, useMemo, useState } from 'react';
import type { AsyncSearchHandler } from '$utils/AsyncSearch';
import { fetch } from '$utils/fetch';
import { useMatrixClient } from '$hooks/useMatrixClient';
import type { GifData } from './types';

const SIZE_LIMIT = 3 * 1024 * 1024;

/** What the picker browses before anyone types.
 *
 *  Global trending is whatever the wider internet is posting that day, which
 *  on a crypto messenger is mostly noise. These are the terms the room is
 *  actually reaching for. One is picked per open so the panel isn't the same
 *  six GIFs forever; if a term comes back empty the code falls back to
 *  trending rather than showing nothing. */
const DEFAULT_GIF_SEARCHES = [
  'crypto',
  'bitcoin',
  'to the moon',
  'hodl',
  'diamond hands',
  'stonks',
  'wen lambo',
  'rug pull',
];

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
  const mx = useMatrixClient();

  /** One request shape for both endpoints — they differ only in path and query.
   *
   *  Returns the parsed results so a caller can react to an empty set (the
   *  crypto default falls back to trending), or null when the request never
   *  ran or failed. */
  const load = useCallback(
    async (endpoint: 'search' | 'trending', query: string): Promise<GifData[] | null> => {
      if (!showGifPicker) return null;

      setLoading(true);
      setError(null);

      try {
        // Through our own gateway rather than straight to Klipy: the API key
        // lives server-side now, so it is never in a URL a browser requests
        // and never in the client's public config.
        const url = new URL(`${mx.baseUrl}/_blockwire/gifs/${endpoint}`);
        if (endpoint === 'search') url.searchParams.set('q', query);
        url.searchParams.set('per_page', '50'); // TODO: infinite scroll?

        const response = await fetch(url.toString());

        if (response.status === 503) {
          // The gateway is up but has no key — a deployment problem, not
          // something the person searching can do anything about.
          setSearchResults([]);
          setError('GIF search is not set up on this server yet.');
          return null;
        }

        if (response.status === 200) {
          const data = (await response.json()) as KlipySearchResponse;
          const results = data.data?.data;
          const parsed = results ? results.map(parseKlipyResult) : [];

          setSearchResults(parsed);
          return parsed;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch {
        setError(endpoint === 'trending' ? 'Could not load GIFs' : 'Failed to search GIFs');
        setSearchResults([]);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mx, showGifPicker]
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
   *
   * Here that something is crypto-flavoured rather than global trending, on
   * the grounds that this is a crypto messenger and what's trending on the
   * open internet usually isn't what anyone is about to post. Trending is the
   * safety net when a curated term returns nothing.
   */
  const loadTrending = useCallback(async () => {
    gifSearch('');
    const term = DEFAULT_GIF_SEARCHES[Math.floor(Math.random() * DEFAULT_GIF_SEARCHES.length)]!;
    const results = await load('search', term);
    if (results === null || results.length === 0) {
      await load('trending', '');
    }
  }, [gifSearch, load]);

  const gifs = useMemo(
    () => ({ gifs: searchResults, favorites: favoriteGifs }),
    [searchResults, favoriteGifs]
  );

  return { gifs, loading, error, searchGifs, loadTrending };
}
