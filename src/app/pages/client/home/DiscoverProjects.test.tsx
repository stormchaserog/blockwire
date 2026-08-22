import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import type * as ProjectsModule from '$utils/blockwire/projects';
import { getExplorePath } from '$pages/pathUtils';
import { clearDexScreenerTokenImageCacheForTesting } from '$features/project-identity/useDexScreenerTokenImage';
import { DiscoverProjects } from './DiscoverProjects';

const joinedRooms: Record<string, { getMyMembership: () => string }> = {
  '!joined:blockwire.chat': { getMyMembership: () => 'join' },
};

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
  getRoom: (roomId: string) => joinedRooms[roomId] ?? null,
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('$hooks/useMediaAuthentication', () => ({
  useMediaAuthentication: () => false,
}));

const stableAlive = () => true;
vi.mock('$hooks/useAlive', () => ({
  useAlive: () => stableAlive,
}));

const { fetchDiscoverProjects, fetchChainAssets, fetchChainAssetSnapshot } = vi.hoisted(() => ({
  fetchDiscoverProjects: vi.fn<(mx: unknown) => Promise<ProjectRecord[]>>(async () => []),
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(
    async () => []
  ),
  fetchChainAssetSnapshot:
    vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<unknown>>(),
}));

vi.mock('$utils/blockwire/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectsModule>();
  return { ...actual, fetchDiscoverProjects, fetchChainAssets };
});

vi.mock('$utils/blockwire/chainAssets', () => ({ fetchChainAssetSnapshot }));

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn<(path: string) => void>(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigateMock };
});

const makeProject = (id: number, name: string, spaceRoomId: string): ProjectRecord => ({
  project_id: id,
  slug: `p${id}`,
  name,
  ticker: 'TKN',
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: spaceRoomId,
  owner_mxid: '@founder:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
});

const fetchMock = vi.fn<typeof fetch>(async () => ({ ok: true, json: async () => [] }) as Response);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearDexScreenerTokenImageCacheForTesting();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const renderDiscover = () =>
  render(
    <MemoryRouter>
      <DiscoverProjects />
    </MemoryRouter>
  );

describe('DiscoverProjects', () => {
  it('renders nothing when the public directory has no projects for this user', async () => {
    fetchDiscoverProjects.mockResolvedValue([]);
    const { container } = renderDiscover();
    await waitFor(() => expect(fetchDiscoverProjects).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the header, "View all" link, and project cards with the $TICKER line', async () => {
    fetchDiscoverProjects.mockResolvedValue([
      makeProject(1, 'Moon Machine', '!moon:blockwire.chat'),
    ]);

    renderDiscover();

    await waitFor(() => expect(screen.getByText('Discover Projects')).toBeInTheDocument());
    expect(screen.getByText('Moon Machine')).toBeInTheDocument();
    expect(screen.getByText('$TKN')).toBeInTheDocument();

    fireEvent.click(screen.getByText('View all'));
    expect(navigateMock).toHaveBeenCalledWith(getExplorePath());
  });

  it('excludes projects whose space the user has already joined', async () => {
    fetchDiscoverProjects.mockResolvedValue([
      makeProject(1, 'Already Home', '!joined:blockwire.chat'),
      makeProject(2, 'New Frontier', '!frontier:blockwire.chat'),
    ]);

    renderDiscover();

    await waitFor(() => expect(screen.getByText('New Frontier')).toBeInTheDocument());
    expect(screen.queryByText('Already Home')).not.toBeInTheDocument();
  });

  it('caps the scroller at 10 cards', async () => {
    fetchDiscoverProjects.mockResolvedValue(
      Array.from({ length: 14 }, (_, i) => makeProject(i + 1, `Project ${i + 1}`, `!p${i + 1}:x`))
    );

    renderDiscover();

    await waitFor(() => expect(screen.getByText('Project 1')).toBeInTheDocument());
    expect(screen.getByText('Project 10')).toBeInTheDocument();
    expect(screen.queryByText('Project 11')).not.toBeInTheDocument();
  });

  it('shows the 24h change once the snapshot resolves, colored by direction', async () => {
    fetchDiscoverProjects.mockResolvedValue([
      makeProject(1, 'Moon Machine', '!moon:blockwire.chat'),
    ]);
    fetchChainAssets.mockResolvedValue([
      {
        id: 3,
        project_id: 1,
        chain: 'solana',
        contract_address: 'abc',
        token_symbol: 'TKN',
        token_decimals: 9,
        verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchChainAssetSnapshot.mockResolvedValue({
      asset: {},
      snapshots: [],
      canonical: {
        chain: 'solana',
        contractAddress: 'abc',
        name: 'TKN',
        symbol: 'TKN',
        priceUsd: 1.23,
        priceChangePercent: { m5: null, h1: null, h6: null, h24: -4.2 },
        volumeUsd24h: null,
        liquidityUsd: null,
        pairAddress: null,
        dexId: null,
        imageUrl: null,
        fetchedAt: new Date().toISOString(),
      },
    });

    renderDiscover();

    await waitFor(() => expect(screen.getByText('-4.2%')).toBeInTheDocument());
  });

  it('navigates to the project space when a card is tapped', async () => {
    fetchDiscoverProjects.mockResolvedValue([
      makeProject(1, 'Moon Machine', '!moon:blockwire.chat'),
    ]);

    renderDiscover();

    await waitFor(() => expect(screen.getByText('Moon Machine')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Moon Machine'));
    expect(navigateMock).toHaveBeenCalledWith('/!moon%3Ablockwire.chat/lobby');
  });
});
