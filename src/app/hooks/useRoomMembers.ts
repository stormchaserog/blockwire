import type { MatrixClient, MatrixEvent, RoomMember } from '$types/matrix-sdk';
import { EventType, RoomMemberEvent, RoomStateEvent } from '$types/matrix-sdk';
import { useEffect, useState } from 'react';
import { hydrateAllRoomMembers } from '$client/roomMemberHydration';

export const useRoomMembers = (mx: MatrixClient, roomId: string, enabled = true): RoomMember[] => {
  const [members, setMembers] = useState<RoomMember[]>([]);

  useEffect(() => {
    if (!enabled) {
      setMembers([]);
      return undefined;
    }

    const room = mx.getRoom(roomId);
    let loadingMembers = true;
    let disposed = false;
    let updateTimer: ReturnType<typeof setTimeout> | null = null;

    const updateMemberList = (event?: MatrixEvent) => {
      if (!room || disposed || (event && event.getRoomId() !== roomId)) return;
      if (loadingMembers) return;
      // Trailing debounce: busy rooms emit membership/power events in bursts,
      // and every setMembers re-renders the whole room tree and re-sorts the
      // member drawer. One update per window is plenty.
      if (updateTimer !== null) return;
      updateTimer = setTimeout(() => {
        updateTimer = null;
        if (disposed || loadingMembers) return;
        setMembers(room.getMembers());
      }, 250);
    };

    if (room) {
      setMembers(room.getMembers());
      const stopLoading = () => {
        loadingMembers = false;
        if (disposed) return;
        updateMemberList();
        void hydrateAllRoomMembers(mx, roomId).then(() => updateMemberList());
      };
      room.loadMembersIfNeeded().then(stopLoading, stopLoading);
    }

    const handleStateEvent = (event: MatrixEvent) => {
      if (event.getRoomId() !== roomId) return;
      if (event.getType() !== (EventType.RoomMember as string)) return;
      updateMemberList(event);
    };

    mx.on(RoomMemberEvent.Membership, updateMemberList);
    mx.on(RoomMemberEvent.PowerLevel, updateMemberList);
    mx.on(RoomStateEvent.Events, handleStateEvent);
    return () => {
      disposed = true;
      if (updateTimer !== null) clearTimeout(updateTimer);
      mx.removeListener(RoomMemberEvent.Membership, updateMemberList);
      mx.removeListener(RoomMemberEvent.PowerLevel, updateMemberList);
      mx.removeListener(RoomStateEvent.Events, handleStateEvent);
    };
  }, [enabled, mx, roomId]);

  return members;
};
