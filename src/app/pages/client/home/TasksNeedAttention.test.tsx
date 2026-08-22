import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import type {
  ProjectRecord,
  ProjectChainAsset,
  ProjectLinkRecord,
} from '$utils/blockwire/projects';
import type * as ProjectsModule from '$utils/blockwire/projects';
import { TasksNeedAttention, computeSetupProgress } from './TasksNeedAttention';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const stableAlive = () => true;
vi.mock('$hooks/useAlive', () => ({
  useAlive: () => stableAlive,
}));

vi.mock('$hooks/useMediaAuthentication', () => ({
  useMediaAuthentication: () => false,
}));

// The rows' DexScreener pfp-fallback hook uses global fetch directly; stub
// it so no test touches the real network. Default: no pairs, so rows fall
// back to initials exactly as before.
const dexFetchMock = vi.fn<typeof fetch>(
  async () => ({ ok: true, json: async () => [] }) as Response
);
vi.stubGlobal('fetch', dexFetchMock);

const { fetchChainAssets, fetchProjectLinks } = vi.hoisted(() => ({
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(
    async () => []
  ),
  fetchProjectLinks: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectLinkRecord[]>>(
    async () => []
  ),
}));

vi.mock('$utils/blockwire/projects', async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectsModule>();
  return { ...actual, fetchChainAssets, fetchProjectLinks };
});

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn<(path: string) => void>(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigateMock };
});

const incompleteProject: ProjectRecord = {
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

const completeProject: ProjectRecord = {
  ...incompleteProject,
  project_id: 2,
  slug: 'done',
  name: 'Fully Set Up',
  description: 'A complete project',
  space_room_id: '!done:blockwire.chat',
  owner_verification_state: 'verified',
};

const asset: ProjectChainAsset = {
  id: 7,
  project_id: 2,
  chain: 'solana',
  contract_address: 'abc',
  token_symbol: 'DONE',
  token_decimals: 9,
  verified_control_state: 'verified',
  created_at: new Date().toISOString(),
};

const link: ProjectLinkRecord = {
  id: 3,
  project_id: 2,
  link_type: 'website',
  url: 'https://example.com',
  verification_state: 'verified',
  created_at: new Date().toISOString(),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('computeSetupProgress', () => {
  it('mirrors the Hub checklist: five items, counted from real project facts', () => {
    expect(computeSetupProgress(incompleteProject, 0, 0)).toEqual({ done: 1, total: 5 });
    expect(computeSetupProgress(completeProject, 1, 1)).toEqual({ done: 5, total: 5 });
  });
});

describe('TasksNeedAttention', () => {
  it('lists an owned project with an incomplete checklist and its real progress count', async () => {
    render(
      <MemoryRouter>
        <TasksNeedAttention ownedProjects={[incompleteProject]} />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('WCLAW Labs')).toBeInTheDocument());
    expect(screen.getByText('Tasks need attention')).toBeInTheDocument();
    expect(screen.getByText('1 of 5 setup tasks done')).toBeInTheDocument();
  });

  it('renders nothing at all when every owned project is fully set up', async () => {
    fetchChainAssets.mockResolvedValue([asset]);
    fetchProjectLinks.mockResolvedValue([link]);
    const { container } = render(
      <MemoryRouter>
        <TasksNeedAttention ownedProjects={[completeProject]} />
      </MemoryRouter>
    );
    await waitFor(() => expect(fetchChainAssets).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing when there are no owned projects', () => {
    const { container } = render(
      <MemoryRouter>
        <TasksNeedAttention ownedProjects={[]} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('skips a project whose data failed to fetch instead of showing a row built on nothing', async () => {
    fetchChainAssets.mockRejectedValueOnce(new Error('gateway down'));
    const { container } = render(
      <MemoryRouter>
        <TasksNeedAttention ownedProjects={[incompleteProject]} />
      </MemoryRouter>
    );
    await waitFor(() => expect(fetchChainAssets).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("navigates straight to that project's Hub when a row is tapped", async () => {
    render(
      <MemoryRouter>
        <TasksNeedAttention ownedProjects={[incompleteProject]} />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('WCLAW Labs')).toBeInTheDocument());
    fireEvent.click(screen.getByText('WCLAW Labs'));
    expect(navigateMock).toHaveBeenCalledWith('/!wclaw%3Ablockwire.chat/hub');
  });
});
