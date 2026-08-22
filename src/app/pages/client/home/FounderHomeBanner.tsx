import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Text, color, config } from 'folds';
import type { ProjectRecord } from '$utils/blockwire/projects';
import { getSpaceHubPath } from '$pages/pathUtils';
import { mxcUrlToHttp } from '$utils/matrix';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { nameInitials } from '$utils/common';
import { sizedIcon, CaretRight, House } from '$components/icons/phosphor';

function OwnedProjectRow({ project }: { project: ProjectRecord }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();
  const avatarUrl = project.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 64, 64, 'crop') ?? undefined)
    : undefined;

  return (
    <Box
      alignItems="Center"
      gap="300"
      style={{ padding: '0.625rem 0', cursor: 'pointer' }}
      onClick={() => navigate(getSpaceHubPath(project.space_room_id))}
    >
      <Avatar size="300" radii="300">
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
      </Box>
      {sizedIcon(CaretRight, '50')}
    </Box>
  );
}

/** UI Bible §7 (Founder and Team Home): "Show the Project Hub. The first
 *  question this screen should answer is: What needs me today?" This is a
 *  deliberately honest first slice, not the full Bible spec -- it lists
 *  the projects a founder owns with a one-tap link straight to each
 *  Project's Hub, rather than the full card-grid of moderation/token/
 *  social/task summaries the Bible describes. Those cards need real
 *  aggregated data sources across potentially many owned projects that
 *  don't exist yet (see Hub.tsx's own doc comment and
 *  BLOCKWIRE_VERIFIED_STATUS_2026-08-21.md) -- a single project's Hub
 *  already has one real card (Setup Completeness); showing that same
 *  data rolled up across N projects on this screen without a real
 *  aggregation layer would mean either querying every owned project's
 *  Hub data on Home load (real cost, real latency, on a screen that
 *  should feel instant) or faking it. Neither is acceptable, so this
 *  ships the one thing that's real: fast, one-tap access to every
 *  project a founder owns. */
export function FounderHomeBanner({ ownedProjects }: { ownedProjects: ProjectRecord[] }) {
  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        margin: `${config.space.S300} ${config.space.S300} 0`,
        padding: config.space.S300,
        border: `1px solid ${color.Surface.ContainerLine}`,
        borderRadius: config.radii.R400,
      }}
    >
      <Box alignItems="Center" gap="100">
        {sizedIcon(House, '100')}
        <Text size="L400">Your Projects</Text>
      </Box>
      <Box direction="Column">
        {ownedProjects.map((project) => (
          <OwnedProjectRow key={project.project_id} project={project} />
        ))}
      </Box>
    </Box>
  );
}
