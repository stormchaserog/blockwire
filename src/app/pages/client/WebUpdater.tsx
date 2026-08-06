import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp } from '$components/icons/phosphor';
import { useRegisterGlobalBanner, type GlobalBanner } from '$state/globalBanners';
import { useSetting } from '$state/hooks/settings';
import { settingsAtom } from '$state/settings';
import { createLogger } from '$utils/debug';
import {
  applyPendingUpdate,
  purgePrecacheAndReload,
  UPDATE_POLL_INTERVAL_MS,
} from '$utils/swUpdate';
import { fetchServedDocument, isNewBuildAvailable, readRunningBundle } from '$utils/buildVersion';

const log = createLogger('WebUpdater');

/** Offering, and actually delivering, a new version.
 *
 *  Two faults here compounded into an app that could not be updated at all:
 *
 *  1. Nothing ever noticed a new build. The only check ran at registration,
 *     and a standalone PWA has no reload button and is resumed from the app
 *     switcher without re-running page load — so an installed app could sit on
 *     an old version indefinitely with no way for anyone to move it forward.
 *
 *  2. When an update *was* offered, Refresh posted a message to the waiting
 *     worker and reloaded on the very next line. The reload won that race, the
 *     old worker served the same build straight back, and the banner returned
 *     — a button that visibly did nothing.
 *
 *  So the check no longer waits for the service worker to volunteer the news;
 *  it asks the server which bundle is being served and compares. And Refresh
 *  escalates instead of assuming its first move worked.
 */
export function WebUpdater() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [newBuildAvailable, setNewBuildAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [autoUpdate, setAutoUpdate] = useSetting(settingsAtom, 'autoUpdate');
  const runningBundle = useRef<string | undefined>(undefined);

  if (runningBundle.current === undefined) {
    runningBundle.current = readRunningBundle(document);
  }

  useEffect(() => {
    const handleUpdate = (ev: Event) => {
      const customEv = ev as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      if (customEv.detail?.registration) {
        log.log('Web update available via ServiceWorker');
        setRegistration(customEv.detail.registration);
        setNewBuildAvailable(true);
      }
    };

    window.addEventListener('sable-sw-update-available', handleUpdate);
    return () => window.removeEventListener('sable-sw-update-available', handleUpdate);
  }, []);

  // Ask the server directly, because the worker cannot be relied on to raise
  // its hand. Checked whenever the app returns to the foreground — the moment
  // someone is most likely about to use it.
  useEffect(() => {
    let cancelled = false;

    const check = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      void (async () => {
        const html = await fetchServedDocument(fetch, Date.now());
        if (cancelled || !isNewBuildAvailable(runningBundle.current, html)) return;

        log.log('A newer build is being served');
        setNewBuildAvailable(true);
        // Still give the worker a chance to pick it up the clean way.
        const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
        if (cancelled || !reg) return;
        setRegistration(reg);
        reg.update().catch(() => undefined);
      })();
    };

    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const interval = window.setInterval(check, UPDATE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.clearInterval(interval);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    const pendingWorker = registration?.waiting ?? registration?.installing ?? null;

    if (pendingWorker) {
      // Clean path: hand over to the new worker, reload once it has control.
      applyPendingUpdate({
        pendingWorker,
        onControllerChange: (listener) => {
          navigator.serviceWorker?.addEventListener('controllerchange', listener);
          return () => navigator.serviceWorker?.removeEventListener('controllerchange', listener);
        },
        reload: () => window.location.reload(),
      });
      return;
    }

    // No worker is waiting even though the server has something newer, which
    // means the browser never noticed. Empty the precache so there is nothing
    // stale left to serve, and reload into whatever the network returns.
    void (async () => {
      const cacheNames = await caches.keys().catch(() => [] as string[]);
      await purgePrecacheAndReload({
        cacheNames,
        deleteCache: (name) => caches.delete(name),
        reload: () => window.location.reload(),
      });
    })();
  }, [registration]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleAlwaysUpdate = useCallback(() => {
    setAutoUpdate(true);
    handleRefresh();
  }, [setAutoUpdate, handleRefresh]);

  // Opted in: install it and reload rather than asking again. Deliberately
  // not instant — a reload landing mid-sentence is its own kind of broken, so
  // this waits for the app to be in the background. It applies on the next
  // foreground check otherwise.
  useEffect(() => {
    if (!autoUpdate || !newBuildAvailable) return undefined;

    const applyWhenAway = () => {
      if (document.visibilityState === 'hidden') {
        log.log('Auto-update: applying while backgrounded');
        handleRefresh();
      }
    };

    applyWhenAway();
    document.addEventListener('visibilitychange', applyWhenAway);
    return () => document.removeEventListener('visibilitychange', applyWhenAway);
  }, [autoUpdate, newBuildAvailable, handleRefresh]);

  const bannerData = useMemo<GlobalBanner | null>(() => {
    if (!newBuildAvailable || dismissed) return null;
    // Auto-update handles it silently; no banner to answer.
    if (autoUpdate) return null;

    return {
      id: 'web-app-update',
      priority: 200, // Top priority for updates
      icon: ArrowUp,
      title: 'Update Available',
      description: `A new version of ${SABLE_PRODUCT_NAME} is ready. Update now, or later when it suits you.`,
      primaryAction: {
        label: 'Update now',
        variant: 'Primary',
        onClick: handleRefresh,
      },
      secondaryAction: {
        label: 'Later',
        variant: 'Secondary',
        onClick: handleDismiss,
      },
      tertiaryAction: {
        label: 'Always update automatically',
        variant: 'Secondary',
        onClick: handleAlwaysUpdate,
      },
    };
  }, [newBuildAvailable, dismissed, autoUpdate, handleRefresh, handleDismiss, handleAlwaysUpdate]);

  useRegisterGlobalBanner(bannerData);

  return null;
}
