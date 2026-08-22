import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Text, color, config } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { sizedIcon, Bell } from '$components/icons/phosphor';
import { getInboxNotificationsPath } from '$pages/pathUtils';
import { getGreetingByHour, getGreetingName } from './greeting';

/** UI Bible §7: Home opens with a personal header, not a bare room list.
 *  Greeting varies by local time of day; the name is the user's own Matrix
 *  display name with an mxid-localpart fallback (greeting.ts holds the
 *  pure, unit-tested rules). Per the design mock, the name carries a 👋
 *  and the row ends with a bell that jumps to the notifications inbox. */
export function HomeGreeting() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const userId = mx.getUserId();
  const displayName = userId ? mx.getUser(userId)?.displayName : undefined;
  const name = getGreetingName(displayName ?? undefined, userId);
  const greeting = getGreetingByHour(new Date().getHours());

  return (
    <Box
      alignItems="Start"
      gap="200"
      style={{
        margin: `${config.space.S400} ${config.space.S300} 0`,
      }}
    >
      <Box grow="Yes" direction="Column" gap="100">
        <Text size="H4">
          {greeting}, {name} 👋
        </Text>
        <Text size="T300" style={{ color: color.Surface.OnContainer }}>
          Here&apos;s what&apos;s happening in your world.
        </Text>
      </Box>
      <IconButton
        size="300"
        radii="300"
        variant="Background"
        aria-label="Notifications"
        onClick={() => navigate(getInboxNotificationsPath())}
      >
        {sizedIcon(Bell, '200')}
      </IconButton>
    </Box>
  );
}
