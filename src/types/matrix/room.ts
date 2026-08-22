import type { IImageInfo } from './common';
import * as prefix from '$unstable/prefixes';
import type { ColorSet } from '$hooks/useUserProfile';

export type IMemberContent = {
  avatar_url?: string;
  displayname?: string;
  membership?: string;
  reason?: string;
  is_direct?: boolean;
};

export const CustomStateEvent = {
  ImagePack: prefix.MATRIX_STATE_ROOM_IMAGE_PACK_PROPERTY_NAME,
  PoniesRoomEmotes: 'im.ponies.room_emotes',
  PowerLevelTags: 'in.cinny.room.power_level_tags',
  RoomWidget: 'im.vector.modular.widgets',
  RoomCosmeticsColor: 'moe.sable.room.cosmetics.color',
  RoomCosmeticsFont: 'moe.sable.room.cosmetics.font',
  RoomCosmeticsPronouns: 'moe.sable.room.cosmetics.pronouns',
  RoomAbbreviations: 'moe.sable.room.abbreviations',
  RoomBanner: 'page.codeberg.everypizza.room.banner',
  /** Set on a Project's Space room, pointing at the child room that acts as
   *  its "Updates" (announcements) feed per UI Bible §8's Chat/Updates/
   *  Hub/Info project nav. State key is always empty string -- one Updates
   *  room per project. A custom state event, not name-matching a room
   *  called "Updates", so it survives renames and stays unambiguous even
   *  if a project happens to have another room with that name. */
  BlockWireSpaceUpdatesRoom: 'chat.blockwire.space.updates_room',
} as const;
export type CustomStateEvent = (typeof CustomStateEvent)[keyof typeof CustomStateEvent];

export type MSpaceChildContent = {
  via: string[];
  suggested?: boolean;
  order?: string;
};

export enum NotificationType {
  Default = 'default',
  AllMessages = 'all_messages',
  MentionsAndKeywords = 'mentions_and_keywords',
  Mute = 'mute',
}

export type IRoomCreateContent = {
  creator?: string;
  ['m.federate']?: boolean;
  room_version: string;
  type?: string;
  additional_creators?: string[];
  predecessor?: {
    event_id?: string;
    room_id: string;
  };
};

export type GetContentCallback = () => unknown;

export type RoomToParents = Map<string, Set<string>>;
export type Unread = {
  total: number;
  highlight: number;
  from: Set<string> | null;
};
export type RoomToUnread = Map<string, Unread>;
export type UnreadInfo = {
  roomId: string;
  total: number;
  highlight: number;
};

export type MemberPowerTagIcon = {
  key?: string;
  info?: IImageInfo;
};
export type MemberPowerTag = {
  name: string;
  color?: string;
  icon?: MemberPowerTagIcon;
};

export type MemberPowerStyle = {
  name: string;
  color?: ColorSet;
};
