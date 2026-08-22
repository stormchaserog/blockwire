import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useMyOwnedProjects } from './useMyOwnedProjects';
import type { ProjectRecord } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchMyProjects } = vi.hoisted(() => ({
  fetchMyProjects: vi.fn<(mx: unknown) => Promise<ProjectRecord[]>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({ fetchMyProjects }));

afterEach(() => {
  vi.clearAllMocks();
});

const ownedProject: ProjectRecord = {
  project_id: 1,
  slug: 'wclaw',
  name: 'WCLAW Labs',
  ticker: 'WCLAW',
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!wclaw:blockwire.chat',
  owner_mxid: '@steven:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('useMyOwnedProjects', () => {
  it('starts undefined (still checking) and is not treated as a founder yet', () => {
    fetchMyProjects.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMyOwnedProjects());
    expect(result.current.ownedProjects).toBeUndefined();
    expect(result.current.isFounder).toBe(false);
  });

  it('is a founder when fetchMyProjects returns at least one owned project', async () => {
    fetchMyProjects.mockResolvedValue([ownedProject]);
    const { result } = renderHook(() => useMyOwnedProjects());
    await waitFor(() => expect(result.current.ownedProjects).not.toBeUndefined());
    expect(result.current.isFounder).toBe(true);
    expect(result.current.ownedProjects).toEqual([ownedProject]);
  });

  it('is NOT a founder when the caller owns zero projects', async () => {
    fetchMyProjects.mockResolvedValue([]);
    const { result } = renderHook(() => useMyOwnedProjects());
    await waitFor(() => expect(result.current.ownedProjects).not.toBeUndefined());
    expect(result.current.isFounder).toBe(false);
  });

  it('treats a fetch failure as "not a founder" rather than throwing or silently promoting the user', async () => {
    fetchMyProjects.mockRejectedValue(new Error('network blip'));
    const { result } = renderHook(() => useMyOwnedProjects());
    await waitFor(() => expect(result.current.ownedProjects).toBeNull());
    expect(result.current.isFounder).toBe(false);
  });
});
