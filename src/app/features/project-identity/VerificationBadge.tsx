import { Box, Text, color } from 'folds';
import { SealCheck, sizedIcon } from '$components/icons/phosphor';
import type { VerifiedControlState } from '$utils/blockwire/projects';

export type VerificationBadgeProps = {
  state: VerifiedControlState;
  /** UI Bible §18: use precise labels ("Identity Verified," "Project Owner
   *  Verified," "Wallet Verified," "Team Role Verified"), never vague ones
   *  ("Trusted," "Safe," "Legit," "Guaranteed"). The label text itself is
   *  the caller's responsibility (different verified THINGS need
   *  different precise labels) -- this component only renders whichever
   *  precise label it's given, plus the correct icon/tone for the state.
   */
  label: string;
};

/** Renders nothing for 'unverified' -- an absent badge communicates
 *  "not verified" more honestly than a grey/crossed-out badge would (Bible
 *  §18: verification communicates what was checked, never implies safety
 *  by its mere presence). 'pending' gets its own distinct, non-alarming
 *  treatment -- a project mid-verification should not look suspicious. */
export function VerificationBadge({ state, label }: VerificationBadgeProps) {
  if (state === 'unverified') return null;

  const tone = state === 'verified' ? color.Success.Main : color.Surface.OnContainer;

  return (
    <Box alignItems="Center" gap="100">
      {sizedIcon(SealCheck, '100', { weight: state === 'verified' ? 'fill' : 'regular', style: { color: tone } })}
      <Text size="T200" style={{ color: tone }}>
        {state === 'verified' ? label : `${label} (Pending)`}
      </Text>
    </Box>
  );
}
