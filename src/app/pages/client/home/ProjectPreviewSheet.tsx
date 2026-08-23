import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Spinner, Text, color, config } from 'folds';
import type { MatrixError, Room } from '$types/matrix-sdk';
import type { ProjectChainAsset, ProjectRecord } from '$utils/blockwire/projects';
import { getSpaceLobbyPath } from '$pages/pathUtils';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { nameInitials, formatTicker } from '$utils/common';
import { VerificationBadge } from '$features/project-identity/VerificationBadge';

function capitalizeChain(chain: string): string {
  if (!chain) return chain;
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

export type ProjectPreviewSheetProps = {
  project: ProjectRecord;
  /** The project's primary chain asset, when the card has already loaded
   *  one -- used for the ticker fallback and the "• Chain" suffix. */
  chainAsset: ProjectChainAsset | null;
  /** Fully-resolved display avatar (mxc avatar_url → DexScreener token
   *  image), exactly what the Discover card itself renders. The sheet
   *  falls back to name initials when the card had no image either. */
  avatarUrl?: string;
  onClose: () => void;
};

/** Branded preview sheet opened by tapping a Discover card, replacing the
 *  old raw-room-ID JoinBeforeNavigate landing. Everything shown comes from
 *  data the card already holds (ProjectRecord + primary chain asset) -- no
 *  extra fetches. "Join Community" performs the real space join and only
 *  navigates once the join succeeds; failures stay inline in the sheet. */
export function ProjectPreviewSheet({
  project,
  chainAsset,
  avatarUrl,
  onClose,
}: ProjectPreviewSheetProps) {
  const mx = useMatrixClient();
  const navigate = useNavigate();

  const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
    useCallback(() => mx.joinRoom(project.space_room_id), [mx, project.space_room_id])
  );
  const joining =
    joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;

  const handleJoin = async () => {
    // On failure `join` resolves undefined and parks the error in
    // joinState -- rendered inline below, never thrown at React.
    const room = await join();
    if (room) {
      onClose();
      navigate(getSpaceLobbyPath(project.space_room_id));
    }
  };

  const ticker = formatTicker(project.ticker ?? chainAsset?.token_symbol)?.toUpperCase() ?? null;
  const chainName = chainAsset ? capitalizeChain(chainAsset.chain) : null;
  const subtitle = [ticker, chainName].filter(Boolean).join(' • ');

  return (
    <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
      <Box direction="Column" alignItems="Center" gap="300">
        <Avatar size="500" radii="300">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={project.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Text size="H3">{nameInitials(project.name)}</Text>
          )}
        </Avatar>
        <Box alignItems="Center" justifyContent="Center" gap="200" style={{ maxWidth: '100%' }}>
          <Text size="H4" align="Center" truncate>
            {project.name}
          </Text>
          <VerificationBadge
            state={project.owner_verification_state}
            label="Project Owner Verified"
          />
        </Box>
        {subtitle && (
          <Text size="T300" align="Center" style={{ color: color.Surface.OnContainer }}>
            {subtitle}
          </Text>
        )}
        {project.description && (
          <Text
            size="T300"
            align="Center"
            priority="400"
            style={{
              color: color.Surface.OnContainer,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.description}
          </Text>
        )}
      </Box>

      {joinState.status === AsyncStatus.Error && (
        <Text size="T300" align="Center" style={{ color: color.Critical.Main }}>
          {joinState.error.message || 'Failed to join. Unknown Error.'}
        </Text>
      )}

      <Box direction="Column" gap="200">
        <Button
          variant="Primary"
          size="400"
          onClick={handleJoin}
          disabled={joining}
          before={
            joining && (
              <Spinner
                size="100"
                variant="Primary"
                fill="Solid"
                style={{ background: 'transparent' }}
              />
            )
          }
        >
          <Text size="B400">{joining ? 'Joining…' : 'Join Community'}</Text>
        </Button>
        <Button variant="Secondary" fill="Soft" size="400" onClick={onClose}>
          <Text size="B400">Cancel</Text>
        </Button>
      </Box>
    </Box>
  );
}
