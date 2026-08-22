import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectTabBar } from './ProjectTabBar';

vi.mock('$hooks/useSpace', () => ({
  useSpace: () => ({ roomId: '!wclaw:blockwire.chat' }),
}));

describe('ProjectTabBar', () => {
  it('renders exactly the four UI Bible §8 project nav items -- Chat, Updates, Hub, Info', () => {
    render(
      <MemoryRouter initialEntries={['/!wclaw%3Ablockwire.chat/lobby/']}>
        <ProjectTabBar />
      </MemoryRouter>
    );

    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Updates')).toBeInTheDocument();
    expect(screen.getByText('Hub')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    // Exactly these four -- the Bible explicitly says "do not create twelve
    // project tabs."
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('marks Hub as the active tab when the current route is the Hub', () => {
    render(
      <MemoryRouter initialEntries={['/!wclaw%3Ablockwire.chat/hub/']}>
        <ProjectTabBar />
      </MemoryRouter>
    );

    const hubLink = screen.getByText('Hub').closest('a');
    expect(hubLink).toHaveClass('active');
  });
});
