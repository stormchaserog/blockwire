import { Box, Chip, Text, config } from 'folds';
import type {
  ProjectChainAsset,
  ProjectLinkRecord,
  ProjectRecord,
} from '$utils/blockwire/projects';
import { ProjectInfoOverview } from './ProjectInfoOverview';

export type ProjectIdentityContentProps = {
  project: ProjectRecord;
  chainAssets: ProjectChainAsset[];
  links: ProjectLinkRecord[];
  selectedAssetId: number | null;
  setSelectedAssetId: (id: number) => void;
  selectedAsset: ProjectChainAsset | null;
};

/** The Project Identity Page's Info tab content (Bible §12), factored out
 *  of ProjectIdentitySection so the Lobby-seeded surface and the
 *  dedicated /project/ route render IDENTICAL content from one source of
 *  truth -- a founder editing a project sees the exact same thing in both
 *  places, never a subtly different subset.
 *
 *  Per the locked design mock this renders the shared ProjectInfoOverview
 *  (the same component the room-header Project Info Sheet uses): centered
 *  hero (avatar, name + verification seal, "$TICKER • Chain", Verified
 *  Project chip), price + 24h sparkline card, the Chart / Buy Feed /
 *  Info / Share tile row, and the details card. Identity appears exactly
 *  ONCE, in the hero -- no separate name/ticker/description block and no
 *  raw full contract-address string. The Buy/Sell trades feed (Bible §14)
 *  is deliberately NOT embedded here; it stays reachable via the Buy Feed
 *  tile rather than rendering as a raw list on this tab. */
export function ProjectIdentityContent({
  project,
  chainAssets,
  links,
  selectedAssetId,
  setSelectedAssetId,
  selectedAsset,
}: ProjectIdentityContentProps) {
  return (
    <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
      {/* Chip selector only when there's an actual choice to make -- a
       *  single-asset project (the common case today) shows no selector at
       *  all, same progressive-disclosure principle as the rest of this
       *  section. */}
      {chainAssets.length > 1 && (
        <Box justifyContent="Center" gap="100" style={{ flexWrap: 'wrap' }}>
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

      <ProjectInfoOverview
        project={project}
        chainAssets={chainAssets}
        links={links}
        selectedAsset={selectedAsset}
        spaceRoomId={project.space_room_id}
        variant="page"
      />
    </Box>
  );
}
