import { describe, expect, it, vi } from 'vitest';
import { GifSendError, MAX_GIF_BYTES, resolveGifMxc } from './klipyUpload';

const GIF = 'https://static.klipy.com/ii/abc/71/f9/example.gif';
const mx = {} as never;

const okFetch = (size = 1024) =>
  vi.fn<() => Promise<{ ok: boolean; blob: () => Promise<Blob> }>>(async () => ({
    ok: true,
    blob: async () => ({ size, type: 'image/gif' }) as Blob,
  })) as unknown as typeof fetch;

describe('resolveGifMxc', () => {
  it('uploads the GIF when there is no proxy, instead of giving up', async () => {
    // The bug: with no proxy the old helper returned undefined and the send
    // handler returned early, so tapping a GIF did nothing and said nothing.
    const upload = vi.fn<() => Promise<string>>(async () => 'mxc://blockwire.chat/abc123');
    const { mxc } = await resolveGifMxc(mx, GIF, undefined, { fetchFn: okFetch(), upload });

    expect(mxc).toBe('mxc://blockwire.chat/abc123');
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('prefers a configured proxy, which costs no storage', async () => {
    const upload = vi.fn<() => Promise<string>>(
      async () => 'mxc://blockwire.chat/should-not-happen'
    );
    const { mxc } = await resolveGifMxc(mx, GIF, 'gifproxy.example', {
      fetchFn: okFetch(),
      upload,
    });

    expect(mxc.startsWith('mxc://gifproxy.example/')).toBe(true);
    expect(upload).not.toHaveBeenCalled();
  });

  it('passes an existing mxc straight through', async () => {
    const upload = vi.fn<() => Promise<string>>(async () => 'mxc://nope/nope');
    const { mxc } = await resolveGifMxc(mx, 'mxc://blockwire.chat/already', undefined, {
      fetchFn: okFetch(),
      upload,
    });

    expect(mxc).toBe('mxc://blockwire.chat/already');
    expect(upload).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only proxy as no proxy', async () => {
    const upload = vi.fn<() => Promise<string>>(async () => 'mxc://blockwire.chat/abc');
    await resolveGifMxc(mx, GIF, '   ', { fetchFn: okFetch(), upload });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('explains a network failure rather than failing silently', async () => {
    const fetchFn = vi.fn<() => Promise<never>>(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    await expect(resolveGifMxc(mx, GIF, undefined, { fetchFn })).rejects.toBeInstanceOf(
      GifSendError
    );
  });

  it('explains a dead GIF url', async () => {
    const fetchFn = vi.fn<() => Promise<{ ok: boolean }>>(async () => ({
      ok: false,
    })) as unknown as typeof fetch;
    await expect(resolveGifMxc(mx, GIF, undefined, { fetchFn })).rejects.toThrow(
      /no longer available/
    );
  });

  it('refuses a GIF too large to be worth hosting', async () => {
    const upload = vi.fn<() => Promise<string>>(async () => 'mxc://blockwire.chat/abc');
    await expect(
      resolveGifMxc(mx, GIF, undefined, { fetchFn: okFetch(MAX_GIF_BYTES + 1), upload })
    ).rejects.toThrow(/too large/);
    expect(upload).not.toHaveBeenCalled();
  });

  it('reports a server that accepted the upload but returned nothing usable', async () => {
    const upload = vi.fn<() => Promise<string>>(async () => '');
    await expect(resolveGifMxc(mx, GIF, undefined, { fetchFn: okFetch(), upload })).rejects.toThrow(
      /did not accept/
    );
  });
});
