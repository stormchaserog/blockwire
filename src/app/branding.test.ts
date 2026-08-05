import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Keeps the upstream brand out of anything a person can read.
 *
 *  This is a fork, so every merge from upstream carries the chance of putting
 *  "Sable" back into a button label, a notification body or the browser tab
 *  title. Catching that by eye does not scale, and a stray one is embarrassing
 *  in a way that is hard to notice from the inside — you stop seeing it.
 *
 *  The rule is only about what is VISIBLE. Internal identifiers are
 *  deliberately left alone: the `--sable-*` CSS variables, the `sable-sw-*`
 *  event and cache names, `useSableCosmetics`, and above all the stored
 *  settings keys, because renaming a key that lives in someone's account data
 *  silently discards their saved preferences.
 */

const SRC = path.resolve(__dirname, '..');

/** Internal names that legitimately contain the word, and are never displayed. */
const INTERNAL = [
  'SABLE_PRODUCT_NAME',
  '--sable-',
  'sable-sw-',
  'sable-announcements',
  'useSableCosmetics',
  'SableCosmetics',
  'SableChatPreview',
  'UploadedSableCss',
  'themeChatSable',
  'sable.moe/', // only inside comments explaining history
];

/**
 * Files allowed to name the upstream project, because AGPL-3.0 §13 requires
 * offering the source to network users and §5 requires preserving notices.
 * Branding does not get to remove a licence obligation.
 */
const ATTRIBUTION_ALLOWED = [
  'pages/auth/AuthFooter.tsx',
  'features/settings/about/About.tsx',
  'pages/client/WelcomePage.tsx',
  'utils/consolePasteScamWarning.ts',
  'features/bug-report/BugReportForm.tsx',
  'theme/githubRaw.ts',
  'theme/catalogDefaults.ts',
  'utils/sentryScrubbers.ts',
  'plugins/call/CallEmbed.ts',
  'branding.test.ts',
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full) ? [full] : [];
  });

describe('BlockWire branding', () => {
  it('never shows the upstream name to a user', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const rel = path.relative(SRC, file).replaceAll(path.sep, '/');
      if (ATTRIBUTION_ALLOWED.some((allowed) => rel.endsWith(allowed))) continue;

      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          // Word boundaries on purpose: `parseSableTweakMetadata` and
          // `SableNicknames` are symbols, not sentences. Only a standalone
          // "Sable" can end up in front of a person.
          if (!/\bSable\b/.test(line)) return;
          if (INTERNAL.some((token) => line.includes(token))) return;
          // Comments explain provenance and are not shown to anyone.
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return;
          }
          offenders.push(`${rel}:${i + 1}  ${trimmed.slice(0, 100)}`);
        });
    }

    expect(offenders, `Upstream branding is visible here:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps the source-code offer that the licence requires', () => {
    // Removing this is a licence violation, not a branding win. If the auth
    // footer ever stops offering source, that is a bug in the other direction.
    const footer = readFileSync(path.join(SRC, 'app/pages/auth/AuthFooter.tsx'), 'utf8');
    expect(footer).toContain('github.com/SableClient/Sable');
  });
});
