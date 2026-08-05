import { useCallback } from 'react';
import type { Room } from '$types/matrix-sdk';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { getCanonicalAliasOrRoomId, isRoomAlias } from '$utils/matrix';
import { getViaServers } from '$plugins/via-servers';
import { canShorten, getRoomLink } from '$plugins/blockwire-link';
import { createInviteLinkUrl } from '$utils/blockwire/inviteLinks';
import { copyToClipboard } from '$utils/dom';
import { shareText } from '$utils/share';
import { showToast } from '$state/toast';

/** Produces the link a person shares for a room, and hands it to the clipboard
 *  or the share sheet.
 *
 *  Two shapes, because rooms come in two kinds:
 *
 *    published address   #degens:blockwire.chat  ->  blockwire.chat/degens
 *    no address at all   !FFsmi…:blockwire.chat  ->  blockwire.chat/+7Fk2xQwe
 *
 *  The second is the interesting one. A private room has no name to put in a
 *  URL, and pasting its internal id is what made shared links look like
 *  protocol debris. So we mint a real invite link through the gateway —
 *  revocable, expirable, and the thing people already expect from a group
 *  chat. It costs a round trip, which is why this is async.
 *
 *  Minting needs permission to invite. When the caller does not have it (or
 *  the gateway is down) we fall back to the long form rather than failing:
 *  an ugly link that works beats an error, and the room may well be one the
 *  recipient can already reach.
 */
export const useShareRoomLink = (room: Room) => {
  const mx = useMatrixClient();

  const buildLink = useCallback(async (): Promise<string> => {
    const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);

    if (canShorten(roomIdOrAlias)) {
      // Published address: no server round trip, no side effects.
      return getRoomLink(roomIdOrAlias);
    }

    try {
      return await createInviteLinkUrl(mx, room.roomId);
    } catch {
      const viaServers = isRoomAlias(roomIdOrAlias) ? undefined : getViaServers(room);
      return getRoomLink(roomIdOrAlias, viaServers);
    }
  }, [mx, room]);

  const copyLink = useCallback(async () => {
    copyToClipboard(await buildLink());
    showToast('Link copied');
  }, [buildLink]);

  const shareLink = useCallback(async () => {
    // shareText already falls back to the clipboard where there is no share
    // sheet, and returns false when the person cancels — which must stay a
    // no-op rather than a surprise copy.
    const link = await buildLink();
    await shareText(link).catch(() => {});
  }, [buildLink]);

  return { buildLink, copyLink, shareLink };
};
