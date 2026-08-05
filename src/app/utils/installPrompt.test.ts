import { describe, expect, it } from 'vitest';
import { getInstallOffer } from './installPrompt';

const ctx = (over: Partial<Parameters<typeof getInstallOffer>[0]> = {}) => ({
  standalone: false,
  hasNativePrompt: false,
  isIos: false,
  inAppBrowser: false,
  dismissed: false,
  ...over,
});

describe('getInstallOffer', () => {
  it('offers the real install on Android, where the browser can do it', () => {
    expect(getInstallOffer(ctx({ hasNativePrompt: true }))).toBe('native');
  });

  it('falls back to instructions on iOS, which has no install API', () => {
    expect(getInstallOffer(ctx({ isIos: true }))).toBe('ios-instructions');
  });

  it('never nags someone who already installed it', () => {
    // The most annoying possible bug: an install banner inside the installed
    // app. Standalone beats everything else.
    expect(getInstallOffer(ctx({ standalone: true, hasNativePrompt: true }))).toBeNull();
    expect(getInstallOffer(ctx({ standalone: true, isIos: true }))).toBeNull();
  });

  it('stays quiet once dismissed', () => {
    expect(getInstallOffer(ctx({ hasNativePrompt: true, dismissed: true }))).toBeNull();
    expect(getInstallOffer(ctx({ isIos: true, dismissed: true }))).toBeNull();
  });

  it('prefers the real prompt over instructions when both could apply', () => {
    // An iOS browser that somehow supports the API should use it rather than
    // telling someone to go hunting in the Share sheet.
    expect(getInstallOffer(ctx({ isIos: true, hasNativePrompt: true }))).toBe('native');
  });

  it('sends an in-app web view to Safari, where installing is even possible', () => {
    // Opening a link inside Telegram or X gives a web view with no Share >
    // Add to Home Screen at all. Telling someone to tap a button that is not
    // there is worse than saying nothing.
    expect(getInstallOffer(ctx({ isIos: true, inAppBrowser: true }))).toBe('open-in-safari');
  });

  it('offers nothing on a desktop browser that cannot install', () => {
    // No prompt event and not iOS means the browser has not offered, so
    // inventing a button that does nothing would be worse than staying quiet.
    expect(getInstallOffer(ctx())).toBeNull();
  });
});
