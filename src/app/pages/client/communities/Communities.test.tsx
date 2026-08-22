import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as Jotai from 'jotai';
import type { Room } from '$types/matrix-sdk';
import { Communities } from './Communities';

const rooms: Record<string, Partial<Room>> = {
  '!wclaw:blockwire.chat': { name: 'WCLAW Labs', roomId: '!wclaw:blockwire.chat' },
};

const mockMatrixClient = {
  getRoom: (roomId: string) => rooms[roomId] ?? null,
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof Jotai>();
  return { ...actual, useAtomValue: () => new Map() };
});

const { orphanSpacesMock } = vi.hoisted(() => ({
  orphanSpacesMock: vi.fn<() => string[]>(() => []),
}));

vi.mock('$state/hooks/roomList', () => ({
  useOrphanSpaces: () => orphanSpacesMock(),
}));

vi.mock('$state/hooks/unread', () => ({
  useRoomsUnread: () => undefined,
}));

vi.mock('$hooks/useRoomMeta', () => ({
  useRoomName: (room: Partial<Room>) => room.name,
  useRoomAvatar: () => undefined,
}));

vi.mock('$hooks/useMediaAuthentication', () => ({
  useMediaAuthentication: () => false,
}));

vi.mock('$utils/sort', () => ({
  factoryRoomIdByActivity: () => () => 0,
}));

describe('Communities', () => {
  it('shows an honest empty state, not a blank screen, with no communities', () => {
    orphanSpacesMock.mockReturnValue([]);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('No communities yet')).toBeInTheDocument();
  });

  it('lists every top-level Space the user belongs to', () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
  });

  it('silently skips a room id the client cannot resolve, instead of crashing the whole list', () => {
    orphanSpacesMock.mockReturnValue(['!missing:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.queryByText('No communities yet')).not.toBeInTheDocument();
  });
});
