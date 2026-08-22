import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Scroll, Text, color } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { fetchDiscoverProjects, type ProjectRecord } from '$utils/blockwire/projects';
import { mxcUrlToHttp } from '$utils/matrix';
import { nameInitials } from '$utils/common';
import { getSpaceLobbyPath } from '$pages/pathUtils';
import { Page, PageContent, PageContentCenter, PageHeader } from '$components/page';
import { sizedIcon, Compass } from '$components/icons/phosphor';

function DiscoverProjectRow({ project }: { project: ProjectRecord }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const avatarUrl = project.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;

  return (
    <Box
      alignItems="Center"
      gap="300"
      style={{ padding: '0.75rem 0', cursor: 'pointer' }}
      onClick={() => navigate(getSpaceLobbyPath(project.space_room_id))}
    >
      <Avatar size="400" radii="300">
        {avatarUrl ? (
          <img src={avatarUrl} alt={project.name} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text size="H6">{nameInitials(project.name)}</Text>
        )}
      </Avatar>
      <Box grow="Yes" direction="Column" gap="0">
        <Text size="T400" truncate>
          {project.name}
        </Text>
        {project.ticker && (
          <Text size="T200" style={{ color: color.Surface.OnContainer }} truncate>
            ${project.ticker}
          </Text>
        )}
      </Box>
    </Box>
  );
}

/** UI Bible §16 (Discover): "should feel like a curated project directory
 *  or app store. Possible sections: New, Trending, Verified, Solana,
 *  Ethereum/EVM, Meme Coins, DeFi, Growing Communities, Sponsored."
 *
 *  There was no backend capability to list projects across all users
 *  before this session -- only /projects/mine (owner-scoped) existed.
 *  Added GET /_blockwire/projects/discover (blockwire-botgw) to make this
 *  real, not fabricated.
 *
 *  This ships exactly one real section, "New" (server-sorted
 *  newest-first, which is also the query's only real ordering signal
 *  today) -- not the full nine-category taxonomy. Trending needs real
 *  engagement/volume metrics that don't exist yet; Verified needs the
 *  owner_verification_state field to actually be populated by a working
 *  verification flow (also unbuilt, confirmed in
 *  BLOCKWIRE_VERIFIED_STATUS_2026-08-21.md); Solana/EVM needs the chain
 *  field on ProjectChainAsset to vary (today it's Solana-only, see
 *  chain-adapter.ts, so a chain filter would be a no-op dropdown).
 *  Building fake category tabs that all show the same one list would be
 *  decoration, not information architecture -- this is the honest first
 *  slice the rest of Discover's categories attach to as their real data
 *  sources land. */
export function Discover() {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [projects, setProjects] = useState<ProjectRecord[] | null | undefined>(undefined);

  useEffect(() => {
    setProjects(undefined);
    fetchDiscoverProjects(mx)
      .then((result) => {
        if (alive()) setProjects(result);
      })
      .catch(() => {
        if (alive()) setProjects(null);
      });
  }, [mx, alive]);

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" alignItems="Center" justifyContent="Center" gap="200">
          {sizedIcon(Compass, '400')}
          <Text size="H3">Discover</Text>
        </Box>
      </PageHeader>
      <Box style={{ position: 'relative' }} grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              {projects === undefined && (
                <Box alignItems="Center" justifyContent="Center" style={{ padding: '2rem 0' }}>
                  <Text size="T300">Loading…</Text>
                </Box>
              )}
              {projects === null && (
                <Box direction="Column" gap="100" alignItems="Center" style={{ padding: '2rem 0' }}>
                  <Text size="H5">Couldn&apos;t load Discover</Text>
                  <Text size="T300" style={{ color: color.Surface.OnContainer }}>
                    We&apos;ll keep trying. Check back in a moment.
                  </Text>
                </Box>
              )}
              {projects && projects.length === 0 && (
                <Box direction="Column" gap="100" alignItems="Center" style={{ padding: '2rem 0' }}>
                  <Text size="H5">No projects yet</Text>
                  <Text size="T300" style={{ color: color.Surface.OnContainer }}>
                    New crypto communities will appear here as they launch on BlockWire.
                  </Text>
                </Box>
              )}
              {projects && projects.length > 0 && (
                <Box direction="Column" gap="200">
                  <Text size="L400" style={{ color: color.Surface.OnContainer }}>
                    New
                  </Text>
                  <Box direction="Column">
                    {projects.map((project) => (
                      <DiscoverProjectRow key={project.project_id} project={project} />
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
