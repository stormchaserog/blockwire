import { createContext, useContext } from 'react';
import type { PushTransportConfig } from '$features/settings/notifications/NotificationTransport';

import type { Settings } from '$state/settings';

export type HashRouterConfig = {
  enabled?: boolean;
  basename?: string;
};

export type GifsConfig = {
  /** Media proxy server name for `mxc://<proxyUrl>/klipy_<id>`. NOT an API
   *  proxy — the search key lives on the gateway (`KLIPY_API_KEY`), and this
   *  is only about how a sent GIF is referenced. Leave it unset here:
   *  federation is disabled, so the homeserver cannot fetch media from
   *  another server name and setting it makes sent GIFs arrive broken. The
   *  working path uploads the bytes to our own media repo instead — see
   *  utils/klipyUpload.ts. */
  proxyUrl?: string;
};

export type ClientConfig = {
  defaultHomeserver?: number;
  homeserverList?: string[];
  allowCustomHomeservers?: boolean;
  elementCallUrl?: string;

  disableAccountSwitcher?: boolean;
  hideUsernamePasswordFields?: boolean;

  pushNotificationDetails?: {
    pushNotifyUrl?: string;
    vapidPublicKey?: string;
    webPushAppID?: string;
    nativePushAppID?: string;
    unifiedPushAppID?: string;
    unifiedPushGatewayUrl?: string;
  };

  pushTransport?: PushTransportConfig;

  slidingSync?: {
    enabled?: boolean;
    proxyBaseUrl?: string;
    bootstrapClassicOnColdCache?: boolean;
    listPageSize?: number;
    timelineLimit?: number;
    pollTimeoutMs?: number;
    maxRooms?: number;
    includeInviteList?: boolean;
    probeTimeoutMs?: number;
  };

  featuredCommunities?: {
    openAsDefault?: boolean;
    spaces?: string[];
    rooms?: string[];
    servers?: string[];
  };

  hashRouter?: HashRouterConfig;

  gifs?: GifsConfig;

  matrixToBaseUrl?: string;

  themeCatalogBaseUrl?: string;
  themeCatalogManifestUrl?: string;
  themeCatalogApprovedHostPrefixes?: string[];

  settingsDefaults?: Partial<Settings>;
};

const EMPTY_CONFIG: ClientConfig = {};

const ClientConfigContext = createContext<ClientConfig>(EMPTY_CONFIG);

export const ClientConfigProvider = ClientConfigContext.Provider;

export function useClientConfig(): ClientConfig {
  return useContext(ClientConfigContext);
}

export function useOptionalClientConfig(): ClientConfig {
  return useContext(ClientConfigContext);
}

export const clientDefaultServer = (clientConfig: ClientConfig): string =>
  clientConfig.homeserverList?.[clientConfig.defaultHomeserver ?? 0] ?? 'matrix.org';

export const clientAllowedServer = (clientConfig: ClientConfig, server: string): boolean => {
  const { homeserverList, allowCustomHomeservers } = clientConfig;

  if (allowCustomHomeservers) return true;

  return homeserverList?.includes(server) === true;
};
