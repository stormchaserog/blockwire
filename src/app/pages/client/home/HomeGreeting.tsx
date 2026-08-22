import { Box, Text, color, config } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { getGreetingByHour, getGreetingName } from './greeting';

/** UI Bible §7: Home opens with a personal header, not a bare room list.
 *  Greeting varies by local time of day; the name is the user's own Matrix
 *  display name with an mxid-localpart fallback (greeting.ts holds the
 *  pure, unit-tested rules). */
export function HomeGreeting() {
  const mx = useMatrixClient();
  const userId = mx.getUserId();
  const displayName = userId ? mx.getUser(userId)?.displayName : undefined;
  const name = getGreetingName(displayName ?? undefined, userId);
  const greeting = getGreetingByHour(new Date().getHours());

  return (
    <Box
      direction="Column"
      gap="100"
      style={{
        margin: `${config.space.S400} ${config.space.S300} 0`,
      }}
    >
      <Text size="H4">
        {greeting}, {name}
      </Text>
      <Text size="T300" style={{ color: color.Surface.OnContainer }}>
        Here&apos;s what&apos;s happening in your world
      </Text>
    </Box>
  );
}
