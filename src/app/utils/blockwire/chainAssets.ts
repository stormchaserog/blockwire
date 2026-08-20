import type { MatrixClient } from '$types/matrix-sdk';

/** Client for the read-only chain-asset snapshot endpoint
 *  (blockwire-botgw's GET /_blockwire/projects/:id/chain-assets/:id/snapshot,
 *  see chain-adapter.ts). Deliberately separate from projects.ts's
 *  chain-asset CRUD (add/list/remove) -- this file is purely the live
 *  market-data READ path a Project Identity Page (UI Bible §12) polls,
 *  never a mutation. */

export interface TokenSnapshot {
  chain: string;
  contractAddress: string;
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  priceChangePercent: {
    m5: number | null;
    h1: number | null;
    h6: number | null;
    h24: number | null;
  };
  volumeUsd24h: number | null;
  liquidityUsd: number | null;
  pairAddress: string | null;
  dexId: string | null;
  imageUrl: string | null;
  fetchedAt: string;
}

export interface ChainAssetSnapshotResponse {
  asset: {
    id: number;
    project_id: number;
    chain: string;
    contract_address: string;
    token_symbol: string | null;
    token_decimals: number | null;
    verified_control_state: 'unverified' | 'pending' | 'verified';
    created_at: string;
  };
  snapshots: TokenSnapshot[];
  canonical: TokenSnapshot | null;
}

/** A single on-chain buy/sell, normalized the same way regardless of which
 *  provider (DexScreener, Helius, etc.) it came from. Mirrors
 *  blockwire-botgw's chain-adapter.ts TradeEvent exactly. */
export interface TradeEvent {
  chain: string;
  contractAddress: string;
  side: 'buy' | 'sell';
  amountUsd: number | null;
  id: string;
  occurredAt: string | null;
}

export interface ChainAssetTradesResponse {
  asset: ChainAssetSnapshotResponse['asset'];
  trades: TradeEvent[];
  /** false means the configured backend provider does not support
   *  per-transaction trade data yet (true today: DexScreener's free API
   *  has no such endpoint) -- NOT "this token has zero trades." A client
   *  MUST render these two cases differently (Bible §31/§33: an empty
   *  state and an unavailable-feature state are not the same thing). */
  supported: boolean;
}

/** Deliberately unauthenticated on the wire (matches the server: seeing a
 *  token's public market data isn't a project-permission-gated action —
 *  see getChainAssetSnapshot's doc comment in blockwire-botgw/src/projects.ts).
 *  Still passes the caller's token when present so a logged-in session
 *  doesn't get treated any differently, but this call must also succeed
 *  for a signed-out visitor viewing a public Project Identity Page. */
export const fetchChainAssetSnapshot = async (
  mx: MatrixClient, projectId: number, assetId: number,
): Promise<ChainAssetSnapshotResponse> => {
  const headers: Record<string, string> = {};
  const token = mx.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${mx.baseUrl}/_blockwire/projects/${projectId}/chain-assets/${assetId}/snapshot`,
    { headers },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Could not load live price data (${res.status})`);
  }
  return (await res.json()) as ChainAssetSnapshotResponse;
};

/** Same public/unauthenticated posture as fetchChainAssetSnapshot -- trade
 *  history is exactly as public as the price data next to it. */
export const fetchChainAssetTrades = async (
  mx: MatrixClient, projectId: number, assetId: number,
): Promise<ChainAssetTradesResponse> => {
  const headers: Record<string, string> = {};
  const token = mx.getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${mx.baseUrl}/_blockwire/projects/${projectId}/chain-assets/${assetId}/trades`,
    { headers },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Could not load recent trades (${res.status})`);
  }
  return (await res.json()) as ChainAssetTradesResponse;
};
