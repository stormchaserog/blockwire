// Guards the inline boot script in index.html: stale-launch-URL
// normalisation and shared-permalink resolution. Run against a build:
//   npm run build && node test/boot-guard.test.mjs
// Extract the boot guard from the built index.html and exercise it against the
// link shapes the app actually produces.
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
  // what copy-link / share now produce
  ['https://blockwire.chat/#/@stephen:blockwire.chat', '/direct/create?userId=%40stephen%3Ablockwire.chat'],
  ['https://blockwire.chat/#/%23news:blockwire.chat', '/home/%23news%3Ablockwire.chat/'],
  ['https://blockwire.chat/#/!weOKVBoq:blockwire.chat?via=blockwire.chat', '/home/!weOKVBoq%3Ablockwire.chat/?via=blockwire.chat'],
  // the stale Home Screen icon
  ['https://blockwire.chat/index.html', '/'],
  // ordinary navigation must be untouched
  ['https://blockwire.chat/', '/'],
  ['https://blockwire.chat/home/', '/home/'],
];
let fail = 0;
for (const [input, expected] of cases) {
  const got = run(input);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${input}\n      -> ${got}${ok ? '' : `\n      expected ${expected}`}`);
}
process.exit(fail ? 1 : 0);
