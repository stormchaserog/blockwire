import type { MatrixClient } from '$types/matrix-sdk';
import { getKlipyMxcUrl } from '$utils/klipy';

/** Getting a picked GIF into a room.
 *
 *  The upstream design keeps the GIF on Klipy's CDN and sends an mxc URI
 *  pointing at a *media proxy server* — `mxc://proxy.example/klipy_<id>` —
 *  which a homeserver then fetches over federation.
 *
 *  That cannot work here, twice over. There is no proxy configured, so the
 *  helper returned undefined and the send handler bailed on a bare `return`:
 *  tapping a GIF did nothing at all, with no error, which is a horrible thing
 *  to debug from the outside. And even with a proxy it would still fail,
 *  because BlockWire runs with federation disabled — our homeserver will not
 *  fetch media from another server name, so the GIF would arrive as a broken
 *  image.
 *
 *  So we upload instead. Klipy's CDN sends `access-control-allow-origin: *`,
 *  which means the browser can read the bytes; we put them in our own media
 *  repository and send an ordinary mxc URI. The GIF then behaves like every
 *  other image in the room, and keeps working even if Klipy stops serving it.
 *
 *  The cost is our storage and bandwidth per GIF sent, which is the honest
 *  trade for one that actually appears. A proxy is still cheaper and is still
 *  used when one is configured.
 */

/** Refuse anything implausible for a GIF rather than uploading it blindly. */
export const MAX_GIF_BYTES = 8 * 1024 * 1024;

export class GifSendError extends Error {}

/**
 * Resolve a picked GIF to an mxc URI that this homeserver can serve.
 *
 * Uses the configured media proxy when there is one; otherwise fetches the
 * bytes and uploads them.
 */
export const resolveGifMxc = async (
  mx: MatrixClient,
  gifUrl: string,
  proxyUrl: string | undefined,
  deps: {
    fetchFn?: typeof fetch;
    upload?: (blob: Blob, name: string) => Promise<string>;
  } = {}
): Promise<string> => {
  if (gifUrl.startsWith('mxc://')) return gifUrl;

  // A configured proxy is cheaper — no upload, no storage — so prefer it.
  if (proxyUrl?.trim()) {
    const viaProxy = getKlipyMxcUrl(gifUrl, proxyUrl);
    if (viaProxy.startsWith('mxc://')) return viaProxy;
  }

  const fetchFn = deps.fetchFn ?? fetch;
  const res = await fetchFn(gifUrl).catch(() => {
    throw new GifSendError('Could not reach the GIF. Check your connection and try again.');
  });
  if (!res.ok) throw new GifSendError('That GIF is no longer available.');

  const blob = await res.blob();
  if (blob.size > MAX_GIF_BYTES) {
    throw new GifSendError('That GIF is too large to send.');
  }

  const upload =
    deps.upload ??
    (async (b: Blob, name: string) => {
      const result = await mx.uploadContent(b, { name, type: b.type || 'image/gif' });
      return result.content_uri;
    });

  const mxc = await upload(blob, 'gif.gif');
  if (!mxc?.startsWith('mxc://')) {
    throw new GifSendError('The server did not accept the GIF.');
  }
  return mxc;
};
