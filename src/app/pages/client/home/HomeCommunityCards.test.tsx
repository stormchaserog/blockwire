import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import type * as ProjectsModule from '$utils/blockwire/projects';
import { clearDexScreenerTokenImageCacheForTesting } from '$features/project-identity/useDexScreenerTokenImage';
import { HomeCommunityCards } from './HomeCommunityCards';

type MockRoom = {
  roomId: string;
  name: string;
  getJoinedMemberCount: () => number;
  getJoinRule: () => string;
};

const makeRoom = (roomId: string, name: string, members: number, joinRule: string): MockRoom => ({
  roomId,
  name,
  getJoinedMemberCount: () => members,
  getJoinRule: () => joinRule,
});

const rooms: Record<string, MockRoom> = {
  '!wclaw:blockwire.chat': makeRoom('!wclaw:blockwire.chat', 'WCLAW Labs', 12400, 'public'),
  '!team:blockwire.chat': makeRoom('!team:blockwire.chat', 'Core Team', 8, 'invite'),
  '!public:blockwire.chat': makeRoom('!public:blockwire.chat', 'Open Lounge', 847, 'public'),
};

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
  getRoom: (roomId: string) => rooms[roomId] ?? null,
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

const { orphanSpacesMock, unreadMock } = vi.hoisted(() => ({
  orphanSpacesMock: vi.fn<() => string[]>(() => []),
  unreadMock: vi.fn<() => { total: number; highlight: number } | undefined>(() => undefined),
}));

vi.mock('$state/hooks/roomList', () => ({
  useOrphanSpaces: () => orphanSpacesMock(),
  useSpaceChildren: () => [],
  useRecursiveChildScopeFactory: () => () => () => false,
}));

vi.mock('$state/hooks/unread', () => ({
  useRoomsUnread: () => unreadMock(),
}));

vi.mock('$hooks/useRoomMeta', () => ({
  useRoomName: (room: MockRoom) => room.name,
  useRoomAvatar: () => undefined,
}));

vi.mock('$utils/sort', () => ({
  factoryRoomIdByActivity: () => () => 0,
}));

const { fetchProjectBySpace, fetchChainAssets, fetchChainAssetSnapshot } = vi.hoisted(() => ({
  fetchProjectBySpace: vi.fn<(mx: unknown, spaceId: string) => Promise<ProjectRecord | null>>(
    async () => null
  ),
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(
    async () => []
  ),
  fetchChainAssetSnapshot:
    vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<unknown>>(),
}));

vi.mock('$utils/blockwire/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectsModule>();
  return { ...actual, fetchProjectBySpace, fetchChainAssets };
});

vi.mock('$utils/blockwire/chainAssets', () => ({ fetchChainAssetSnapshot }));

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn<(path: string) => void>(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigateMock };
});

const wclawProject: ProjectRecord = {
  project_id: 1,
  slug: 'wclaw',
  name: 'WCLAW Labs',
  ticker: 'WCLAW',
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!wclaw:blockwire.chat',
  owner_mxid: '@steven:blockwire.chat',
  status: 'active',
  owner_verification_state: 'verified',
  created_at: new Date().toISOString(),
};

const wclawAsset: ProjectChainAsset = {
  id: 7,
  project_id: 1,
  chain: 'solana',
  contract_address: 'abc',
  token_symbol: 'WCLAW',
  token_decimals: 9,
  verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
};

// The DexScreener pfp-fallback hook uses global fetch directly; stub it so
// no test ever touches the real network.
const fetchMock = vi.fn<typeof fetch>(async () => ({ ok: true, json: async () => [] }) as Response);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearDexScreenerTokenImageCacheForTesting();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const renderCards = () =>
  render(
    <MemoryRouter>
      <HomeCommunityCards />
    </MemoryRouter>
  );

describe('HomeCommunityCards', () => {
  it('renders nothing at all when the user has joined no spaces', () => {
    orphanSpacesMock.mockReturnValue([]);
    const { container } = renderCards();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the "$TICKER • Chain" line plus live price and 24h change for a project-bound space', async () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(wclawProject);
    fetchChainAssets.mockResolvedValue([wclawAsset]);
    fetchChainAssetSnapshot.mockResolvedValue({
      asset: {},
      snapshots: [],
      canonical: {
        chain: 'solana',
        contractAddress: 'abc',
        name: 'WCLAW',
        symbol: 'WCLAW',
        priceUsd: 0.00042,
        priceChangePercent: { m5: null, h1: null, h6: null, h24: 18.4 },
        volumeUsd24h: null,
        liquidityUsd: null,
        pairAddress: null,
        dexId: null,
        imageUrl: null,
        fetchedAt: new Date().toISOString(),
      },
    });

    renderCards();

    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('$WCLAW • Solana')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('+18.4%')).toBeInTheDocument());
    expect(screen.getByText('$0.000420')).toBeInTheDocument();
  });

  it('still renders "$TICKER • Chain" without price chrome when the snapshot fails', async () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(wclawProject);
    fetchChainAssets.mockResolvedValue([wclawAsset]);
    fetchChainAssetSnapshot.mockRejectedValue(new Error('no snapshot'));

    renderCards();

    await waitFor(() => expect(screen.getByText('$WCLAW • Solana')).toBeInTheDocument());
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('labels a private non-project space "Team Space • Private" with a "Team" pill', async () => {
    orphanSpacesMock.mockReturnValue(['!team:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);

    renderCards();

    await waitFor(() => expect(screen.getByText('Team Space • Private')).toBeInTheDocument());
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.queryByText(/members/)).not.toBeInTheDocument();
  });

  it('omits line 2 entirely for a public non-project space and shows a compact member pill', async () => {
    orphanSpacesMock.mockReturnValue(['!public:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);

    renderCards();

    expect(screen.getByText('Open Lounge')).toBeInTheDocument();
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
    expect(screen.queryByText(/•/)).not.toBeInTheDocument();
    expect(screen.getByText('847 members')).toBeInTheDocument();
  });

  it('shows the member pill in compact K notation for large communities', async () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(wclawProject);
    fetchChainAssets.mockResolvedValue([]);

    renderCards();

    expect(screen.getByText('12.4K members')).toBeInTheDocument();
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
  });

  it('shows the unread line only when there are unreads', async () => {
    orphanSpacesMock.mockReturnValue(['!public:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);
    unreadMock.mockReturnValue({ total: 23, highlight: 0 });

    renderCards();

    expect(screen.getByText('23 unread')).toBeInTheDocument();
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());

    unreadMock.mockReturnValue({ total: 0, highlight: 0 });
    renderCards();
    expect(screen.queryByText('0 unread')).not.toBeInTheDocument();
  });

  it('navigates to the space when a card is tapped', async () => {
    orphanSpacesMock.mockReturnValue(['!public:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);

    renderCards();

    fireEvent.click(screen.getByText('Open Lounge'));
    expect(navigateMock).toHaveBeenCalledWith('/!public%3Ablockwire.chat/lobby');
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
  });
});
