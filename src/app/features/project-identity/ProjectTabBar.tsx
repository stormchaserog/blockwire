import { NavLink, useLocation } from 'react-router-dom';
import { Box, Text, color, config } from 'folds';
import { useSpace } from '$hooks/useSpace';
import {
  getSpaceLobbyPath,
  getSpaceUpdatesPath,
  getSpaceHubPath,
  getSpaceProjectPath,
} from '$pages/pathUtils';
import { ChatCircle, Bell, House, Info, sizedIcon } from '$components/icons/phosphor';

type TabDef = {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  matchPrefix: string;
};

function useProjectTabs(spaceIdOrAlias: string): TabDef[] {
  return [
    {
      to: getSpaceLobbyPath(spaceIdOrAlias),
      label: 'Chat',
      matchPrefix: getSpaceLobbyPath(spaceIdOrAlias),
      icon: (active) => sizedIcon(ChatCircle, '100', { filled: active }),
    },
    {
      to: getSpaceUpdatesPath(spaceIdOrAlias),
      label: 'Updates',
      matchPrefix: getSpaceUpdatesPath(spaceIdOrAlias),
      icon: (active) => sizedIcon(Bell, '100', { filled: active }),
    },
    {
      to: getSpaceHubPath(spaceIdOrAlias),
      label: 'Hub',
      matchPrefix: getSpaceHubPath(spaceIdOrAlias),
      icon: (active) => sizedIcon(House, '100', { filled: active }),
    },
    {
      to: getSpaceProjectPath(spaceIdOrAlias),
      label: 'Info',
      matchPrefix: getSpaceProjectPath(spaceIdOrAlias),
      icon: (active) => sizedIcon(Info, '100', { filled: active }),
    },
  ];
}

/** UI Bible §8: "Inside a project, prefer: Chat, Updates, Hub, Info...
 *  Do not create twelve project tabs." Before this, these four screens
 *  existed as separately-linked pages (Lobby, Updates, Hub, Project) with
 *  no visible way to switch between them except a deep link or the
 *  "Open Project Hub" text link buried in the Project page -- there was
 *  no tab bar at all.
 *
 *  Visual language deliberately leans Telegram/iMessage: a single pill-
 *  shaped segmented control (not four separate boxy buttons), soft
 *  background fill on the active segment, smooth transition on switch --
 *  the same instantly-recognizable pattern as Telegram's chat-list filter
 *  bar or iMessage's tab switcher, not a dense admin-dashboard tab strip. */
export function ProjectTabBar() {
  const space = useSpace();
  const location = useLocation();
  const tabs = useProjectTabs(space.roomId);

  return (
    <Box
      shrink="No"
      alignItems="Center"
      style={{
        margin: `${config.space.S200} ${config.space.S300}`,
        padding: '0.25rem',
        borderRadius: config.radii.R500,
        background: color.SurfaceVariant.Container,
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname.startsWith(tab.matchPrefix);
        return (
          <Box
            key={tab.to}
            as={NavLink}
            to={tab.to}
            grow="Yes"
            direction="Row"
            alignItems="Center"
            justifyContent="Center"
            gap="100"
            style={{
              textDecoration: 'none',
              padding: '0.5rem 0',
              borderRadius: config.radii.R400,
              background: active ? color.Surface.Container : 'transparent',
              color: active ? color.Primary.Main : color.SurfaceVariant.OnContainer,
              transition: 'background-color 150ms ease, color 150ms ease',
            }}
          >
            {tab.icon(active)}
            <Text size="B300" style={{ color: 'inherit' }} truncate>
              {tab.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
