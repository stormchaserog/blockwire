import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import type { ProjectRecord } from '$utils/blockwire/projects';
import { FounderHomeBanner } from './FounderHomeBanner';

const mockMatrixClient = { baseUrl: 'https://matrix.blockwire.chat' };

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('$hooks/useMediaAuthentication', () => ({
  useMediaAuthentication: () => false,
}));

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
  space_room_id: '!other:blockwire.chat',
};

describe('FounderHomeBanner', () => {
  it('lists every owned project', () => {
    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA, projectB]} />
      </MemoryRouter>
    );
    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
    expect(screen.getByText('Other Project')).toBeInTheDocument();
  });

  it('navigates straight to that project\'s Hub when tapped -- the whole point is one tap from Home to "what needs attention", not a detour through the Project Identity page first', () => {
    render(
      <MemoryRouter>
        <FounderHomeBanner ownedProjects={[projectA]} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('WCLAW Labs'));
    expect(navigateMock).toHaveBeenCalledWith('/!wclaw%3Ablockwire.chat/hub');
  });
});
