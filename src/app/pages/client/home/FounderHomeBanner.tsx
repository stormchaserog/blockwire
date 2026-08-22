import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Badge, Box, Text, color, config } from 'folds';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import { fetchChainAssets } from '$utils/blockwire/projects';
import { fetchChainAssetSnapshot, type TokenSnapshot } from '$utils/blockwire/chainAssets';
import { getSpaceHubPath } from '$pages/pathUtils';
import { mxcUrlToHttp } from '$utils/matrix';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useAlive } from '$hooks/useAlive';
import { nameInitials } from '$utils/common';
import { sizedIcon, House, SealCheck } from '$components/icons/phosphor';
import { useSpaceChildren, useRecursiveChildScopeFactory } from '$state/hooks/roomList';
import { allRoomsAtom } from '$state/room-list/roomList';
import { roomToParentsAtom } from '$state/room/roomToParents';
import { roomToUnreadAtom } from '$state/room/roomToUnread';
import { useRoomsUnread } from '$state/hooks/unread';
import { useStateEvent } from '$hooks/useStateEvent';
import type { Room } from '$types/matrix-sdk';

function formatPrice(price: number | null): string | null {
  if (price === null) return null;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(price < 1 ? 4 : 2)}`;
}

function PriceChange({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const up = percent >= 0;
  return (
    <Text size="T200" style={{ color: up ? color.Success.Main : color.Critical.Main }}>
      {up ? '+' : ''}
      {percent.toFixed(1)}%
    </Text>
  );
}

function OwnedProjectRow({ project }: { project: ProjectRecord }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(project.space_room_id);
  if (!room) return null;
  return <OwnedProjectRowContent project={project} room={room} />;
}

function OwnedProjectRowContent({ project, room }: { project: ProjectRecord; room: Room }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const alive = useAlive();
  const avatarUrl = project.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 64, 64, 'crop') ?? undefined)
    : undefined;

  const [primaryAsset, setPrimaryAsset] = useState<ProjectChainAsset | null | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<TokenSnapshot | null>(null);

  useEffect(() => {
    setPrimaryAsset(undefined);
    setSnapshot(null);
    fetchChainAssets(mx, project.project_id)
      .then((assets) => {
        if (!alive()) return;
        setPrimaryAsset(assets[0] ?? null);
      })
      .catch(() => {
        if (alive()) setPrimaryAsset(null);
      });
  }, [mx, project.project_id, alive]);

  useEffect(() => {
    if (!primaryAsset) return;
    fetchChainAssetSnapshot(mx, project.project_id, primaryAsset.id)
      .then((res) => {
        if (alive()) setSnapshot(res.canonical);
      })
      .catch(() => {
        // Price is a nice-to-have on this card, not the reason it exists --
        // fail silently rather than show an error state for a decorative
        // metric on a summary row.
      });
  }, [mx, project.project_id, primaryAsset, alive]);

  const roomToParents = useAtomValue(roomToParentsAtom);
  const allChild = useSpaceChildren(
    allRoomsAtom,
    project.space_room_id,
    useRecursiveChildScopeFactory(mx, roomToParents)
  );
  const unread = useRoomsUnread(allChild, roomToUnreadAtom);
  const memberCount = room.getJoinedMemberCount();

  const updatesRoomEvent = useStateEvent(room, 'chat.blockwire.space.updates_room');
  const updatesRoomId = updatesRoomEvent?.getContent<{ room_id: string }>()?.room_id;
  const updatesRoom = updatesRoomId ? mx.getRoom(updatesRoomId) : null;
  const pinnedCount = updatesRoom?.currentState
    .getStateEvents('m.room.pinned_events', '')
    ?.getContent<{ pinned?: string[] }>()?.pinned?.length;

  const price = formatPrice(snapshot?.priceUsd ?? null);

  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        padding: config.space.S300,
        borderRadius: config.radii.R400,
        backgroundColor: color.SurfaceVariant.Container,
        cursor: 'pointer',
      }}
      onClick={() => navigate(getSpaceHubPath(project.space_room_id))}
    >
      <Box alignItems="Center" gap="200">
        <Avatar size="400" radii="300">
          {avatarUrl ? (
            <img src={avatarUrl} alt={project.name} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text size="H5">{nameInitials(project.name)}</Text>
          )}
        </Avatar>
        <Box grow="Yes" direction="Column" gap="0">
          <Box alignItems="Center" gap="100">
            <Text size="T500" truncate>
              {project.name}
            </Text>
            {project.owner_verification_state === 'verified' &&
              sizedIcon(SealCheck, '50', { weight: 'fill', style: { color: color.Success.Main } })}
          </Box>
          <Box alignItems="Center" gap="100">
            {project.ticker && (
              <Text size="T200" style={{ color: color.Surface.OnContainer }}>
                ${project.ticker}
              </Text>
            )}
            {primaryAsset && (
              <Text size="T200" style={{ color: color.Surface.OnContainer }}>
                · {primaryAsset.chain}
              </Text>
            )}
          </Box>
        </Box>
        {price && (
          <Box direction="Column" alignItems="End" gap="0">
            <Text size="T300">{price}</Text>
            <PriceChange percent={snapshot?.priceChangePercent.h24 ?? null} />
          </Box>
        )}
      </Box>
      <Box alignItems="Center" gap="200" style={{ flexWrap: 'wrap' }}>
        {!!unread?.total && (
          <Badge variant="Primary" fill="Solid" radii="Pill" size="500">
            <Text size="L400">{unread.total} unread</Text>
          </Badge>
        )}
        {!!pinnedCount && (
          <Text size="T200" style={{ color: color.Surface.OnContainer }}>
            {pinnedCount} announcement{pinnedCount === 1 ? '' : 's'}
          </Text>
        )}
        {typeof memberCount === 'number' && (
          <Text size="T200" style={{ color: color.Surface.OnContainer, marginLeft: 'auto' }}>
            {memberCount.toLocaleString()} members
          </Text>
        )}
      </Box>
    </Box>
  );
}

/** UI Bible §7 (Founder and Team Home): "Show the Project Hub. The first
 *  question this screen should answer is: What needs me today?"
 *
 *  Rebuilt from the original honest-MVP version (a bare name + link row)
 *  into a real card per Steven's reference mockup: avatar, verified
 *  badge, ticker + chain, live price/24h change (real data, from the
 *  same chain-asset snapshot endpoint BuyFeed already uses), aggregate
 *  unread count across every room in the project's space (same
 *  useRoomsUnread/useSpaceChildren pattern Space.tsx already uses for
 *  its own unread badge), a real announcement count sourced from the
 *  Updates room's actual pinned-message count (the same room Updates.tsx
 *  reads), and the space's real joined-member count.
 *
 *  Still deliberately does NOT fake: Trending/engagement scores, "tasks
 *  need attention" (no task system exists), or per-project moderation
 *  queue counts -- those still need real aggregation data sources this
 *  session didn't build, exactly as the previous version's doc comment
 *  explained. Every number on this card is now real and live, just a
 *  richer honest slice than before, not the full Bible card-grid. */
export function FounderHomeBanner({ ownedProjects }: { ownedProjects: ProjectRecord[] }) {
  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        margin: `${config.space.S300} ${config.space.S300} 0`,
      }}
    >
      <Box alignItems="Center" gap="100">
        {sizedIcon(House, '100')}
        <Text size="L400">Your Projects</Text>
      </Box>
      <Box direction="Column" gap="200">
        {ownedProjects.map((project) => (
          <OwnedProjectRow key={project.project_id} project={project} />
        ))}
      </Box>
    </Box>
  );
}
