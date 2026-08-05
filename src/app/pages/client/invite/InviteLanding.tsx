import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Spinner, Text } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useRoomNavigate } from '$hooks/useRoomNavigate';
import { HOME_PATH } from '$pages/paths';
import {
  redeemInviteLink,
  resolveInviteLink,
  type ResolvedInvite,
} from '$utils/blockwire/inviteLinks';

/** Landing page for `blockwire.chat/+7Fk2xQwe`.
 *
 *  Two steps on purpose. Resolving names the room without spending anything;
 *  redeeming consumes one of the link's uses and is what actually opens the
 *  door. A link can be capped at a handful of uses, so a mis-tap must not
 *  burn one — nobody says yes to a room they cannot see the name of.
 */
export function InviteLanding() {
  const { hash } = useParams<{ hash: string }>();
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const { navigateRoom } = useRoomNavigate();

  const [invite, setInvite] = useState<ResolvedInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!hash) {
      setError('This invite link is not valid.');
      return undefined;
    }
    resolveInviteLink(mx.baseUrl, hash)
      .then((resolved) => {
        if (!cancelled) setInvite(resolved);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'This invite link is not valid.');
      });
    return () => {
      cancelled = true;
    };
  }, [hash, mx.baseUrl]);

  const handleJoin = useCallback(async () => {
    if (!hash || joining) return;
    setJoining(true);
    setError(null);
    try {
      const redeemed = await redeemInviteLink(mx, hash);
      if (redeemed.action === 'join') {
        // The gateway has invited us where it needed to; the join itself is
        // ours to make, and is a no-op if we are already a member.
        await mx.joinRoom(redeemed.room_id).catch(() => undefined);
      }
      navigateRoom(redeemed.room_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This invite link is not valid.');
      setJoining(false);
    }
  }, [hash, joining, mx, navigateRoom]);

  const roomName = invite?.room_name ?? 'this chat';
  // An ask-to-join room decides for itself: the link says who may ask, the
  // room's admins still choose. Promising entry here would be a lie.
  const asksApproval = invite?.action === 'knock';

  return (
    <Box
      grow="Yes"
      direction="Column"
      alignItems="Center"
      justifyContent="Center"
      gap="400"
      style={{ padding: '24px', textAlign: 'center' }}
    >
      {!invite && !error && <Spinner size="600" />}

      {error && (
        <>
          <Text size="H4">This invite doesn&apos;t work</Text>
          <Text size="T300" priority="300">
            {error}
          </Text>
          <Button variant="Secondary" onClick={() => navigate(HOME_PATH)}>
            <Text size="B400">Go to BlockWire</Text>
          </Button>
        </>
      )}

      {invite && !error && (
        <>
          <Text size="H4">You&apos;ve been invited to {roomName}</Text>
          <Text size="T300" priority="300">
            {asksApproval
              ? 'This chat approves new members, so your request goes to its admins.'
              : 'Join to see the conversation and start posting.'}
          </Text>
          <Button variant="Primary" disabled={joining} onClick={handleJoin}>
            <Text size="B400">
              {/* eslint-disable-next-line no-nested-ternary */}
              {joining ? 'Joining…' : asksApproval ? 'Ask to join' : 'Join'}
            </Text>
          </Button>
          <Button variant="Secondary" fill="None" onClick={() => navigate(HOME_PATH)}>
            <Text size="B400">Not now</Text>
          </Button>
        </>
      )}
    </Box>
  );
}
