import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ContractAddressBadge } from './ContractAddressBadge';
import type { ProjectChainAsset } from '$utils/blockwire/projects';

const { copyToClipboard } = vi.hoisted(() => ({
  copyToClipboard: vi.fn<(text: string) => Promise<boolean>>(),
}));

vi.mock('$utils/dom', () => ({ copyToClipboard }));

afterEach(() => {
  vi.clearAllMocks();
});

function makeAsset(overrides: Partial<ProjectChainAsset> = {}): ProjectChainAsset {
  return {
    id: 1, project_id: 42, chain: 'solana', contract_address: 'SoLTest1111111111111111111111111111abcd',
    token_symbol: 'TEST', token_decimals: 9, verified_control_state: 'unverified',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('ContractAddressBadge', () => {
  it('shows the chain and a truncated address, not the full raw string', () => {
    render(<ContractAddressBadge asset={makeAsset()} explorerUrl={null} />);
    expect(screen.getByText('solana')).toBeInTheDocument();
    expect(screen.getByText('SoLTes…abcd')).toBeInTheDocument();
    expect(screen.queryByText('SoLTest1111111111111111111111111111abcd')).not.toBeInTheDocument();
  });

  it('copies the FULL untruncated address to the clipboard, not the display string', async () => {
    copyToClipboard.mockResolvedValue(true);
    render(<ContractAddressBadge asset={makeAsset()} explorerUrl={null} />);
    fireEvent.click(screen.getByRole('button', { name: /copy contract address/i }));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('SoLTest1111111111111111111111111111abcd'));
  });

  it('renders no explorer button when no explorer URL is available for this chain', () => {
    render(<ContractAddressBadge asset={makeAsset()} explorerUrl={null} />);
    expect(screen.queryByRole('link', { name: /block explorer/i })).not.toBeInTheDocument();
  });

  it('renders a working explorer link when a URL is available', () => {
    render(
      <ContractAddressBadge asset={makeAsset()} explorerUrl="https://solscan.io/token/SoLTest111" />
    );
    const link = screen.getByRole('link', { name: /block explorer/i });
    expect(link).toHaveAttribute('href', 'https://solscan.io/token/SoLTest111');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
