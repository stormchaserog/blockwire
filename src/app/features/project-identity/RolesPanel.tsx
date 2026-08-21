import type { FormEventHandler } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Box, Text, color, config, Input } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAlive } from '$hooks/useAlive';
import { fetchRoles, createRole, deleteRole, type RoleRecord } from '$utils/blockwire/projects';
import { Button } from '$components/button';
import { Warning, Trash, Shield, sizedIcon } from '$components/icons/phosphor';
import { RolePermissionsEditor } from './RolePermissionsEditor';

type RolesPanelProps = {
  projectId: number;
};

/** PRD §20 ("projects can define custom role names") /
 *  §11_PRODUCT_ROLES_PERMISSIONS.md. createRole()/fetchRoles()/deleteRole()
 *  and the full permission-assignment API (setRolePermissions,
 *  grantMemberRole/revokeMemberRole) were built and tested on the backend
 *  months ago -- same "built the API, never built the form" pattern as
 *  chain-assets/links had before this session. This closes the first half
 *  of that gap: creating and naming roles. Assigning permissions to a role
 *  and assigning a role to a member are real, separate follow-up work
 *  (setRolePermissions/grantMemberRole exist and are untouched) -- scoping
 *  this pass to role CRUD only rather than half-building a bigger surface
 *  in one sitting. */
export function RolesPanel({ projectId }: RolesPanelProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [roles, setRoles] = useState<RoleRecord[] | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [editingRole, setEditingRole] = useState<RoleRecord | undefined>(undefined);

  const loadRoles = useCallback(() => {
    setRoles(undefined);
    setLoadError(undefined);
    fetchRoles(mx, projectId)
      .then((result) => {
        if (alive()) setRoles(result);
      })
      .catch((err: Error) => {
        if (alive()) {
          setRoles([]);
          setLoadError(err.message);
        }
      });
  }, [mx, projectId, alive]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const [createState, create] = useAsyncCallback<RoleRecord, Error, [{ name: string }]>(
    useCallback((data) => createRole(mx, projectId, { name: data.name }), [mx, projectId])
  );

  const [deleteState, remove] = useAsyncCallback<void, Error, [number]>(
    useCallback((roleId) => deleteRole(mx, projectId, roleId), [mx, projectId])
  );

  const creating = createState.status === AsyncStatus.Loading;
  const createError = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const deleting = deleteState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (creating) return;
    const form = evt.currentTarget;
    const nameInput = form.roleNameInput as HTMLInputElement | undefined;
    const name = nameInput?.value.trim();
    if (!name || !nameInput) return;

    create({ name }).then((role) => {
      if (alive() && role) {
        nameInput.value = '';
        loadRoles();
      }
    });
  };

  const handleDelete = (roleId: number) => {
    remove(roleId).then(() => {
      if (alive()) loadRoles();
    });
  };

  return (
    <Box
      direction="Column"
      gap="300"
      style={{
        border: `1px solid ${color.Surface.ContainerLine}`,
        borderRadius: config.radii.R400,
        padding: config.space.S400,
      }}
    >
      <Text size="H6">Roles</Text>

      {roles === undefined && <Text size="T300">Loading roles…</Text>}
      {loadError && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          {sizedIcon(Warning, '100', { filled: true })}
          <Text size="T300" style={{ color: color.Critical.Main }}>
            {loadError}
          </Text>
        </Box>
      )}
      {roles && roles.length === 0 && !loadError && <Text size="T300">No custom roles yet.</Text>}
      {roles && roles.length > 0 && (
        <Box direction="Column" gap="100">
          {roles.map((role) => (
            <Box key={role.role_id} direction="Column" gap="100">
              <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Text size="T300">{role.name}</Text>
                <Box gap="100">
                  <Button
                    type="button"
                    size="300"
                    variant="Secondary"
                    fill="Soft"
                    radii="400"
                    onClick={() =>
                      setEditingRole((prev) => (prev?.role_id === role.role_id ? undefined : role))
                    }
                  >
                    {sizedIcon(Shield, '50')}
                  </Button>
                  <Button
                    type="button"
                    size="300"
                    variant="Critical"
                    fill="Soft"
                    radii="400"
                    disabled={deleting}
                    onClick={() => handleDelete(role.role_id)}
                  >
                    {sizedIcon(Trash, '50')}
                  </Button>
                </Box>
              </Box>
              {editingRole?.role_id === role.role_id && (
                <RolePermissionsEditor
                  projectId={projectId}
                  role={role}
                  onClose={() => setEditingRole(undefined)}
                />
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box as="form" onSubmit={handleSubmit} direction="Column" gap="200">
        <Input
          required
          name="roleNameInput"
          size="400"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={creating}
          placeholder="e.g. Social Manager"
        />
        {createError && (
          <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
            {sizedIcon(Warning, '100', { filled: true })}
            <Text size="T300" style={{ color: color.Critical.Main }}>
              <b>{createError.message}</b>
            </Text>
          </Box>
        )}
        <Box>
          <Button type="submit" size="400" variant="Primary" radii="400" loading={creating}>
            <Text size="B400">Add Role</Text>
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
