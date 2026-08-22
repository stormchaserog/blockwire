import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as Jotai from 'jotai';
import type { Room } from '$types/matrix-sdk';
import { UserEvent } from '$types/matrix-sdk';
import { Communities } from './Communities';

const memberIds = (ids: string[]) => ids.map((userId) => ({ userId }));

const rooms: Record<string, Partial<Room>> = {
  '!wclaw:blockwire.chat': {
    name: 'WCLAW Labs',
    roomId: '!wclaw:blockwire.chat',
    getJoinedMemberCount: () => 42,
    getJoinedMembers: () =>
      memberIds(['@a:blockwire.chat', '@b:blockwire.chat', '@c:blockwire.chat']) as never,
  },
  '!sol:blockwire.chat': {
    name: 'Solana Devs',
    roomId: '!sol:blockwire.chat',
    getJoinedMemberCount: () => 0,
    getJoinedMembers: () => [],
  },
  '!quiet:blockwire.chat': {
    name: 'Quiet Corner',
    roomId: '!quiet:blockwire.chat',
    getJoinedMemberCount: () => 2,
    getJoinedMembers: () => memberIds(['@b:blockwire.chat', '@zzz:blockwire.chat']) as never,
  },
  '!mega:blockwire.chat': {
    name: 'Mega Space',
    roomId: '!mega:blockwire.chat',
    // Over the 500-member cap: the online count must be skipped entirely,
    // so getJoinedMembers throwing proves the walk never even started.
    getJoinedMemberCount: () => 20000,
    getJoinedMembers: () => {
      throw new Error('membership walk must not run above the online-count cap');
    },
  },
};

const presenceByUserId: Record<string, string> = {
  '@a:blockwire.chat': 'online',
  '@b:blockwire.chat': 'offline',
  '@c:blockwire.chat': 'online',
};

const mockMatrixClient = {
  getRoom: (roomId: string) => rooms[roomId] ?? null,
  getUser: (userId: string) =>
    userId in presenceByUserId ? { userId, presence: presenceByUserId[userId] } : null,
  on: vi.fn<(event: unknown, handler: () => void) => void>(),
  removeListener: vi.fn<(event: unknown, handler: () => void) => void>(),
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

const { useRoomsUnreadMock } = vi.hoisted(() => ({
  // A real spy, not a stub -- this is the only way to catch "did the array
  // identity stay stable across re-renders", the exact bug this regression
  // test exists to guard. A stubbed-out useRoomsUnread (as in this file's
  // other tests) can never surface this class of bug because it never
  // looks at what was passed in.
  useRoomsUnreadMock: vi.fn<(roomIds: string[]) => undefined>(() => undefined),
}));

vi.mock('$state/hooks/unread', () => ({
  useRoomsUnread: useRoomsUnreadMock,
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

  it('shows the joined member count as a second line on each card', () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('42 members')).toBeInTheDocument();
  });

  it('omits the member count line entirely (no "0 members") when the count is unavailable', () => {
    orphanSpacesMock.mockReturnValue(['!sol:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('Solana Devs')).toBeInTheDocument();
    expect(screen.queryByText('0 members')).not.toBeInTheDocument();
  });

  it('filters the community list by name, case-insensitively, as the user types in search', async () => {
    const user = userEvent.setup();
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat', '!sol:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('WCLAW Labs')).toBeInTheDocument();
    expect(screen.getByText('Solana Devs')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search communities'), 'solana');
    expect(screen.queryByText('WCLAW Labs')).not.toBeInTheDocument();
    expect(screen.getByText('Solana Devs')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search communities'));
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

  it("passes useRoomsUnread a REFERENTIALLY STABLE array across re-renders -- regression test for the freeze this caused in production: useRoomsUnread's internal selector depends on the array by reference (see state/hooks/unread.ts), so a fresh [roomId] literal every render created a new selector every render, which re-subscribed the atom every render, which re-rendered the component: an infinite loop that froze the whole Communities screen", () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    const { rerender } = render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    const firstCallArgs = useRoomsUnreadMock.mock.calls.at(-1)?.[0];
    expect(firstCallArgs).toEqual(['!wclaw:blockwire.chat']);

    rerender(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    const secondCallArgs = useRoomsUnreadMock.mock.calls.at(-1)?.[0];

    // The actual regression check: SAME array reference, not just equal
    // contents. Object.is (===) is exactly what useCallback's dependency
    // comparison in useRoomsUnread uses internally.
    expect(secondCallArgs).toBe(firstCallArgs);
  });

  it('shows a green online count next to the member line, counting only members whose presence is online', () => {
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    // @a and @c are online, @b is offline.
    expect(screen.getByText('2 online')).toBeInTheDocument();
  });

  it('omits the online indicator entirely (never "0 online") when nobody is online or presence is unknown', () => {
    // Quiet Corner: @b is offline, @zzz has no User object (presence unavailable).
    orphanSpacesMock.mockReturnValue(['!quiet:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('2 members')).toBeInTheDocument();
    expect(screen.queryByText(/online/)).not.toBeInTheDocument();
  });

  it('skips the online computation entirely for communities above the member cap (the mock throws if the membership walk runs)', () => {
    orphanSpacesMock.mockReturnValue(['!mega:blockwire.chat']);
    render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('20000 members')).toBeInTheDocument();
    expect(screen.queryByText(/online/)).not.toBeInTheDocument();
  });

  it('subscribes to client-level UserEvent.Presence, recounts when it fires, and unsubscribes on unmount', () => {
    mockMatrixClient.on.mockClear();
    mockMatrixClient.removeListener.mockClear();
    orphanSpacesMock.mockReturnValue(['!wclaw:blockwire.chat']);
    const { unmount } = render(
      <MemoryRouter>
        <Communities />
      </MemoryRouter>
    );
    expect(screen.getByText('2 online')).toBeInTheDocument();

    const presenceCall = mockMatrixClient.on.mock.calls.find(
      ([event]) => event === UserEvent.Presence
    );
    expect(presenceCall).toBeDefined();
    const handler = presenceCall?.[1] as () => void;

    // @b comes online; the live count follows the presence event.
    presenceByUserId['@b:blockwire.chat'] = 'online';
    try {
      act(() => {
        handler();
      });
      expect(screen.getByText('3 online')).toBeInTheDocument();
    } finally {
      presenceByUserId['@b:blockwire.chat'] = 'offline';
    }

    unmount();
    expect(
      mockMatrixClient.removeListener.mock.calls.some(
        ([event, fn]) => event === UserEvent.Presence && fn === handler
      )
    ).toBe(true);
  });
});
