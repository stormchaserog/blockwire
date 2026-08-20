import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerificationBadge } from './VerificationBadge';

describe('VerificationBadge', () => {
  it('renders nothing for unverified — an absent badge, not a grey/crossed-out one (Bible §18)', () => {
    const { container } = render(<VerificationBadge state="unverified" label="Contract Verified" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the precise label as-is when verified', () => {
    render(<VerificationBadge state="verified" label="Contract Verified" />);
    expect(screen.getByText('Contract Verified')).toBeInTheDocument();
  });

  it('marks a pending state distinctly, not identically to verified', () => {
    render(<VerificationBadge state="pending" label="Contract Verified" />);
    expect(screen.getByText('Contract Verified (Pending)')).toBeInTheDocument();
    expect(screen.queryByText('Contract Verified')).not.toBeInTheDocument();
  });

  it('never renders vague language like "Trusted" or "Safe" — only the precise label passed in', () => {
    render(<VerificationBadge state="verified" label="Project Owner Verified" />);
    expect(screen.queryByText(/trusted|safe|legit|guaranteed/i)).not.toBeInTheDocument();
    expect(screen.getByText('Project Owner Verified')).toBeInTheDocument();
  });
});
