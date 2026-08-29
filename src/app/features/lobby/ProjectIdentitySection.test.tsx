import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ProjectIdentitySection } from './ProjectIdentitySection';
import type {
  ProjectRecord,
  ProjectChainAsset,
  ProjectLinkRecord,
} from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
  useOptionalMatrixClient: () => mockMatrixClient,
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

// ProjectIdentityContent renders the shared ProjectInfoOverview, which
// imports each display component directly from its own module, NOT through
// the $features/project-identity barrel -- so mocking the barrel has no
// effect on what actually renders. Each concrete module needs its own mock.
// Real price-card network/timer behavior is already covered by
// TokenPriceCard.test.tsx / ProjectChainAssetPrice; this test only cares
// whether the section (via the real useProjectIdentity + real
// ProjectIdentityContent) decides to render each piece AT ALL, so a stub
// that reports its own props is a faithful, low-noise stand-in.
vi.mock('$features/project-identity/ProjectChainAssetPrice', () => ({
  ProjectChainAssetPrice: ({
    projectId,
    chainAssetId,
  }: {
    projectId: number;
    chainAssetId: number;
  }) => (
    <div data-testid="price-card">
      project {projectId} asset {chainAssetId}
    </div>
  ),
}));

// The sparkline history hook fetches GeckoTerminal; a unit test must never
// hit the network. Its real behavior has its own test file.
vi.mock('$features/project-identity/useTokenPriceHistory', () => ({
  useTokenPriceHistory: () => null,
}));

// The Jupiter verification hook also fetches; a unit test must never hit
// the network. null = the row is omitted, which is what these tests want.
vi.mock('$features/project-identity/useJupiterVerification', () => ({
  useJupiterVerification: () => null,
}));

vi.mock('$features/project-identity/VerificationBadge', () => ({
  VerificationBadge: ({ state, label }: { state: string; label: string }) =>
    state === 'unverified' ? null : (
      <div data-testid={`verification-badge-${label.replace(/\s+/g, '-').toLowerCase()}`}>
        {label}
      </div>
    ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

// ProjectInfoOverview's action tiles navigate via useNavigate, so the
// section must render inside a router the same way it does in the app.
function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const baseProject: ProjectRecord = {
  project_id: 42,
  slug: 'test-proj',
  name: 'Test Project',
  ticker: null,
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!bound:blockwire.chat',
  owner_mxid: '@owner:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('ProjectIdentitySection', () => {
  it('renders nothing for an ordinary space with no bound project (Bible §3: progressive disclosure)', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    const { container } = renderWithRouter(
      <ProjectIdentitySection spaceRoomId="!plain:blockwire.chat" />
    );
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(fetchChainAssets).not.toHaveBeenCalled();
    expect(fetchProjectLinks).not.toHaveBeenCalled();
  });

  it('renders nothing while still checking, not a flash of empty content', () => {
    fetchProjectBySpace.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderWithRouter(
      <ProjectIdentitySection spaceRoomId="!pending:blockwire.chat" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the project name exactly once, in the hero (identity never duplicated on the page)', async () => {
    fetchProjectBySpace.mockResolvedValue({
      ...baseProject,
      description: 'A project for testing.',
    });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
    expect(screen.getAllByText('Test Project')).toHaveLength(1);
    // The locked mock's hero is avatar / name / ticker-chain line only --
    // no separate description block repeating identity below it.
    expect(screen.queryByText('A project for testing.')).not.toBeInTheDocument();
  });

  it('shows no "Project Owner Verified" badge for an unverified owner (the default, common case)', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject); // owner_verification_state: 'unverified'
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByText('Test Project');
    expect(
      screen.queryByTestId('verification-badge-project-owner-verified')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Verified Project')).not.toBeInTheDocument();
  });

  it('shows the "Project Owner Verified" badge and the Verified Project line once the owner is verified', async () => {
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, owner_verification_state: 'verified' });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(
      await screen.findByTestId('verification-badge-project-owner-verified')
    ).toHaveTextContent('Project Owner Verified');
    expect(screen.getByText('Verified Project')).toBeInTheDocument();
  });

  it('renders the ticker with a leading $ when the project has one', async () => {
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, ticker: 'TEST' });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('$TEST')).toBeInTheDocument();
  });

  it('does not render a ticker element at all when the project has none', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByText('Test Project');
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it('renders the "$TICKER • Chain" hero line once the project has a chain asset', async () => {
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, ticker: 'TEST' });
    fetchChainAssets.mockResolvedValue([
      {
        id: 7,
        project_id: 42,
        chain: 'solana',
        contract_address: 'Sol1FullAddressString',
        token_symbol: 'TEST',
        token_decimals: 9,
        verified_control_state: 'verified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('$TEST • Solana')).toBeInTheDocument();
  });

  it('renders the price card and truncated contract row -- never the raw full address or an inline buy feed', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      {
        id: 7,
        project_id: 42,
        chain: 'solana',
        contract_address: 'Sol1FullAddressString',
        token_symbol: 'TEST',
        token_decimals: 9,
        verified_control_state: 'verified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 7');
    // Details card shows 3+4 truncation with a copy control; the raw full
    // string appears nowhere on the tab (identity/details never duplicated).
    expect(screen.getByText('Sol…ring')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy contract address')).toBeInTheDocument();
    expect(screen.queryByText('Sol1FullAddressString')).not.toBeInTheDocument();
    // The Buy/Sell trades feed (Bible §14) is its own surface, reachable
    // via the Buy Feed tile -- never a raw list embedded on this tab.
    expect(screen.getByText('Buy Feed')).toBeInTheDocument();
    expect(screen.queryByTestId('buy-feed')).not.toBeInTheDocument();
  });

  it('renders no chain-asset UI at all when the project has zero chain assets', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByText('Test Project');
    expect(screen.queryByTestId('price-card')).not.toBeInTheDocument();
    expect(screen.queryByText('Contract Address')).not.toBeInTheDocument();
    expect(screen.queryByText('Chart')).not.toBeInTheDocument();
  });

  it('shows no chip selector for a single chain asset (only render the choice when there is one)', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      {
        id: 7,
        project_id: 42,
        chain: 'solana',
        contract_address: 'Sol1',
        token_symbol: 'TEST',
        token_decimals: 9,
        verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    await screen.findByTestId('price-card');
    // Chips carry aria-pressed; action tiles and the copy button don't --
    // so zero pressed/unpressed buttons means zero chips.
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { pressed: false })).toHaveLength(0);
  });

  it('defaults to the first chain asset and lets a chip switch which one is shown', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      {
        id: 7,
        project_id: 42,
        chain: 'solana',
        contract_address: 'SolFirstAddr',
        token_symbol: 'FIRST',
        token_decimals: 9,
        verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
      {
        id: 9,
        project_id: 42,
        chain: 'solana',
        contract_address: 'SolSecondAddr',
        token_symbol: 'SECOND',
        token_decimals: 9,
        verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);

    // Defaults to the first asset.
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 7');
    expect(screen.getByText('FIRST')).toBeInTheDocument();
    expect(screen.getByText('SECOND')).toBeInTheDocument();
    expect(screen.getByText('Sol…Addr')).toBeInTheDocument();

    // Switching the chip swaps which asset's data renders.
    const user = userEvent.setup();
    await user.click(screen.getByText('SECOND'));
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 9');
  });

  it('renders Website and X rows in the details card from the official links, omitting X when absent', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([
      {
        id: 1,
        project_id: 42,
        link_type: 'website',
        url: 'https://example.com',
        verification_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);

    renderWithRouter(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('Website')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    // No X link seeded → the row is omitted entirely, never fabricated.
    expect(screen.queryByText('X (Twitter)')).not.toBeInTheDocument();
  });

  it('treats a fetch failure the same as "no project" rather than showing an error card', async () => {
    fetchProjectBySpace.mockRejectedValue(new Error('network blip'));
    const { container } = renderWithRouter(
      <ProjectIdentitySection spaceRoomId="!flaky:blockwire.chat" />
    );
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
