import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('RoomTombstone', () => {
  it('offers the replacement room when the tombstone names one', () => {
    render(<RoomTombstone roomId="!old:example.org" replacementRoomId="!new:example.org" />);
    expect(screen.getByRole('button', { name: /join new room/i })).toBeInTheDocument();
  });

  it('renders as closed, with no join button, when the tombstone has no replacement', () => {
    // A redacted tombstone has empty content; the old code rendered a Join
    // button wired to undefined that failed forever.
    render(<RoomTombstone roomId="!old:example.org" />);
    expect(
      screen.getByText('This room has been replaced and is no longer active.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
