import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MobileNavDrawer } from './MobileNavDrawer';
import { ScreenSize, ScreenSizeProvider } from '$hooks/useScreenSize';

vi.mock('$state/hooks/settings', () => ({
  useSetting: () => [true, vi.fn<() => void>()],
}));

vi.mock('./PersistentRoomHost', () => ({
  PersistentRoomHost: () => <div data-testid="persistent-room-host" />,
}));

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
});

const renderDrawer = (screenSize: ScreenSize = ScreenSize.Mobile) =>
  render(
    <MemoryRouter initialEntries={['/home']}>
      <ScreenSizeProvider value={screenSize}>
        <MobileNavDrawer nav={<div>nav</div>}>
          <div>content</div>
        </MobileNavDrawer>
      </ScreenSizeProvider>
    </MemoryRouter>
  );

describe('MobileNavDrawer', () => {
  // The panels sit side by side in a track twice the viewport wide, moved by transform.
  // `hidden` leaves a scrollport that focus or scrollIntoView scrolls a full panel width,
  // stacking on top of the transform and stranding the active panel off frame.
  it('clips the viewport instead of hiding overflow, so it can never be scrolled', () => {
    renderDrawer();

    const viewport = screen.getByTestId('mobile-nav-drawer-viewport');

    expect(viewport.style.overflow).toBe('clip');
    expect(viewport.style.overflow).not.toBe('hidden');
  });

  // Direct regression for the "desktop rail and mobile bottom nav both
  // visible at once" bug caught from a real screenshot: `rail` used to
  // render unconditionally with zero screen-size check anywhere in the
  // whole render chain (Router.tsx -> PageRoot -> here), so the desktop
  // sidebar rail always showed even on a strictly Mobile-sized viewport.
  it('never renders the desktop rail on a Mobile-sized viewport, even when one is passed', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <ScreenSizeProvider value={ScreenSize.Mobile}>
          <MobileNavDrawer nav={<div>nav</div>} rail={<div data-testid="rail-marker">rail</div>}>
            <div>content</div>
          </MobileNavDrawer>
        </ScreenSizeProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('rail-marker')).not.toBeInTheDocument();
  });

  it('renders the desktop rail on a Desktop-sized viewport', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <ScreenSizeProvider value={ScreenSize.Desktop}>
          <MobileNavDrawer nav={<div>nav</div>} rail={<div data-testid="rail-marker">rail</div>}>
            <div>content</div>
          </MobileNavDrawer>
        </ScreenSizeProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('rail-marker')).toBeInTheDocument();
  });
});
