import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { getExplorePath } from '$pages/pathUtils';
import { DiscoverProjects } from './DiscoverProjects';

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

const renderBanner = () =>
  render(
    <MemoryRouter>
      <DiscoverProjects />
    </MemoryRouter>
  );

describe('DiscoverProjects', () => {
  it('renders the static banner: title, subline, and an Explore button', () => {
    renderBanner();
    expect(screen.getByText('Discover Projects')).toBeInTheDocument();
    expect(
      screen.getByText('Find trending crypto projects and growing communities.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore' })).toBeInTheDocument();
  });

  it('navigates to the Discover route when Explore is tapped', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Explore' }));
    expect(navigateMock).toHaveBeenCalledWith(getExplorePath());
  });
});
