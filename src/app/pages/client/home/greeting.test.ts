import { describe, expect, it } from 'vitest';
import { getGreetingByHour, getGreetingName } from './greeting';

describe('getGreetingByHour', () => {
  it('greets good morning from midnight up to (but not including) noon', () => {
    expect(getGreetingByHour(0)).toBe('Good morning');
    expect(getGreetingByHour(6)).toBe('Good morning');
    expect(getGreetingByHour(11)).toBe('Good morning');
  });

  it('flips to good afternoon exactly at noon and holds until (but not including) 18:00', () => {
    expect(getGreetingByHour(12)).toBe('Good afternoon');
    expect(getGreetingByHour(15)).toBe('Good afternoon');
    expect(getGreetingByHour(17)).toBe('Good afternoon');
  });

  it('flips to good evening exactly at 18:00 and holds through 23:00', () => {
    expect(getGreetingByHour(18)).toBe('Good evening');
    expect(getGreetingByHour(21)).toBe('Good evening');
    expect(getGreetingByHour(23)).toBe('Good evening');
  });
});

describe('getGreetingName', () => {
  it('prefers the Matrix display name when set', () => {
    expect(getGreetingName('Steven', '@steven:blockwire.chat')).toBe('Steven');
  });

  it('falls back to the mxid localpart (no @, no :server) when there is no display name', () => {
    expect(getGreetingName(undefined, '@steven:blockwire.chat')).toBe('steven');
  });

  it('treats an empty display name as unset', () => {
    expect(getGreetingName('', '@steven:blockwire.chat')).toBe('steven');
  });

  it('falls back to "there" when neither display name nor user id is available', () => {
    expect(getGreetingName(undefined, null)).toBe('there');
    expect(getGreetingName(undefined, undefined)).toBe('there');
  });
});
