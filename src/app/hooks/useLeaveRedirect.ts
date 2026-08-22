import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import type { Room, RoomEventHandlerMap } from '$types/matrix-sdk';
import { RoomEvent, KnownMembership } from '$types/matrix-sdk';
import { useMatrixEvent } from '$hooks/useMatrixEvent';
import { allRoomsAtom } from '$state/room-list/roomList';
import { getHomePath } from '$pages/pathUtils';

/**
 * Watches the currently routed room/space and redirects to Home (replacing
 * history, so Back does not bounce into the dead room) when the user's own
 * membership transitions away from `join` while the room is being viewed —
 * e.g. the user leaves or deletes the space/room they are currently inside.
 *
 * The redirect fires ONLY on an observed join→leave transition (or when the
 * routed room vanishes from the joined room list while mounted). Mounting on
 * a room that was never joined does nothing, so the JoinBeforeNavigate flow
 * for join-via-link remains intact.
 */
export const useLeaveRedirect = (room: Room | null | undefined): void => {
  const navigate = useNavigate();
  const allRooms = useAtomValue(allRoomsAtom);

  const roomId = room?.roomId;
  const joined = !!roomId && allRooms.includes(roomId);

  const handleMyMembership: RoomEventHandlerMap[RoomEvent.MyMembership] = useCallback(
    (eventRoom, membership, prevMembership) => {
      if (!roomId || eventRoom.roomId !== roomId) return;
      if (
        prevMembership === (KnownMembership.Join as string) &&
        membership !== (KnownMembership.Join as string)
      ) {
        navigate(getHomePath(), { replace: true });
      }
    },
    [roomId, navigate]
  );

  // The client re-emits Room.myMembership for all of its rooms.
  useMatrixEvent(room?.client, RoomEvent.MyMembership, handleMyMembership);

  // Fallback: the routed room disappeared from the joined room list while
  // being viewed (e.g. room deleted / forgotten without a membership event
  // reaching us). Only fires when the SAME room goes joined → not joined.
  const prevRef = useRef({ roomId, joined });
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { roomId, joined };
    if (roomId && prev.roomId === roomId && prev.joined && !joined) {
      navigate(getHomePath(), { replace: true });
    }
  }, [roomId, joined, navigate]);
};
