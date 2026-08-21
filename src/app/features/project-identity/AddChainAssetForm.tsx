import type { FormEventHandler, ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { Box, color, Input, Text } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAlive } from '$hooks/useAlive';
import { addChainAsset, type ProjectChainAsset } from '$utils/blockwire/projects';
import { Button } from '$components/button';
import { Warning, sizedIcon } from '$components/icons/phosphor';

type AddChainAssetFormProps = {
  projectId: number;
  onAdded: (asset: ProjectChainAsset) => void;
};

/** PRD §8/§14: a project's chain + contract address is the data everything
 *  else (Buy Feed, Whale Alerts, the price card) depends on. Without a way
 *  to add one, those features are correctly built but permanently starved
 *  of data -- this form is that missing link, added directly to the
 *  addChainAsset() call that already existed and was already tested. */
export function AddChainAssetForm({ projectId, onAdded }: AddChainAssetFormProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [chain, setChain] = useState('solana');

  const [addState, add] = useAsyncCallback<
    ProjectChainAsset,
    Error,
    [{ chain: string; contractAddress: string; tokenSymbol?: string }]
  >(
    useCallback(
      (data) =>
        addChainAsset(mx, projectId, {
          chain: data.chain,
          contractAddress: data.contractAddress,
          tokenSymbol: data.tokenSymbol || null,
        }),
      [mx, projectId]
    )
  );

  const loading = addState.status === AsyncStatus.Loading;
  const error = addState.status === AsyncStatus.Error ? addState.error : undefined;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (loading) return;
    const form = evt.currentTarget;
    const addressInput = form.contractAddressInput as HTMLInputElement | undefined;
    const symbolInput = form.tokenSymbolInput as HTMLInputElement | undefined;

    const contractAddress = addressInput?.value.trim();
    if (!contractAddress || !addressInput) return;

    add({ chain, contractAddress, tokenSymbol: symbolInput?.value.trim() }).then((asset) => {
      if (alive() && asset) {
        addressInput.value = '';
        if (symbolInput) symbolInput.value = '';
        onAdded(asset);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="300">
      <Box direction="Column" gap="100">
        <Text size="L400">Chain</Text>
        <Input
          name="chainInput"
          size="400"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={loading}
          value={chain}
          onChange={(evt: ChangeEvent<HTMLInputElement>) => setChain(evt.target.value)}
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">Contract Address</Text>
        <Input
          required
          name="contractAddressInput"
          size="400"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={loading}
          placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">Token Symbol (Optional)</Text>
        <Input
          name="tokenSymbolInput"
          size="400"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={loading}
          placeholder="e.g. USDC"
        />
      </Box>
      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          {sizedIcon(Warning, '100', { filled: true })}
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>{error.message}</b>
          </Text>
        </Box>
      )}
      <Box>
        <Button type="submit" size="400" variant="Primary" radii="400" loading={loading}>
          <Text size="B400">Add Token</Text>
        </Button>
      </Box>
    </Box>
  );
}
