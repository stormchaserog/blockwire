import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as Jotai from 'jotai';
import { MobileBottomNav } from './MobileBottomNav';

const mockMatrixClient = { getUserId: () => '@me:blockwire.chat' };

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

vi.mock('jotai', async (importOriginal) => {
  const actual = await importOriginal<typeof Jotai>();
  return { ...actual, useAtomValue: () => new Map() };
});

vi.mock('$state/hooks/roomList', () => ({
  useOrphanRooms: () => [],
  useOrphanSpaces: () => [],
  useDirects: () => [],
}));

vi.mock('$state/hooks/unread', () => ({
  useRoomsUnread: () => undefined,
}));

vi.mock('$hooks/router/useRouteSelected', () => ({
  useHomeSelected: () => false,
  useDirectSelected: () => false,
  useExploreSelected: () => false,
}));

describe('MobileBottomNav', () => {
  it('renders exactly the five UI Bible §6 global nav items -- Home, Communities, Messages, Discover, Profile', () => {
    render(
      <MemoryRouter initialEntries={['/home/']}>
        <MobileBottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    // Exactly these five -- the Bible explicitly says "do not casually add
    // more global tabs."
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });
});
