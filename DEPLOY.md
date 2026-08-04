# Deploying the BlockWire client

Static build on Vercel at **blockwire.chat**. The homeserver is separate
(`matrix.blockwire.chat`, see `blockwire-infra`).

## Build and deploy

```bash
export PATH="$HOME/homebrew/opt/node@24/bin:$PATH"   # needs Node 24
npm install --legacy-peer-deps                       # see note below
npm run build

cp vercel.json dist/
cp -r public/.well-known dist/

cd dist
rm -rf .vercel
vercel link --project blockwire --yes                # REQUIRED after every build
vercel deploy --prod --yes
vercel alias set <deployment-url> blockwire.chat     # REQUIRED, see below
```

## Three traps, each of which cost a broken deploy

**Rebuilding wipes `dist/.vercel`.** Deploying without relinking creates a
*brand new Vercel project named after the directory* — one deploy silently went
to a project called `dist` while blockwire.chat kept serving the old build.
Always `vercel link --project blockwire` after a build.

**`--prod` does not move the domain.** Because the domain was once aliased by
hand, production deploys no longer auto-assign it. Every deploy needs an
explicit `vercel alias set`, or the site serves the previous build with no
error anywhere.

**The build emits `dist/public/`, which hijacks the output directory.** Vercel's
project setting is "`public` if it exists, or `.`", so it served `dist/public/`
— which has no `index.html` — and *every route on the site 404'd*, including
the Matrix delegation files. `vercel.json` pins `"outputDirectory": "."` to
stop this. Do not remove it.

## Other notes

- **`--legacy-peer-deps` is required**: `folds@2.7.1` pins an older
  `@vanilla-extract/css` than the root project. Consequence: a couple of
  pre-existing typecheck errors in `GenericWidgetDriver.ts` from a
  `matrix-widget-api` version skew. Vite does not typecheck, so builds are
  unaffected.
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
  clients lose the server.
