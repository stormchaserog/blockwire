import type { ReactNode } from 'react';
import { Box, Text, color, config } from 'folds';
import { CaretRight, sizedIcon } from '$components/icons/phosphor';
import { getSpaceProjectPath } from '$pages/pathUtils';
import { useProjectIdentity, ProjectIdentityContent } from '$features/project-identity';

export type ProjectIdentitySectionProps = {
  spaceRoomId: string;
  /** Rendered INSTEAD of the project identity when the space has no bound
   *  project (the generic space hero). When a project exists, the project
   *  identity IS the hero — rendering both stacked the space name + topic
   *  (often the raw contract address) above the project hero, duplicating
   *  identity on the Lobby (exact-mock parity fix, 2026-08-29). */
  fallback?: ReactNode;
};

/** Rendered inside the Lobby (UI Bible §8: project-specific tools live
 *  inside the project, not as new global navigation) when a space has a
 *  bound Project. Deliberately renders NOTHING for the common case of an
 *  ordinary space with no Project attached -- this is progressive
 *  disclosure per the Bible's core philosophy (§3): an ordinary
 *  community with no Project must look exactly like it did before this
 *  feature existed, not grow an empty "Project" card no one asked for.
 *
 *  Renders the SAME ProjectIdentityContent as the dedicated /project/
 *  route (SpaceProject) via the shared useProjectIdentity hook -- the
 *  two surfaces can never silently drift into showing different things
 *  for the same project, since they share one data source and one
 *  presentation component. This Lobby-seeded copy also links to the
 *  full page, so the content isn't ONLY reachable by scrolling the
 *  Lobby.
 */
export function ProjectIdentitySection({ spaceRoomId, fallback }: ProjectIdentitySectionProps) {
  const { project, chainAssets, links, selectedAssetId, setSelectedAssetId, selectedAsset } =
    useProjectIdentity(spaceRoomId);

  // Still checking, or checked and this space has no project: render the
  // generic space hero (fallback) instead. Bible §3/§8: do not show
  // founder/project tooling to a plain community space.
  if (!project) return fallback ?? null;

  return (
    <Box direction="Column" gap="0">
      <Box justifyContent="End" style={{ padding: `0 ${config.space.S400}` }}>
        <Box
          as="a"
          href={getSpaceProjectPath(spaceRoomId)}
          alignItems="Center"
          gap="100"
          style={{ color: color.Primary.Main, textDecoration: 'none' }}
        >
          <Text size="T200">View full project page</Text>
          {sizedIcon(CaretRight, '50')}
        </Box>
      </Box>
      <ProjectIdentityContent
        project={project}
        chainAssets={chainAssets}
        links={links}
        selectedAssetId={selectedAssetId}
        setSelectedAssetId={setSelectedAssetId}
        selectedAsset={selectedAsset}
      />
    </Box>
  );
}
