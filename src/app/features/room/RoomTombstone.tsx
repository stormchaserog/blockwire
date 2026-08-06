import { useCallback } from 'react';
import { Box, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { allRoomsAtom } from '$state/room-list/roomList';

import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { AsyncError } from '$components/AsyncError';

import { useRoomNavigate } from '$hooks/useRoomNavigate';
import { getViaServers } from '$plugins/via-servers';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import * as css from './RoomTombstone.css';
import { KnownMembership } from '$types/matrix-sdk';
import type { Room } from '$types/matrix-sdk';
import { Button } from '$components/button';

// `replacementRoomId` is required by spec but not by reality: a redacted
// tombstone has empty content, and rendering a Join button for it produced a
// permanent, always-failing banner. Without a replacement the room is simply
// closed.
type RoomTombstoneProps = { roomId: string; body?: string; replacementRoomId?: string };
export function RoomTombstone({ roomId, body, replacementRoomId }: RoomTombstoneProps) {
  const mx = useMatrixClient();
  const { navigateRoom } = useRoomNavigate();

  const [joinState, handleJoin] = useAsyncCallback(
    useCallback(() => {
      if (!replacementRoomId) return Promise.reject<Room>(new Error('No replacement room.'));
      const currentRoom = mx.getRoom(roomId);
      const via = currentRoom ? getViaServers(currentRoom) : [];
      return mx.joinRoom(replacementRoomId, {
        viaServers: via,
      });
    }, [mx, roomId, replacementRoomId])
  );
  const replacementRoom = replacementRoomId ? mx.getRoom(replacementRoomId) : null;

  // See the matching comment in SpaceTombstone: `mx.getRoom()` is a plain
  // render-time read, so this banner never updated once the replacement
  // arrived and kept offering "Join New Room" to people already in it.
  const allJoinedRoomIds = useAtomValue(allRoomsAtom);
  const alreadyJoined =
    (!!replacementRoomId && allJoinedRoomIds.includes(replacementRoomId)) ||
    replacementRoom?.getMyMembership() === KnownMembership.Join ||
    joinState.status === AsyncStatus.Success;

  const handleOpen = () => {
    if (replacementRoom) navigateRoom(replacementRoom.roomId);
    else if (joinState.status === AsyncStatus.Success) navigateRoom(joinState.data.roomId);
    else if (replacementRoomId) navigateRoom(replacementRoomId);
  };

  return (
    <RoomInputPlaceholder alignItems="Center" gap="600" className={css.RoomTombstone}>
      <Box direction="Column" grow="Yes">
        <Text size="T400">{body || 'This room has been replaced and is no longer active.'}</Text>
        <AsyncError state={joinState} />
      </Box>
      {replacementRoomId && (
        <Box shrink="No">
          {alreadyJoined ? (
            <Button onClick={handleOpen} size="300" variant="Success" fill="Solid" radii="300">
              <Text size="B300">Open New Room</Text>
            </Button>
          ) : (
            <Button
              loading={joinState.status === AsyncStatus.Loading}
              spinnerSize="100"
              spinnerVariant="Primary"
              spinnerFill="Solid"
              size="300"
              variant="Primary"
              fill="Solid"
              radii="300"
              onClick={handleJoin}
            >
              <Text size="B300">Join New Room</Text>
            </Button>
          )}
        </Box>
      )}
    </RoomInputPlaceholder>
  );
}
