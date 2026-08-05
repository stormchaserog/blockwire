import type { MatrixClient } from '$types/matrix-sdk';

/** Mirrors `toPublicBot()` in blockwire-botgw/src/server.ts — deliberately
 *  narrow. The gateway never returns the token hash, webhook fields or the
 *  owner, so there is nothing here that isn't already public to anyone
 *  sharing a room with the bot. */
export type PublicBot = {
  id: number;
  username: string;
  first_name: string;
  description: string | null;
  /** Used to build the ghost's mxid for the invite. */
  matrix_localpart: string;
};

/** The gateway is proxied under the homeserver's origin, same as the push and
 *  invite-link endpoints already shipped in this client. */
export const fetchPublicBots = async (mx: MatrixClient): Promise<PublicBot[]> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/bots/directory`, {
    headers: { Authorization: `Bearer ${mx.getAccessToken() ?? ''}` },
  });
  if (!res.ok) throw new Error(`Could not load the bot directory (${res.status})`);

  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as PublicBot[]) : [];
};

export const botMxid = (mx: MatrixClient, bot: PublicBot): string =>
  `@${bot.matrix_localpart}:${mx.getDomain() ?? ''}`;
