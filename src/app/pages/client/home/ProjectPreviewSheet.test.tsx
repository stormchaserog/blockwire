import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import { ProjectPreviewSheet } from './ProjectPreviewSheet';

const { joinRoomMock } = vi.hoisted(() => ({
  joinRoomMock: vi.fn<(roomId: string) => Promise<unknown>>(),
}));

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
  joinRoom: joinRoomMock,
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn<(path: string) => void>(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => navigateMock };
});

const makeProject = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  project_id: 1,
  slug: 'moon',
  name: 'Moon Machine',
  ticker: 'MOON',
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!moon:blockwire.chat',
  owner_mxid: '@founder:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
  ...overrides,
});

const makeAsset = (overrides: Partial<ProjectChainAsset> = {}): ProjectChainAsset => ({
  id: 3,
  project_id: 1,
  chain: 'solana',
  contract_address: 'abc',
  token_symbol: 'MOON',
  token_decimals: 9,
  verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
  ...overrides,
});

afterEach(() => {
  vi.clearAllMocks();
});

const renderSheet = (
  props: Partial<Parameters<typeof ProjectPreviewSheet>[0]> = {},
  project = makeProject()
) =>
  render(
    <MemoryRouter>
      <ProjectPreviewSheet
        project={project}
        chainAsset={null}
        onClose={() => undefined}
        {...props}
      />
    </MemoryRouter>
  );

describe('ProjectPreviewSheet', () => {
  it('renders name, "$TICKER • Chain" line, initials avatar fallback, and description', () => {
    renderSheet(
      { chainAsset: makeAsset() },
      makeProject({ description: 'The lunar rewards community.' })
    );

    expect(screen.getByText('Moon Machine')).toBeInTheDocument();
    expect(screen.getByText('$MOON • Solana')).toBeInTheDocument();
    expect(screen.getByText('The lunar rewards community.')).toBeInTheDocument();
    // No avatar_url and no token image -> initials fallback.
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the avatar image instead of initials when an avatar URL is available', () => {
    renderSheet({ avatarUrl: 'https://cdn.example/moon.png' });

    expect(screen.getByRole('img', { name: 'Moon Machine' })).toHaveAttribute(
      'src',
      'https://cdn.example/moon.png'
    );
    expect(screen.queryByText('M')).not.toBeInTheDocument();
  });

  it('joins the space and navigates to its lobby when Join Community succeeds', async () => {
    joinRoomMock.mockResolvedValue({ roomId: '!moon:blockwire.chat' });
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    fireEvent.click(screen.getByText('Join Community'));

    await waitFor(() => expect(joinRoomMock).toHaveBeenCalledWith('!moon:blockwire.chat'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/!moon%3Ablockwire.chat/lobby'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the join error inline and does not navigate when the join fails', async () => {
    joinRoomMock.mockRejectedValue(new Error('You are banned from this room.'));
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    fireEvent.click(screen.getByText('Join Community'));

    await waitFor(() =>
      expect(screen.getByText('You are banned from this room.')).toBeInTheDocument()
    );
    expect(navigateMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // The button recovers so the user can retry.
    expect(screen.getByText('Join Community')).toBeInTheDocument();
  });

  it('closes without joining when Cancel is tapped', () => {
    const onClose = vi.fn<() => void>();
    renderSheet({ onClose });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalled();
    expect(joinRoomMock).not.toHaveBeenCalled();
  });
});
