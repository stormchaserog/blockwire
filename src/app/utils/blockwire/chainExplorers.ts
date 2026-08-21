/** Per-chain block explorer URL builder — kept separate from any display
 *  component, since which explorer to use for a given chain is pure data,
 *  not presentation. Solana is the only chain BlockWire actually supports
 *  today (per the blueprint's "Solana first, but the adapter must support
 *  more chains" requirement), so this starts as a lookup table of one and
 *  grows the same way chain-adapter.ts's CHAIN_ID_MAP does on the backend
 *  -- add an entry, never rewrite the callers. */

const EXPLORER_URL_BUILDERS: Record<string, (contractAddress: string) => string> = {
  solana: (address) => `https://solscan.io/token/${address}`,
};

/** Returns null for a chain with no known explorer yet, rather than
 *  guessing at a URL shape — callers (ContractAddressBadge) already treat
 *  a null explorerUrl as "don't render the explorer button," which is the
 *  correct behavior for an unsupported chain, not a broken link. */
export function getExplorerUrl(chain: string, contractAddress: string): string | null {
  const builder = EXPLORER_URL_BUILDERS[chain.toLowerCase()];
  return builder ? builder(contractAddress) : null;
}

const TX_EXPLORER_URL_BUILDERS: Record<string, (txId: string) => string> = {
  solana: (txId) => `https://solscan.io/tx/${txId}`,
};

/** Transaction-level explorer link for the Buy Feed's Standard style
 *  (UI Bible §14: "Standard" shows "Transaction link"). This assumes
 *  TradeEvent.id IS a real chain transaction signature -- which the wire
 *  contract (chain-adapter.ts's TradeEvent doc) explicitly does NOT
 *  guarantee ("never assumed to be a real transaction signature unless
 *  the provider documents it as one"). It holds true today only because
 *  the ONE real trade provider wired in (HeliusTradeProvider) documents
 *  id as tx.signature, and DexScreener (the only other provider) never
 *  returns any TradeEvents at all (getRecentTrades is undefined for it,
 *  surfaced to the client as supported: false, never a fabricated
 *  event). If a future provider is added whose id is NOT a real
 *  signature, this function must gain a per-provider flag rather than
 *  silently building a broken link -- tracked here, not assumed away. */
export function getTransactionExplorerUrl(chain: string, txId: string): string | null {
  const builder = TX_EXPLORER_URL_BUILDERS[chain.toLowerCase()];
  return builder ? builder(txId) : null;
}
