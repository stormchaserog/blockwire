import { useMemo } from 'react';
import { Box, Scroll, Text, color } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useSpace } from '$hooks/useSpace';
import { useStateEvent } from '$hooks/useStateEvent';
import { useRoomPinnedEvents } from '$hooks/useRoomPinnedEvents';
import { useRoomEvent } from '$hooks/useRoomEvent';
import { useRoomMessagePreviewRenderer, MessagePreview } from '$components/message-preview';
import { useRoomNavigate } from '$hooks/useRoomNavigate';
import { useSetting } from '$state/hooks/settings';
import { settingsAtom } from '$state/settings';
import { Page, PageContent, PageContentCenter, PageHeader } from '$components/page';
import { sizedIcon, Bell } from '$components/icons/phosphor';
import { ProjectTabBar } from '$features/project-identity';
import type { Room } from '$types/matrix-sdk';

type UpdateRowProps = {
  room: Room;
  eventId: string;
};
function UpdateRow({ room, eventId }: UpdateRowProps) {
  const event = useRoomEvent(room, eventId);
  const renderContent = useRoomMessagePreviewRenderer(room);
  const { navigateRoom } = useRoomNavigate();
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  if (!event) return null;

  return (
    <MessagePreview
      room={room}
      event={event}
      renderContent={renderContent}
      onOpen={() => navigateRoom(room.roomId, eventId)}
      hour24Clock={hour24Clock}
      dateFormatString={dateFormatString}
    />
  );
}

/** UI Bible §8: project navigation is Chat/Updates/Hub/Info. "Updates" is
 *  the official announcements feed for a project. There is no dedicated
 *  announcements feature in the underlying platform -- Spaces don't have
 *  their own message timeline in any practical sense, and nothing
 *  auto-created a canonical announcements room before this session. The
 *  real mechanism: CreateProjectForm now creates a normal room named
 *  "Updates" as a child of every new project's Space, and records its ID
 *  on the Space via the chat.blockwire.space.updates_room state event (see
 *  types/matrix-sdk-events.d.ts) -- not name-matching a room called
 *  "Updates", which would break on rename and be ambiguous if a project
 *  happened to have a second room with that name. This screen reads that
 *  state event, resolves the room, and shows its PINNED messages as the
 *  actual feed -- reusing the same useRoomPinnedEvents/MessagePreview
 *  pieces the existing per-room pin menu (RoomPinMenu.tsx) already uses,
 *  rather than duplicating that rendering logic.
 *
 *  Projects created BEFORE this shipped have no updates_room state event
 *  and no Updates room -- the empty state below says exactly that,
 *  honestly, rather than silently showing nothing with no explanation. */
export function SpaceUpdates() {
  const mx = useMatrixClient();
  const space = useSpace();

  const updatesRoomEvent = useStateEvent(space, 'chat.blockwire.space.updates_room');
  const updatesRoomId = updatesRoomEvent?.getContent<{ room_id: string }>()?.room_id;
  const updatesRoom = updatesRoomId ? mx.getRoom(updatesRoomId) : null;

  const pinnedEventIds = useRoomPinnedEvents(updatesRoom ?? space);
  const sortedPinnedEventIds = useMemo(
    () => Array.from(pinnedEventIds).toReversed(),
    [pinnedEventIds]
  );

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" alignItems="Center" justifyContent="Center" gap="200">
          {sizedIcon(Bell, '400')}
          <Text size="H3">Updates</Text>
        </Box>
      </PageHeader>
      <ProjectTabBar />
      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              {!updatesRoom ? (
                <Box direction="Column" gap="100" alignItems="Center" style={{ padding: '2rem 0' }}>
                  <Text size="H5">No Updates room yet</Text>
                  <Text
                    size="T300"
                    style={{ color: color.Surface.OnContainer, textAlign: 'center' }}
                  >
                    This project was created before Updates existed. A founder can create a room and
                    pin announcements to it to use this feature.
                  </Text>
                </Box>
              ) : sortedPinnedEventIds.length === 0 ? (
                <Box direction="Column" gap="100" alignItems="Center" style={{ padding: '2rem 0' }}>
                  <Text size="H5">No announcements yet</Text>
                  <Text
                    size="T300"
                    style={{ color: color.Surface.OnContainer, textAlign: 'center' }}
                  >
                    Official project updates will appear here once a founder pins a message in the
                    Updates room.
                  </Text>
                </Box>
              ) : (
                <Box direction="Column" gap="200">
                  {sortedPinnedEventIds.map((eventId) => (
                    <UpdateRow key={eventId} room={updatesRoom} eventId={eventId} />
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
