/** Offering to install the app.
 *
 *  BlockWire is a PWA, so "downloading" it means installing it to the home
 *  screen. Everything needed for that was already in place — HTTPS, a valid
 *  manifest, the right icons, a service worker — but nothing ever *offered*
 *  it. Android users had to know to open Chrome's overflow menu and find
 *  "Install app", and iOS users had to know about the Share sheet. Both are
 *  invisible to anyone who has not installed a PWA before, which is most
 *  people.
 *
 *  The two platforms need completely different handling:
 *
 *  - Android (Chrome, Edge, Samsung Internet) fires `beforeinstallprompt`.
 *    Catch it, keep it, and fire it when the person taps our button. It only
 *    fires when the browser has already decided the app is installable, so
 *    holding an event is also the most reliable "can we install?" signal
 *    there is — better than sniffing the user agent.
 *
 *  - iOS Safari has no equivalent API and never will expose one. The only
 *    route is Share → Add to Home Screen, so all we can do is say so clearly.
 *    That matters more here than elsewhere: on iOS, web push only works once
 *    the app has been added to the Home Screen, so an uninstalled iOS user
 *    gets no notifications at all.
 */

export type InstallOffer = 'native' | 'ios-instructions' | 'open-in-safari' | null;

export interface InstallContext {
  /** Already running as an installed app, so there is nothing to offer. */
  standalone: boolean;
  /** A captured `beforeinstallprompt`, meaning the browser will install it. */
  hasNativePrompt: boolean;
  isIos: boolean;
  /** An in-app web view (a link opened inside Telegram, X, Instagram…). */
  inAppBrowser: boolean;
  dismissed: boolean;
}

/**
 * What, if anything, to offer this visitor.
 *
 * Order matters: an installed app is never nagged, a browser that can do it
 * properly always wins over hand-written instructions, and iOS only gets the
 * manual route because it has no other one.
 */
export const getInstallOffer = ({
  standalone,
  hasNativePrompt,
  isIos,
  inAppBrowser,
  dismissed,
}: InstallContext): InstallOffer => {
  if (standalone) return null;
  if (dismissed) return null;
  if (hasNativePrompt) return 'native';
  // An in-app web view has no Share > Add to Home Screen at all, so the normal
  // instructions would send someone hunting for a button that does not exist.
  // They have to get into Safari first, and nothing else can happen until
  // they do.
  if (isIos && inAppBrowser) return 'open-in-safari';
  if (isIos) return 'ios-instructions';
  return null;
};

/** True when the page is running as an installed app rather than in a tab. */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

/** iPhone and iPad, including iPadOS pretending to be a Mac. */
export const isIosDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOs =
    /Macintosh/.test(ua) && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints
      ? ((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0) > 1
      : false;
  return /iPad|iPhone|iPod/.test(ua) || iPadOs;
};

/** The subset of BeforeInstallPromptEvent we rely on; it is not in lib.dom. */
export interface NativeInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * True when this looks like an in-app web view rather than Safari proper.
 *
 * `navigator.standalone` is an old Apple-only property that is `false` in a
 * real Safari tab, `true` in an installed app, and *undefined* inside the web
 * view that apps like Telegram and X use for links. That absence is the most
 * reliable signal available, because those web views otherwise identify
 * themselves as Safari.
 */
export const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return isIosDevice() && typeof standalone === 'undefined';
};
