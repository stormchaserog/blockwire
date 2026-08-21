import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectBanner } from './ProjectBanner';

describe('ProjectBanner', () => {
  it('renders nothing when a project has neither an avatar nor a banner (Bible §3: progressive disclosure)', () => {
    const { container } = render(
      <ProjectBanner project={{ name: 'Test Project', avatar_url: null, banner_url: null }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the avatar image when only avatar_url is set', () => {
    render(
      <ProjectBanner
        project={{
          name: 'Test Project',
          avatar_url: 'https://cdn.test/avatar.png',
          banner_url: null,
        }}
      />
    );
    const img = screen.getByRole('img', { name: 'Test Project' });
    expect(img).toHaveAttribute('src', 'https://cdn.test/avatar.png');
  });

  it('renders the banner even when there is no avatar', () => {
    const { container } = render(
      <ProjectBanner
        project={{
          name: 'Test Project',
          avatar_url: null,
          banner_url: 'https://cdn.test/banner.png',
        }}
      />
    );
    expect(container.innerHTML).toContain('https://cdn.test/banner.png');
  });

  it('renders both when both are set', () => {
    render(
      <ProjectBanner
        project={{
          name: 'Test Project',
          avatar_url: 'https://cdn.test/avatar.png',
          banner_url: 'https://cdn.test/banner.png',
        }}
      />
    );
    expect(screen.getByRole('img', { name: 'Test Project' })).toHaveAttribute(
      'src',
      'https://cdn.test/avatar.png'
    );
  });
});
