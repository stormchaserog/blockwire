import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMatrixClient } from '$hooks/useMatrixClient';
import {
  type DirectoryUser,
  homeServerOf,
  matchesTerm,
  mergeDirectoryResults,
} from '$utils/userSearch';

const DEBOUNCE_MS = 250;
const LIMIT = 30;

/** Search for people, actually asking the server.
 *
 *  The client used to filter the list of people you had already messaged,
 *  which meant a new account could never be found by anyone — the thing you
 *  need search for most is precisely the person you have not talked to yet.
 *
 *  Local matches still come first because they are instant and usually right;
 *  the directory fills in everyone else. Requests are debounced, and a slow
 *  response for an old query is discarded rather than overwriting a newer one
 *  — typing fast must not make results flicker backwards.
 */
export const useUserDirectorySearch = (knownUsers: DirectoryUser[] = []) => {
  const mx = useMatrixClient();
  const [term, setTerm] = useState('');
  const [remote, setRemote] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const homeServer = homeServerOf(mx.getUserId());

  useEffect(() => {
    const query = term.trim().replace(/^@/, '');
    if (!query) {
      setRemote([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    requestId.current += 1;
    const id = requestId.current;

    const timer = setTimeout(() => {
      mx.searchUserDirectory({ term: query, limit: LIMIT })
        .then((res) => {
          // A stale response must not clobber a newer query's results.
          if (id !== requestId.current) return;
          setRemote(
            res.results.map((user) => ({
              userId: user.user_id,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
            }))
          );
          setLoading(false);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          // A directory that is off or erroring must not break the input —
          // local matches and typing a full id both still work.
          setRemote([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, mx]);

  const results = useMemo(() => {
    if (!term.trim()) return [];
    const local = knownUsers.filter((user) => matchesTerm(user, term));
    return mergeDirectoryResults(local, remote, LIMIT);
  }, [knownUsers, remote, term]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setTerm('');
    setRemote([]);
    setLoading(false);
  }, []);

  return { term, search: setTerm, reset, results, loading, homeServer };
};
