/** Knowing whether the app you are running is the app that was shipped.
 *
 *  The service worker's own update machinery is supposed to answer this, and
 *  on this app it demonstrably does not: with a genuinely new build sitting on
 *  the server, `registration.update()` resolves without finding anything, no
 *  worker enters `waiting`, and a full page load still comes back on the old
 *  bundle. Reproduced locally, repeatedly. That is why someone can force-quit
 *  a PWA all day and stay on a week-old version — there is no address bar and
 *  no reload button, so the app updating itself is the only route in.
 *
 *  So we stop asking the browser and ask the server: fetch the entry document,
 *  read which bundle it points at, compare with the one this page actually
 *  loaded. Two strings, no heuristics, no cache to be wrong about.
 */

/** The hashed entry bundle, which changes on every build. */
const BUNDLE_PATTERN = /assets\/index-[A-Za-z0-9_-]+\.js/;

/** Which bundle a served document points at, if we can tell. */
export const parseBundleUrl = (html: string): string | undefined => BUNDLE_PATTERN.exec(html)?.[0];

/** Which bundle this page is running. */
export const readRunningBundle = (doc: Pick<Document, 'querySelectorAll'>): string | undefined => {
  const scripts = Array.from(doc.querySelectorAll('script[src]')) as HTMLScriptElement[];
  for (const script of scripts) {
    const match = BUNDLE_PATTERN.exec(script.getAttribute('src') ?? '');
    if (match) return match[0];
  }
  return undefined;
};

/**
 * True when the server is serving a different build than this page is running.
 *
 * Unknown on either side means "no" — a failed fetch or an unrecognised
 * document must not nag someone into reloading for nothing.
 */
export const isNewBuildAvailable = (
  runningBundle: string | undefined,
  servedHtml: string | undefined
): boolean => {
  if (!runningBundle || !servedHtml) return false;
  const served = parseBundleUrl(servedHtml);
  if (!served) return false;
  return served !== runningBundle;
};

/**
 * Ask the server what it is serving right now.
 *
 * `no-store` and a cache-busting parameter because every layer between here
 * and the origin — the service worker included — is capable of handing back
 * the very document we are trying to compare against.
 */
export const fetchServedDocument = async (
  fetchFn: typeof fetch,
  now: number
): Promise<string | undefined> => {
  try {
    const res = await fetchFn(`/index.html?build-check=${now}`, { cache: 'no-store' });
    if (!res.ok) return undefined;
    return await res.text();
  } catch {
    return undefined;
  }
};
