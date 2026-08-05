// Guards the inline boot script in index.html: stale-launch-URL
// normalisation and share-link resolution. Run against a build:
//   npm run build && node test/boot-guard.test.mjs
//
// This is the counterpart to src/app/plugins/blockwire-link.ts — that module
// builds the links, this script has to take them apart again. Every shape one
// produces must appear here, or a shared link silently lands on the home
// screen instead of the thing it names.
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const m = html.match(/\(function \(\) \{[\s\S]*?\}\)\(\);/);
if (!m) { console.log('GUARD NOT FOUND'); process.exit(1); }
const guard = m[0];

const run = (url) => {
  const u = new URL(url);
  let result = u.pathname + u.search + u.hash;
  const window = {
    location: { pathname: u.pathname, search: u.search, hash: u.hash },
    history: { replaceState: (_a, _b, to) => { result = to; } },
  };
  new Function('window', guard)(window);
  return result;
};

const cases = [
  // --- BlockWire short links: what copy-link and share produce today -------
  ['https://blockwire.chat/degens', '/home/%23degens%3Ablockwire.chat/'],
  ['https://blockwire.chat/@stephen', '/direct/create?userId=%40stephen%3Ablockwire.chat'],
  ['https://blockwire.chat/degens/$abc', '/home/%23degens%3Ablockwire.chat/$abc/'],
  ['https://blockwire.chat/degens?via=blockwire.chat', '/home/%23degens%3Ablockwire.chat/?via=blockwire.chat'],
  // a foreign account keeps its server
  ['https://blockwire.chat/@bob:other.example', '/direct/create?userId=%40bob%3Aother.example'],
  // long form, for a room with no published address
  ['https://blockwire.chat/room/!weOKVBoq%3Ablockwire.chat?via=blockwire.chat', '/home/!weOKVBoq%3Ablockwire.chat/?via=blockwire.chat'],

  // --- Invite links are resolved by a route, not here ---------------------
  ['https://blockwire.chat/+7Fk2xQwe', '/invite/7Fk2xQwe'],
  ['https://blockwire.chat/invite/7Fk2xQwe', '/invite/7Fk2xQwe'],

  // --- Older / cross-client permalinks still have to work -----------------
  ['https://blockwire.chat/#/@stephen:blockwire.chat', '/direct/create?userId=%40stephen%3Ablockwire.chat'],
  ['https://blockwire.chat/#/%23news:blockwire.chat', '/home/%23news%3Ablockwire.chat/'],
  ['https://blockwire.chat/#/!weOKVBoq:blockwire.chat?via=blockwire.chat', '/home/!weOKVBoq%3Ablockwire.chat/?via=blockwire.chat'],

  // --- The app's own pages must never be swallowed ------------------------
  ['https://blockwire.chat/', '/'],
  ['https://blockwire.chat/home/', '/home/'],
  ['https://blockwire.chat/settings/', '/settings/'],
  ['https://blockwire.chat/settings/devices', '/settings/devices'],
  ['https://blockwire.chat/inbox/invites', '/inbox/invites'],
  ['https://blockwire.chat/direct/create?userId=%40a%3Ab', '/direct/create?userId=%40a%3Ab'],
  ['https://blockwire.chat/explore/blockwire.chat', '/explore/blockwire.chat'],
  ['https://blockwire.chat/login/', '/login/'],
  ['https://blockwire.chat/register/', '/register/'],
  ['https://blockwire.chat/navigate', '/navigate'],
  // The AGPL source offer must stay reachable — a room named "source" cannot
  // be allowed to shadow the page that discharges a licence obligation.
  ['https://blockwire.chat/source', '/source'],
  ['https://blockwire.chat/profile/', '/profile/'],
  ['https://blockwire.chat/create-room', '/create-room'],
  // reloading while inside a space must stay inside that space
  ['https://blockwire.chat/!spaceid%3Ablockwire.chat/', '/!spaceid%3Ablockwire.chat/'],
  ['https://blockwire.chat/!spaceid%3Ablockwire.chat/lobby/', '/!spaceid%3Ablockwire.chat/lobby/'],

  // --- The stale Home Screen icon ----------------------------------------
  ['https://blockwire.chat/index.html', '/'],
];

let fail = 0;
for (const [input, expected] of cases) {
  let got;
  try {
    got = run(input);
  } catch (e) {
    got = `THREW ${e.message}`;
  }
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${input}\n      -> ${got}${ok ? '' : `\n      expected ${expected}`}`);
}
console.log(`\n${cases.length - fail}/${cases.length} passed`);
process.exit(fail ? 1 : 0);
