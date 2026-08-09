import { describe, expect, it } from 'vitest';
import { matchPath } from 'react-router-dom';
import {
  getAppPathFromHref,
  getSettingsPath,
  getHomeRoomPath,
  getSpaceRoomPath,
} from './pathUtils';
import { HOME_ROOM_PATH, SPACE_ROOM_PATH } from './paths';

describe('getSettingsPath', () => {
  it('returns the settings root path', () => {
    expect(getSettingsPath()).toBe('/settings');
  });

  it('returns a section path with an optional focus query', () => {
    expect(getSettingsPath('devices')).toBe('/settings/devices');
    expect(getSettingsPath('appearance', 'message-link-preview')).toBe(
      '/settings/appearance?focus=message-link-preview'
    );
  });
});

describe('getAppPathFromHref', () => {
  it('extracts the app path for a matching browser-router origin', () => {
    expect(getAppPathFromHref('https://app.sable.moe/', 'https://app.sable.moe/')).toBe('/');
    expect(getAppPathFromHref('https://app.sable.moe/', 'https://app.sable.moe/login')).toBe(
      '/login'
    );
    expect(
      getAppPathFromHref('https://app.sable.moe/', 'https://app.sable.moe/home/room/%21abc')
    ).toBe('/home/room/%21abc');
  });

  it('extracts the app path for a matching hash-router origin', () => {
    expect(getAppPathFromHref('https://app.sable.moe/#/', 'https://app.sable.moe/#/')).toBe('/');
    expect(
      getAppPathFromHref('https://app.sable.moe/#/', 'https://app.sable.moe/#/login?code=c&state=s')
    ).toBe('/login?code=c&state=s');
  });

  it('extracts the path from the href when the origin does not match the base (Tauri)', () => {
    expect(getAppPathFromHref('https://app.sable.moe/', 'https://tauri.localhost/')).toBe('/');
    expect(
      getAppPathFromHref('https://app.sable.moe/', 'https://tauri.localhost/login?code=c&state=s')
    ).toBe('/login?code=c&state=s');
  });

  it('returns empty when a hash-router base is paired with a hashless href', () => {
    expect(getAppPathFromHref('https://app.sable.moe/#/', 'https://tauri.localhost/')).toBe('');
  });
});

describe('room path id round-trip (react-router v7 encode/decode balance)', () => {
  const ROOM = '!esoyFgbCHWbJjFajcx:blockwire.chat';
  const SPACE = '!xjLTbBaWxeIoUjgNOd:blockwire.chat';

  it('recovers the exact room id from a generated home-room path', () => {
    const path = getHomeRoomPath(ROOM);
    // The id must never appear double-encoded (%253A) in the URL.
    expect(path).not.toContain('%253A');
    const match = matchPath(HOME_ROOM_PATH, path);
    const decoded = decodeURIComponent(match!.params.roomIdOrAlias!);
    expect(decoded).toBe(ROOM);
  });

  it('recovers the exact space and room ids from a generated space-room path', () => {
    const path = getSpaceRoomPath(SPACE, ROOM);
    expect(path).not.toContain('%253A');
    const match = matchPath(SPACE_ROOM_PATH, path);
    expect(decodeURIComponent(match!.params.spaceIdOrAlias!)).toBe(SPACE);
    expect(decodeURIComponent(match!.params.roomIdOrAlias!)).toBe(ROOM);
  });
});
