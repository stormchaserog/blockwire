import { NavLink, useLocation } from 'react-router-dom';
import { Box, Text, color, config } from 'folds';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { mDirectAtom } from '$state/mDirectList';
import { roomToParentsAtom } from '$state/room/roomToParents';
import { allRoomsAtom } from '$state/room-list/roomList';
import { roomToUnreadAtom } from '$state/room/roomToUnread';
import { useOrphanRooms, useOrphanSpaces, useDirects } from '$state/hooks/roomList';
import { useRoomsUnread } from '$state/hooks/unread';
import {
  useHomeSelected,
  useDirectSelected,
  useExploreSelected,
} from '$hooks/router/useRouteSelected';
import {
  getHomePath,
  getDirectPath,
  getExplorePath,
  getProfilePath,
  getCommunitiesPath,
} from '$pages/pathUtils';
import {
  House,
  User,
  Compass,
  UsersThree,
  UserCircle,
  sizedIcon,
} from '$components/icons/phosphor';

type NavItemProps = {
  to: string;
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  unreadCount?: number;
};

function NavItem({ to, selected, label, icon, unreadCount }: NavItemProps) {
  return (
    <Box
      as={NavLink}
      to={to}
      grow="Yes"
      direction="Column"
      alignItems="Center"
      justifyContent="Center"
      gap="0"
      style={{
        textDecoration: 'none',
        color: selected ? color.Primary.Main : color.Surface.OnContainer,
        position: 'relative',
        padding: `${config.space.S200} 0`,
      }}
    >
      {icon}
      <Text size="T200" style={{ color: 'inherit' }}>
        {label}
      </Text>
      {!!unreadCount && unreadCount > 0 && (
        <Box
          style={{
            position: 'absolute',
            top: config.space.S100,
            right: '30%',
            minWidth: '1rem',
            height: '1rem',
            borderRadius: '1rem',
            background: color.Critical.Main,
            color: color.Critical.OnContainer,
            fontSize: '0.625rem',
            fontWeight: 700,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 0.25rem',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Box>
      )}
    </Box>
  );
}

/** UI Bible §6 (Global Navigation): "Recommended mobile navigation: Home,
 *  Communities, Messages, Discover, Profile. Keep this navigation stable.
 *  Do not casually add more global tabs." Before this component, mobile had
 *  NO persistent navigation at all -- ClientLayout.tsx hides the desktop
 *  sidebar rail entirely on mobile (railInDrawer) with nothing standing in
 *  for it, meaning every screen was a dead end unless reached by a deep
 *  link. This is the actual root cause of "no hamburger, nowhere to go" --
 *  not a missing menu button, a missing navigation layer.
 *
 *  Deliberately thin: reuses the same data hooks the desktop SidebarNav
 *  already relies on (useOrphanRooms, useOrphanSpaces, useDirects,
 *  useRoomsUnread) rather than duplicating unread-counting logic, but
 *  renders none of SidebarNav's drag-and-drop reordering, folder
 *  management, or per-space context menus -- those are Workspace-Mode-
 *  adjacent power-user features the Bible explicitly keeps off the
 *  Community-Mode global nav (§3: "Community members should not see
 *  founder-level complexity unless it is relevant to them"). */
export function MobileBottomNav() {
  const mx = useMatrixClient();
  const location = useLocation();

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const homeUnread = useRoomsUnread(orphanRooms, roomToUnreadAtom);

  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const directUnread = useRoomsUnread(directs, roomToUnreadAtom);

  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const communitiesUnread = useRoomsUnread(orphanSpaces, roomToUnreadAtom);

  const homeSelected = useHomeSelected();
  const directSelected = useDirectSelected();
  const exploreSelected = useExploreSelected();
  const communitiesSelected = location.pathname.startsWith(getCommunitiesPath());

  return (
    <Box
      shrink="No"
      direction="Row"
      style={{
        borderTop: `1px solid ${color.Surface.ContainerLine}`,
        background: color.Surface.Container,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <NavItem
        to={getHomePath()}
        selected={homeSelected}
        label="Home"
        icon={sizedIcon(House, '400', { filled: homeSelected })}
        unreadCount={homeUnread?.total}
      />
      <NavItem
        to={getCommunitiesPath()}
        selected={communitiesSelected}
        label="Communities"
        icon={sizedIcon(UsersThree, '400', { filled: communitiesSelected })}
        unreadCount={communitiesUnread?.total}
      />
      <NavItem
        to={getDirectPath()}
        selected={directSelected}
        label="Messages"
        icon={sizedIcon(User, '400', { filled: directSelected })}
        unreadCount={directUnread?.total}
      />
      <NavItem
        to={getExplorePath()}
        selected={exploreSelected}
        label="Discover"
        icon={sizedIcon(Compass, '400', { filled: exploreSelected })}
      />
      <NavItem
        to={getProfilePath()}
        selected={location.pathname.startsWith(getProfilePath())}
        label="Profile"
        icon={sizedIcon(UserCircle, '400', {
          filled: location.pathname.startsWith(getProfilePath()),
        })}
      />
    </Box>
  );
}
