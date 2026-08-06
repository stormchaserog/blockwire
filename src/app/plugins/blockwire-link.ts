/** BlockWire share links.
 *
 *  A link someone pastes into a group chat or texts to a friend is often the
 *  first thing they ever see of the product, so it has to read like a
 *  messenger link and never expose the protocol underneath:
 *
 *    person           https://blockwire.chat/@stephen
 *    public room      https://blockwire.chat/degens
 *    private room     https://blockwire.chat/+7Fk2xQwe   (minted on demand)
 *    single message   https://blockwire.chat/degens/$abc
 *
 *  The short forms are only possible for our own server, because that is the
 *  part we get to leave out. Anything from another server keeps its full
 *  identifier so the link still resolves — federation is off today, so that
 *  branch is theoretical, but a link that works is worth more than a link
 *  that is pretty.
 *
 *  A room with no published address cannot be shortened at all: there is
 *  nothing to shorten but an opaque internal id. Those get an invite link
 *  instead (`/+hash`, minted through the gateway), which is both prettier and
 *  the behaviour people already expect from Telegram.
 *
 *  Generation lives here; the matching resolution lives in the boot guard in
 *  index.html, which runs before the router. Change one, change the other —
 *  test/boot-guard.test.mjs is what stops them drifting apart.
 */

const DEFAULT_BASE = 'https://blockwire.chat/';
const DEFAULT_SERVER = 'blockwire.chat';

let linkBase = DEFAULT_BASE;
let homeServer = DEFAULT_SERVER;

/**
 * Configure where share links point. Called once from the app shell with the
 * deployment's config; falls back to the production values so a link built
 * before config lands is still correct rather than broken.
 */
export const setLinkConfig = (baseUrl?: string, serverName?: string): void => {
  linkBase = baseUrl ? baseUrl.replace(/\/?$/, '/') : DEFAULT_BASE;
  homeServer = serverName || DEFAULT_SERVER;
};

export const getLinkBase = (): string => linkBase;
export const getLinkServerName = (): string => homeServer;

/**
 * Top-level paths the app itself owns. A room whose address collides with one
 * of these cannot use the short form — `/settings` has to stay the settings
 * page — so it falls back to the long form instead of shadowing a real page.
 *
 * Keep in sync with src/app/pages/paths.ts. `test/boot-guard.test.mjs` checks
 * the resolver against this same list.
 */
export const RESERVED_SEGMENTS: ReadonlySet<string> = new Set([
  'login',
  'register',
  'reset-password',
  'home',
  'direct',
  'explore',
  'create',
  'create-room',
  'bug-report',
  'navigate',
  'profile',
  'inbox',
  'settings',
  'lp',
  'invite',
  // The AGPL source offer. A room called "source" must never be able to
  // shadow the page that discharges a licence obligation.
  'source',
  // Store-required legal pages; app-store review links point here, so no room
  // may ever shadow them.
  'privacy',
  'terms',
  // Owned by the link scheme itself: `/room/<id>` is the long form for a room
  // with no published address.
  'room',
  // Not routes, but files Vercel serves from the filesystem. A room using one
  // of these names would produce a link that never reaches the app at all.
  'index.html',
  'config.json',
  'sw.js',
  'assets',
  'public',
  'manifest.webmanifest',
  '.well-known',
]);

/** A bare handle usable as a URL path segment: no slashes, no protocol punctuation. */
const HANDLE = /^[a-z0-9._=-]+$/i;

const localpartOf = (id: string): string | undefined => {
  const colon = id.indexOf(':');
  if (colon < 1) return undefined;
  return id.slice(1, colon);
};

const serverOf = (id: string): string | undefined => {
  const colon = id.indexOf(':');
  if (colon < 1) return undefined;
  return id.slice(colon + 1);
};

/** True when this target can be written as a bare `/handle` on our server. */
export const canShorten = (idOrAlias: string): boolean => {
  const sigil = idOrAlias.charAt(0);
  if (sigil !== '#' && sigil !== '@') return false;
  if (serverOf(idOrAlias) !== homeServer) return false;
  const localpart = localpartOf(idOrAlias);
  if (!localpart || !HANDLE.test(localpart)) return false;
  // A room named "settings" is legal on the server but cannot own /settings.
  if (sigil === '#' && RESERVED_SEGMENTS.has(localpart.toLowerCase())) return false;
  return true;
};

const withVia = (url: string, viaServers?: string[]): string => {
  if (!Array.isArray(viaServers) || viaServers.length === 0) return url;
  const query = viaServers.map((server) => `via=${encodeURIComponent(server)}`).join('&');
  return `${url}?${query}`;
};

/**
 * Link to a person. Users always have a handle, so this is always short for
 * local accounts: https://blockwire.chat/@stephen
 */
export const getUserLink = (userId: string): string => {
  if (canShorten(userId)) return `${linkBase}@${localpartOf(userId)}`;
  return `${linkBase}${encodeURIComponent(userId)}`;
};

/**
 * Link to a room, group or channel by its published address.
 *
 * Rooms with no address cannot be shortened — see `canShorten` — and callers
 * that care about the difference should mint an invite link instead of
 * shipping the long form. `via` servers are preserved because without them a
 * non-member's server may have no way to find the room.
 */
export const getRoomLink = (roomIdOrAlias: string, viaServers?: string[]): string => {
  if (canShorten(roomIdOrAlias)) {
    return withVia(`${linkBase}${localpartOf(roomIdOrAlias)}`, viaServers);
  }
  // No usable short form. `/room/` keeps this unambiguous: a bare segment is
  // a room name, `/room/<id>` is an internal identifier, and neither can be
  // mistaken for a space URL by the resolver.
  return withVia(`${linkBase}room/${encodeURIComponent(roomIdOrAlias)}`, viaServers);
};

/** Link to one message inside a room. */
export const getEventLink = (
  roomIdOrAlias: string,
  eventId: string,
  viaServers?: string[]
): string => {
  const room = canShorten(roomIdOrAlias)
    ? localpartOf(roomIdOrAlias)
    : `room/${encodeURIComponent(roomIdOrAlias)}`;
  return withVia(`${linkBase}${room}/${encodeURIComponent(eventId)}`, viaServers);
};

/** Link that redeems a gateway-minted invite: https://blockwire.chat/+7Fk2xQwe */
export const getInviteLink = (hash: string): string => `${linkBase}+${encodeURIComponent(hash)}`;
