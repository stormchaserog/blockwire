import { useEffect, useState } from 'react';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { fetchMyProjects, type ProjectRecord } from '$utils/blockwire/projects';

/** UI Bible §7: "Home is role-aware" -- Community Member Home vs Founder
 *  and Team Home. The real, server-issued signal for "does this person
 *  need Founder Home" is whether they own at least one project --
 *  fetchMyProjects() calls GET /_blockwire/projects/mine, which the
 *  backend implements as listProjectsByOwner(mxid) (blockwire-botgw's
 *  projects.ts) -- never a locally-guessed role, matching CLAUDE.md's
 *  "never trust client-provided role or entitlement claims" applied to
 *  the client's own logic. This only distinguishes project OWNERS today;
 *  broader role-based detection (Developer/Moderator/Social Manager roles
 *  granted on someone else's project, per §20) is real, separate,
 *  unbuilt follow-up work, not folded in here to avoid shipping a bigger,
 *  harder-to-verify surface in one pass. */
export type UseMyOwnedProjectsResult = {
  /** undefined = still checking, null = checked and failed (treated the
   *  same as "no owned projects" for the purpose of picking a Home
   *  variant -- a network hiccup should never silently promote someone
   *  to Founder Home, or worse, silently drop a founder to Community
   *  Home), ProjectRecord[] = the real, server-issued list. */
  ownedProjects: ProjectRecord[] | null | undefined;
  isFounder: boolean;
};

export function useMyOwnedProjects(): UseMyOwnedProjectsResult {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [ownedProjects, setOwnedProjects] = useState<ProjectRecord[] | null | undefined>(undefined);

  useEffect(() => {
    setOwnedProjects(undefined);
    fetchMyProjects(mx)
      .then((projects) => {
        if (alive()) setOwnedProjects(projects);
      })
      .catch(() => {
        if (alive()) setOwnedProjects(null);
      });
  }, [mx, alive]);

  return {
    ownedProjects,
    isFounder: !!ownedProjects && ownedProjects.length > 0,
  };
}
