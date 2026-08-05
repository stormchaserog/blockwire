import { describe, expect, it } from 'vitest';
import { completeUserId, matchesTerm, mergeDirectoryResults } from './userSearch';

const SERVER = 'blockwire.chat';

describe('completeUserId', () => {
  it('completes a bare handle, which is what people actually type', () => {
    // The reported bug: searching "guitarguy1007" found nothing because it is
    // not a legal user id and nothing filled in the server.
    expect(completeUserId('guitarguy1007', SERVER)).toBe('@guitarguy1007:blockwire.chat');
  });

  it('completes a handle written with the sigil', () => {
    expect(completeUserId('@guitarguy1007', SERVER)).toBe('@guitarguy1007:blockwire.chat');
  });

  it('leaves a full id alone', () => {
    expect(completeUserId('@guitarguy1007:blockwire.chat', SERVER)).toBe(
      '@guitarguy1007:blockwire.chat'
    );
  });

  it('does not redirect someone who named another server', () => {
    expect(completeUserId('@bob:other.example', SERVER)).toBe('@bob:other.example');
    expect(completeUserId('bob:other.example', SERVER)).toBe('@bob:other.example');
  });

  it('trims what was typed', () => {
    expect(completeUserId('  guitarguy1007  ', SERVER)).toBe('@guitarguy1007:blockwire.chat');
  });

  it('refuses input that cannot be a handle', () => {
    expect(completeUserId('', SERVER)).toBeUndefined();
    expect(completeUserId('   ', SERVER)).toBeUndefined();
    expect(completeUserId('@', SERVER)).toBeUndefined();
    expect(completeUserId('two words', SERVER)).toBeUndefined();
    expect(completeUserId('a/b', SERVER)).toBeUndefined();
  });

  it('refuses to guess when we do not know our own server', () => {
    expect(completeUserId('guitarguy1007', '')).toBeUndefined();
  });
});

describe('mergeDirectoryResults', () => {
  const local = [{ userId: '@stephen:blockwire.chat', displayName: 'Stephen' }];
  const remote = [
    { userId: '@stephen:blockwire.chat', displayName: 'Stephen' },
    { userId: '@guitarguy1007:blockwire.chat', displayName: 'guitarguy1007' },
  ];

  it('lists people you know first and does not repeat them', () => {
    const merged = mergeDirectoryResults(local, remote);
    expect(merged.map((u) => u.userId)).toEqual([
      '@stephen:blockwire.chat',
      '@guitarguy1007:blockwire.chat',
    ]);
  });

  it('still surfaces someone you have never spoken to', () => {
    const merged = mergeDirectoryResults([], remote);
    expect(merged.some((u) => u.userId === '@guitarguy1007:blockwire.chat')).toBe(true);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ userId: `@u${i}:blockwire.chat` }));
    expect(mergeDirectoryResults([], many, 10)).toHaveLength(10);
  });
});

describe('matchesTerm', () => {
  const user = { userId: '@guitarguy1007:blockwire.chat', displayName: 'Guitar Guy' };

  it('matches the handle', () => {
    expect(matchesTerm(user, 'guitar')).toBe(true);
    expect(matchesTerm(user, '@guitar')).toBe(true);
    expect(matchesTerm(user, 'GUITAR')).toBe(true);
  });

  it('matches the display name', () => {
    expect(matchesTerm(user, 'Guy')).toBe(true);
  });

  it('does not match everything', () => {
    expect(matchesTerm(user, 'banjo')).toBe(false);
    expect(matchesTerm(user, '')).toBe(false);
  });
});
