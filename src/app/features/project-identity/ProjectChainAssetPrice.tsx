import { useCallback, useEffect, useState } from 'react';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useInterval } from '$hooks/useInterval';
import { useAlive } from '$hooks/useAlive';
import { fetchChainAssetSnapshot, type TokenSnapshot } from '$utils/blockwire/chainAssets';
import { TokenPriceCard, type TokenPriceCardProps } from './TokenPriceCard';

export type ProjectChainAssetPriceProps = {
  projectId: number;
  chainAssetId: number;
  /** 20s: comfortably above the gateway's 15s server-side cache TTL, so a
   *  poll almost always either serves fresh data or a very-recently-cached
   *  response, rather than hammering the endpoint faster than the cache
   *  can ever return anything new. */
  pollIntervalMs?: number;
};

/** Fetches + refreshes a project's chain-asset snapshot and renders it via
 *  TokenPriceCard, exactly the container/presentation split the rest of
 *  this codebase already uses (e.g. NotificationTransportRuntimeFeature
 *  vs. the pure PushNotifications helpers). Kept separate from the card
 *  itself so the card stays trivially snapshot-testable with a fixed
 *  status/snapshot pair, no network or timers involved.
 */
export function ProjectChainAssetPrice({
  projectId,
  chainAssetId,
  pollIntervalMs = 20_000,
}: ProjectChainAssetPriceProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [status, setStatus] = useState<TokenPriceCardProps['status']>('loading');
  const [snapshot, setSnapshot] = useState<TokenSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const result = await fetchChainAssetSnapshot(mx, projectId, chainAssetId);
      if (!alive()) return;
      if (result.canonical) {
        setSnapshot(result.canonical);
        setStatus('ready');
        setErrorMessage(undefined);
      } else {
        setSnapshot(null);
        setStatus('no-data');
      }
    } catch (err) {
      if (!alive()) return;
      // Keep showing the last good snapshot through a transient failure
      // rather than replacing it with an error card — a 20s poll hiccup
      // should not make a price that was correct 20 seconds ago vanish.
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus((prev) => (prev === 'ready' ? prev : 'error'));
    }
  }, [mx, projectId, chainAssetId, alive]);

  useEffect(() => {
    setStatus('loading');
    setSnapshot(null);
    void load();
  }, [load]);

  useInterval(load, pollIntervalMs);

  return <TokenPriceCard snapshot={snapshot} status={status} errorMessage={errorMessage} />;
}
