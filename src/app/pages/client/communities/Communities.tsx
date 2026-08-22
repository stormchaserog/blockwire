import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Scroll, Text, color } from 'folds';
import { useAtomValue } from 'jotai';
import type { Room } from '$types/matrix-sdk';
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
import { sizedIcon, UsersThree } from '$components/icons/phosphor';
import { factoryRoomIdByActivity } from '$utils/sort';

function CommunityRow({ roomId }: { roomId: string }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  if (!room) return null;
  return <CommunityRowContent roomId={roomId} room={room} />;
}

function CommunityRowContent({ roomId, room }: { roomId: string; room: Room }) {
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

  return (
    <Box
      alignItems="Center"
      gap="300"
      style={{ padding: '0.75rem 0', cursor: 'pointer' }}
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
          {name}
        </Text>
      </Box>
      {!!unread && unread.total > 0 && (
        <Box
          style={{
            minWidth: '1.25rem',
            height: '1.25rem',
            borderRadius: '1.25rem',
            background: unread.highlight > 0 ? color.Critical.Main : color.Secondary.Main,
            color: unread.highlight > 0 ? color.Critical.OnContainer : color.Secondary.OnContainer,
            fontSize: '0.75rem',
            fontWeight: 700,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 0.375rem',
          }}
        >
          {unread.total > 99 ? '99+' : unread.total}
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
                <Box direction="Column">
                  {sortedSpaces.map((roomId) => (
                    <CommunityRow key={roomId} roomId={roomId} />
                  ))}
                </Box>
              )}
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
