import { describe, expect, it } from 'vitest';
import { mergePersistedSettings } from './settings';

describe('mergePersistedSettings -- messageLayout migration', () => {
  it('migrates an existing session stuck on the old default (Modern/0) forward to Bubble', () => {
    // Regression test: the app's default messageLayout changed from 0
    // (Modern) to 2 (Bubble), but useSetSetting persists the FULL
    // settings object on every single write -- so any user who has ever
    // changed ANY setting has messageLayout: 0 baked into their
    // localStorage from before this change, and never sees the new
    // default. Confirmed live: "Definitely do not see bubbles" despite
    // the default flip being deployed and verified.
    const persisted = JSON.stringify({ messageLayout: 0 });
    const merged = mergePersistedSettings(persisted, {});
    expect(merged.messageLayout).toBe(2);
  });

  it('does not touch a value the user already set to Compact (1) or Bubble (2)', () => {
    expect(mergePersistedSettings(JSON.stringify({ messageLayout: 1 }), {}).messageLayout).toBe(1);
    expect(mergePersistedSettings(JSON.stringify({ messageLayout: 2 }), {}).messageLayout).toBe(2);
  });

  it('a brand new session with no persisted settings gets the real default (Bubble/2), not the migration path', () => {
    expect(mergePersistedSettings(null, {}).messageLayout).toBe(2);
  });
});
