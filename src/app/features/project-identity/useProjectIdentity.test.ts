import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useProjectIdentity } from './useProjectIdentity';
import type {
  ProjectRecord,
  ProjectChainAsset,
  ProjectLinkRecord,
} from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchProjectBySpace, fetchChainAssets, fetchProjectLinks } = vi.hoisted(() => ({
  fetchProjectBySpace: vi.fn<(mx: unknown, spaceRoomId: string) => Promise<ProjectRecord | null>>(),
  fetchChainAssets: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectChainAsset[]>>(),
  fetchProjectLinks: vi.fn<(mx: unknown, projectId: number) => Promise<ProjectLinkRecord[]>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({
  fetchProjectBySpace,
  fetchChainAssets,
  fetchProjectLinks,
}));

afterEach(() => {
  vi.clearAllMocks();
});

const baseProject: ProjectRecord = {
  project_id: 42,
  slug: 'test-proj',
  name: 'Test Project',
  ticker: null,
  description: null,
  avatar_url: null,
  banner_url: null,
  space_room_id: '!bound:blockwire.chat',
  owner_mxid: '@owner:blockwire.chat',
  status: 'active',
  owner_verification_state: 'unverified',
  created_at: new Date().toISOString(),
};

const baseAsset: ProjectChainAsset = {
  id: 7,
  project_id: 42,
  chain: 'solana',
  contract_address: 'Sol1',
  token_symbol: 'TEST',
  token_decimals: 9,
  verified_control_state: 'unverified',
  created_at: new Date().toISOString(),
};

describe('useProjectIdentity', () => {
  it('starts undefined (still checking), then resolves to null for an unbound space', async () => {
    fetchProjectBySpace.mockResolvedValue(null);
    const { result } = renderHook(() => useProjectIdentity('!plain:blockwire.chat'));
    expect(result.current.project).toBeUndefined();
    await waitFor(() => expect(result.current.project).toBeNull());
    expect(fetchChainAssets).not.toHaveBeenCalled();
    expect(fetchProjectLinks).not.toHaveBeenCalled();
  });

  it('resolves to the project and defaults selectedAssetId to the first chain asset', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      baseAsset,
      { ...baseAsset, id: 9, token_symbol: 'SECOND' },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    const { result } = renderHook(() => useProjectIdentity('!bound:blockwire.chat'));
    await waitFor(() => expect(result.current.project).toEqual(baseProject));
    expect(result.current.selectedAssetId).toBe(7);
    expect(result.current.selectedAsset?.token_symbol).toBe('TEST');
  });

  it('setSelectedAssetId switches which asset is selected', async () => {
    fetchProjectBySpace.mockResolvedValue(baseProject);
    fetchChainAssets.mockResolvedValue([
      baseAsset,
      { ...baseAsset, id: 9, token_symbol: 'SECOND' },
    ]);
    fetchProjectLinks.mockResolvedValue([]);

    const { result } = renderHook(() => useProjectIdentity('!bound:blockwire.chat'));
    await waitFor(() => expect(result.current.selectedAssetId).toBe(7));

    act(() => result.current.setSelectedAssetId(9));
    expect(result.current.selectedAssetId).toBe(9);
    expect(result.current.selectedAsset?.token_symbol).toBe('SECOND');
  });

  it('treats a fetch failure the same as "no project" rather than throwing', async () => {
    fetchProjectBySpace.mockRejectedValue(new Error('network blip'));
    const { result } = renderHook(() => useProjectIdentity('!flaky:blockwire.chat'));
    await waitFor(() => expect(result.current.project).toBeNull());
  });

  it('re-fetches and resets state when spaceRoomId changes', async () => {
    fetchProjectBySpace.mockResolvedValueOnce(baseProject).mockResolvedValueOnce(null);
    fetchChainAssets.mockResolvedValue([baseAsset]);
    fetchProjectLinks.mockResolvedValue([]);

    const { result, rerender } = renderHook(({ spaceRoomId }) => useProjectIdentity(spaceRoomId), {
      initialProps: { spaceRoomId: '!first:blockwire.chat' },
    });
    await waitFor(() => expect(result.current.project).toEqual(baseProject));

    rerender({ spaceRoomId: '!second:blockwire.chat' });
    await waitFor(() => expect(result.current.project).toBeNull());
    expect(result.current.selectedAssetId).toBeNull();
    expect(result.current.chainAssets).toEqual([]);
  });
});
