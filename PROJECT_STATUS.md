# BlockWire project status

Metadata verified at `2026-09-24T02:01:54.398875+00:00`. Maintainer: `stormchaserog`.

## Verified source and deployment baseline

| Item                                      | Observation                                         |
| ----------------------------------------- | --------------------------------------------------- |
| Canonical source                          | `stormchaserog/blockwire` (public)                  |
| Default / Vercel production branch        | `dev`                                               |
| Source head at observation                | `142a4f9510e35e80eade591f12a3a1c7517da687`          |
| Vercel project / root                     | `blockwire` / repository root                       |
| Output directory in source                | `dist`                                              |
| Branch protection reported                | `dev`: true                                         |
| Open PRs before this documentation change | 18, including dependency updates and release PR #37 |

| Domain           | Serving commit                             | State |
| ---------------- | ------------------------------------------ | ----- |
| `blockwire.chat` | `142a4f9510e35e80eade591f12a3a1c7517da687` | READY |

The Vercel custom-domain assignment was resolved to the serving deployment; the source commit matches the observed `dev` head. Internal deployment/account identifiers and backend operational details are intentionally kept out of this public document. Operators must record the exact serving deployment in the private release record before a cutover.

This pass verified metadata and source relationships, not authenticated member journeys, bot behavior, device push, calls, native builds, or backend health. READY does not prove those behaviors work.

## Existing implementation and historical evidence

The source includes the messaging client, bot interaction UI, push integration, service-worker update handling, and Tauri project. [STATUS.md](STATUS.md) records tests and caveats as of 2026-08-06. Its statements about what was live are historical observations and were not rerun in this pass.

## Outstanding verification and cleanup

1. Reconcile the historical push, real-app bot-button, and native iOS follow-ups against current device/runtime evidence.
2. Review dependency PRs and release PR #37 individually; do not merge them merely to clean up the branch list.
3. Verify custom-domain assignment on every release. [DEPLOY.md](DEPLOY.md) records that a production deploy alone may leave the domain on an older build.
4. Review the accidental legacy `dist` Vercel project and the unlinked `blockwire-app` project for retirement only after checking their consumers. Neither should become a second canonical source repository.
5. Keep private service repos independent and document any changed API contracts with their owners.

## Next step and rollback boundary

Land the reviewed documentation baseline without changing production configuration. For the next authorized release, refresh the private serving-deployment record, validate the intended build, and keep the previous compatible deployment available. Confirm a fresh browser receives the intended assets and delegation responses after changing the domain assignment. Roll back the client only when compatible with the running services; backend state and native releases are separate.
