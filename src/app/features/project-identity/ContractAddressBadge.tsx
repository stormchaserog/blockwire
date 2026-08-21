import { useState } from 'react';
import { Box, Text, IconButton, color } from 'folds';
import { ArrowSquareOut, Copy, Check, sizedIcon } from '$components/icons/phosphor';
import { copyToClipboard } from '$utils/dom';
import type { ProjectChainAsset } from '$utils/blockwire/projects';

export type ContractAddressBadgeProps = {
  asset: ProjectChainAsset;
  /** Explorer URL builder is left to the caller rather than hard-coded
   *  here -- which explorer to link to depends on the chain (Solscan for
   *  Solana, Etherscan for EVM, etc.) and that mapping doesn't belong
   *  inside a presentation component. See getExplorerUrl in
   *  chainExplorers.ts for the actual per-chain logic. */
  explorerUrl: string | null;
};

/** UI Bible §13: "The contract address should have: Copy, Chain indicator,
 *  Explorer action, Verification/context state." All four, in one row,
 *  nothing more -- this is a small utility strip, not a card of its own. */
export function ContractAddressBadge({ asset, explorerUrl }: ContractAddressBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(asset.contract_address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const truncated = `${asset.contract_address.slice(0, 6)}…${asset.contract_address.slice(-4)}`;

  return (
    <Box alignItems="Center" gap="200">
      <Text
        size="T200"
        style={{
          color: color.Surface.OnContainer,
          fontFamily: 'monospace',
          textTransform: 'uppercase',
        }}
      >
        {asset.chain}
      </Text>
      <Text size="T300" style={{ fontFamily: 'monospace' }}>
        {truncated}
      </Text>
      <IconButton
        size="300"
        variant="Background"
        radii="300"
        aria-label={copied ? 'Copied' : 'Copy contract address'}
        onClick={handleCopy}
      >
        {copied
          ? sizedIcon(Check, '100', { style: { color: color.Success.Main } })
          : sizedIcon(Copy, '100')}
      </IconButton>
      {explorerUrl && (
        <IconButton
          size="300"
          variant="Background"
          radii="300"
          as="a"
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on block explorer"
        >
          {sizedIcon(ArrowSquareOut, '100')}
        </IconButton>
      )}
    </Box>
  );
}
