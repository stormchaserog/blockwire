import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Text, color, config } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import {
  fetchProjectBySpace, fetchChainAssets, fetchProjectLinks,
  type ProjectRecord, type ProjectChainAsset, type ProjectLinkRecord,
} from '$utils/blockwire/projects';
import { getExplorerUrl } from '$utils/blockwire/chainExplorers';
import {
  ProjectChainAssetPrice, ContractAddressBadge, VerificationBadge, OfficialLinksVault, BuyFeed,
  ProjectBanner,
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
 *  verification, banner/avatar, live price/buy-feed for the SELECTED
 *  chain asset (a Chip selector when the project has more than one --
 *  Steven's own stated UI preference is tabbed/chip selection over
 *  scrolling for exactly this kind of "which of several things" choice),
 *  and the Official Links Vault (§13). What is NOT yet here: a dedicated
 *  full-page route separate from the Lobby -- tracked as explicit
 *  follow-up in BLOCKWIRE.md, not silently skipped.
 */
export function ProjectIdentitySection({ spaceRoomId }: ProjectIdentitySectionProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [project, setProject] = useState<ProjectRecord | null | undefined>(undefined);
  const [chainAssets, setChainAssets] = useState<ProjectChainAsset[]>([]);
  const [links, setLinks] = useState<ProjectLinkRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  useEffect(() => {
    setProject(undefined);
    setChainAssets([]);
    setLinks([]);
    setSelectedAssetId(null);
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
            // Default to the first asset -- a stable, deterministic choice
            // (the order the server returns them in) rather than picking
            // "highest liquidity" or similar, which would require an extra
            // snapshot fetch per asset just to decide what to show first.
            setSelectedAssetId(assets[0]?.id ?? null);
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

  const selectedAsset = useMemo(
    () => chainAssets.find((a) => a.id === selectedAssetId) ?? null,
    [chainAssets, selectedAssetId],
  );

  // Still checking, or checked and this space has no project: render
  // nothing. Bible §3/§8: do not show founder/project tooling to a plain
  // community space.
  if (!project) return null;

  return (
    <Box direction="Column" gap="300" style={{ padding: config.space.S400 }}>
      <ProjectBanner project={project} />
      <Box direction="Column" gap="100">
        <Box alignItems="Center" gap="200">
          <Text size="H4">{project.name}</Text>
          {project.ticker && (
            <Text size="T300" style={{ color: color.Surface.OnContainer }}>
              ${project.ticker}
            </Text>
          )}
          {/* UI Bible §18: "Project Owner Verified" is a DIFFERENT precise
           *  claim than a chain asset's or link's own verified_control_state
           *  (checked separately, next to that specific contract/link) --
           *  this reflects whether the human running the PROJECT has proven
           *  their identity. Renders nothing for 'unverified' (see
           *  VerificationBadge) so a brand-new, not-yet-checked project
           *  shows no badge at all, never a fabricated one. */}
          <VerificationBadge
            state={project.owner_verification_state}
            label="Project Owner Verified"
          />
        </Box>
        {project.description && (
          <Text size="T300" style={{ color: color.Surface.OnContainer }}>
            {project.description}
          </Text>
        )}
      </Box>

      {/* Chip selector only when there's an actual choice to make -- a
       *  single-asset project (the common case today) shows no selector at
       *  all, same progressive-disclosure principle as the rest of this
       *  section. */}
      {chainAssets.length > 1 && (
        <Box gap="100" style={{ flexWrap: 'wrap' }}>
          {chainAssets.map((asset) => (
            <Chip
              key={asset.id}
              variant={asset.id === selectedAssetId ? 'Primary' : 'Secondary'}
              radii="Pill"
              onClick={() => setSelectedAssetId(asset.id)}
              aria-pressed={asset.id === selectedAssetId}
            >
              <Text size="T200">{asset.token_symbol ?? asset.chain}</Text>
            </Chip>
          ))}
        </Box>
      )}

      {selectedAsset && (
        <Box direction="Column" gap="200">
          <ContractAddressBadge
            asset={selectedAsset}
            explorerUrl={getExplorerUrl(selectedAsset.chain, selectedAsset.contract_address)}
          />
          <VerificationBadge state={selectedAsset.verified_control_state} label="Contract Verified" />
          <ProjectChainAssetPrice projectId={project.project_id} chainAssetId={selectedAsset.id} />
          <BuyFeed projectId={project.project_id} chainAssetId={selectedAsset.id} />
        </Box>
      )}

      <OfficialLinksVault links={links} />
    </Box>
  );
}
