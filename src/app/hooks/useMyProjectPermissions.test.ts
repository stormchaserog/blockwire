import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useMyProjectPermissions } from './useMyProjectPermissions';
import type { MyProjectPermissions } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchMyProjectPermissions } = vi.hoisted(() => ({
  fetchMyProjectPermissions:
    vi.fn<(mx: unknown, projectId: number) => Promise<MyProjectPermissions>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({ fetchMyProjectPermissions }));

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMyProjectPermissions', () => {
  it('starts undefined (still checking), independent of projectId', () => {
    fetchMyProjectPermissions.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMyProjectPermissions(42));
    expect(result.current.permissions).toBeUndefined();
    expect(result.current.has('role.assign')).toBe(false);
  });

  it('grants every permission to an owner, per the server-issued isOwner flag -- never re-derived client-side', async () => {
    fetchMyProjectPermissions.mockResolvedValue({
      mxid: '@owner:blockwire.chat',
      isOwner: true,
      permissions: [],
    });
    const { result } = renderHook(() => useMyProjectPermissions(42));

    await waitFor(() => expect(result.current.permissions).not.toBeUndefined());
    expect(result.current.has('role.assign')).toBe(true);
    expect(result.current.has('anything.at.all')).toBe(true);
  });

  it('grants only the specific permissions the server lists for a non-owner', async () => {
    fetchMyProjectPermissions.mockResolvedValue({
      mxid: '@member:blockwire.chat',
      isOwner: false,
      permissions: ['project.read', 'social.connect'],
    });
    const { result } = renderHook(() => useMyProjectPermissions(42));

    await waitFor(() => expect(result.current.permissions).not.toBeUndefined());
    expect(result.current.has('social.connect')).toBe(true);
    expect(result.current.has('role.assign')).toBe(false);
  });

  it('treats a fetch failure as "no permissions" rather than throwing or granting access', async () => {
    fetchMyProjectPermissions.mockRejectedValue(new Error('network blip'));
    const { result } = renderHook(() => useMyProjectPermissions(42));

    await waitFor(() => expect(result.current.permissions).toBeNull());
    expect(result.current.has('role.assign')).toBe(false);
  });

  it('does not call the server at all while projectId is undefined -- e.g. before a project has finished loading', () => {
    renderHook(() => useMyProjectPermissions(undefined));
    expect(fetchMyProjectPermissions).not.toHaveBeenCalled();
  });
});
