import { describe, expect, it } from 'vitest';
import { GRADIENTS, gradientFor, hashId, roomGradientCss } from './roomGradient';

const ROOM = '!FFsmiHprdqsRQisHme:blockwire.chat';

describe('gradientFor', () => {
  it('gives a room the same colours every time', () => {
    // People learn a room by its colour. If it changed between reloads or
    // between devices, it would be noise rather than identity.
    expect(gradientFor(ROOM)).toEqual(gradientFor(ROOM));
  });

  it('always returns a pair from the curated set', () => {
    for (let i = 0; i < 500; i += 1) {
      const { from, to } = gradientFor(`!room${i}:blockwire.chat`);
      expect(GRADIENTS.some((g) => g.from === from && g.to === to)).toBe(true);
    }
  });

  it('spreads rooms across the whole set rather than favouring one', () => {
    const used = new Set(
      Array.from({ length: 400 }, (_, i) => {
        const g = gradientFor(`!room${i}:blockwire.chat`);
        return `${g.from}${g.to}`;
      })
    );
    expect(used.size).toBe(GRADIENTS.length);
  });

  it('separates rooms that land on the same pair by angle', () => {
    const seen = new Map<string, Set<number>>();
    for (let i = 0; i < 200; i += 1) {
      const g = gradientFor(`!room${i}:blockwire.chat`);
      const key = `${g.from}${g.to}`;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(g.angle);
    }
    // At least one pair should show more than one sweep, or the skew is dead.
    expect([...seen.values()].some((angles) => angles.size > 1)).toBe(true);
  });

  it('handles an empty id without throwing', () => {
    expect(() => gradientFor('')).not.toThrow();
    expect(GRADIENTS.some((g) => g.from === gradientFor('').from)).toBe(true);
  });

  it('treats different rooms as different', () => {
    const a = gradientFor('!alpha:blockwire.chat');
    const b = gradientFor('!beta:blockwire.chat');
    expect(`${a.from}${a.angle}`).not.toBe(`${b.from}${b.angle}`);
  });
});

describe('hashId', () => {
  it('is stable and non-negative', () => {
    expect(hashId('!room:blockwire.chat')).toBe(hashId('!room:blockwire.chat'));
    expect(hashId('!room:blockwire.chat')).toBeGreaterThanOrEqual(0);
    expect(hashId('')).toBe(0);
  });
});

describe('roomGradientCss', () => {
  it('produces a usable CSS value', () => {
    expect(roomGradientCss(ROOM)).toMatch(
      /^linear-gradient\(\d+deg, #[0-9A-Fa-f]{6}, #[0-9A-Fa-f]{6}\)$/
    );
  });
});
