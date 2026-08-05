/** Applying a waiting app update.
 *
 *  The old version of this posted a message to the waiting worker and called
 *  location.reload() on the very next line. The reload almost always won that
 *  race, so the page came back served by the *old* worker — same build, same
 *  "Update Available" banner. Tapping Refresh appeared to do nothing, forever.
 *
 *  The switchover is asynchronous and has exactly one reliable signal:
 *  `controllerchange`, fired once the new worker has claimed the page. Wait
 *  for that, then reload. The timeout is the safety net — a reload that
 *  happens slightly too early is recoverable, a button that never reloads is
 *  not.
 */

/** Long enough for a worker to activate, short enough not to feel broken. */
export const CONTROLLER_CHANGE_TIMEOUT_MS = 3000;

export interface ApplyUpdateDeps {
  /** The worker to hand over to: `waiting` normally, `installing` if we were quick. */
  pendingWorker: { postMessage: (message: unknown) => void } | null;
  /** Resolves when the new worker takes control. */
  onControllerChange: (listener: () => void) => () => void;
  reload: () => void;
  setTimeoutFn?: (fn: () => void, ms: number) => unknown;
  clearTimeoutFn?: (handle: unknown) => void;
}

/**
 * Hand over to the pending worker and reload once it has control.
 *
 * Reloads exactly once, whichever of the two paths gets there first.
 */
export const applyPendingUpdate = ({
  pendingWorker,
  onControllerChange,
  reload,
  setTimeoutFn = (fn, ms) => setTimeout(fn, ms),
  clearTimeoutFn = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}: ApplyUpdateDeps): void => {
  let done = false;
  let unsubscribe: (() => void) | undefined;
  let timer: unknown;

  const finish = () => {
    if (done) return;
    done = true;
    unsubscribe?.();
    if (timer !== undefined) clearTimeoutFn(timer);
    reload();
  };

  if (!pendingWorker) {
    // Nothing waiting — the new worker already took over, so a plain reload
    // is all that was ever needed.
    reload();
    return;
  }

  unsubscribe = onControllerChange(finish);
  timer = setTimeoutFn(finish, CONTROLLER_CHANGE_TIMEOUT_MS);
  // A ServiceWorker's postMessage takes no target origin — the lint rule is
  // written for window.postMessage.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  pendingWorker.postMessage({ type: 'SKIP_WAITING_AND_CLAIM' });
};

export interface PurgeAndReloadDeps {
  /** Every Cache Storage bucket name, so the precache can be identified. */
  cacheNames: string[];
  deleteCache: (name: string) => Promise<unknown>;
  reload: () => void;
}

/** Workbox names its precache bucket with this prefix. */
const PRECACHE_PREFIX = 'workbox-precache';

/**
 * Second attempt, for when the browser refuses to see a new service worker.
 *
 * Emptying the precache means the worker's routes have nothing stale to serve,
 * so the next navigation falls through to the network and the current build
 * loads. The registration itself survives, which matters: unregistering would
 * throw away the push subscription with it and silently stop notifications.
 */
export const purgePrecacheAndReload = async ({
  cacheNames,
  deleteCache,
  reload,
}: PurgeAndReloadDeps): Promise<void> => {
  const precaches = cacheNames.filter((name) => name.startsWith(PRECACHE_PREFIX));
  await Promise.all(precaches.map((name) => deleteCache(name).catch(() => undefined)));
  reload();
};

/** How often to ask the server whether there is a newer build. */
export const UPDATE_POLL_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Keep checking for new builds while the app is open.
 *
 * A standalone PWA has no address bar, no reload button and no pull to
 * refresh, and iOS restores it from the app switcher without re-running page
 * load. Registration-time is therefore the *only* moment the app would ever
 * notice a new version — which is how someone ends up stuck on a build from
 * days ago with no way to move. Checking whenever the app comes back to the
 * foreground is what makes an update reachable at all.
 *
 * Returns a cleanup function.
 */
export const startUpdateChecks = (
  registration: { update: () => Promise<unknown> },
  {
    addVisibilityListener,
    setIntervalFn = (fn, ms) => setInterval(fn, ms),
    clearIntervalFn = (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
    isVisible,
  }: {
    addVisibilityListener: (listener: () => void) => () => void;
    setIntervalFn?: (fn: () => void, ms: number) => unknown;
    clearIntervalFn?: (handle: unknown) => void;
    isVisible: () => boolean;
  }
): (() => void) => {
  const check = () => {
    registration.update().catch(() => {
      // Offline, or the server is unreachable. The next check will do.
    });
  };

  const onVisible = () => {
    if (isVisible()) check();
  };

  const unsubscribe = addVisibilityListener(onVisible);
  const interval = setIntervalFn(onVisible, UPDATE_POLL_INTERVAL_MS);

  return () => {
    unsubscribe();
    clearIntervalFn(interval);
  };
};
