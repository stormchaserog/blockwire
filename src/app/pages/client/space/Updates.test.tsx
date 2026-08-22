import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SpaceUpdates } from './Updates';

const rooms: Record<string, unknown> = {
  '!updates:blockwire.chat': { roomId: '!updates:blockwire.chat' },
};

const mockMatrixClient = {
  getRoom: (roomId: string) => rooms[roomId] ?? null,
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('$hooks/useSpace', () => ({
  useSpace: () => ({ roomId: '!wclaw:blockwire.chat' }),
}));

vi.mock('$features/project-identity/ProjectTabBar', () => ({
  ProjectTabBar: () => <div>project-tab-bar</div>,
}));

const { stateEventMock, pinnedEventsMock } = vi.hoisted(() => ({
  stateEventMock: vi.fn<() => { getContent: () => { room_id: string } } | undefined>(
    () => undefined
  ),
  pinnedEventsMock: vi.fn<() => string[]>(() => []),
}));

vi.mock('$hooks/useStateEvent', () => ({
  useStateEvent: stateEventMock,
}));

vi.mock('$hooks/useRoomPinnedEvents', () => ({
  useRoomPinnedEvents: pinnedEventsMock,
}));

vi.mock('$hooks/useRoomEvent', () => ({
  useRoomEvent: () => ({ getId: () => 'pinned-event-1' }),
}));

vi.mock('$components/message-preview', () => ({
  useRoomMessagePreviewRenderer: () => () => 'rendered content',
  MessagePreview: () => <div>update-row</div>,
}));

vi.mock('$hooks/useRoomNavigate', () => ({
  useRoomNavigate: () => ({ navigateRoom: vi.fn<(roomId: string, eventId: string) => void>() }),
}));

describe('SpaceUpdates', () => {
  it('shows an honest "no Updates room yet" state for a project created before Updates existed', () => {
    stateEventMock.mockReturnValue(undefined);
    render(
      <MemoryRouter>
        <SpaceUpdates />
      </MemoryRouter>
    );
    expect(screen.getByText('No Updates room yet')).toBeInTheDocument();
  });

  it('shows an honest "no announcements yet" state when the Updates room exists but nothing is pinned', () => {
    stateEventMock.mockReturnValue({
      getContent: () => ({ room_id: '!updates:blockwire.chat' }),
    });
    pinnedEventsMock.mockReturnValue([]);
    render(
      <MemoryRouter>
        <SpaceUpdates />
      </MemoryRouter>
    );
    expect(screen.getByText('No announcements yet')).toBeInTheDocument();
  });

  it('renders pinned messages from the Updates room as the actual feed', () => {
    stateEventMock.mockReturnValue({
      getContent: () => ({ room_id: '!updates:blockwire.chat' }),
    });
    pinnedEventsMock.mockReturnValue(['$pin1', '$pin2']);
    render(
      <MemoryRouter>
        <SpaceUpdates />
      </MemoryRouter>
    );
    expect(screen.getAllByText('update-row')).toHaveLength(2);
  });
});
