import { describe, expect, it, vi } from 'vitest';
import {
  fetchServedDocument,
  isNewBuildAvailable,
  parseBundleUrl,
  readRunningBundle,
} from './buildVersion';

const htmlFor = (bundle: string) =>
  `<!doctype html><html><head><script type="module" crossorigin src="/${bundle}"></script></head><body></body></html>`;

const OLD = 'assets/index-DctQVpO_.js';
const NEW = 'assets/index-snTkQ1BS.js';

describe('parseBundleUrl', () => {
  it('reads the entry bundle out of a served document', () => {
    expect(parseBundleUrl(htmlFor(NEW))).toBe(NEW);
  });

  it('returns nothing for a document it does not recognise', () => {
    expect(parseBundleUrl('<html><body>maintenance</body></html>')).toBeUndefined();
  });
});

describe('readRunningBundle', () => {
  const docWith = (srcs: string[]) =>
    ({
      querySelectorAll: () =>
        srcs.map((src) => ({ getAttribute: () => src })) as unknown as NodeListOf<Element>,
    }) as unknown as Document;

  it('finds the entry bundle among other scripts', () => {
    expect(readRunningBundle(docWith(['/assets/polyfill-abc.js', `/${OLD}`]))).toBe(OLD);
  });

  it('returns nothing when there is no entry bundle', () => {
    expect(readRunningBundle(docWith(['/assets/polyfill-abc.js']))).toBeUndefined();
  });
});

describe('isNewBuildAvailable', () => {
  it('spots a build the running page is not on', () => {
    // The exact situation reproduced by hand: server on one bundle, page on
    // another, and the service worker insisting everything is current.
    expect(isNewBuildAvailable(OLD, htmlFor(NEW))).toBe(true);
  });

  it('says no when they match', () => {
    expect(isNewBuildAvailable(NEW, htmlFor(NEW))).toBe(false);
  });

  it('says no rather than guessing when the fetch failed', () => {
    expect(isNewBuildAvailable(OLD, undefined)).toBe(false);
  });

  it('says no when the running bundle is unknown', () => {
    expect(isNewBuildAvailable(undefined, htmlFor(NEW))).toBe(false);
  });

  it('says no for a document with no bundle in it', () => {
    // An error page or a captive portal must not be read as a new release.
    expect(isNewBuildAvailable(OLD, '<html>Gateway Timeout</html>')).toBe(false);
  });
});

describe('fetchServedDocument', () => {
  it('bypasses every cache between here and the origin', async () => {
    const fetchFn = vi.fn(async () => new Response(htmlFor(NEW), { status: 200 }));
    const html = await fetchServedDocument(fetchFn as unknown as typeof fetch, 1234);

    expect(html).toContain(NEW);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/index.html?build-check=1234');
    expect(init.cache).toBe('no-store');
  });

  it('gives up quietly when offline', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(
      fetchServedDocument(fetchFn as unknown as typeof fetch, 1)
    ).resolves.toBeUndefined();
  });

  it('ignores a non-OK response', async () => {
    const fetchFn = vi.fn(async () => new Response('nope', { status: 502 }));
    await expect(
      fetchServedDocument(fetchFn as unknown as typeof fetch, 1)
    ).resolves.toBeUndefined();
  });
});
