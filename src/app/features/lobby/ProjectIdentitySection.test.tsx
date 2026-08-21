import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ProjectIdentitySection } from './ProjectIdentitySection';
import type { ProjectRecord, ProjectChainAsset, ProjectLinkRecord } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchProjectBySpace, fetchChainAssets, fetchProjectLinks } = vi.hoisted(() => ({
  fetchProjectBySpace: vi.fn<(mx: unknown, spaceRoomId: string) => Promise<ProjectRecord | null>>(),
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(),
  fetchProjectLinks: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectLinkRecord[]>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({
  fetchProjectBySpace,
  fetchChainAssets,
  fetchProjectLinks,
}));

vi.mock('$utils/blockwire/chainExplorers', () => ({
  getExplorerUrl: (chain: string, address: string) => `https://explorer.test/${chain}/${address}`,
}));

vi.mock('$features/project-identity', () => ({
  // Real component network/timer behavior is already covered by
  // TokenPriceCard.test.tsx / ProjectChainAssetPrice; this test only cares
  // whether the section decides to render it AT ALL, so a stub that
  // reports its own props is a faithful, low-noise stand-in.
  ProjectChainAssetPrice: ({ projectId, chainAssetId }: { projectId: number; chainAssetId: number }) => (
    <div data-testid="price-card">
      project {projectId} asset {chainAssetId}
    </div>
  ),
  ContractAddressBadge: ({ asset }: { asset: ProjectChainAsset }) => (
    <div data-testid="contract-badge">{asset.contract_address}</div>
  ),
  VerificationBadge: ({ state, label }: { state: string; label: string }) =>
    state === 'unverified' ? null : (
      <div data-testid={`verification-badge-${label.replace(/\s+/g, '-').toLowerCase()}`}>
        {label}
      </div>
    ),
  OfficialLinksVault: ({ links }: { links: ProjectLinkRecord[] }) =>
    links.length === 0 ? null : (
      <div data-testid="links-vault">
        {links.map((l) => (
          <span key={l.id}>{l.link_type}</span>
        ))}
      </div>
    ),
  BuyFeed: ({ projectId, chainAssetId }: { projectId: number; chainAssetId: number }) => (
    <div data-testid="buy-feed">
      buy-feed project {projectId} asset {chainAssetId}
    </div>
  ),
  ProjectBanner: () => null,
}));

afterEach(() => {
  vi.clearAllMocks();
});

const baseProject: ProjectRecord = {
  project_id: 42, slug: 'test-proj', name: 'Test Project', ticker: null,
  description: null, avatar_url: null, banner_url: null,
  space_room_id: '!bound:blockwire.chat', owner_mxid: '@owner:blockwire.chat',
  status: 'active', owner_verification_state: 'unverified', created_at: new Date().toISOString(),
};

describe('ProjectIdentitySection', () => {
  it('renders nothing for an ordinary space with no bound project (Bible §3: progressive disclosure)', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    const { container } = render(<ProjectIdentitySection spaceRoomId="!plain:blockwire.chat" />);
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(fetchChainAssets).not.toHaveBeenCalled();
    expect(fetchProjectLinks).not.toHaveBeenCalled();
  });

  it('renders nothing while still checking, not a flash of empty content', () => {
    fetchProjectBySpace.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<ProjectIdentitySection spaceRoomId="!pending:blockwire.chat" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the project name and description once a bound project is found', async () => {
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, description: 'A project for testing.' });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A project for testing.')).toBeInTheDocument();
  });

  it('shows no "Project Owner Verified" badge for an unverified owner (the default, common case)', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject); // owner_verification_state: 'unverified'
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByText('Test Project');
    expect(screen.queryByTestId('verification-badge-project-owner-verified')).not.toBeInTheDocument();
  });

  it('shows the "Project Owner Verified" badge once the owner is verified', async () => {
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, owner_verification_state: 'verified' });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByTestId('verification-badge-project-owner-verified')).toHaveTextContent(
      'Project Owner Verified',
    );
  });

  it('renders the ticker with a leading $ when the project has one', async () => {
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, ticker: 'TEST' });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('$TEST')).toBeInTheDocument();
  });

  it('does not render a ticker element at all when the project has none', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByText('Test Project');
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it('renders the price card, contract badge, and verification badge once the project has a chain asset', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      {
        id: 7, project_id: 42, chain: 'solana', contract_address: 'Sol1',
        token_symbol: 'TEST', token_decimals: 9, verified_control_state: 'verified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 7');
    expect(screen.getByTestId('contract-badge')).toHaveTextContent('Sol1');
    expect(screen.getByTestId('verification-badge-contract-verified')).toHaveTextContent('Contract Verified');
    expect(screen.getByTestId('buy-feed')).toHaveTextContent('buy-feed project 42 asset 7');
  });

  it('renders no chain-asset UI at all when the project has zero chain assets', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByText('Test Project');
    expect(screen.queryByTestId('price-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contract-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('buy-feed')).not.toBeInTheDocument();
  });

  it('shows no chip selector for a single chain asset (only render the choice when there is one)', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      {
        id: 7, project_id: 42, chain: 'solana', contract_address: 'Sol1',
        token_symbol: 'TEST', token_decimals: 9, verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByTestId('price-card');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('defaults to the first chain asset and lets a chip switch which one is shown', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      {
        id: 7, project_id: 42, chain: 'solana', contract_address: 'SolFirst',
        token_symbol: 'FIRST', token_decimals: 9, verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
      {
        id: 9, project_id: 42, chain: 'solana', contract_address: 'SolSecond',
        token_symbol: 'SECOND', token_decimals: 9, verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);

    // Defaults to the first asset.
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 7');
    expect(screen.getByText('FIRST')).toBeInTheDocument();
    expect(screen.getByText('SECOND')).toBeInTheDocument();

    // Switching the chip swaps which asset's data renders.
    const user = userEvent.setup();
    await user.click(screen.getByText('SECOND'));
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 9');
    expect(screen.getByTestId('contract-badge')).toHaveTextContent('SolSecond');
  });

  it('renders the Official Links Vault once the project has official links', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([
      {
        id: 1, project_id: 42, link_type: 'website', url: 'https://example.com',
        verification_state: 'unverified', created_at: new Date().toISOString(),
      },
    ]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByTestId('links-vault')).toHaveTextContent('website');
  });

  it('treats a fetch failure the same as "no project" rather than showing an error card', async () => {
    fetchProjectBySpace.mockRejectedValue(new Error('network blip'));
    const { container } = render(<ProjectIdentitySection spaceRoomId="!flaky:blockwire.chat" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
