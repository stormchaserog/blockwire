const IOS_PWA_VIEWPORT_HEIGHT = '--sable-ios-pwa-viewport-height';
const MIN_KEYBOARD_HEIGHT = 100;

const isStandaloneIosPwa = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches &&
  CSS.supports('-webkit-touch-callout: none');

const isEditableFocused = (): boolean => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
};

export interface ViewportMeasurements {
  /** The web view's own layout viewport — what the page actually gets. */
  layoutHeight: number;
  /** Currently visible area; shrinks when the keyboard covers part of the page. */
  visualHeight: number;
  /** How far the visual viewport has been scrolled off the top. */
  visualOffsetTop: number;
  editableFocused: boolean;
}

/**
 * Height to pin the app to, in CSS pixels.
 *
 * This drives `html`, `body` and `#root` in a standalone iOS PWA, so getting
 * it wrong by even a few pixels pushes the bottom of the layout — the message
 * composer — off the screen, with no scrollbar to reveal it.
 *
 * It used to measure the physical display. That is not the
 * same thing as the space the page is given: depending on iOS version and
 * whether the status bar is translucent, the web view can start below the
 * status bar, leaving the layout an entire status bar too tall. `innerHeight`
 * is the web view's own viewport by definition, so it cannot disagree with
 * itself. Safari's disappearing URL bar is the usual reason people avoid
 * `innerHeight`, and it does not apply here — standalone PWAs have no URL bar,
 * which is exactly what `isStandaloneIosPwa` has already established.
 *
 * With the keyboard up we shrink to the visible area instead, so the composer
 * sits directly above the keyboard rather than behind it.
 */
export const computeViewportHeight = ({
  layoutHeight,
  visualHeight,
  visualOffsetTop,
  editableFocused,
}: ViewportMeasurements): number => {
  // A keyboard is the only thing that takes a large bite out of the visual
  // viewport while a text field has focus. Requiring focus keeps rubber-band
  // scrolling and the Dynamic Island from being mistaken for one.
  const keyboardOpen = editableFocused && layoutHeight - visualHeight > MIN_KEYBOARD_HEIGHT;
  return keyboardOpen ? visualHeight + visualOffsetTop : layoutHeight;
};

export function installIosPwaViewportHeight(): void {
  if (!isStandaloneIosPwa()) return;

  let frame = 0;
  let settleTimer = 0;

  const updateHeight = () => {
    frame = 0;
    const viewport = window.visualViewport;
    const height = computeViewportHeight({
      layoutHeight: window.innerHeight,
      visualHeight: viewport?.height ?? window.innerHeight,
      visualOffsetTop: viewport?.offsetTop ?? 0,
      editableFocused: isEditableFocused(),
    });

    document.documentElement.style.setProperty(IOS_PWA_VIEWPORT_HEIGHT, `${Math.round(height)}px`);
  };

  const scheduleUpdate = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updateHeight);

    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(updateHeight, 350);
  };

  updateHeight();
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);
  window.visualViewport?.addEventListener('resize', scheduleUpdate);
  window.visualViewport?.addEventListener('scroll', scheduleUpdate);
  document.addEventListener('focusin', scheduleUpdate);
  document.addEventListener('focusout', scheduleUpdate);
}
