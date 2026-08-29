import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { getInboxNotificationsPath } from '$pages/pathUtils';
import { HomeGreeting } from './HomeGreeting';

const mockMatrixClient = {
  getUserId: () => '@steven:blockwire.chat',
  getUser: () => ({ displayName: 'Steven' }),
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

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomeGreeting', () => {
  it('greets the user by name with the 👋 emoji, per the design mock', () => {
    render(
      <MemoryRouter>
        <HomeGreeting />
      </MemoryRouter>
    );
    expect(screen.getByText(/Steven 👋$/)).toBeInTheDocument();
  });

  it('keeps the subtitle verbatim, with its trailing period', () => {
    render(
      <MemoryRouter>
        <HomeGreeting />
      </MemoryRouter>
    );
    expect(screen.getByText("Here's what's happening.")).toBeInTheDocument();
  });

  it('shows a bell button that jumps to the notifications inbox', () => {
    render(
      <MemoryRouter>
        <HomeGreeting />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(navigateMock).toHaveBeenCalledWith(getInboxNotificationsPath());
  });
});
