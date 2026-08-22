import type { ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '$hooks/useScreenSize';
import {
  COMMUNITIES_PATH,
  DIRECT_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  INBOX_PATH,
  NAVIGATE_PATH,
  PROFILE_PATH,
  SPACE_PATH,
} from './paths';

type MobileFriendlyClientNavProps = {
  children: ReactNode;
};
export function MobileFriendlySidebarNav({ children }: MobileFriendlyClientNavProps) {
  const screenSize = useScreenSizeContext();
  const homeMatch = useMatch({ path: HOME_PATH, caseSensitive: true, end: true });
  const directMatch = useMatch({ path: DIRECT_PATH, caseSensitive: true, end: true });
  const spaceMatch = useMatch({ path: SPACE_PATH, caseSensitive: true, end: true });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, caseSensitive: true, end: true });
  const inboxMatch = useMatch({ path: INBOX_PATH, caseSensitive: true, end: true });
  const profileMatch = useMatch({ path: PROFILE_PATH, caseSensitive: true, end: true });
  const navigateMatch = useMatch({ path: NAVIGATE_PATH, caseSensitive: true, end: true });
  if (
    screenSize === ScreenSize.Mobile &&
    (!(homeMatch || directMatch || spaceMatch || exploreMatch) ||
      profileMatch ||
      inboxMatch ||
      navigateMatch)
  ) {
    return null;
  }

  return children;
}

export function MobileFriendlyBottomNav({ children }: MobileFriendlyClientNavProps) {
  const screenSize = useScreenSizeContext();
  const homeMatch = useMatch({ path: HOME_PATH, caseSensitive: true, end: true });
  const directMatch = useMatch({ path: DIRECT_PATH, caseSensitive: true, end: true });
  const spaceMatch = useMatch({ path: SPACE_PATH, caseSensitive: true, end: true });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, caseSensitive: true, end: true });
  const communitiesMatch = useMatch({ path: COMMUNITIES_PATH, caseSensitive: true, end: true });
  const profileMatch = useMatch({ path: PROFILE_PATH, caseSensitive: true, end: false });

  // UI Bible §6: "Keep this navigation stable." The bar shows on every one
  // of the five global destinations' own list screen (Home, Communities,
  // Messages/Direct, Discover/Explore, Profile) and nowhere else -- it
  // disappears once a specific room/chat is open (a Space's own :roomId
  // route, a DM thread, etc), matching normal mobile-app tab-bar behavior
  // where the tab bar hides inside a pushed detail screen. The previous
  // version of this gate only showed the bar on Inbox/Navigate/Profile --
  // never on Home, Direct, Space, or Explore themselves -- which is the
  // actual root cause of "no persistent nav, nowhere to go" on mobile.
  const onListDestination =
    homeMatch || directMatch || spaceMatch || exploreMatch || communitiesMatch || profileMatch;

  if (screenSize !== ScreenSize.Mobile || !onListDestination) {
    return null;
  }

  return children;
}
