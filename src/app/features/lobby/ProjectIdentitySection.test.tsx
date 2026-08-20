import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ProjectIdentitySection } from './ProjectIdentitySection';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchProjectBySpace, fetchChainAssets } = vi.hoisted(() => ({
  fetchProjectBySpace: vi.fn<(mx: unknown, spaceRoomId: string) => Promise<ProjectRecord | null>>(),
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({
  fetchProjectBySpace,
  fetchChainAssets,
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
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('ProjectIdentitySection', () => {
  it('renders nothing for an ordinary space with no bound project (Bible §3: progressive disclosure)', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    const { container } = render(<ProjectIdentitySection spaceRoomId="!plain:blockwire.chat" />);
    await waitFor(() => expect(fetchProjectBySpace).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(fetchChainAssets).not.toHaveBeenCalled();
  });

  it('renders nothing while still checking, not a flash of empty content', () => {
    fetchProjectBySpace.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<ProjectIdentitySection spaceRoomId="!pending:blockwire.chat" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the project name and description once a bound project is found', async () => {
    fetchProjectBySpace.mockResolvedValue({
      project_id: 42, slug: 'test-proj', name: 'Test Project', ticker: null,
      description: 'A project for testing.', avatar_url: null, banner_url: null,
      space_room_id: '!bound:blockwire.chat', owner_mxid: '@owner:blockwire.chat',
      status: 'active', created_at: new Date().toISOString(),
    });
    fetchChainAssets.mockResolvedValue([]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A project for testing.')).toBeInTheDocument();
  });

  it('renders the price card only once the project has at least one chain asset', async () => {
    fetchProjectBySpace.mockResolvedValue({
      project_id: 42, slug: 'test-proj', name: 'Test Project', ticker: null,
      description: null, avatar_url: null, banner_url: null,
      space_room_id: '!bound:blockwire.chat', owner_mxid: '@owner:blockwire.chat',
      status: 'active', created_at: new Date().toISOString(),
    });
    fetchChainAssets.mockResolvedValue([
      {
        id: 7, project_id: 42, chain: 'solana', contract_address: 'Sol1',
        token_symbol: 'TEST', token_decimals: 9, verified_control_state: 'unverified',
        created_at: new Date().toISOString(),
      },
    ]);

    render(<ProjectIdentitySection spaceRoomId="!bound:blockwire.chat" />);
    expect(await screen.findByTestId('price-card')).toHaveTextContent('project 42 asset 7');
  });

  it('treats a fetch failure the same as "no project" rather than showing an error card', async () => {
    fetchProjectBySpace.mockRejectedValue(new Error('network blip'));
    const { container } = render(<ProjectIdentitySection spaceRoomId="!flaky:blockwire.chat" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
