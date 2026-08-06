import { describe, expect, it, vi } from 'vitest';
import {
  applyPendingUpdate,
  CONTROLLER_CHANGE_TIMEOUT_MS,
  startUpdateChecks,
  UPDATE_POLL_INTERVAL_MS,
} from './swUpdate';

const makeWorker = () => {
  const messages: unknown[] = [];
  return { worker: { postMessage: (m: unknown) => messages.push(m) }, messages };
};

describe('applyPendingUpdate', () => {
  it('waits for the new worker to take control before reloading', () => {
    // The bug this exists to prevent: reloading in the same tick as the
    // hand-over message, which reloads under the OLD worker and serves the
    // same build back — so Refresh looks like it does nothing.
    const { worker, messages } = makeWorker();
    const reload = vi.fn<() => void>();
    let fire: (() => void) | undefined;

    applyPendingUpdate({
      pendingWorker: worker,
      onControllerChange: (listener) => {
        fire = listener;
        return () => {
          fire = undefined;
        };
      },
      reload,
      setTimeoutFn: () => 1,
      clearTimeoutFn: () => {},
    });

    expect(messages).toEqual([{ type: 'SKIP_WAITING_AND_CLAIM' }]);
    expect(reload).not.toHaveBeenCalled();

    fire?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads anyway if the hand-over never completes', () => {
    // A button that never reloads is worse than one that reloads early.
    const { worker } = makeWorker();
    const reload = vi.fn<() => void>();
    let timeoutFn: (() => void) | undefined;
    let delay: number | undefined;

    applyPendingUpdate({
      pendingWorker: worker,
      onControllerChange: () => () => {},
      reload,
      setTimeoutFn: (fn, ms) => {
        timeoutFn = fn;
        delay = ms;
        return 1;
      },
      clearTimeoutFn: () => {},
    });

    expect(delay).toBe(CONTROLLER_CHANGE_TIMEOUT_MS);
    expect(reload).not.toHaveBeenCalled();
    timeoutFn?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads only once when both paths fire', () => {
    const { worker } = makeWorker();
    const reload = vi.fn<() => void>();
    let fire: (() => void) | undefined;
    let timeoutFn: (() => void) | undefined;

    applyPendingUpdate({
      pendingWorker: worker,
      onControllerChange: (listener) => {
        fire = listener;
        return () => {};
      },
      reload,
      setTimeoutFn: (fn) => {
        timeoutFn = fn;
        return 1;
      },
      clearTimeoutFn: () => {},
    });

    fire?.();
    timeoutFn?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('just reloads when the new worker already has control', () => {
    const reload = vi.fn<() => void>();
    const onControllerChange = vi.fn<() => () => void>(() => () => {});

    applyPendingUpdate({ pendingWorker: null, onControllerChange, reload });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(onControllerChange).not.toHaveBeenCalled();
  });

  it('stops listening once it has reloaded', () => {
    const { worker } = makeWorker();
    const unsubscribe = vi.fn<() => void>();

    let fire: (() => void) | undefined;
    applyPendingUpdate({
      pendingWorker: worker,
      onControllerChange: (listener) => {
        fire = listener;
        return unsubscribe;
      },
      reload: () => {},
      setTimeoutFn: () => 1,
      clearTimeoutFn: () => {},
    });

    fire?.();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('startUpdateChecks', () => {
  it('checks when the app comes back to the foreground', () => {
    // The whole point: a standalone PWA has no reload button, and iOS resumes
    // it without re-running page load. Without this, the only update check
    // ever performed is the one at first launch.
    const update = vi.fn<() => Promise<void>>(() => Promise.resolve());
    let visibilityListener: (() => void) | undefined;
    let visible = false;

    startUpdateChecks(
      { update },
      {
        addVisibilityListener: (listener) => {
          visibilityListener = listener;
          return () => {};
        },
        setIntervalFn: () => 1,
        clearIntervalFn: () => {},
        isVisible: () => visible,
      }
    );

    visible = true;
    visibilityListener?.();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('does not check while the app is in the background', () => {
    const update = vi.fn<() => Promise<void>>(() => Promise.resolve());
    let visibilityListener: (() => void) | undefined;

    startUpdateChecks(
      { update },
      {
        addVisibilityListener: (listener) => {
          visibilityListener = listener;
          return () => {};
        },
        setIntervalFn: () => 1,
        clearIntervalFn: () => {},
        isVisible: () => false,
      }
    );

    visibilityListener?.();
    expect(update).not.toHaveBeenCalled();
  });

  it('also polls, for an app left open for days', () => {
    const update = vi.fn<() => Promise<void>>(() => Promise.resolve());
    let intervalFn: (() => void) | undefined;
    let ms: number | undefined;

    startUpdateChecks(
      { update },
      {
        addVisibilityListener: () => () => {},
        setIntervalFn: (fn, delay) => {
          intervalFn = fn;
          ms = delay;
          return 1;
        },
        clearIntervalFn: () => {},
        isVisible: () => true,
      }
    );

    expect(ms).toBe(UPDATE_POLL_INTERVAL_MS);
    intervalFn?.();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('survives a failing check rather than throwing at the caller', async () => {
    const update = vi.fn<() => Promise<void>>(() => Promise.reject(new Error('offline')));
    let visibilityListener: (() => void) | undefined;

    startUpdateChecks(
      { update },
      {
        addVisibilityListener: (listener) => {
          visibilityListener = listener;
          return () => {};
        },
        setIntervalFn: () => 1,
        clearIntervalFn: () => {},
        isVisible: () => true,
      }
    );

    expect(() => visibilityListener?.()).not.toThrow();
    await Promise.resolve();
  });

  it('cleans up both the listener and the timer', () => {
    const unsubscribe = vi.fn<() => void>();
    const clearIntervalFn = vi.fn<() => void>();

    const stop = startUpdateChecks(
      { update: () => Promise.resolve() },
      {
        addVisibilityListener: () => unsubscribe,
        setIntervalFn: () => 42,
        clearIntervalFn,
        isVisible: () => true,
      }
    );

    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(clearIntervalFn).toHaveBeenCalledWith(42);
  });
});
