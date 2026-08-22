import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Avatar, Badge, Box, Text, color } from 'folds';
import type { Room } from '$types/matrix-sdk';
import { JoinRule } from '$types/matrix-sdk';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import { fetchProjectBySpace, fetchChainAssets } from '$utils/blockwire/projects';
import { fetchChainAssetSnapshot, type TokenSnapshot } from '$utils/blockwire/chainAssets';
import { getSpaceLobbyPath } from '$pages/pathUtils';
import { mxcUrlToHttp } from '$utils/matrix';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useAlive } from '$hooks/useAlive';
import { useRoomName, useRoomAvatar } from '$hooks/useRoomMeta';
import { nameInitials, formatTicker } from '$utils/common';
import { formatCompactCount } from '$utils/formatCompactCount';
import { sizedIcon, Lock, SealCheck, UsersThree } from '$components/icons/phosphor';
import {
  useOrphanSpaces,
  useSpaceChildren,
  useRecursiveChildScopeFactory,
} from '$state/hooks/roomList';
import { allRoomsAtom } from '$state/room-list/roomList';
import { roomToParentsAtom } from '$state/room/roomToParents';
import { roomToUnreadAtom } from '$state/room/roomToUnread';
import { useRoomsUnread } from '$state/hooks/unread';
import { useDexScreenerTokenImage } from '$features/project-identity/useDexScreenerTokenImage';
import { factoryRoomIdByActivity } from '$utils/sort';
import * as css from './HomeCommunityCards.css';

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

const capitalize = (str: string): string =>
  str.length === 0 ? str : str.charAt(0).toUpperCase() + str.slice(1);

const isPrivateJoinRule = (room: Room): boolean => {
  const rule = room.getJoinRule();
  return rule === JoinRule.Invite || rule === JoinRule.Knock;
};

/** Space→project binding + primary chain asset + price snapshot, the same
 *  three-step lookup the Hub/Project pages make (fetchProjectBySpace →
 *  fetchChainAssets → fetchChainAssetSnapshot). Every failure degrades to
 *  "just a plain space" -- most spaces genuinely have no project, and a
 *  card must never error out over a decorative metric. */
function useSpaceProjectCardData(spaceRoomId: string) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [project, setProject] = useState<ProjectRecord | null | undefined>(undefined);
  const [primaryAsset, setPrimaryAsset] = useState<ProjectChainAsset | null>(null);
  const [snapshot, setSnapshot] = useState<TokenSnapshot | null>(null);

  useEffect(() => {
    setProject(undefined);
    setPrimaryAsset(null);
    setSnapshot(null);
    fetchProjectBySpace(mx, spaceRoomId)
      .then(async (result) => {
        if (!alive()) return;
        setProject(result);
        if (!result) return;
        const assets = await fetchChainAssets(mx, result.project_id).catch(
          () => [] as ProjectChainAsset[]
        );
        if (!alive()) return;
        const asset = assets[0] ?? null;
        setPrimaryAsset(asset);
        if (!asset) return;
        fetchChainAssetSnapshot(mx, result.project_id, asset.id)
          .then((res) => {
            if (alive()) setSnapshot(res.canonical);
          })
          .catch(() => {
            // Price is decorative on this card -- fail silently.
          });
      })
      .catch(() => {
        if (alive()) setProject(null);
      });
  }, [mx, spaceRoomId, alive]);

  return { project, primaryAsset, snapshot };
}

function CommunityHomeCard({ roomId }: { roomId: string }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  if (!room) return null;
  return <CommunityHomeCardContent roomId={roomId} room={room} />;
}

function CommunityHomeCardContent({ roomId, room }: { roomId: string; room: Room }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const name = useRoomName(room);
  const { project, primaryAsset, snapshot } = useSpaceProjectCardData(roomId);

  // Avatar chain -- project-bound: project avatar_url → DexScreener token
  // image → initials; plain space: room avatar → initials.
  const projectAvatarUrl = project?.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const tokenImageUrl = useDexScreenerTokenImage(
    project && !projectAvatarUrl ? primaryAsset?.chain : null,
    project && !projectAvatarUrl ? primaryAsset?.contract_address : null
  );
  const roomAvatarMxc = useRoomAvatar(room);
  const roomAvatarUrl = roomAvatarMxc
    ? (mxcUrlToHttp(mx, roomAvatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const displayAvatarUrl = project
    ? (projectAvatarUrl ?? tokenImageUrl ?? undefined)
    : roomAvatarUrl;

  const roomToParents = useAtomValue(roomToParentsAtom);
  const allChild = useSpaceChildren(
    allRoomsAtom,
    roomId,
    useRecursiveChildScopeFactory(mx, roomToParents)
  );
  const unread = useRoomsUnread(allChild, roomToUnreadAtom);

  const memberCount = room.getJoinedMemberCount();
  const isPrivate = isPrivateJoinRule(room);
  const isTeamSpace = !project && isPrivate;

  const ticker = formatTicker(project?.ticker ?? primaryAsset?.token_symbol)?.toUpperCase() ?? null;
  const chain = primaryAsset ? capitalize(primaryAsset.chain) : null;
  const price = formatPrice(snapshot?.priceUsd ?? null);

  return (
    <Box
      className={css.CommunityCard}
      direction="Column"
      gap="200"
      onClick={() => navigate(getSpaceLobbyPath(roomId))}
    >
      <Box alignItems="Center" gap="200">
        <Avatar size="400" radii="300">
          {displayAvatarUrl ? (
            <img src={displayAvatarUrl} alt={name} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text size="H5">{nameInitials(name)}</Text>
          )}
        </Avatar>
        <Box grow="Yes" direction="Column" gap="0">
          <Box alignItems="Center" gap="100">
            <Text size="T400" truncate>
              <b>{name}</b>
            </Text>
            {project?.owner_verification_state === 'verified' &&
              sizedIcon(SealCheck, '50', { weight: 'fill', style: { color: color.Success.Main } })}
            {isPrivate && sizedIcon(Lock, '50', { style: { color: color.Surface.OnContainer } })}
          </Box>
          {/* Line 2 -- three explicit variants, never fabricated:
           *  project + chain asset: "$TICKER • Solana"
           *  private non-project:   "Team Space • Private"
           *  public non-project:    nothing. */}
          {project && ticker && chain && (
            <Text size="T200" style={{ color: color.Surface.OnContainer }} truncate>
              {ticker} • {chain}
            </Text>
          )}
          {isTeamSpace && (
            <Text size="T200" style={{ color: color.Surface.OnContainer }} truncate>
              Team Space • Private
            </Text>
          )}
        </Box>
        {price && (
          <Box shrink="No" direction="Column" alignItems="End" gap="0">
            <Text size="T300">{price}</Text>
            <PriceChange percent={snapshot?.priceChangePercent.h24 ?? null} />
          </Box>
        )}
      </Box>
      <Box alignItems="Center" gap="200">
        {!!unread?.total && (
          <Text size="T200" style={{ color: color.Surface.OnContainer }}>
            {formatCompactCount(unread.total)} unread
          </Text>
        )}
        <Box grow="Yes" justifyContent="End">
          <Badge variant="Primary" fill="Soft" radii="Pill" size="500">
            <Text size="L400">
              {isTeamSpace
                ? 'Team'
                : `${formatCompactCount(memberCount)} ${memberCount === 1 ? 'member' : 'members'}`}
            </Text>
          </Badge>
        </Box>
      </Box>
    </Box>
  );
}

/** Design mock's "rich community cards" block for the mobile Home: every
 *  joined top-level Space, sorted by recent activity (the same set and
 *  ordering the Communities tab shows -- useOrphanSpaces +
 *  factoryRoomIdByActivity), each rendered as a card that leads with
 *  identity (avatar/verified/lock), then the token line for project-bound
 *  spaces, then unread + membership chrome. */
export function HomeCommunityCards() {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);

  const sortedSpaces = useMemo(
    () => Array.from(orphanSpaces).toSorted(factoryRoomIdByActivity(mx)),
    [mx, orphanSpaces]
  );

  if (sortedSpaces.length === 0) return null;

  return (
    <Box direction="Column" gap="200">
      <Box alignItems="Center" gap="100">
        {sizedIcon(UsersThree, '100')}
        <Text size="L400">Communities</Text>
      </Box>
      <Box direction="Column" gap="200">
        {sortedSpaces.map((roomId) => (
          <CommunityHomeCard key={roomId} roomId={roomId} />
        ))}
      </Box>
    </Box>
  );
}
