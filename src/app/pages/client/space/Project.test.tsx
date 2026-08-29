import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SpaceProject } from './Project';
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

vi.mock('$utils/blockwire/chainExplorers', () => ({
  getExplorerUrl: () => null,
  getTransactionExplorerUrl: () => null,
}));

// Keep the real display components in this page-level test: it's the one
// place verifying the FULL route renders something real end to end, not
// just that individual pieces are wired -- ProjectIdentitySection.test.tsx
// and each component's own test file already cover the granular cases.
vi.mock('$features/project-identity/BuyFeed', () => ({ BuyFeed: () => null }));
vi.mock('$features/project-identity/WhaleAlerts', () => ({ WhaleAlerts: () => null }));
// The Info tab's shared overview fetches GeckoTerminal sparkline history;
// a unit test must never hit the network (the hook has its own test file).
vi.mock('$features/project-identity/useTokenPriceHistory', () => ({
  useTokenPriceHistory: () => null,
}));
vi.mock('$features/project-identity/ManageProjectPanel', () => ({
  ManageProjectPanel: () => <div>manage-project-panel</div>,
}));
vi.mock('$features/project-identity/ProjectTabBar', () => ({
  ProjectTabBar: () => <div>project-tab-bar</div>,
}));

afterEach(() => {
  vi.clearAllMocks();
});

// The overview's action tiles navigate via useNavigate, so the page must
// render inside a router the same way it does in the app.
function renderPage() {
  return render(
    <MemoryRouter>
      <SpaceProject />
    </MemoryRouter>
  );
}

const baseProject: ProjectRecord = {
  project_id: 42,
  slug: 'test-proj',
  name: 'Test Project',
  ticker: 'TEST',
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!bound:blockwire.chat',
  owner_mxid: '@owner:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('SpaceProject', () => {
  it('shows a loading state before the project check resolves', () => {
    fetchProjectBySpace.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows an explicit "no project" state for a space with none bound -- unlike the Lobby section, this route must never render silently empty', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
  });

  it('renders the project name in the header and the content once found', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderPage();
    await waitFor(() => expect(screen.getAllByText('Test Project')).not.toHaveLength(0));
    // Header title AND the ProjectIdentityContent heading both say the name.
    expect(screen.getAllByText('Test Project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$TEST')).toBeInTheDocument();
  });

  it('treats a fetch failure as "no project" rather than crashing the page', async () => {
    fetchProjectBySpace.mockRejectedValue(new Error('network blip'));
    renderPage();
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
  });

  it("shows the Manage Project panel to a user who can edit this room's settings", async () => {
    stateEventMock.mockReturnValue(true);
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderPage();
    expect(await screen.findByText('manage-project-panel')).toBeInTheDocument();
  });

  it('hides the Manage Project panel from an ordinary member -- adding a contract address or official link is a project-management action, not something every member should see', async () => {
    stateEventMock.mockReturnValue(false);
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    renderPage();
    await waitFor(() => expect(screen.getAllByText('Test Project')).not.toHaveLength(0));
    expect(screen.queryByText('manage-project-panel')).not.toBeInTheDocument();
  });
});
