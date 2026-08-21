import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { SpaceHub } from './Hub';
import type {
  ProjectRecord,
  ProjectChainAsset,
  ProjectLinkRecord,
} from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
  getUserId: () => '@owner:blockwire.chat',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('$hooks/useSpace', () => ({
  useSpace: () => ({ roomId: '!bound:blockwire.chat', name: 'Test Space' }),
}));

vi.mock('$hooks/usePowerLevels', () => ({
  usePowerLevels: () => ({}),
}));

vi.mock('$hooks/useRoomCreators', () => ({
  useRoomCreators: () => new Set(['@owner:blockwire.chat']),
}));

const { stateEventMock } = vi.hoisted(() => ({
  stateEventMock: vi.fn<(type: string, userId: string) => boolean>(() => true),
}));

vi.mock('$hooks/useRoomPermissions', () => ({
  useRoomPermissions: () => ({
    event: () => true,
    message: () => true,
    stateEvent: stateEventMock,
    action: () => true,
    notificationAction: () => true,
  }),
}));

vi.mock('$hooks/useScreenSize', () => ({
  ScreenSize: { Mobile: 'Mobile', Tablet: 'Tablet', Desktop: 'Desktop' },
  useScreenSizeContext: () => 'Desktop',
}));

vi.mock('$components/BackRouteHandler', () => ({
  BackRouteHandler: () => null,
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

afterEach(() => {
  vi.clearAllMocks();
});

const baseProject: ProjectRecord = {
  project_id: 42,
  slug: 'test-proj',
  name: 'Test Project',
  ticker: 'TEST',
  description: 'A real project description',
  avatar_url: null,
  banner_url: null,
  space_room_id: '!bound:blockwire.chat',
  owner_mxid: '@owner:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

const chainAsset: ProjectChainAsset = {
  id: 1,
  project_id: 42,
  chain: 'solana',
  contract_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  token_symbol: 'USDC',
  token_decimals: null,
  verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
};

const link: ProjectLinkRecord = {
  id: 1,
  project_id: 42,
  link_type: 'website',
  url: 'https://blockwire.chat',
  verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('SpaceHub', () => {
  it('shows a loading state before the project check resolves', () => {
    fetchProjectBySpace.mockReturnValue(new Promise(() => {}));
    render(<SpaceHub />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows an explicit "no project" state for a space with none bound', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    render(<SpaceHub />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
  });

  it('refuses to show the Hub to an ordinary member -- this is project-management surface, not something every community member should reach', async () => {
    stateEventMock.mockReturnValue(false);
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<SpaceHub />);
    expect(await screen.findByText('Hub is for project admins')).toBeInTheDocument();
  });

  it('computes setup completeness honestly from real project data -- nothing here is simulated or hardcoded', async () => {
    stateEventMock.mockReturnValue(true);
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([chainAsset]);
    fetchProjectLinks.mockResolvedValue([link]);

    render(<SpaceHub />);
    // description + ticker + 1 chain asset + 1 link = 4 of 5 (owner not verified).
    expect(await screen.findByText('Setup Completeness (4/5)')).toBeInTheDocument();
  });

  it('reflects an incomplete project honestly -- no token or link added yet', async () => {
    stateEventMock.mockReturnValue(true);
    fetchProjectBySpace.mockResolvedValue({ ...baseProject, description: null, ticker: null });
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<SpaceHub />);
    expect(await screen.findByText('Setup Completeness (0/5)')).toBeInTheDocument();
  });

  it('never claims to be an investment rating', async () => {
    stateEventMock.mockReturnValue(true);
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<SpaceHub />);
    await waitFor(() => expect(screen.getByText(/not an investment rating/i)).toBeInTheDocument());
  });
});
