import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OfficialLinksVault } from './OfficialLinksVault';
import type { ProjectLinkRecord } from '$utils/blockwire/projects';

function makeLink(overrides: Partial<ProjectLinkRecord> = {}): ProjectLinkRecord {
  return {
    id: 1, project_id: 42, link_type: 'website', url: 'https://example.com',
    verification_state: 'unverified', created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('OfficialLinksVault', () => {
  it('renders nothing for a project with zero official links (progressive disclosure, not an empty-vault card)', () => {
    const { container } = render(<OfficialLinksVault links={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link with a readable label for a known type', () => {
    render(<OfficialLinksVault links={[makeLink({ link_type: 'website' })]} />);
    expect(screen.getByText('Website')).toBeInTheDocument();
  });

  it('labels X/Twitter as "X", not "Twitter" or the raw stored value', () => {
    render(<OfficialLinksVault links={[makeLink({ link_type: 'x' })]} />);
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('renders every link in the list, each as its own actual anchor to the real URL', () => {
    render(
      <OfficialLinksVault
        links={[
          makeLink({ id: 1, link_type: 'website', url: 'https://a.example.com' }),
          makeLink({ id: 2, link_type: 'github', url: 'https://github.com/example' }),
        ]}
      />
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://a.example.com');
    expect(links[1]).toHaveAttribute('href', 'https://github.com/example');
  });

  it('opens official links in a new tab with rel=noopener (never navigates the app away)', () => {
    render(<OfficialLinksVault links={[makeLink()]} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('capitalizes an unrecognized link type rather than showing raw lowercase text', () => {
    render(<OfficialLinksVault links={[makeLink({ link_type: 'discord' })]} />);
    expect(screen.getByText('Discord')).toBeInTheDocument();
  });
});
