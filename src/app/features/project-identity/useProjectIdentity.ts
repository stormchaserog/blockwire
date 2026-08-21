import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import {
  fetchProjectBySpace,
  fetchChainAssets,
  fetchProjectLinks,
  type ProjectRecord,
  type ProjectChainAsset,
  type ProjectLinkRecord,
} from '$utils/blockwire/projects';

export type UseProjectIdentityResult = {
  /** undefined = still checking, null = checked and no project is bound
   *  to this space, ProjectRecord = found. Three distinct states on
   *  purpose (Bible §31/§33) -- a caller rendering a full page needs to
   *  tell "loading" apart from "genuinely nothing here," which a single
   *  boolean or a bare null can't express. */
  project: ProjectRecord | null | undefined;
  chainAssets: ProjectChainAsset[];
  links: ProjectLinkRecord[];
  selectedAssetId: number | null;
  setSelectedAssetId: (id: number) => void;
  selectedAsset: ProjectChainAsset | null;
  /** Re-runs the chain-assets and links fetch for the CURRENT project,
   *  without resetting to the loading/no-project state first -- used
   *  after a management action (add a chain asset, add a link) so the
   *  page reflects what was just added without a jarring full reload of
   *  the whole hook. A no-op if there is no project bound yet. */
  refetchProjectDetails: () => void;
};

/** Shared data-fetching for the Project Identity page's content (Bible
 *  §12), extracted so the Lobby-seeded ProjectIdentitySection and the
 *  dedicated /project/ route (SpaceProject) can both drive the same
 *  underlying content without duplicating the fetch-and-select logic
 *  (and risking the two surfaces silently drifting apart on behavior --
 *  e.g. one deciding to default-select a different asset than the
 *  other). Callers own the loading/empty/found presentation entirely;
 *  this hook only owns data. */
export function useProjectIdentity(spaceRoomId: string): UseProjectIdentityResult {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [project, setProject] = useState<ProjectRecord | null | undefined>(undefined);
  const [chainAssets, setChainAssets] = useState<ProjectChainAsset[]>([]);
  const [links, setLinks] = useState<ProjectLinkRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [detailsRefetchNonce, setDetailsRefetchNonce] = useState(0);

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
            setSelectedAssetId((prev) => prev ?? assets[0]?.id ?? null);
          }
        }
      })
      .catch(() => {
        // A failed check (network hiccup) is treated the same as "no
        // project" rather than surfacing an error for content that may
        // not even apply to this space.
        if (alive()) setProject(null);
      });
  }, [mx, spaceRoomId, alive, detailsRefetchNonce]);

  const refetchProjectDetails = useCallback(() => {
    setDetailsRefetchNonce((n) => n + 1);
  }, []);

  const selectedAsset = useMemo(
    () => chainAssets.find((a) => a.id === selectedAssetId) ?? null,
    [chainAssets, selectedAssetId]
  );

  return {
    project,
    chainAssets,
    links,
    selectedAssetId,
    setSelectedAssetId,
    selectedAsset,
    refetchProjectDetails,
  };
}
