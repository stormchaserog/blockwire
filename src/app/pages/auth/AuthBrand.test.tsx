import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthBrand } from './AuthBrand';

describe('AuthBrand', () => {
  it('renders the BlockWire wordmark, logo, and tagline on auth screens', () => {
    render(<AuthBrand />);
    expect(screen.getByRole('heading', { name: 'BlockWire' })).toBeInTheDocument();
    expect(screen.getByAltText('BlockWire logo')).toBeInTheDocument();
    expect(screen.getByText('Feels like Telegram. Built for crypto.')).toBeInTheDocument();
  });
});
