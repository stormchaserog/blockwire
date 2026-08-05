import { afterEach, describe, expect, it } from 'vitest';
import {
  canShorten,
  getEventLink,
  getInviteLink,
  getRoomLink,
  getUserLink,
  setLinkConfig,
} from './blockwire-link';

afterEach(() => {
  setLinkConfig(undefined, undefined);
});

describe('links people actually share', () => {
  it('writes a person as a bare handle', () => {
    expect(getUserLink('@stephen:blockwire.chat')).toBe('https://blockwire.chat/@stephen');
  });

  it('writes a room as a bare name, with no sigil and no server', () => {
    expect(getRoomLink('#degens:blockwire.chat')).toBe('https://blockwire.chat/degens');
  });

  it('never emits a matrix.to link', () => {
    const links = [
      getUserLink('@stephen:blockwire.chat'),
      getRoomLink('#degens:blockwire.chat'),
      getRoomLink('!FFsmiHprdqsRQisHme:blockwire.chat', ['blockwire.chat']),
      getEventLink('#degens:blockwire.chat', '$abc'),
      getInviteLink('7Fk2xQwe'),
    ];
    for (const link of links) {
      expect(link.startsWith('https://blockwire.chat/')).toBe(true);
      expect(link).not.toContain('matrix.to');
      expect(link).not.toContain('matrix');
    }
  });

  it('links one message inside a named room', () => {
    expect(getEventLink('#degens:blockwire.chat', '$abc')).toBe(
      'https://blockwire.chat/degens/%24abc'
    );
  });

  it('builds an invite link from a gateway hash', () => {
    expect(getInviteLink('7Fk2xQwe')).toBe('https://blockwire.chat/+7Fk2xQwe');
  });
});

describe('what cannot be shortened', () => {
  it('refuses a room that has no published address', () => {
    // This is the case that produced the ugly link in the wild: an unnamed
    // private room has nothing to shorten. Callers mint an invite link.
    expect(canShorten('!FFsmiHprdqsRQisHme:blockwire.chat')).toBe(false);
  });

  it('refuses a room whose name would shadow a page of the app', () => {
    expect(canShorten('#settings:blockwire.chat')).toBe(false);
    expect(canShorten('#home:blockwire.chat')).toBe(false);
    expect(getRoomLink('#settings:blockwire.chat')).toBe(
      'https://blockwire.chat/room/%23settings%3Ablockwire.chat'
    );
  });

  it('refuses another server, so the link still resolves', () => {
    expect(canShorten('#room:other.example')).toBe(false);
    expect(canShorten('@bob:other.example')).toBe(false);
  });

  it('refuses a name that is not URL-safe', () => {
    expect(canShorten('#a room:blockwire.chat')).toBe(false);
    expect(canShorten('#a/b:blockwire.chat')).toBe(false);
  });

  it('keeps a long-form link openable rather than pretty', () => {
    // The colon is encoded so it cannot be read as a scheme separator; `!` is
    // a legal path character and survives as-is. Ugly, but our domain and it
    // opens — this branch only runs when minting an invite link failed.
    const link = getRoomLink('!FFsmiHprdqsRQisHme:blockwire.chat', ['blockwire.chat']);
    expect(link).toBe(
      'https://blockwire.chat/room/!FFsmiHprdqsRQisHme%3Ablockwire.chat?via=blockwire.chat'
    );
  });
});

describe('via servers', () => {
  it('carries them so a non-member can find the room', () => {
    expect(getRoomLink('#degens:blockwire.chat', ['blockwire.chat', 'other.example'])).toBe(
      'https://blockwire.chat/degens?via=blockwire.chat&via=other.example'
    );
  });

  it('omits the query entirely when there are none', () => {
    expect(getRoomLink('#degens:blockwire.chat', [])).toBe('https://blockwire.chat/degens');
  });
});

describe('deployment config', () => {
  it('follows a configured base and server name', () => {
    setLinkConfig('https://staging.blockwire.chat', 'staging.blockwire.chat');
    expect(getUserLink('@stephen:staging.blockwire.chat')).toBe(
      'https://staging.blockwire.chat/@stephen'
    );
    // The production server is now the foreign one, so it stays long.
    expect(canShorten('#degens:blockwire.chat')).toBe(false);
  });

  it('falls back to production rather than emitting a broken link', () => {
    setLinkConfig(undefined, undefined);
    expect(getRoomLink('#degens:blockwire.chat')).toBe('https://blockwire.chat/degens');
  });
});
