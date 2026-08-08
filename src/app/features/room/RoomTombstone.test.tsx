import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as JotaiModule from 'jotai';
import { RoomTombstone } from './RoomTombstone';

const { getRoomMock } = vi.hoisted(() => ({
  getRoomMock: vi.fn<(roomId?: string) => unknown>(() => null),
}));

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => ({ getRoom: getRoomMock, joinRoom: vi.fn<() => Promise<unknown>>() }),
}));

vi.mock('$hooks/useRoomNavigate', () => ({
  useRoomNavigate: () => ({ navigateRoom: vi.fn<() => void>() }),
}));

vi.mock('jotai', async (importOriginal: () => Promise<typeof JotaiModule>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAtomValue: () => [],
  };
});

beforeEach(() => {
  getRoomMock.mockReset();
  getRoomMock.mockReturnValue(null);
});

describe('RoomTombstone', () => {
  it('offers the replacement room when the client can resolve it', () => {
    // A genuine upgrade auto-invites its members, so getRoom resolves the
    // successor room (here, as an invite) and the banner is actionable.
    getRoomMock.mockReturnValue({
      roomId: '!new:example.org',
      getMyMembership: () => 'invite',
    });
    render(<RoomTombstone roomId="!old:example.org" replacementRoomId="!new:example.org" />);
    expect(screen.getByRole('button', { name: /join new room/i })).toBeInTheDocument();
  });

  it('renders nothing when the named replacement room no longer exists', () => {
    // The dangling case: the tombstone names a replacement, but that room was
    // removed, so the client cannot resolve it and the user has not joined it.
    // A dead-end Join button that only errors must not be shown at all.
    render(<RoomTombstone roomId="!old:example.org" replacementRoomId="!gone:example.org" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/replaced/i)).not.toBeInTheDocument();
  });

  it('renders nothing when the tombstone has no replacement at all', () => {
    // A redacted or empty tombstone points nowhere; there is nothing to offer.
    render(<RoomTombstone roomId="!old:example.org" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/replaced/i)).not.toBeInTheDocument();
  });
});
