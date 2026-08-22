import { describe, expect, it } from 'vitest';
import { formatCompactCount } from './formatCompactCount';

describe('formatCompactCount', () => {
  it('renders counts under a thousand verbatim', () => {
    expect(formatCompactCount(0)).toBe('0');
    expect(formatCompactCount(1)).toBe('1');
    expect(formatCompactCount(847)).toBe('847');
    expect(formatCompactCount(999)).toBe('999');
  });

  it('renders thousands with one decimal and a K suffix', () => {
    expect(formatCompactCount(1000)).toBe('1.0K');
    expect(formatCompactCount(1234)).toBe('1.2K');
    expect(formatCompactCount(12400)).toBe('12.4K');
    expect(formatCompactCount(999_400)).toBe('999.4K');
  });

  it('renders millions with one decimal and an M suffix', () => {
    expect(formatCompactCount(1_000_000)).toBe('1.0M');
    expect(formatCompactCount(2_450_000)).toBe('2.5M');
  });

  it('promotes values that would round to "1000.0K" into the M tier', () => {
    expect(formatCompactCount(999_950)).toBe('1.0M');
  });

  it('never emits negative or fractional garbage for odd inputs', () => {
    expect(formatCompactCount(-5)).toBe('0');
    expect(formatCompactCount(1234.9)).toBe('1.2K');
    expect(formatCompactCount(Number.NaN)).toBe('0');
  });
});
