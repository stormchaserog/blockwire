import type { MatrixClient } from '$types/matrix-sdk';
import { getInviteLink } from '$plugins/blockwire-link';

/** BlockWire invite links — `blockwire.chat/+7Fk2xQwe`.
 *
 *  Matrix has no revocable, expiring, use-capped invite link, so the gateway
 *  owns that primitive and the client only creates and redeems. This is what
 *  makes a private room shareable at all: it has no published address, so
 *  there is nothing to put in a pretty URL except a link we mint.
 *
 *  Creating one is a room-admin action, so these calls carry the caller's own
 *  access token, never a bot token.
 */

export interface InviteLinkRecord {
  hash: string;
  room_id: string;
}

export interface ResolvedInvite {
  hash: string;
  room_id: string;
  room_name?: string;
  join_rule: string;
  /** `knock` means the room is ask-to-join: the link says who may ask, the
   *  room's admins still decide. Callers must not promise entry. */
  action: 'join' | 'knock';
}

const parseError = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? fallback;
};

/**
 * Mint a shareable invite link for a room and return the full URL.
 *
 * Requires permission to invite in that room — the gateway checks, because a
 * link hands out exactly that capability.
 */
export const createInviteLinkUrl = async (
  mx: MatrixClient,
  roomId: string
): Promise<string> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mx.getAccessToken() ?? ''}`,
    },
    body: JSON.stringify({ room_id: roomId }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not create an invite link for this chat.'));
  }
  const link = (await res.json()) as InviteLinkRecord;
  if (!link.hash) throw new Error('The invite service returned an unusable link.');
  return getInviteLink(link.hash);
};

/**
 * Look up what a link leads to WITHOUT spending one of its uses, so the
 * landing page can name the room before anyone commits to joining.
 * Deliberately unauthenticated on the server side.
 */
export const resolveInviteLink = async (
  baseUrl: string,
  hash: string
): Promise<ResolvedInvite> => {
  const res = await fetch(`${baseUrl}/_blockwire/links/${encodeURIComponent(hash)}`);
  if (!res.ok) {
    throw new Error(await parseError(res, 'This invite link is not valid.'));
  }
  return (await res.json()) as ResolvedInvite;
};

/**
 * Spend the link. Only call this once the person has said yes — a use is
 * consumed on success and capped links are a finite resource.
 */
export const redeemInviteLink = async (
  mx: MatrixClient,
  hash: string
): Promise<ResolvedInvite> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/links/${encodeURIComponent(hash)}/redeem`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mx.getAccessToken() ?? ''}` },
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'This invite link is not valid.'));
  }
  return (await res.json()) as ResolvedInvite;
};
