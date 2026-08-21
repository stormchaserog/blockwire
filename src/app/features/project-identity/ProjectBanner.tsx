import { Box, Avatar, Text, color, config } from 'folds';
import { nameInitials } from '$utils/common';
import type { ProjectRecord } from '$utils/blockwire/projects';

export type ProjectBannerProps = {
  project: Pick<ProjectRecord, 'name' | 'avatar_url' | 'banner_url'>;
};

/** Project avatar_url/banner_url are plain HTTPS URLs a project owner sets
 *  via updateProject -- NOT Matrix mxc:// media (the server does zero URL
 *  transformation on them, confirmed in projects.ts). This deliberately
 *  does not reuse RoomAvatar/mxcUrlToHttp, which are for the SPACE's own
 *  Matrix-hosted avatar (see LobbyHero) -- a project's branding is a
 *  distinct, optional thing from whatever image the underlying Matrix
 *  room happens to have.
 *
 *  Renders nothing at all when neither is set -- same progressive-
 *  disclosure principle as the rest of this section (Bible §3): a
 *  project that hasn't set branding yet should not show an empty grey
 *  banner placeholder taking up vertical space. */
export function ProjectBanner({ project }: ProjectBannerProps) {
  if (!project.avatar_url && !project.banner_url) return null;

  return (
    <Box direction="Column" gap="0">
      {project.banner_url && (
        <Box
          style={{
            width: '100%',
            height: '96px',
            borderRadius: '12px',
            backgroundImage: `url(${project.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {project.avatar_url && (
        <Box
          style={{
            marginTop: project.banner_url ? '-24px' : 0,
            marginLeft: config.space.S400,
          }}
        >
          <Avatar size="500" style={{ border: `2px solid ${color.Surface.Container}` }}>
            {project.avatar_url ? (
              <img
                src={project.avatar_url}
                alt={project.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Text size="H4">{nameInitials(project.name)}</Text>
            )}
          </Avatar>
        </Box>
      )}
    </Box>
  );
}
