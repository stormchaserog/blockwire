# Deploying the BlockWire client

Static build on Vercel at **blockwire.chat**. The homeserver is separate
(`matrix.blockwire.chat`, see `blockwire-infra`).

## Deploying

**Push to `dev`. Vercel builds from the repository and deploys.** The Git
integration runs `vercel build` at the repo root, which is why `vercel.json`
pins `"outputDirectory": "dist"` and why the delegation files are copied into
`dist/` by `vite.config.ts` rather than by hand.

blockwire.chat does **not** move on its own — see the note below — so a release
still ends with an explicit alias:

```bash
vercel alias set <deployment-url> blockwire.chat
```

### Building it yourself

Only needed to reproduce a Vercel build locally or to ship without pushing:

```bash
export PATH="$HOME/homebrew/bin:$HOME/homebrew/opt/node@24/bin:$PATH"
npm install --legacy-peer-deps          # see note below
vercel link --project blockwire --yes   # from the repo root, NOT from dist/
vercel build                            # writes .vercel/output/
vercel deploy --prebuilt --prod --yes
vercel alias set <deployment-url> blockwire.chat
```

Check `.vercel/output/static/` before deploying. It must contain `assets/`,
`.well-known/matrix/*.json`, and an `index.html` referencing `assets/index-*.js`.
If it instead contains `src/`, `docs/` and a `Dockerfile`, the output directory
is resolving to the repo root and the deploy would serve the source tree.

## Four traps, each of which cost a broken deploy

**Never redirect `/index.html` to `/`.** This one froze the shipped app for
days. The service worker precaches `index.html`; precaching stores responses
with `Cache.put()`, and `Cache.put()` REJECTS any response that was redirected.
So a 307 there made every new build's worker fail to install and be discarded
— leaving installed apps pinned to whichever build predated the redirect, with
no update banner, no effect from force-quitting, and `registration.update()`
cheerfully reporting nothing to do because the replacement worker died before
it could reach `waiting`. Symptom to recognise: a worker that goes
`installing -> redundant`. `/index.html` is already handled by the inline boot
guard in `index.html`, which rewrites it before the router runs; the edge
redirect was belt-and-braces on top of a fix that already worked.

**Rebuilding wipes `dist/.vercel`.** Deploying without relinking creates a
_brand new Vercel project named after the directory_ — one deploy silently went
to a project called `dist` while blockwire.chat kept serving the old build.
Always `vercel link --project blockwire` after a build.

**`--prod` does not move the domain.** Because the domain was once aliased by
hand, production deploys no longer auto-assign it. Every deploy needs an
explicit `vercel alias set`, or the site serves the previous build with no
error anywhere.

**`outputDirectory` means different things from different directories.** The
build emits `dist/public/`, and Vercel's default is "`public` if it exists,
otherwise `.`" — so it once served `dist/public/`, which has no `index.html`,
and _every route 404'd_, delegation files included. That was pinned away with
`"outputDirectory": "."`, correct for the old ritual of deploying from **inside**
`dist/`.

Connecting the Git integration made that pin actively dangerous: a Git build
runs from the **repo root**, where `.` is the source tree. Such a deploy serves
the unbuilt `index.html`, no `assets/`, no `.well-known/` — a white screen and
dead Matrix delegation, with the repo's own `docs/` and `Dockerfile` published
on the product domain. It is now `"outputDirectory": "dist"`, which is correct
from the repo root. **Do not deploy from inside `dist/` any more** — that would
make Vercel look for `dist/dist`.

## Other notes

- **`--legacy-peer-deps` is required**: `folds@2.7.1` pins an older
  `@vanilla-extract/css` than the root project. Note that npm does not install
  peer dependencies under that flag, which is how `@testing-library/dom` went
  missing and took a third of the test suite with it.
- **There are two lockfiles and they must move together.** CI and Vercel install
  with `pnpm --frozen-lockfile`; the commands above use npm. A change to
  `package.json` that updates only one lockfile fails every branch at the
  install step, with errors that look like they come from the code.
- **The service worker precaches aggressively.** After deploying, a browser can
  keep serving the previous build. To verify a deploy, unregister the service
  worker and clear caches, or test in a fresh profile — otherwise you will
  "confirm" a change that never shipped.
- **Branding lives in `config.json`** (`productName`, `homeserverList`,
  `pushNotificationDetails`). Several UI strings hardcoded the upstream brand;
  they now read the `SABLE_PRODUCT_NAME` build constant, which is fed from
  `productName`. If new upstream code reintroduces a literal, fix it the same way.
- **Delegation files are load-bearing.** `public/.well-known/matrix/{client,server}.json`
  tell every client where the homeserver is. If they stop being served, all
  clients lose the server and `rtc_foci` disappears, so calls break too. They
  used to be carried into `dist/` by a manual `cp` in this file, which meant any
  build that was not that exact ritual shipped without them. `vite.config.ts`
  now copies them as part of the build (`publicDir` is `false`, so anything
  under `public/` must be listed in `copyFiles` explicitly).
