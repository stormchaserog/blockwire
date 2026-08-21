import { useEffect, useState } from 'react';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { fetchMyProjectPermissions, type MyProjectPermissions } from '$utils/blockwire/projects';

export type UseMyProjectPermissionsResult = {
  /** undefined = still checking, null = checked and failed (network error,
   *  or the caller genuinely has no relationship to this project),
   *  MyProjectPermissions = the real, server-issued answer. */
  permissions: MyProjectPermissions | null | undefined;
  /** True once permissions is resolved (found OR null) and the caller
   *  either owns the project or holds the given permission key. Owners
   *  implicitly have every permission per the server's own model
   *  (MyProjectPermissions.isOwner) -- mirrored here rather than
   *  re-derived, since the server is the one source of truth per
   *  CLAUDE.md's "never trust client-provided role or entitlement
   *  claims" rule applied to the client's own logic too. */
  has: (permissionKey: string) => boolean;
};

/** THE hook UI should use to gate any project-management action --
 *  wraps fetchMyProjectPermissions(), which is itself documented as "THE
 *  permission check the UI should gate on, never a local role/owner
 *  guess." Earlier project-management surfaces (ManageProjectPanel, the
 *  Project Hub) shipped gated on a Matrix power-level proxy instead,
 *  before this hook existed -- that was a reasonable stopgap (power
 *  levels are real Matrix state, not a total guess) but is being
 *  replaced by this, the actually-intended mechanism, as each surface
 *  gets touched. */
export function useMyProjectPermissions(
  projectId: number | undefined
): UseMyProjectPermissionsResult {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [permissions, setPermissions] = useState<MyProjectPermissions | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (projectId === undefined) {
      setPermissions(undefined);
      return;
    }
    setPermissions(undefined);
    fetchMyProjectPermissions(mx, projectId)
      .then((result) => {
        if (alive()) setPermissions(result);
      })
      .catch(() => {
        if (alive()) setPermissions(null);
      });
  }, [mx, projectId, alive]);

  const has = (permissionKey: string): boolean => {
    if (!permissions) return false;
    return permissions.isOwner || permissions.permissions.includes(permissionKey);
  };

  return { permissions, has };
}
