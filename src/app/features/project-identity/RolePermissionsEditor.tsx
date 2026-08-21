import { useCallback, useEffect, useState } from 'react';
import { Box, Text, color, config, Checkbox } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAlive } from '$hooks/useAlive';
import {
  fetchPlatformPermissions,
  fetchRolePermissions,
  setRolePermissions,
  type PlatformPermission,
  type RoleRecord,
} from '$utils/blockwire/projects';
import { Button } from '$components/button';
import { Warning, sizedIcon } from '$components/icons/phosphor';

type RolePermissionsEditorProps = {
  projectId: number;
  role: RoleRecord;
  onClose: () => void;
};

/** The checkbox UI setRolePermissions()/fetchRolePermissions() (the GET
 *  endpoint added alongside this) were waiting for -- lists every real
 *  platform permission key (project.edit, social.manage, moderation.act,
 *  etc -- 19 exist server-side today, most of them the exact permissions
 *  the still-unbuilt Hub cards like Social Command Center and Moderation
 *  Queue will eventually gate on) and lets an authorized user check/uncheck
 *  which ones a role grants. Loads the role's CURRENT permissions from the
 *  server to pre-check the boxes -- never assumes a role starts empty,
 *  since it may already have permissions set from a prior session or from
 *  another admin. */
export function RolePermissionsEditor({ projectId, role, onClose }: RolePermissionsEditorProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [allPermissions, setAllPermissions] = useState<PlatformPermission[] | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAllPermissions(undefined);
    setSelectedKeys(undefined);
    setLoadError(undefined);
    Promise.all([fetchPlatformPermissions(mx), fetchRolePermissions(mx, projectId, role.role_id)])
      .then(([platformPermissions, currentKeys]) => {
        if (!alive()) return;
        setAllPermissions(platformPermissions);
        setSelectedKeys(new Set(currentKeys));
      })
      .catch((err: Error) => {
        if (alive()) {
          setAllPermissions([]);
          setSelectedKeys(new Set());
          setLoadError(err.message);
        }
      });
  }, [mx, projectId, role.role_id, alive]);

  const [saveState, save] = useAsyncCallback<void, Error, [string[]]>(
    useCallback(
      (permissionKeys) => setRolePermissions(mx, projectId, role.role_id, permissionKeys),
      [mx, projectId, role.role_id]
    )
  );

  const saving = saveState.status === AsyncStatus.Loading;
  const saveError = saveState.status === AsyncStatus.Error ? saveState.error : undefined;

  // setRolePermissions() returns void, so useAsyncCallback's resolved value
  // can't distinguish success from failure (it resolves undefined either
  // way -- it never rejects, by design, see useAsyncCallback.ts). Only
  // close on a confirmed Success status, not on promise resolution.
  useEffect(() => {
    if (saveState.status === AsyncStatus.Success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState.status]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedKeys) return;
    save(Array.from(selectedKeys));
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
      <Text size="H6">Permissions for {role.name}</Text>

      {allPermissions === undefined && <Text size="T300">Loading permissions…</Text>}
      {loadError && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          {sizedIcon(Warning, '100', { filled: true })}
          <Text size="T300" style={{ color: color.Critical.Main }}>
            {loadError}
          </Text>
        </Box>
      )}

      {allPermissions && selectedKeys && (
        <Box direction="Column" gap="200">
          {allPermissions.map((permission) => (
            <Box key={permission.permission_key} alignItems="Center" gap="200">
              <Checkbox
                variant="Primary"
                checked={selectedKeys.has(permission.permission_key)}
                onClick={() => toggleKey(permission.permission_key)}
              />
              <Box direction="Column" gap="0">
                <Text size="T300">{permission.permission_key}</Text>
                <Text size="T200" style={{ color: color.Surface.OnContainer }}>
                  {permission.description}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {saveError && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          {sizedIcon(Warning, '100', { filled: true })}
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>{saveError.message}</b>
          </Text>
        </Box>
      )}

      <Box gap="200">
        <Button
          type="button"
          size="400"
          variant="Primary"
          radii="400"
          loading={saving}
          disabled={!selectedKeys}
          onClick={handleSave}
        >
          <Text size="B400">Save</Text>
        </Button>
        <Button type="button" size="400" variant="Secondary" radii="400" onClick={onClose}>
          <Text size="B400">Cancel</Text>
        </Button>
      </Box>
    </Box>
  );
}
