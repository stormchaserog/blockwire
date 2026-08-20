import { useEffect, useState } from 'react';
import { Box, Text, color, config } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import {
  fetchProjectBySpace, fetchChainAssets, type ProjectRecord, type ProjectChainAsset,
} from '$utils/blockwire/projects';
import { ProjectChainAssetPrice } from '$features/project-identity';

export type ProjectIdentitySectionProps = {
  spaceRoomId: string;
};

/** Rendered inside the Lobby (UI Bible §8: project-specific tools live
 *  inside the project, not as new global navigation) when a space has a
 *  bound Project. Deliberately renders NOTHING for the common case of an
 *  ordinary space with no Project attached -- this is progressive
 *  disclosure per the Bible's core philosophy (§3): an ordinary
 *  community with no Project must look exactly like it did before this
 *  feature existed, not grow an empty "Project" card no one asked for.
 *
 *  This is the seed of the full Project Identity Page (Bible §12) -- it
 *  currently surfaces name/description/live price for the FIRST chain
 *  asset only. Ticker, verification badges, the full Official Links Vault
 *  (§13), and a proper multi-asset layout are explicit follow-up work
 *  (see BLOCKWIRE.md), not silently declared "done" here.
 */
export function ProjectIdentitySection({ spaceRoomId }: ProjectIdentitySectionProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [project, setProject] = useState<ProjectRecord | null | undefined>(undefined);
  const [chainAssets, setChainAssets] = useState<ProjectChainAsset[]>([]);

  useEffect(() => {
    setProject(undefined);
    setChainAssets([]);
    fetchProjectBySpace(mx, spaceRoomId)
      .then(async (result) => {
        if (!alive()) return;
        setProject(result);
        if (result) {
          const assets = await fetchChainAssets(mx, result.project_id).catch(() => []);
          if (alive()) setChainAssets(assets);
        }
      })
      .catch(() => {
        // A failed check (network hiccup) is treated the same as "no
        // project" rather than surfacing an error card for a section that
        // may not even apply to this space -- the Lobby's own content is
        // the primary experience here, this is a bonus.
        if (alive()) setProject(null);
      });
  }, [mx, spaceRoomId, alive]);

  // Still checking, or checked and this space has no project: render
  // nothing. Bible §3/§8: do not show founder/project tooling to a plain
  // community space.
  if (!project) return null;

  const primaryAsset = chainAssets[0];

  return (
    <Box direction="Column" gap="200" style={{ padding: config.space.S400 }}>
      <Text size="H4">{project.name}</Text>
      {project.description && (
        <Text size="T300" style={{ color: color.Surface.OnContainer }}>
          {project.description}
        </Text>
      )}
      {primaryAsset && (
        <ProjectChainAssetPrice projectId={project.project_id} chainAssetId={primaryAsset.id} />
      )}
    </Box>
  );
}
