import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { RolesPanel } from './RolesPanel';
import type { RoleRecord } from '$utils/blockwire/projects';

const mockMatrixClient = {
  baseUrl: 'https://matrix.blockwire.chat',
  getAccessToken: () => 'test-token',
};

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => mockMatrixClient,
}));

const { fetchRoles, createRole, deleteRole } = vi.hoisted(() => ({
  fetchRoles: vi.fn<(mx: unknown, projectId: number) => Promise<RoleRecord[]>>(),
  createRole:
    vi.fn<(mx: unknown, projectId: number, params: { name: string }) => Promise<RoleRecord>>(),
  deleteRole: vi.fn<(mx: unknown, projectId: number, roleId: number) => Promise<void>>(),
}));

vi.mock('$utils/blockwire/projects', () => ({ fetchRoles, createRole, deleteRole }));

vi.mock('./RolePermissionsEditor', () => ({
  RolePermissionsEditor: ({ role }: { role: RoleRecord }) => (
    <div>permissions-editor-for-{role.name}</div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const roleA: RoleRecord = {
  role_id: 1,
  project_id: 42,
  name: 'Social Manager',
  system_key: null,
  created_at: new Date().toISOString(),
};
const roleB: RoleRecord = {
  role_id: 2,
  project_id: 42,
  name: 'Moderator',
  system_key: null,
  created_at: new Date().toISOString(),
};

// jsdom lacks named form-element properties (form.roleNameInput), which
// the component relies on in real browsers -- same documented workaround
// as SecretStorage.test.tsx / AddChainAssetForm.test.tsx.
const submitForm = (form: HTMLFormElement) => {
  form.querySelectorAll('input').forEach((input) => {
    Object.defineProperty(form, input.name, { value: input, configurable: true });
  });
  fireEvent.submit(form);
};

describe('RolesPanel', () => {
  it('shows a loading state, then an empty state when a project has no custom roles', async () => {
    fetchRoles.mockResolvedValue([]);
    render(<RolesPanel projectId={42} />);

    expect(screen.getByText('Loading roles…')).toBeInTheDocument();
    expect(await screen.findByText('No custom roles yet.')).toBeInTheDocument();
  });

  it('lists existing roles once loaded', async () => {
    fetchRoles.mockResolvedValue([roleA, roleB]);
    render(<RolesPanel projectId={42} />);

    expect(await screen.findByText('Social Manager')).toBeInTheDocument();
    expect(screen.getByText('Moderator')).toBeInTheDocument();
  });

  it('creates a role and refreshes the list to show it', async () => {
    fetchRoles.mockResolvedValueOnce([]).mockResolvedValueOnce([roleA]);
    createRole.mockResolvedValue(roleA);
    render(<RolesPanel projectId={42} />);

    await screen.findByText('No custom roles yet.');

    fireEvent.change(screen.getByPlaceholderText(/Social Manager/i), {
      target: { value: 'Social Manager' },
    });
    submitForm(screen.getByRole('button', { name: /add role/i }).closest('form')!);

    await waitFor(() =>
      expect(createRole).toHaveBeenCalledWith(mockMatrixClient, 42, { name: 'Social Manager' })
    );
    expect(await screen.findByText('Social Manager')).toBeInTheDocument();
    expect(fetchRoles).toHaveBeenCalledTimes(2);
  });

  it('surfaces a create-role server error instead of silently failing', async () => {
    fetchRoles.mockResolvedValue([]);
    createRole.mockRejectedValue(new Error('Could not create this role.'));
    render(<RolesPanel projectId={42} />);

    await screen.findByText('No custom roles yet.');
    fireEvent.change(screen.getByPlaceholderText(/Social Manager/i), {
      target: { value: 'anything' },
    });
    submitForm(screen.getByRole('button', { name: /add role/i }).closest('form')!);

    expect(await screen.findByText('Could not create this role.')).toBeInTheDocument();
  });

  it('deletes a role and refreshes the list', async () => {
    fetchRoles.mockResolvedValueOnce([roleA]).mockResolvedValueOnce([]);
    deleteRole.mockResolvedValue(undefined);
    render(<RolesPanel projectId={42} />);

    await screen.findByText('Social Manager');
    // Two icon-only buttons per role now (permissions toggle, then delete)
    // -- delete is the second one.
    fireEvent.click(screen.getAllByRole('button', { name: '' })[1]!);

    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith(mockMatrixClient, 42, 1));
    await waitFor(() => expect(screen.getByText('No custom roles yet.')).toBeInTheDocument());
  });

  it('surfaces a load error rather than pretending the project has zero roles', async () => {
    fetchRoles.mockRejectedValue(new Error('Could not load roles for this project.'));
    render(<RolesPanel projectId={42} />);

    expect(await screen.findByText('Could not load roles for this project.')).toBeInTheDocument();
  });

  it('opens the permissions editor for a role when its shield button is clicked', async () => {
    fetchRoles.mockResolvedValue([roleA, roleB]);
    render(<RolesPanel projectId={42} />);

    await screen.findByText('Social Manager');
    // First icon-only button on Social Manager's row is the permissions toggle.
    fireEvent.click(screen.getAllByRole('button', { name: '' })[0]!);

    expect(await screen.findByText('permissions-editor-for-Social Manager')).toBeInTheDocument();
    expect(screen.queryByText('permissions-editor-for-Moderator')).not.toBeInTheDocument();
  });

  it('closes an open permissions editor when its shield button is clicked again', async () => {
    fetchRoles.mockResolvedValue([roleA]);
    render(<RolesPanel projectId={42} />);

    await screen.findByText('Social Manager');
    const shieldButton = screen.getAllByRole('button', { name: '' })[0]!;
    fireEvent.click(shieldButton);
    await screen.findByText('permissions-editor-for-Social Manager');

    fireEvent.click(shieldButton);
    expect(screen.queryByText('permissions-editor-for-Social Manager')).not.toBeInTheDocument();
  });

  it("only ever shows one role's permissions editor open at a time", async () => {
    fetchRoles.mockResolvedValue([roleA, roleB]);
    render(<RolesPanel projectId={42} />);

    await screen.findByText('Social Manager');
    const [socialManagerShield, , moderatorShield] = screen.getAllByRole('button', { name: '' });
    fireEvent.click(socialManagerShield!);
    await screen.findByText('permissions-editor-for-Social Manager');

    fireEvent.click(moderatorShield!);
    expect(await screen.findByText('permissions-editor-for-Moderator')).toBeInTheDocument();
    expect(screen.queryByText('permissions-editor-for-Social Manager')).not.toBeInTheDocument();
  });
});
