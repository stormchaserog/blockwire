import { describe, expect, it } from 'vitest';
import { slugify } from './CreateProject';

/** Actual validity boundary is server-side (blockwire-botgw/src/projects.ts's
 *  SLUG_PATTERN); this only needs to produce something LIKELY to pass that
 *  check so the user isn't surprised by a 400 after typing a normal
 *  project name. */

describe('CreateProject slug suggestion', () => {
  it('lowercases and hyphenates a normal project name', () => {
    expect(slugify('White Claw Labs')).toBe('white-claw-labs');
  });

  it('strips punctuation and emoji, not just uppercase letters', () => {
    expect(slugify("Steven's Project! 🚀")).toBe('stevens-project');
  });

  it('collapses repeated whitespace and hyphens into one hyphen', () => {
    expect(slugify('too   many    spaces')).toBe('too-many-spaces');
    expect(slugify('already--hyphenated')).toBe('already-hyphenated');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -leading and trailing-  ')).toBe('leading-and-trailing');
  });

  it('never exceeds 64 characters, matching the server-side slug column width', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(64);
  });

  it('produces an empty string for input with no valid characters, so the caller can validate', () => {
    expect(slugify('🚀🚀🚀')).toBe('');
  });
});
