import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Text, color, config } from 'folds';
import type { ProjectRecord, ProjectChainAsset } from '$utils/blockwire/projects';
import { fetchChainAssets, fetchProjectLinks } from '$utils/blockwire/projects';
import { getSpaceHubPath } from '$pages/pathUtils';
import { mxcUrlToHttp } from '$utils/matrix';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useAlive } from '$hooks/useAlive';
import { useDexScreenerTokenImage } from '$features/project-identity/useDexScreenerTokenImage';
import { nameInitials } from '$utils/common';
import { sizedIcon, CaretRight, Checks } from '$components/icons/phosphor';

export type SetupProgress = {
  done: number;
  total: number;
};

/** Mirrors the Hub page's Setup Completeness checklist (Hub.tsx) exactly --
 *  same five items, same predicates -- so the count shown on Home always
 *  matches what the founder sees when they tap through to the Hub. Every
 *  item is a real, current fact from the project record + its chain assets
 *  and official links; nothing simulated. */
export function computeSetupProgress(
  project: ProjectRecord,
  chainAssetCount: number,
  linkCount: number
): SetupProgress {
  const checklist = [
    !!project.description,
    !!project.ticker,
    chainAssetCount > 0,
    linkCount > 0,
    project.owner_verification_state === 'verified',
  ];
  return { done: checklist.filter(Boolean).length, total: checklist.length };
}

type TaskRow = {
  project: ProjectRecord;
  progress: SetupProgress;
  /** The project's first chain asset, if any -- carried along so the row
   *  can fall back to the token's DexScreener image as its pfp without a
   *  second chain-assets fetch (this component already fetched them to
   *  compute the checklist). */
  primaryAsset: ProjectChainAsset | null;
};

function TaskProjectRow({ project, progress, primaryAsset }: TaskRow) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const useAuthentication = useMediaAuthentication();

  // Same pfp fallback chain as the FounderHomeBanner cards: the project's
  // own avatar, else the token's DexScreener image, else initials.
  const avatarUrl = project.avatar_url
    ? (mxcUrlToHttp(mx, project.avatar_url, useAuthentication, 64, 64, 'crop') ?? undefined)
    : undefined;
  const tokenImageUrl = useDexScreenerTokenImage(
    avatarUrl ? null : primaryAsset?.chain,
    avatarUrl ? null : primaryAsset?.contract_address
  );
  const displayAvatarUrl = avatarUrl ?? tokenImageUrl ?? undefined;

  return (
    <Box
      alignItems="Center"
      gap="200"
      style={{
        padding: config.space.S300,
        borderRadius: config.radii.R400,
        backgroundColor: color.SurfaceVariant.Container,
        cursor: 'pointer',
      }}
      onClick={() => navigate(getSpaceHubPath(project.space_room_id))}
    >
      <Avatar size="300" radii="300">
        {displayAvatarUrl ? (
          <img
            src={displayAvatarUrl}
            alt={project.name}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text size="H6">{nameInitials(project.name)}</Text>
        )}
      </Avatar>
      <Box grow="Yes" direction="Column" gap="0">
        <Text size="T400" truncate>
          {project.name}
        </Text>
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          {progress.done} of {progress.total} setup tasks done
        </Text>
      </Box>
      {sizedIcon(CaretRight, '100')}
    </Box>
  );
}

/** UI Bible §7 (Founder and Team Home): "What needs me today?" -- this is
 *  the first real "Tasks" surface on Home, and it is deliberately limited
 *  to the one task system that actually exists: the Hub's setup checklist.
 *  One row per owned project whose checklist is incomplete, linking
 *  straight to that project's Hub. Renders nothing at all (no empty shell,
 *  no spinner) while loading, when a project's data could not be fetched
 *  (an unreachable gateway must not claim tasks are outstanding), or when
 *  every owned project is fully set up. */
export function TasksNeedAttention({ ownedProjects }: { ownedProjects: ProjectRecord[] }) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [rows, setRows] = useState<TaskRow[] | undefined>(undefined);

  useEffect(() => {
    setRows(undefined);
    Promise.all(
      ownedProjects.map(async (project): Promise<TaskRow | null> => {
        try {
          const [assets, links] = await Promise.all([
            fetchChainAssets(mx, project.project_id),
            fetchProjectLinks(mx, project.project_id),
          ]);
          const progress = computeSetupProgress(project, assets.length, links.length);
          return progress.done < progress.total
            ? { project, progress, primaryAsset: assets[0] ?? null }
            : null;
        } catch {
          // Unknown state is not the same as "tasks outstanding" -- skip the
          // project rather than show a row built on a failed fetch.
          return null;
        }
      })
    ).then((results) => {
      if (alive()) setRows(results.filter((row): row is TaskRow => row !== null));
    });
  }, [mx, ownedProjects, alive]);

  if (!rows || rows.length === 0) return null;

  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        margin: `${config.space.S300} ${config.space.S300} 0`,
      }}
    >
      <Box alignItems="Center" gap="100">
        {sizedIcon(Checks, '100')}
        <Text size="L400">Tasks need attention</Text>
      </Box>
      <Box direction="Column" gap="200">
        {rows.map((row) => (
          <TaskProjectRow
            key={row.project.project_id}
            project={row.project}
            progress={row.progress}
            primaryAsset={row.primaryAsset}
          />
        ))}
      </Box>
    </Box>
  );
}
