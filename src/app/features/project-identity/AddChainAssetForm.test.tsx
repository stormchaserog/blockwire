import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { AddChainAssetForm } from './AddChainAssetForm';
import type { ProjectChainAsset } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { addChainAsset } = vi.hoisted(() => ({
  addChainAsset:
    vi.fn<
      (
        mx: unknown,
        projectId: number,
        params: { chain: string; contractAddress: string; tokenSymbol?: string | null }
      ) => Promise<ProjectChainAsset>
    >(),
}));

vi.mock('$utils/blockwire/projects', () => ({ addChainAsset }));

afterEach(() => {
  vi.clearAllMocks();
});

const madeAsset: ProjectChainAsset = {
  id: 7,
  project_id: 42,
  chain: 'solana',
  contract_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  token_symbol: 'USDC',
  token_decimals: null,
  verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
};

// jsdom lacks named form-element properties (form.contractAddressInput),
// which the component relies on in real browsers -- same documented
// workaround as SecretStorage.test.tsx.
const defineNamedElement = (form: HTMLFormElement, input: HTMLInputElement) => {
  Object.defineProperty(form, input.name, { value: input, configurable: true });
};

const submitForm = (form: HTMLFormElement) => {
  form.querySelectorAll('input').forEach((input) => defineNamedElement(form, input));
  fireEvent.submit(form);
};

describe('AddChainAssetForm', () => {
  it('is disabled without a contract address -- addChainAsset() is never called for an empty submission', () => {
    const onAdded = vi.fn<(asset: ProjectChainAsset) => void>();
    render(<AddChainAssetForm projectId={42} onAdded={onAdded} />);

    submitForm(screen.getByRole('button', { name: /add token/i }).closest('form')!);

    expect(addChainAsset).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('calls addChainAsset with the entered chain/address/symbol and reports the created asset back', async () => {
    addChainAsset.mockResolvedValue(madeAsset);
    const onAdded = vi.fn<(asset: ProjectChainAsset) => void>();
    render(<AddChainAssetForm projectId={42} onAdded={onAdded} />);

    fireEvent.change(screen.getByPlaceholderText(/EPjFWdd5Aufq/i), {
      target: { value: madeAsset.contract_address },
    });
    fireEvent.change(screen.getByPlaceholderText(/USDC/i), {
      target: { value: 'USDC' },
    });
    submitForm(screen.getByRole('button', { name: /add token/i }).closest('form')!);

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(madeAsset));
    expect(addChainAsset).toHaveBeenCalledWith(mockMatrixClient, 42, {
      chain: 'solana',
      contractAddress: madeAsset.contract_address,
      tokenSymbol: 'USDC',
    });
  });

  it('surfaces a server error instead of silently failing', async () => {
    addChainAsset.mockRejectedValue(new Error('Could not add this chain asset.'));
    render(
      <AddChainAssetForm projectId={42} onAdded={vi.fn<(asset: ProjectChainAsset) => void>()} />
    );

    fireEvent.change(screen.getByPlaceholderText(/EPjFWdd5Aufq/i), {
      target: { value: 'anything' },
    });
    submitForm(screen.getByRole('button', { name: /add token/i }).closest('form')!);

    expect(await screen.findByText('Could not add this chain asset.')).toBeInTheDocument();
  });
});
