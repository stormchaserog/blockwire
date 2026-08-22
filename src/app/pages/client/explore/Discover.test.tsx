import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Discover } from './Discover';
import type { ProjectRecord } from '$utils/blockwire/projects';

const mockMatrixClient = { baseUrl: 'https://matrix.blockwire.chat' };

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('$hooks/useMediaAuthentication', () => ({
  useMediaAuthentication: () => false,
}));

const { fetchDiscoverProjects } = vi.hoisted(() => ({
  fetchDiscoverProjects: vi.fn<(mx: unknown) => Promise<ProjectRecord[]>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({ fetchDiscoverProjects }));

afterEach(() => {
  vi.clearAllMocks();
});

const project: ProjectRecord = {
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

describe('Discover', () => {
  it('lists real active projects returned by the discover endpoint', async () => {
    fetchDiscoverProjects.mockResolvedValue([project]);
    render(
      <MemoryRouter>
        <Discover />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('WCLAW Labs')).toBeInTheDocument());
    expect(screen.getByText('$WCLAW')).toBeInTheDocument();
  });

  it('shows an honest empty state, not a blank screen, with zero projects', async () => {
    fetchDiscoverProjects.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Discover />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('No projects yet')).toBeInTheDocument());
  });

  it('shows an honest error state, not a silent failure, when the fetch fails', async () => {
    fetchDiscoverProjects.mockRejectedValue(new Error('network blip'));
    render(
      <MemoryRouter>
        <Discover />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Couldn't load Discover")).toBeInTheDocument());
  });
});
