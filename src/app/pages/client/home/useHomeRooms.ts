import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { mDirectAtom } from '$state/mDirectList';
import { roomToParentsAtom } from '$state/room/roomToParents';
import { allRoomsAtom } from '$state/room-list/roomList';
import { useDirects, useOrphanRooms } from '$state/hooks/roomList';

/**
 * Every conversation, in one flat list.
 *
 * BlockWire departs from upstream here. Upstream splits conversations across
 * tabs by Matrix concept — direct messages in one place, rooms in another,
 * rooms inside spaces somewhere else again — which asks the user to know what
 * a "space" is before they can find a chat.
 *
 * The product this competes with shows a single list of everything, newest
 * first, so that is what home returns: DMs, groups and channels together,
 * including rooms that live inside a space. Sorting is by activity (see
 * Home.tsx), so the chat you last used is the one at the top.
 *
 * The two sets are disjoint by construction — useOrphanRooms excludes
 * directs — so concatenating cannot duplicate a room.
 */
export const useHomeRooms = (isShowingAllRoomsInHome?: boolean) => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

  const rooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents, isShowingAllRoomsInHome);
  const directs = useDirects(mx, allRoomsAtom, mDirects);

  return useMemo(() => [...directs, ...rooms], [directs, rooms]);
};
