import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Text, color } from 'folds';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import { fetchDiscoverProjects, fetchChainAssets } from '$utils/blockwire/projects';
import { fetchChainAssetSnapshot, type TokenSnapshot } from '$utils/blockwire/chainAssets';
import { getExplorePath, getSpaceLobbyPath } from '$pages/pathUtils';
import { mxcUrlToHttp } from '$utils/matrix';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useAlive } from '$hooks/useAlive';
import { nameInitials, formatTicker } from '$utils/common';
import { useDexScreenerTokenImage } from '$features/project-identity/useDexScreenerTokenImage';
import * as css from './HomeCommunityCards.css';

const DISCOVER_CAP = 10;

function DiscoverChange({ percent }: { percent: number | null }) {
  if (percent === null) return null;
  const up = percent >= 0;
  return (
    <Text size="T200" style={{ color: up ? color.Success.Main : color.Critical.Main }}>
      {up ? '+' : ''}
      {percent.toFixed(1)}%
    </Text>
  );
}

function DiscoverProjectCard({ project }: { project: ProjectRecord }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const alive = useAlive();
  const [primaryAsset, setPrimaryAsset] = useState<ProjectChainAsset | null>(null);
  const [snapshot, setSnapshot] = useState<TokenSnapshot | null>(null);

  useEffect(() => {
    setPrimaryAsset(null);
    setSnapshot(null);
    fetchChainAssets(mx, project.project_id)
      .then((assets) => {
        if (!alive()) return;
        const asset = assets[0] ?? null;
        setPrimaryAsset(asset);
        if (!asset) return;
        fetchChainAssetSnapshot(mx, project.project_id, asset.id)
          .then((res) => {
            if (alive()) setSnapshot(res.canonical);
          })
          .catch(() => {
            // 24h change is decorative here -- fail silently.
          });
      })
      .catch(() => {
        // No chain assets is a normal state for a young project.
      });
  }, [mx, project.project_id, alive]);

  const avatarUrl = project.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;
  const tokenImageUrl = useDexScreenerTokenImage(
    avatarUrl ? null : primaryAsset?.chain,
    avatarUrl ? null : primaryAsset?.contract_address
  );
  const displayAvatarUrl = avatarUrl ?? tokenImageUrl ?? undefined;
  const ticker = formatTicker(project.ticker ?? primaryAsset?.token_symbol)?.toUpperCase() ?? null;

  return (
    <Box
      className={css.DiscoverCard}
      direction="Column"
      alignItems="Center"
      gap="100"
      onClick={() => navigate(getSpaceLobbyPath(project.space_room_id))}
    >
      <Avatar size="400" radii="300">
        {displayAvatarUrl ? (
          <img
            src={displayAvatarUrl}
            alt={project.name}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text size="H5">{nameInitials(project.name)}</Text>
        )}
      </Avatar>
      <Text size="T300" align="Center" truncate style={{ maxWidth: '100%' }}>
        <b>{project.name}</b>
      </Text>
      {ticker && (
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          {ticker}
        </Text>
      )}
      <DiscoverChange percent={snapshot?.priceChangePercent.h24 ?? null} />
    </Box>
  );
}

/** "Discover Projects" horizontal scroller (design mock, below the
 *  community cards). Real data only: the botgw's public directory
 *  (GET /_blockwire/projects/discover, the same endpoint the Discover tab
 *  uses via fetchDiscoverProjects), minus projects whose space the user
 *  has already joined, capped at 10. Renders nothing while loading, on
 *  error, or when the directory has nothing new for this user -- an empty
 *  header with no cards would just be dead chrome. */
export function DiscoverProjects() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const alive = useAlive();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    fetchDiscoverProjects(mx)
      .then((list) => {
        if (alive()) setProjects(list);
      })
      .catch(() => {
        // Discover is a bonus surface on Home; a directory hiccup should
        // never degrade the rest of the screen.
      });
  }, [mx, alive]);

  // "Already joined" comes straight from the client's own room state --
  // the space either resolves locally with a 'join' membership or it
  // doesn't; no extra prop plumbing or network call needed.
  const discoverable = projects
    .filter((p) => mx.getRoom(p.space_room_id)?.getMyMembership() !== 'join')
    .slice(0, DISCOVER_CAP);

  if (discoverable.length === 0) return null;

  return (
    <Box direction="Column" gap="200">
      <Box alignItems="Center" gap="200">
        <Box grow="Yes">
          <Text size="H6">Discover Projects</Text>
        </Box>
        <Text
          as="button"
          type="button"
          size="T200"
          onClick={() => navigate(getExplorePath())}
          style={{
            color: color.Primary.Main,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          View all
        </Text>
      </Box>
      <div className={css.DiscoverRow}>
        {discoverable.map((project) => (
          <DiscoverProjectCard key={project.project_id} project={project} />
        ))}
      </div>
    </Box>
  );
}
