import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Input, Scroll, Text, color } from 'folds';
import { useAtomValue } from 'jotai';
import type { MatrixClient, Room, UserEventHandlerMap } from '$types/matrix-sdk';
import { UserEvent } from '$types/matrix-sdk';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { roomToParentsAtom } from '$state/room/roomToParents';
import { allRoomsAtom } from '$state/room-list/roomList';
import { roomToUnreadAtom } from '$state/room/roomToUnread';
import { useOrphanSpaces } from '$state/hooks/roomList';
import { useRoomsUnread } from '$state/hooks/unread';
import { useRoomName, useRoomAvatar } from '$hooks/useRoomMeta';
import { mxcUrlToHttp } from '$utils/matrix';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { RoomAvatar } from '$components/room-avatar';
import { nameInitials } from '$utils/common';
import { getSpaceLobbyPath } from '$pages/pathUtils';
import { Page, PageContent, PageContentCenter, PageHeader } from '$components/page';
import { chipIcon, sizedIcon, MagnifyingGlass, UsersThree } from '$components/icons/phosphor';
import { factoryRoomIdByActivity } from '$utils/sort';
import * as css from './style.css';

function CommunityCard({ roomId, filter }: { roomId: string; filter: string }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  if (!room) return null;
  return <CommunityCardContent roomId={roomId} room={room} filter={filter} />;
}

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
 *  listen when the answer aggregates over a whole room's membership. */
function useOnlineMemberCount(room: Room): number {
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

function CommunityCardContent({
  roomId,
  room,
  filter,
}: {
  roomId: string;
  room: Room;
  filter: string;
}) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  // useRoomsUnread's internal selector depends on this array BY REFERENCE
  // (see state/hooks/unread.ts) -- passing a fresh [roomId] literal every
  // render meant a new selector every render, which re-subscribes the atom
  // every render, which re-renders this component, which creates another
  // fresh array: an infinite loop. This is exactly what froze the
  // Communities screen. Every other caller of useRoomsUnread in the
  // codebase (HomeTab, DirectTab) already passes a stable, memoized array
  // -- this one didn't.
  const unreadRoomIds = useMemo(() => [roomId], [roomId]);
  const unread = useRoomsUnread(unreadRoomIds, roomToUnreadAtom);
  const name = useRoomName(room);
  const avatarMxc = useRoomAvatar(room);
  const avatarUrl = avatarMxc
    ? (mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const memberCount = room.getJoinedMemberCount();
  const onlineCount = useOnlineMemberCount(room);

  // Client-side search filter: hide (don't unmount-crash) cards whose name
  // doesn't contain the query. Hooks above always run so the unread atom
  // subscription stays stable while typing.
  if (filter && !name.toLowerCase().includes(filter)) return null;

  return (
    <Box
      className={css.CommunityCard}
      alignItems="Center"
      gap="300"
      onClick={() => navigate(getSpaceLobbyPath(roomId))}
    >
      <Avatar size="400" radii="300">
        <RoomAvatar
          roomId={roomId}
          src={avatarUrl}
          alt={name}
          renderFallback={() => <Text size="H6">{nameInitials(name)}</Text>}
        />
      </Avatar>
      <Box grow="Yes" direction="Column" gap="0">
        <Text size="T400" truncate>
          <b>{name}</b>
        </Text>
        {memberCount > 0 && (
          <Box alignItems="Center" gap="200">
            <Text size="T200" priority="300" truncate>
              {`${memberCount} members`}
            </Text>
            {onlineCount > 0 && (
              <Box as="span" shrink="No" alignItems="Center" gap="100">
                <span
                  style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    background: color.Success.Main,
                  }}
                />
                <Text as="span" size="T200" style={{ color: color.Success.Main }} truncate>
                  {`${onlineCount} online`}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
      {!!unread && unread.total > 0 && (
        <Box
          shrink="No"
          alignItems="Center"
          justifyContent="Center"
          style={{
            height: '1.25rem',
            borderRadius: '1.25rem',
            background: unread.highlight > 0 ? color.Critical.Main : color.Secondary.Main,
            color: unread.highlight > 0 ? color.Critical.OnContainer : color.Secondary.OnContainer,
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0 0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          {`${unread.total > 99 ? '99+' : unread.total} unread`}
        </Box>
      )}
    </Box>
  );
}

/** UI Bible §6: "Communities" is one of the five stable global nav items.
 *  No dedicated screen existed for it before this -- the closest prior art
 *  (Home.tsx) is a two-pane desktop nav-shell component, not a standalone
 *  route, and mixes in create-room/join-address/search entries that belong
 *  to a different, DM-and-room-focused list. This is a deliberately lean,
 *  Communities-only list: every top-level Space (Project) the user belongs
 *  to, sorted by recent activity, nothing else -- Discover (a separate tab)
 *  is where finding NEW communities belongs per the Bible's own nav split. */
export function Communities() {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const [searchInput, setSearchInput] = useState('');
  const filter = searchInput.trim().toLowerCase();

  const sortedSpaces = useMemo(
    () => Array.from(orphanSpaces).toSorted(factoryRoomIdByActivity(mx)),
    [mx, orphanSpaces]
  );

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" alignItems="Center" justifyContent="Center" gap="200">
          {sizedIcon(UsersThree, '400')}
          <Text size="H3">Communities</Text>
        </Box>
      </PageHeader>
      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              {sortedSpaces.length === 0 ? (
                <Box direction="Column" gap="100" alignItems="Center" style={{ padding: '2rem 0' }}>
                  <Text size="H5">No communities yet</Text>
                  <Text size="T300" style={{ color: color.Surface.OnContainer }}>
                    Join a crypto community or discover projects to get started.
                  </Text>
                </Box>
              ) : (
                <Box direction="Column" gap="400">
                  <Input
                    size="400"
                    variant="Surface"
                    radii="400"
                    placeholder="Search communities"
                    before={chipIcon(MagnifyingGlass)}
                    value={searchInput}
                    onChange={(evt) => setSearchInput(evt.currentTarget.value)}
                  />
                  <Box direction="Column" gap="200">
                    {sortedSpaces.map((roomId) => (
                      <CommunityCard key={roomId} roomId={roomId} filter={filter} />
                    ))}
                  </Box>
                </Box>
              )}
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
