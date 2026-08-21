import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { RolePermissionsEditor } from './RolePermissionsEditor';
import type { PlatformPermission, RoleRecord } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchPlatformPermissions, fetchRolePermissions, setRolePermissions } = vi.hoisted(() => ({
  fetchPlatformPermissions: vi.fn<(mx: unknown) => Promise<PlatformPermission[]>>(),
  fetchRolePermissions:
    vi.fn<(mx: unknown, projectId: number, roleId: number) => Promise<string[]>>(),
  setRolePermissions:
    vi.fn<(mx: unknown, projectId: number, roleId: number, keys: string[]) => Promise<void>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({
  fetchPlatformPermissions,
  fetchRolePermissions,
  setRolePermissions,
}));

afterEach(() => {
  vi.clearAllMocks();
});

const role: RoleRecord = {
  role_id: 1,
  project_id: 42,
  name: 'Social Manager',
  system_key: null,
  created_at: new Date().toISOString(),
};

const allPermissions: PlatformPermission[] = [
  { permission_key: 'social.connect', description: 'Connect official social accounts' },
  { permission_key: 'social.manage', description: 'Manage Social Command Center' },
  { permission_key: 'project.edit', description: 'Edit project identity, links, chain assets' },
];

describe('RolePermissionsEditor', () => {
  it('shows a loading state before both fetches resolve', () => {
    fetchPlatformPermissions.mockReturnValue(new Promise(() => {}));
    fetchRolePermissions.mockReturnValue(new Promise(() => {}));
    render(<RolePermissionsEditor projectId={42} role={role} onClose={vi.fn<() => void>()} />);
    expect(screen.getByText('Loading permissions…')).toBeInTheDocument();
  });

  it("pre-checks the boxes for the role's CURRENT permissions -- never assumes a role starts empty", async () => {
    fetchPlatformPermissions.mockResolvedValue(allPermissions);
    fetchRolePermissions.mockResolvedValue(['social.connect']);
    render(<RolePermissionsEditor projectId={42} role={role} onClose={vi.fn<() => void>()} />);

    await screen.findByText('social.connect');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
    expect(screen.getAllByRole('checkbox')[2]).not.toBeChecked();
  });

  it('toggling a checkbox and saving calls setRolePermissions with the updated key set', async () => {
    fetchPlatformPermissions.mockResolvedValue(allPermissions);
    fetchRolePermissions.mockResolvedValue(['social.connect']);
    setRolePermissions.mockResolvedValue(undefined);
    const onClose = vi.fn<() => void>();
    render(<RolePermissionsEditor projectId={42} role={role} onClose={onClose} />);

    await screen.findByText('social.connect');
    fireEvent.click(screen.getAllByRole('checkbox')[1]!); // social.manage
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(setRolePermissions).toHaveBeenCalled());
    const [, , , savedKeys] = setRolePermissions.mock.calls[0]!;
    expect(new Set(savedKeys)).toEqual(new Set(['social.connect', 'social.manage']));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('unchecking an already-granted permission removes it from what gets saved', async () => {
    fetchPlatformPermissions.mockResolvedValue(allPermissions);
    fetchRolePermissions.mockResolvedValue(['social.connect', 'social.manage']);
    setRolePermissions.mockResolvedValue(undefined);
    render(<RolePermissionsEditor projectId={42} role={role} onClose={vi.fn<() => void>()} />);

    await screen.findByText('social.connect');
    fireEvent.click(screen.getAllByRole('checkbox')[0]!); // uncheck social.connect
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(setRolePermissions).toHaveBeenCalled());
    const [, , , savedKeys] = setRolePermissions.mock.calls[0]!;
    expect(savedKeys).toEqual(['social.manage']);
  });

  it('surfaces a save error instead of silently failing or closing', async () => {
    fetchPlatformPermissions.mockResolvedValue(allPermissions);
    fetchRolePermissions.mockResolvedValue([]);
    setRolePermissions.mockRejectedValue(new Error("Could not update this role's permissions."));
    const onClose = vi.fn<() => void>();
    render(<RolePermissionsEditor projectId={42} role={role} onClose={onClose} />);

    await screen.findByText('social.connect');
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(
      await screen.findByText("Could not update this role's permissions.")
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('surfaces a load error instead of pretending the role has zero permissions', async () => {
    fetchPlatformPermissions.mockRejectedValue(
      new Error("Could not load this role's permissions.")
    );
    fetchRolePermissions.mockRejectedValue(new Error("Could not load this role's permissions."));
    render(<RolePermissionsEditor projectId={42} role={role} onClose={vi.fn<() => void>()} />);

    expect(await screen.findByText("Could not load this role's permissions.")).toBeInTheDocument();
  });

  it('calls onClose without saving when Cancel is clicked', async () => {
    fetchPlatformPermissions.mockResolvedValue(allPermissions);
    fetchRolePermissions.mockResolvedValue([]);
    const onClose = vi.fn<() => void>();
    render(<RolePermissionsEditor projectId={42} role={role} onClose={onClose} />);

    await screen.findByText('social.connect');
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(setRolePermissions).not.toHaveBeenCalled();
  });
});
