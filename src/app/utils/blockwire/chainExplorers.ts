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
