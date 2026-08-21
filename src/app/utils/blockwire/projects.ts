import type { MatrixClient } from '$types/matrix-sdk';

/** BlockWire Projects — the client side of blockwire-botgw's
 *  /_blockwire/projects/* API (Phase 6, Workspace Mode foundation).
 *
 *  Mirrors inviteLinks.ts's shape exactly: the gateway is proxied under the
 *  homeserver's origin, calls carry the CALLER'S OWN access token (never a
 *  bot token — binding/administering a project is a human action), and the
 *  server is the only source of truth for permissions. This module never
 *  computes "can I do X" locally; see fetchMyProjectPermissions, which the
 *  UI must call and trust over any local guess. */

export interface ProjectRecord {
  project_id: number;
  slug: string;
  name: string;
  ticker: string | null;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  space_room_id: string;
  owner_mxid: string;
  status: 'active' | 'archived' | 'suspended';
  owner_verification_state: VerifiedControlState;
  created_at: string;
}

/** Mirrors blockwire-botgw's VerifiedControlState (store/types.ts) exactly
 *  — one named type here rather than the same union inlined twice, so
 *  ProjectChainAsset and ProjectLinkRecord can't silently drift apart
 *  from each other or from the server's own type. */
export type VerifiedControlState = 'unverified' | 'pending' | 'verified';

export interface ProjectChainAsset {
  id: number;
  project_id: number;
  chain: string;
  contract_address: string;
  token_symbol: string | null;
  token_decimals: number | null;
  verified_control_state: VerifiedControlState;
  created_at: string;
}

export interface ProjectLinkRecord {
  id: number;
  project_id: number;
  link_type: string;
  url: string;
  verification_state: VerifiedControlState;
  created_at: string;
}

export interface RoleRecord {
  role_id: number;
  project_id: number;
  name: string;
  system_key: string | null;
  created_at: string;
}

export interface PlatformPermission {
  permission_key: string;
  description: string;
}

export interface MyProjectPermissions {
  mxid: string;
  isOwner: boolean;
  permissions: string[];
}

const parseError = async (res: Response, fallback: string): Promise<string> => {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? fallback;
};

function authHeaders(mx: MatrixClient, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${mx.getAccessToken() ?? ''}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

/**
 * Bind a NEW project to an EXISTING Matrix Space (`spaceRoomId`) the caller
 * already administers. Does NOT create the space — call this AFTER
 * `createRoom` from `$components/create-room` succeeds, exactly the way
 * CreateSpaceForm already sequences its own follow-up calls (e.g. sending
 * SpaceChild state to a parent). The gateway independently re-checks the
 * caller's power level in that space server-side; a client-side check here
 * would only be a UX nicety, never the authorization boundary.
 */
export const createProject = async (
  mx: MatrixClient,
  params: { slug: string; name: string; ticker?: string | null; description?: string | null; spaceRoomId: string },
): Promise<ProjectRecord> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects`, {
    method: 'POST',
    headers: authHeaders(mx, true),
    body: JSON.stringify({
      slug: params.slug,
      name: params.name,
      ticker: params.ticker ?? null,
      description: params.description ?? null,
      space_room_id: params.spaceRoomId,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not create this project.'));
  }
  return (await res.json()) as ProjectRecord;
};

export const fetchProject = async (mx: MatrixClient, projectId: number): Promise<ProjectRecord> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}`, {
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'This project could not be found.'));
  return (await res.json()) as ProjectRecord;
};

export const fetchProjectBySlug = async (mx: MatrixClient, slug: string): Promise<ProjectRecord> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/by-slug/${encodeURIComponent(slug)}`, {
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'This project could not be found.'));
  return (await res.json()) as ProjectRecord;
};

/** Given a Matrix Space room id, returns the Project bound to it, or null
 *  if that space has no BlockWire project yet. This is the check a
 *  space-scoped screen (the Lobby) makes to decide whether to show any
 *  Project Identity content at all — most Sable/BlockWire spaces are just
 *  ordinary Spaces with no project, and that's a normal, expected outcome,
 *  not an error (see the 404-to-null translation below). */
export const fetchProjectBySpace = async (
  mx: MatrixClient, spaceRoomId: string,
): Promise<ProjectRecord | null> => {
  const res = await fetch(
    `${mx.baseUrl}/_blockwire/projects/by-space/${encodeURIComponent(spaceRoomId)}`,
    { headers: authHeaders(mx) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseError(res, 'Could not check this space for a project.'));
  return (await res.json()) as ProjectRecord;
};

export const fetchMyProjects = async (mx: MatrixClient): Promise<ProjectRecord[]> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/mine`, { headers: authHeaders(mx) });
  if (!res.ok) throw new Error(await parseError(res, 'Could not load your projects.'));
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as ProjectRecord[]) : [];
};

/** THE permission check the UI should gate on — never a local role/owner
 *  guess. Call this once per project view and hide/disable actions the
 *  response doesn't list, exactly like CLAUDE.md's "never trust
 *  client-provided role or entitlement claims" demands of the client too:
 *  it must ask, not assert. */
export const fetchMyProjectPermissions = async (
  mx: MatrixClient, projectId: number,
): Promise<MyProjectPermissions> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/permissions/mine`, {
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not load your permissions for this project.'));
  return (await res.json()) as MyProjectPermissions;
};

export const updateProject = async (
  mx: MatrixClient,
  projectId: number,
  patch: Partial<Pick<ProjectRecord, 'name' | 'ticker' | 'description' | 'avatar_url' | 'banner_url' | 'status'>>,
): Promise<ProjectRecord> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}`, {
    method: 'POST',
    headers: authHeaders(mx, true),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not update this project.'));
  return (await res.json()) as ProjectRecord;
};

export const fetchChainAssets = async (mx: MatrixClient, projectId: number): Promise<ProjectChainAsset[]> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/chain-assets`, {
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not load chain assets.'));
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as ProjectChainAsset[]) : [];
};

export const addChainAsset = async (
  mx: MatrixClient,
  projectId: number,
  params: { chain: string; contractAddress: string; tokenSymbol?: string | null; tokenDecimals?: number | null },
): Promise<ProjectChainAsset> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/chain-assets`, {
    method: 'POST',
    headers: authHeaders(mx, true),
    body: JSON.stringify({
      chain: params.chain,
      contract_address: params.contractAddress,
      token_symbol: params.tokenSymbol ?? null,
      token_decimals: params.tokenDecimals ?? null,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not add this chain asset.'));
  return (await res.json()) as ProjectChainAsset;
};

export const removeChainAsset = async (mx: MatrixClient, projectId: number, assetId: number): Promise<void> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/chain-assets/${assetId}`, {
    method: 'DELETE',
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not remove this chain asset.'));
};

export const fetchProjectLinks = async (mx: MatrixClient, projectId: number): Promise<ProjectLinkRecord[]> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/links`, {
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not load this project\'s links.'));
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as ProjectLinkRecord[]) : [];
};

export const addProjectLink = async (
  mx: MatrixClient, projectId: number, params: { linkType: string; url: string },
): Promise<ProjectLinkRecord> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/links`, {
    method: 'POST',
    headers: authHeaders(mx, true),
    body: JSON.stringify({ link_type: params.linkType, url: params.url }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not add this link.'));
  return (await res.json()) as ProjectLinkRecord;
};

export const removeProjectLink = async (mx: MatrixClient, projectId: number, linkId: number): Promise<void> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/links/${linkId}`, {
    method: 'DELETE',
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not remove this link.'));
};

export const fetchPlatformPermissions = async (mx: MatrixClient): Promise<PlatformPermission[]> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/permissions`);
  if (!res.ok) throw new Error(await parseError(res, 'Could not load the platform permission list.'));
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as PlatformPermission[]) : [];
};

export const fetchRoles = async (mx: MatrixClient, projectId: number): Promise<RoleRecord[]> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/roles`, {
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not load roles for this project.'));
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as RoleRecord[]) : [];
};

export const createRole = async (
  mx: MatrixClient, projectId: number, params: { name: string; systemKey?: string | null },
): Promise<RoleRecord> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/roles`, {
    method: 'POST',
    headers: authHeaders(mx, true),
    body: JSON.stringify({ name: params.name, system_key: params.systemKey ?? null }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not create this role.'));
  return (await res.json()) as RoleRecord;
};

export const deleteRole = async (mx: MatrixClient, projectId: number, roleId: number): Promise<void> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: authHeaders(mx),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not delete this role.'));
};

export const setRolePermissions = async (
  mx: MatrixClient, projectId: number, roleId: number, permissionKeys: string[],
): Promise<void> => {
  const res = await fetch(`${mx.baseUrl}/_blockwire/projects/${projectId}/roles/${roleId}/permissions`, {
    method: 'POST',
    headers: authHeaders(mx, true),
    body: JSON.stringify({ permissions: permissionKeys }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not update this role\'s permissions.'));
};

export const grantMemberRole = async (
  mx: MatrixClient, projectId: number, targetMxid: string, roleId: number,
): Promise<void> => {
  const res = await fetch(
    `${mx.baseUrl}/_blockwire/projects/${projectId}/members/${encodeURIComponent(targetMxid)}/roles`,
    { method: 'POST', headers: authHeaders(mx, true), body: JSON.stringify({ role_id: roleId }) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Could not grant this role.'));
};

export const revokeMemberRole = async (
  mx: MatrixClient, projectId: number, targetMxid: string, roleId: number,
): Promise<void> => {
  const res = await fetch(
    `${mx.baseUrl}/_blockwire/projects/${projectId}/members/${encodeURIComponent(targetMxid)}/roles/${roleId}`,
    { method: 'DELETE', headers: authHeaders(mx) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Could not revoke this role.'));
};

export const fetchMemberRoles = async (
  mx: MatrixClient, projectId: number, targetMxid: string,
): Promise<RoleRecord[]> => {
  const res = await fetch(
    `${mx.baseUrl}/_blockwire/projects/${projectId}/members/${encodeURIComponent(targetMxid)}/roles`,
    { headers: authHeaders(mx) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Could not load this member\'s roles.'));
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as RoleRecord[]) : [];
};
