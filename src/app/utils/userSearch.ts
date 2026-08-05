import { getMxIdServer } from '$utils/mxIdHelper';
import { isUserId } from '$utils/matrix';

/** Finding people by name.
 *
 *  Two things were missing and both are needed for "search for someone" to
 *  work at all:
 *
 *  1. A bare handle has to be enough. Nobody types `@guitarguy1007:blockwire.chat`
 *     — they type `guitarguy1007`, the way they would in any other messenger.
 *  2. The search has to reach the server. Filtering the people you have
 *     already talked to can only ever find people you have already found.
 *
 *  These are the pure parts of that, kept separate from the request so they
 *  can be tested without a homeserver.
 */

export interface DirectoryUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Turn whatever someone typed into a full user id.
 *
 * `guitarguy1007`, `@guitarguy1007` and `@guitarguy1007:blockwire.chat` all
 * mean the same person; only the last one is a legal Matrix id, so the other
 * two get completed with the server we are signed in to. An input that names
 * a different server is left alone — the point is to fill in the part people
 * leave out, not to redirect them somewhere they did not ask for.
 *
 * Returns undefined when there is nothing usable to complete.
 */
export const completeUserId = (input: string, homeServer: string): string | undefined => {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (isUserId(trimmed)) return trimmed;

  const withoutSigil = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  if (!withoutSigil) return undefined;

  // Already carries a server, just missing the sigil.
  if (withoutSigil.includes(':')) {
    const candidate = `@${withoutSigil}`;
    return isUserId(candidate) ? candidate : undefined;
  }

  if (!homeServer) return undefined;
  // A localpart cannot contain these; refusing beats sending nonsense to the
  // server and showing the user a raw Matrix error.
  if (/[\s:@/]/.test(withoutSigil)) return undefined;

  const candidate = `@${withoutSigil}:${homeServer}`;
  return isUserId(candidate) ? candidate : undefined;
};

/** The server part of the signed-in account — what a bare handle completes to. */
export const homeServerOf = (userId: string | null | undefined): string =>
  (userId ? getMxIdServer(userId) : undefined) ?? '';

/**
 * Merge people we already know about with what the server returned.
 *
 * Local entries come first: someone you have talked to before is almost
 * always who you meant, and they are available without a round trip. The
 * server fills in everyone else. Deduplicated by user id, because the person
 * you DM'd yesterday is also in the directory.
 */
export const mergeDirectoryResults = (
  local: DirectoryUser[],
  remote: DirectoryUser[],
  limit = 30
): DirectoryUser[] => {
  const seen = new Set<string>();
  const merged: DirectoryUser[] = [];

  for (const user of [...local, ...remote]) {
    if (seen.has(user.userId)) continue;
    seen.add(user.userId);
    merged.push(user);
    if (merged.length >= limit) break;
  }
  return merged;
};

/** Case-insensitive substring match over the handle and the display name. */
export const matchesTerm = (user: DirectoryUser, term: string): boolean => {
  const needle = term.trim().toLowerCase().replace(/^@/, '');
  if (!needle) return false;
  return (
    user.userId.toLowerCase().includes(needle) ||
    (user.displayName ?? '').toLowerCase().includes(needle)
  );
};
