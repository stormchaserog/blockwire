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
  getJoinedMembers: () => { userId: string }[];
  getJoinRule: () => string;
};

const makeRoom = (
  roomId: string,
  name: string,
  members: number,
  joinRule: string,
  memberIds: string[] = []
): MockRoom => ({
  roomId,
  name,
  getJoinedMemberCount: () => members,
  getJoinedMembers: () => memberIds.map((userId) => ({ userId })),
  getJoinRule: () => joinRule,
});

const rooms: Record<string, MockRoom> = {
  '!wclaw:blockwire.chat': makeRoom('!wclaw:blockwire.chat', 'WCLAW Labs', 12400, 'public'),
  '!team:blockwire.chat': makeRoom('!team:blockwire.chat', 'Core Team', 8, 'invite', [
    '@a:blockwire.chat',
    '@b:blockwire.chat',
  ]),
  '!public:blockwire.chat': makeRoom('!public:blockwire.chat', 'Open Lounge', 847, 'public'),
  '!lounge:blockwire.chat': makeRoom('!lounge:blockwire.chat', 'Small Lounge', 300, 'public', [
    '@a:blockwire.chat',
    '@b:blockwire.chat',
    '@c:blockwire.chat',
  ]),
};

/** Presence map consumed by mx.getUser -- mutable per test. */
const presenceByUserId: Record<string, string> = {};

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
  getUserId: () => '@steven:blockwire.chat',
  getRoom: (roomId: string) => rooms[roomId] ?? null,
  getUser: (userId: string) =>
    presenceByUserId[userId] ? { presence: presenceByUserId[userId] } : null,
  on: vi.fn<(event: string, handler: () => void) => void>(),
  removeListener: vi.fn<(event: string, handler: () => void) => void>(),
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

const { fetchProjectBySpace, fetchChainAssets, fetchProjectLinks, fetchChainAssetSnapshot } =
  vi.hoisted(() => ({
    fetchProjectBySpace: vi.fn<(mx: unknown, spaceId: string) => Promise<ProjectRecord | null>>(
      async () => null
    ),
    fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(
      async () => []
    ),
    fetchProjectLinks: vi.fn<(mx: unknown, projectId: number) => Promise<unknown[]>>(
      async () => []
    ),
    fetchChainAssetSnapshot:
      vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<unknown>>(),
  }));

vi.mock('$utils/blockwire/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectsModule>();
  return { ...actual, fetchProjectBySpace, fetchChainAssets, fetchProjectLinks };
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

const wclawSnapshot = {
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
};

// The DexScreener pfp-fallback hook uses global fetch directly; stub it so
// no test ever touches the real network.
const fetchMock = vi.fn<typeof fetch>(async () => ({ ok: true, json: async () => [] }) as Response);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  clearDexScreenerTokenImageCacheForTesting();
  for (const key of Object.keys(presenceByUserId)) delete presenceByUserId[key];
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

  it('renders the "$TICKER • Chain" line plus a prominent price line with the 24h change beside it', async () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(wclawProject);
    fetchChainAssets.mockResolvedValue([wclawAsset]);
    fetchChainAssetSnapshot.mockResolvedValue(wclawSnapshot);

    renderCards();

    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('$WCLAW • Solana')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('+18.4%')).toBeInTheDocument());
    const priceEl = screen.getByText('$0.000420');
    // Price sits on its own line, NOT inside the ticker line, at heading size.
    expect(priceEl.parentElement).not.toContainElement(screen.getByText('$WCLAW • Solana'));
    expect(priceEl.getAttribute('data-font-size') ?? priceEl.className).toBeTruthy();
    // The 24h change shares the price line and carries the success color.
    const changeEl = screen.getByText('+18.4%');
    expect(priceEl.parentElement).toContainElement(changeEl);
  });

  it('colors a negative 24h change with the critical color', async () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(wclawProject);
    fetchChainAssets.mockResolvedValue([wclawAsset]);
    fetchChainAssetSnapshot.mockResolvedValue({
      ...wclawSnapshot,
      canonical: {
        ...wclawSnapshot.canonical,
        priceChangePercent: { m5: null, h1: null, h6: null, h24: -7.2 },
      },
    });

    renderCards();

    const changeEl = await screen.findByText('-7.2%');
    const upEl = screen.queryByText('+18.4%');
    expect(upEl).not.toBeInTheDocument();
    expect(changeEl.style.color).toBeTruthy();
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

  it('shows the unread stat only when there are unreads', async () => {
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

  it('joins unread and online with a dot separator for a public space with online members', async () => {
    orphanSpacesMock.mockReturnValue(['!lounge:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);
    unreadMock.mockReturnValue({ total: 8, highlight: 0 });
    presenceByUserId['@a:blockwire.chat'] = 'online';
    presenceByUserId['@b:blockwire.chat'] = 'offline';
    presenceByUserId['@c:blockwire.chat'] = 'online';

    renderCards();

    expect(screen.getByText('8 unread • 2 online')).toBeInTheDocument();
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
  });

  it('omits the online fragment entirely (never "0 online") when nobody is online', async () => {
    orphanSpacesMock.mockReturnValue(['!lounge:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);
    unreadMock.mockReturnValue({ total: 8, highlight: 0 });

    renderCards();

    expect(screen.getByText('8 unread')).toBeInTheDocument();
    expect(screen.queryByText(/online/)).not.toBeInTheDocument();
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
  });

  it('never shows the online fragment on a private space even with online members', async () => {
    orphanSpacesMock.mockReturnValue(['!team:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue(null);
    presenceByUserId['@a:blockwire.chat'] = 'online';

    renderCards();

    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
    expect(screen.queryByText(/online/)).not.toBeInTheDocument();
  });

  it('appends "N tasks need attention" for a private space bound to an owned project with an incomplete checklist', async () => {
    orphanSpacesMock.mockReturnValue(['!team:blockwire.chat']);
    // Owned by the logged-in user (@steven), missing description + links +
    // chain assets: checklist 2/5 done → 3 outstanding.
    fetchProjectBySpace.mockResolvedValue({
      ...wclawProject,
      space_room_id: '!team:blockwire.chat',
    });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);
    unreadMock.mockReturnValue({ total: 4, highlight: 0 });

    renderCards();

    await waitFor(() =>
      expect(screen.getByText('4 unread • 3 tasks need attention')).toBeInTheDocument()
    );
  });

  it('uses the singular "1 task needs attention" when exactly one checklist item is missing', async () => {
    orphanSpacesMock.mockReturnValue(['!team:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue({
      ...wclawProject,
      space_room_id: '!team:blockwire.chat',
      description: 'A real description',
    });
    fetchChainAssets.mockResolvedValue([wclawAsset]);
    fetchProjectLinks.mockResolvedValue([]);
    fetchChainAssetSnapshot.mockRejectedValue(new Error('no snapshot'));
    unreadMock.mockReturnValue(undefined);

    renderCards();

    await waitFor(() => expect(screen.getByText('1 task needs attention')).toBeInTheDocument());
  });

  it('shows no tasks fragment when the project is not owned by the current user', async () => {
    orphanSpacesMock.mockReturnValue(['!team:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue({
      ...wclawProject,
      space_room_id: '!team:blockwire.chat',
      owner_mxid: '@someoneelse:blockwire.chat',
    });
    fetchChainAssets.mockResolvedValue([]);
    unreadMock.mockReturnValue({ total: 4, highlight: 0 });

    renderCards();

    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
    expect(fetchProjectLinks).not.toHaveBeenCalled();
    expect(screen.getByText('4 unread')).toBeInTheDocument();
    expect(screen.queryByText(/attention/)).not.toBeInTheDocument();
  });

  it('shows no tasks fragment when the owned project checklist is complete', async () => {
    orphanSpacesMock.mockReturnValue(['!team:blockwire.chat']);
    fetchProjectBySpace.mockResolvedValue({
      ...wclawProject,
      space_room_id: '!team:blockwire.chat',
      description: 'A real description',
    });
    fetchChainAssets.mockResolvedValue([wclawAsset]);
    fetchProjectLinks.mockResolvedValue([{ id: 1 }]);
    fetchChainAssetSnapshot.mockRejectedValue(new Error('no snapshot'));

    renderCards();

    await waitFor(() => expect(fetchProjectLinks).toHaveBeenCalled());
    expect(screen.queryByText(/attention/)).not.toBeInTheDocument();
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
