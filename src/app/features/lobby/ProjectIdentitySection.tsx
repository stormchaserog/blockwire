import { useEffect, useState } from 'react';
import { Box, Text, color, config } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import {
  fetchProjectBySpace, fetchChainAssets, fetchProjectLinks,
  type ProjectRecord, type ProjectChainAsset, type ProjectLinkRecord,
} from '$utils/blockwire/projects';
import { getExplorerUrl } from '$utils/blockwire/chainExplorers';
import {
  ProjectChainAssetPrice, ContractAddressBadge, VerificationBadge, OfficialLinksVault,
} from '$features/project-identity';

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
 *  This is the Project Identity Page (Bible §12) content, seeded here
 *  rather than as a separate route -- name, ticker, project-owner
 *  verification, live price for the first chain asset with its contract
 *  address/explorer/verification badge, and the Official Links Vault
 *  (§13). What is NOT yet here: banner/avatar display, multi-chain-asset
 *  layout (only the first asset renders), and a dedicated full-page
 *  route separate from the Lobby -- tracked as explicit follow-up in
 *  BLOCKWIRE.md, not silently skipped.
 */
export function ProjectIdentitySection({ spaceRoomId }: ProjectIdentitySectionProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [project, setProject] = useState<ProjectRecord | null | undefined>(undefined);
  const [chainAssets, setChainAssets] = useState<ProjectChainAsset[]>([]);
  const [links, setLinks] = useState<ProjectLinkRecord[]>([]);

  useEffect(() => {
    setProject(undefined);
    setChainAssets([]);
    setLinks([]);
    fetchProjectBySpace(mx, spaceRoomId)
      .then(async (result) => {
        if (!alive()) return;
        setProject(result);
        if (result) {
          const [assets, projectLinks] = await Promise.all([
            fetchChainAssets(mx, result.project_id).catch(() => []),
            fetchProjectLinks(mx, result.project_id).catch(() => []),
          ]);
          if (alive()) {
            setChainAssets(assets);
            setLinks(projectLinks);
          }
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
    <Box direction="Column" gap="300" style={{ padding: config.space.S400 }}>
      <Box direction="Column" gap="100">
        <Box alignItems="Center" gap="200">
          <Text size="H4">{project.name}</Text>
          {project.ticker && (
            <Text size="T300" style={{ color: color.Surface.OnContainer }}>
              ${project.ticker}
            </Text>
          )}
          {/* UI Bible §18: "Project Owner Verified" is the precise claim --
           *  this reflects whether the PROJECT's owner has proven control
           *  of the project (a separate fact from any individual chain
           *  asset's verified_control_state, which is checked below next
           *  to that specific contract address). BlockWire does not yet
           *  have a dedicated project-owner verification flow -- there is
           *  no ProjectRecord field for it -- so nothing renders here
           *  until that's built, rather than fabricating a state. */}
        </Box>
        {project.description && (
          <Text size="T300" style={{ color: color.Surface.OnContainer }}>
            {project.description}
          </Text>
        )}
      </Box>

      {primaryAsset && (
        <Box direction="Column" gap="200">
          <ContractAddressBadge
            asset={primaryAsset}
            explorerUrl={getExplorerUrl(primaryAsset.chain, primaryAsset.contract_address)}
          />
          <VerificationBadge state={primaryAsset.verified_control_state} label="Contract Verified" />
          <ProjectChainAssetPrice projectId={project.project_id} chainAssetId={primaryAsset.id} />
        </Box>
      )}

      <OfficialLinksVault links={links} />
    </Box>
  );
}
