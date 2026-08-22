import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MobileFriendlyBottomNav, MobileFriendlySidebarNav } from './MobileFriendly';

const { screenSizeMock } = vi.hoisted(() => ({
  screenSizeMock: vi.fn<() => string>(() => 'Mobile'),
}));

vi.mock('$hooks/useScreenSize', () => ({
  ScreenSize: { Mobile: 'Mobile', Tablet: 'Tablet', Desktop: 'Desktop' },
  useScreenSizeContext: () => screenSizeMock(),
}));

const renderAt = (path: string, ui: React.ReactNode) =>
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('MobileFriendlyBottomNav', () => {
  it('renders on every one of the five global list destinations -- Home, Communities, Direct, Explore, Profile', () => {
    const destinations = ['/home/', '/communities/', '/direct/', '/explore/', '/profile/'];
    destinations.forEach((path) => {
      const { unmount } = renderAt(
        path,
        <MobileFriendlyBottomNav>
          <div>bottom-nav</div>
        </MobileFriendlyBottomNav>
      );
      expect(screen.getByText('bottom-nav')).toBeInTheDocument();
      unmount();
    });
  });

  it('hides once a specific room is open inside a Space -- the tab bar should not cover an open chat', () => {
    renderAt(
      '/!someroom:blockwire.chat/some-event/',
      <MobileFriendlyBottomNav>
        <div>bottom-nav</div>
      </MobileFriendlyBottomNav>
    );
    expect(screen.queryByText('bottom-nav')).not.toBeInTheDocument();
  });

  it('never renders on desktop, regardless of route', () => {
    screenSizeMock.mockReturnValue('Desktop');
    renderAt(
      '/home/',
      <MobileFriendlyBottomNav>
        <div>bottom-nav</div>
      </MobileFriendlyBottomNav>
    );
    expect(screen.queryByText('bottom-nav')).not.toBeInTheDocument();
    screenSizeMock.mockReturnValue('Mobile');
  });
});

describe('MobileFriendlySidebarNav', () => {
  it('shows the space/room list on a bare Space route', () => {
    renderAt(
      '/!someroom:blockwire.chat/',
      <MobileFriendlySidebarNav>
        <div>sidebar-nav</div>
      </MobileFriendlySidebarNav>
    );
    expect(screen.getByText('sidebar-nav')).toBeInTheDocument();
  });

  it('hides once inside a specific room, or on Profile', () => {
    renderAt(
      '/profile/',
      <MobileFriendlySidebarNav>
        <div>sidebar-nav</div>
      </MobileFriendlySidebarNav>
    );
    expect(screen.queryByText('sidebar-nav')).not.toBeInTheDocument();
  });
});
