import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Scroll, Text, color } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { fetchDiscoverProjects, type ProjectRecord } from '$utils/blockwire/projects';
import { mxcUrlToHttp } from '$utils/matrix';
import { nameInitials, formatTicker } from '$utils/common';
import { getSpaceLobbyPath } from '$pages/pathUtils';
import { Page, PageContent, PageContentCenter, PageHeader } from '$components/page';
import { sizedIcon, CaretRight, Compass } from '$components/icons/phosphor';
import * as css from './Discover.css';

/** One project as a real card: 52px avatar (initials fallback), name +
 *  $TICKER, 2-line description, and a chevron affordance. The discover
 *  endpoint returns no member/online counts today, so no stats row is
 *  rendered — stats appear only when the API actually returns them, never
 *  fabricated. */
function DiscoverProjectCard({ project }: { project: ProjectRecord }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const avatarUrl = project.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 96, 96, 'crop') ?? undefined)
    : undefined;

  return (
    <div
      className={css.ProjectCard}
      role="button"
      tabIndex={0}
      onClick={() => navigate(getSpaceLobbyPath(project.space_room_id))}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          navigate(getSpaceLobbyPath(project.space_room_id));
        }
      }}
    >
      <div className={css.ProjectAvatar}>
        {avatarUrl ? (
          <img className={css.ProjectAvatarImg} src={avatarUrl} alt={project.name} />
        ) : (
          <span>{nameInitials(project.name)}</span>
        )}
      </div>
      <div className={css.ProjectBody}>
        <div className={css.ProjectTitleRow}>
          <span className={css.ProjectName}>{project.name}</span>
          {project.ticker && (
            <span className={css.ProjectTicker}>{formatTicker(project.ticker)}</span>
          )}
        </div>
        {project.description && <div className={css.ProjectDescription}>{project.description}</div>}
      </div>
      <div className={css.ProjectChevron} aria-hidden>
        {sizedIcon(CaretRight, '200')}
      </div>
    </div>
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
                  <Box direction="Column" gap="200">
                    {projects.map((project) => (
                      <DiscoverProjectCard key={project.project_id} project={project} />
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
