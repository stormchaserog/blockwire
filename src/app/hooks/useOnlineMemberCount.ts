import { useCallback, useEffect, useState } from 'react';
import type { MatrixClient, Room, UserEventHandlerMap } from '$types/matrix-sdk';
import { UserEvent } from '$types/matrix-sdk';
import { useMatrixClient } from './useMatrixClient';

/** Presence lookups walk EVERY joined member of the space, so cap where we
 *  even attempt it -- a 20k-member community would mean 20k `mx.getUser()`
 *  calls on every presence event tick. Above the cap the online line is
 *  simply omitted (a fuzzy "lots online" is worth less than the cycles). */
const ONLINE_COUNT_MEMBER_CAP = 500;

const countOnlineMembers = (mx: MatrixClient, room: Room): number => {
  if (room.getJoinedMemberCount() > ONLINE_COUNT_MEMBER_CAP) return 0;
  return room
    .getJoinedMembers()
    .filter((member) => mx.getUser(member.userId)?.presence === 'online').length;
};

/** Live count of joined members whose Matrix presence is 'online'.
 *  Same listen/cleanup shape as useUserPresence (hooks/useUserPresence.ts),
 *  but on the client itself: matrix-js-sdk re-emits every User's
 *  UserEvent.Presence on the MatrixClient, which is the only sane place to
 *  listen when the answer aggregates over a whole room's membership.
 *
 *  Shared extraction of the identical local hook in
 *  pages/client/communities/Communities.tsx -- that file keeps its own copy
 *  for now (another branch is actively touching it); fold it onto this hook
 *  once the branches land. */
export function useOnlineMemberCount(room: Room): number {
  const mx = useMatrixClient();
  const getCount = useCallback(() => countOnlineMembers(mx, room), [mx, room]);
  const [count, setCount] = useState(getCount);

  useEffect(() => {
    setCount(getCount());
    const handlePresence: UserEventHandlerMap[UserEvent.Presence] = () => {
      setCount(getCount());
    };
    mx.on(UserEvent.Presence, handlePresence);
    return () => {
      mx.removeListener(UserEvent.Presence, handlePresence);
    };
  }, [mx, getCount]);

  return count;
}
