import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import type * as ProjectsModule from '$utils/blockwire/projects';
import { FounderHomeBanner } from './FounderHomeBanner';

const rooms: Record<string, unknown> = {
  '!wclaw:blockwire.chat': {
    roomId: '!wclaw:blockwire.chat',
    getJoinedMemberCount: () => 12400,
    currentState: { getStateEvents: () => null },
  },
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

vi.mock('$hooks/useAlive', () => ({
  useAlive: () => () => true,
}));

vi.mock('$state/hooks/roomList', () => ({
  useSpaceChildren: () => [],
  useRecursiveChildScopeFactory: () => () => () => false,
}));

vi.mock('$state/hooks/unread', () => ({
  useRoomsUnread: () => ({ total: 23, highlight: 0, from: new Set() }),
}));

vi.mock('$hooks/useStateEvent', () => ({
  useStateEvent: () => undefined,
}));

const { fetchChainAssets, fetchChainAssetSnapshot } = vi.hoisted(() => ({
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(
    async () => []
  ),
  fetchChainAssetSnapshot:
    vi.fn<(mx: unknown, projectId: number, assetId: number) => Promise<unknown>>(),
}));

vi.mock('$utils/blockwire/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectsModule>();
  return { ...actual, fetchChainAssets };
});

vi.mock('$utils/blockwire/chainAssets', () => ({ fetchChainAssetSnapshot }));

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn<(path: string) => void>(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigateMock };
});

const projectA: ProjectRecord = {
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
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

const projectB: ProjectRecord = {
  ...projectA,
  project_id: 2,
  slug: 'other',
  name: 'Other Project',
  space_room_id: '!missing-room:blockwire.chat',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('FounderHomeBanner', () => {
  it('lists every owned project whose room has resolved locally', async () => {
    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA]} />
      </MemoryRouter>
    );
    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
    await waitFor(() => expect(fetchChainAssets).toHaveBeenCalled());
  });

  it('silently skips a project whose space room has not resolved locally yet, instead of crashing the whole card list', async () => {
    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA, projectB]} />
      </MemoryRouter>
    );
    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
    expect(screen.queryByText('Other Project')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchChainAssets).toHaveBeenCalled());
  });

  it('navigates straight to that project\'s Hub when tapped -- the whole point is one tap from Home to "what needs attention", not a detour through the Project Identity page first', async () => {
    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA]} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('WCLAW Labs'));
    expect(navigateMock).toHaveBeenCalledWith('/!wclaw%3Ablockwire.chat/hub');
    await waitFor(() => expect(fetchChainAssets).toHaveBeenCalled());
  });

  it('shows the real aggregate unread count and real member count, not placeholders', async () => {
    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA]} />
      </MemoryRouter>
    );
    expect(screen.getByText('23 unread')).toBeInTheDocument();
    expect(screen.getByText('12,400 members')).toBeInTheDocument();
    await waitFor(() => expect(fetchChainAssets).toHaveBeenCalled());
  });

  it('shows live price and 24h change once the chain asset snapshot resolves', async () => {
    fetchChainAssets.mockResolvedValueOnce([
      {
        id: 7,
        project_id: 1,
        chain: 'solana',
        contract_address: 'abc',
        token_symbol: 'WCLAW',
        token_decimals: 9,
        verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);
    fetchChainAssetSnapshot.mockResolvedValueOnce({
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

    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA]} />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('+18.4%')).toBeInTheDocument());
  });
});
