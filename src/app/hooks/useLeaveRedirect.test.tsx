import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { EventEmitter } from 'events';
import type { PropsWithChildren } from 'react';
import { Provider, createStore } from 'jotai';
import type { Room } from '$types/matrix-sdk';
import { RoomEvent, KnownMembership } from '$types/matrix-sdk';
import { allRoomsAtom } from '$state/room-list/roomList';
import { getHomePath } from '$pages/pathUtils';
import { useLeaveRedirect } from './useLeaveRedirect';

const navigate = vi.fn<(path: string, options?: { replace?: boolean }) => void>();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

const makeRoom = (roomId: string) => {
  const client = new EventEmitter();
  const room = { roomId, client } as unknown as Room;
  return { room, client };
};

const makeWrapper = (store: ReturnType<typeof createStore>) =>
  function Wrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>;
  };

const makeStore = (joinedRoomIds: string[]) => {
  const store = createStore();
  store.set(allRoomsAtom, { type: 'INITIALIZE', rooms: joinedRoomIds });
  return store;
};

describe('useLeaveRedirect', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('redirects to home (replacing history) on join→leave of the routed room', () => {
    const { room, client } = makeRoom('!room:server');
    const store = makeStore(['!room:server']);

    renderHook(() => useLeaveRedirect(room), { wrapper: makeWrapper(store) });
    expect(navigate).not.toHaveBeenCalled();

    act(() => {
      client.emit(RoomEvent.MyMembership, room, KnownMembership.Leave, KnownMembership.Join);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(getHomePath(), { replace: true });
  });

  it('does NOT redirect when mounted on an already-unjoined room (join-via-link)', () => {
    const { room, client } = makeRoom('!unjoined:server');
    const store = makeStore([]);

    renderHook(() => useLeaveRedirect(room), { wrapper: makeWrapper(store) });

    // A membership event without a join→leave transition must not redirect.
    act(() => {
      client.emit(RoomEvent.MyMembership, room, KnownMembership.Leave, undefined);
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores membership transitions of other rooms', () => {
    const { room, client } = makeRoom('!room:server');
    const { room: otherRoom } = makeRoom('!other:server');
    const store = makeStore(['!room:server', '!other:server']);

    renderHook(() => useLeaveRedirect(room), { wrapper: makeWrapper(store) });

    act(() => {
      client.emit(RoomEvent.MyMembership, otherRoom, KnownMembership.Leave, KnownMembership.Join);
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects when the routed room vanishes from the joined room list while mounted', () => {
    const { room } = makeRoom('!room:server');
    const store = makeStore(['!room:server']);

    renderHook(() => useLeaveRedirect(room), { wrapper: makeWrapper(store) });
    expect(navigate).not.toHaveBeenCalled();

    act(() => {
      store.set(allRoomsAtom, { type: 'DELETE', roomId: '!room:server' });
    });

    expect(navigate).toHaveBeenCalledWith(getHomePath(), { replace: true });
  });

  it('removes the membership listener on unmount', () => {
    const { room, client } = makeRoom('!room:server');
    const store = makeStore(['!room:server']);

    const { unmount } = renderHook(() => useLeaveRedirect(room), {
      wrapper: makeWrapper(store),
    });
    expect(client.listenerCount(RoomEvent.MyMembership)).toBe(1);

    unmount();
    expect(client.listenerCount(RoomEvent.MyMembership)).toBe(0);

    client.emit(RoomEvent.MyMembership, room, KnownMembership.Leave, KnownMembership.Join);
    expect(navigate).not.toHaveBeenCalled();
  });
});
