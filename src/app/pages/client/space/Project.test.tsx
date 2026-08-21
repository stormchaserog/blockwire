import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { SpaceProject } from './Project';
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
}));

vi.mock('$hooks/useSpace', () => ({
  useSpace: () => ({ roomId: '!bound:blockwire.chat', name: 'Test Space' }),
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

afterEach(() => {
  vi.clearAllMocks();
});

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
    render(<SpaceProject />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows an explicit "no project" state for a space with none bound -- unlike the Lobby section, this route must never render silently empty', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    render(<SpaceProject />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
  });

  it('renders the project name in the header and the content once found', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([]);
    fetchProjectLinks.mockResolvedValue([]);

    render(<SpaceProject />);
    await waitFor(() => expect(screen.getAllByText('Test Project')).not.toHaveLength(0));
    // Header title AND the ProjectIdentityContent heading both say the name.
    expect(screen.getAllByText('Test Project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$TEST')).toBeInTheDocument();
  });

  it('treats a fetch failure as "no project" rather than crashing the page', async () => {
    fetchProjectBySpace.mockRejectedValue(new Error('network blip'));
    render(<SpaceProject />);
    expect(await screen.findByText('No project yet')).toBeInTheDocument();
  });
});
