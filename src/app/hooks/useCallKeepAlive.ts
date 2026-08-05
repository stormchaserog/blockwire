import { useEffect } from 'react';
import { createLogger } from '$utils/debug';

const log = createLogger('call-keep-alive');

/** Minimal shape of the Wake Lock API — older TS lib.dom versions don't have
 *  it, and we only ever touch these two members. */
type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};
type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> };

const getWakeLock = (): WakeLockLike | undefined =>
  (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;

/**
 * Hold a screen wake lock for the duration of a call.
 *
 * Without this the screen sleeps on its usual timer while you are talking,
 * and on a phone that is one of the most common ways a call quietly ends —
 * you weren't doing anything wrong, you just stopped touching the glass.
 *
 * The browser releases the lock itself whenever the document is hidden, and
 * does NOT hand it back when you return, so re-acquiring on visibilitychange
 * is the whole job rather than an optimisation.
 */
export function useCallWakeLock(active: boolean): void {
  useEffect(() => {
    const wakeLock = getWakeLock();
    if (!active || !wakeLock) return undefined;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      try {
        const next = await wakeLock.request('screen');
        if (cancelled) {
          void next.release().catch(() => undefined);
          return;
        }
        sentinel = next;
      } catch (err) {
        // Denied, unsupported, or the tab lost focus mid-request. Not worth
        // surfacing — the call still works, the screen just isn't pinned.
        log.warn('screen wake lock refused', err);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
      sentinel = null;
    };
  }, [active]);
}

/**
 * Tell the OS that a call is what this page is doing.
 *
 * Media Session is what puts a title on the lock screen and in the Android
 * notification shade, and it is also part of how a platform decides a
 * backgrounded page is worth keeping alive rather than freezing. It costs
 * almost nothing to declare and it is one of the few levers a web app has
 * here.
 *
 * Caveat worth knowing: the call itself renders in an embedded frame, which
 * owns its own document and therefore its own media elements. Setting this on
 * the parent improves how the session is *described* and gives us a stop
 * control, but it does not by itself hand the parent page audio focus.
 */
export function useCallMediaSession(active: boolean, title: string, onStop?: () => void): void {
  useEffect(() => {
    const { mediaSession } = navigator;
    if (!active || !mediaSession) return undefined;

    const previousMetadata = mediaSession.metadata;

    try {
      if (typeof MediaMetadata !== 'undefined') {
        mediaSession.metadata = new MediaMetadata({
          title,
          artist: `${SABLE_PRODUCT_NAME} call`,
        });
      }
      mediaSession.playbackState = 'playing';
    } catch (err) {
      log.warn('could not describe the media session', err);
    }

    const setHandler = (action: MediaSessionAction, handler: (() => void) | null) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Not every action is supported everywhere; an unsupported one throws.
      }
    };

    if (onStop) setHandler('stop', onStop);

    return () => {
      setHandler('stop', null);
      try {
        mediaSession.playbackState = 'none';
        mediaSession.metadata = previousMetadata;
      } catch {
        // Nothing useful to do if teardown is refused.
      }
    };
  }, [active, title, onStop]);
}
