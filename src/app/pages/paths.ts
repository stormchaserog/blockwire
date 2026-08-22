export const ROOT_PATH = '/';

export type LoginPathSearchParams = {
  username?: string;
  email?: string;
  loginToken?: string;
};
export const LOGIN_PATH = '/login/:server?/';

export type RegisterPathSearchParams = {
  username?: string;
  email?: string;
  token?: string;
};
export const REGISTER_PATH = '/register/:server?/';

export type ResetPasswordPathSearchParams = {
  email?: string;
};
export const RESET_PASSWORD_PATH = '/reset-password/:server?/';

export type SettingsPathSearchParams = {
  focus?: string;
};

export const CREATE_PATH_SEGMENT = 'create/';
export const JOIN_PATH_SEGMENT = 'join/';
export const LOBBY_PATH_SEGMENT = 'lobby/';
export const PROJECT_PATH_SEGMENT = 'project/';
export const HUB_PATH_SEGMENT = 'hub/';
export const UPDATES_PATH_SEGMENT = 'updates/';
export const BOOKMARKS_PATH_SEGMENT = 'bookmarks/';
/**
 * array of rooms and senders mxId assigned
 * to search param as string should be "," separated
 * Like: url?rooms=!one:server,!two:server
 */
export type SearchPathSearchParams = {
  global?: string;
  term?: string;
  order?: string;
  rooms?: string;
  senders?: string;
};
export const SEARCH_PATH_SEGMENT = 'search/';

export type RoomSearchParams = {
  /* comma separated string of servers */
  viaServers?: string;
};
export const ROOM_PATH_SEGMENT = ':roomIdOrAlias/:eventId?/';

export const HOME_PATH = '/home/';
export const HOME_JOIN_PATH = `/home/${JOIN_PATH_SEGMENT}`;
export const HOME_SEARCH_PATH = `/home/${SEARCH_PATH_SEGMENT}`;
export const HOME_ROOM_PATH = `/home/${ROOM_PATH_SEGMENT}`;

export const COMMUNITIES_PATH = '/communities/';

export const DIRECT_PATH = '/direct/';
export type DirectCreateSearchParams = {
  userId?: string;
};
export const DIRECT_CREATE_PATH = `/direct/${CREATE_PATH_SEGMENT}`;
export const DIRECT_ROOM_PATH = `/direct/${ROOM_PATH_SEGMENT}`;

export const SPACE_PATH = '/:spaceIdOrAlias/';
export const SPACE_LOBBY_PATH = `/:spaceIdOrAlias/${LOBBY_PATH_SEGMENT}`;
export const SPACE_PROJECT_PATH = `/:spaceIdOrAlias/${PROJECT_PATH_SEGMENT}`;
export const SPACE_HUB_PATH = `/:spaceIdOrAlias/${HUB_PATH_SEGMENT}`;
export const SPACE_UPDATES_PATH = `/:spaceIdOrAlias/${UPDATES_PATH_SEGMENT}`;
export const SPACE_SEARCH_PATH = `/:spaceIdOrAlias/${SEARCH_PATH_SEGMENT}`;
export const SPACE_ROOM_PATH = `/:spaceIdOrAlias/${ROOM_PATH_SEGMENT}`;

export const FEATURED_PATH_SEGMENT = 'featured/';
export const SERVER_PATH_SEGMENT = ':server/';
export const EXPLORE_PATH = '/explore/';
export const EXPLORE_FEATURED_PATH = `/explore/${FEATURED_PATH_SEGMENT}`;

export type ExploreServerPathSearchParams = {
  limit?: string;
  since?: string;
  term?: string;
  type?: string;
  instance?: string;
};
export const EXPLORE_SERVER_PATH = `/explore/${SERVER_PATH_SEGMENT}`;

export const CREATE_PATH = '/create';
/** BlockWire's own — creates a Matrix Space AND binds a Project to it in
 *  one flow, distinct from the plain "/create" (space-only) path Sable
 *  already ships. See src/app/features/create-project. */
export const CREATE_PROJECT_PATH = '/create-project';
export const CREATE_ROOM_PATH = '/create-room';
export const BUG_REPORT_PATH = '/bug-report';
export const NAVIGATE_PATH = '/navigate';
/** AGPL-3.0 §13 requires offering source to anyone using the software over a
 *  network. A stable, guessable URL reachable without an account is what makes
 *  that offer real rather than asserted. */
export const SOURCE_PATH = '/source';
/** Store-required legal pages: both app stores demand a public privacy-policy
 *  URL, and Apple's UGC rules want published terms with a moderation contact.
 *  Stable and account-free, like /source. */
export const PRIVACY_PATH = '/privacy';
export const TERMS_PATH = '/terms';
/** BlockWire invite links. The URL people share is the short `/+<hash>`; the
 *  boot guard in index.html rewrites it here so React Router never has to
 *  parse a `+` sigil. */
export const INVITE_PATH = '/invite/:hash';
export const PROFILE_PATH = '/profile/';

export const NOTIFICATIONS_PATH_SEGMENT = 'notifications/';
export const INVITES_PATH_SEGMENT = 'invites/';
export const INBOX_PATH = '/inbox/';
export type InboxNotificationsPathSearchParams = {
  only?: string;
};
export const INBOX_NOTIFICATIONS_PATH = `/inbox/${NOTIFICATIONS_PATH_SEGMENT}`;
export const INBOX_INVITES_PATH = `/inbox/${INVITES_PATH_SEGMENT}`;
export const INBOX_BOOKMARKS_PATH = `/inbox/${BOOKMARKS_PATH_SEGMENT}`;

const TO_PATH = '/to';
// Deep-link route used by push notification click-back URLs.
// Format: /to/:user_id/:room_id/:event_id?
// e.g.  /to/%40alice%3Aserver/%21room%3Aserver/%24event%3Aserver
export const TO_ROOM_EVENT_PATH = `${TO_PATH}/:user_id/:room_id/:event_id?`;

export const SSO_CALLBACK_PATH = '/lp/sso-callback';
export const SETTINGS_PATH = '/settings/:section?/';
