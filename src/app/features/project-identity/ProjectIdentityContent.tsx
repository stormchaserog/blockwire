import { Box, Chip, Text, color, config } from 'folds';
import { getExplorerUrl } from '$utils/blockwire/chainExplorers';
import type {
  ProjectChainAsset,
  ProjectLinkRecord,
  ProjectRecord,
} from '$utils/blockwire/projects';
import { ProjectChainAssetPrice } from './ProjectChainAssetPrice';
import { ContractAddressBadge } from './ContractAddressBadge';
import { VerificationBadge } from './VerificationBadge';
import { OfficialLinksVault } from './OfficialLinksVault';
import { BuyFeed } from './BuyFeed';
import { ProjectBanner } from './ProjectBanner';
import { WhaleAlerts } from './WhaleAlerts';

export type ProjectIdentityContentProps = {
  project: ProjectRecord;
  chainAssets: ProjectChainAsset[];
  links: ProjectLinkRecord[];
  selectedAssetId: number | null;
  setSelectedAssetId: (id: number) => void;
  selectedAsset: ProjectChainAsset | null;
};

/** The actual Project Identity Page content (Bible §12/§13/§14/§15/§18),
 *  factored out of ProjectIdentitySection so the Lobby-seeded surface
 *  and the dedicated /project/ route render IDENTICAL content from one
 *  source of truth -- a founder editing a project sees the exact same
 *  thing in both places, never a subtly different subset. */
export function ProjectIdentityContent({
  project,
  chainAssets,
  links,
  selectedAssetId,
  setSelectedAssetId,
  selectedAsset,
}: ProjectIdentityContentProps) {
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
          <VerificationBadge
            state={selectedAsset.verified_control_state}
            label="Contract Verified"
          />
          <ProjectChainAssetPrice projectId={project.project_id} chainAssetId={selectedAsset.id} />
          <BuyFeed projectId={project.project_id} chainAssetId={selectedAsset.id} />
          <WhaleAlerts projectId={project.project_id} chainAssetId={selectedAsset.id} />
        </Box>
      )}

      <OfficialLinksVault links={links} />
    </Box>
  );
}
