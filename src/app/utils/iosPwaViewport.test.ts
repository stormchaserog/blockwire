import { describe, expect, it } from 'vitest';
import { computeViewportHeight } from './iosPwaViewport';

// Numbers from an iPhone with a Dynamic Island: 852pt tall, 59pt status bar.
const SCREEN = 852;
const STATUS_BAR = 59;
const KEYBOARD = 336;

describe('computeViewportHeight', () => {
  it('uses the space the web view actually has, not the physical screen', () => {
    // The bug: when the web view starts below the status bar, the layout
    // viewport is a status bar shorter than the display. Measuring the display
    // made the app 59px too tall, which pushed the composer off the bottom
    // with nothing to scroll to reach it.
    const layoutHeight = SCREEN - STATUS_BAR;
    expect(
      computeViewportHeight({
        layoutHeight,
        visualHeight: layoutHeight,
        visualOffsetTop: 0,
        editableFocused: false,
      })
    ).toBe(layoutHeight);
  });

  it('fills the screen when the web view does get all of it', () => {
    expect(
      computeViewportHeight({
        layoutHeight: SCREEN,
        visualHeight: SCREEN,
        visualOffsetTop: 0,
        editableFocused: false,
      })
    ).toBe(SCREEN);
  });

  it('shrinks to sit above the keyboard while typing', () => {
    expect(
      computeViewportHeight({
        layoutHeight: SCREEN,
        visualHeight: SCREEN - KEYBOARD,
        visualOffsetTop: 0,
        editableFocused: true,
      })
    ).toBe(SCREEN - KEYBOARD);
  });

  it('accounts for the page being scrolled under the keyboard', () => {
    // iOS scrolls the visual viewport to keep the caret visible; the app has
    // to end where the visible area ends, not where it started.
    expect(
      computeViewportHeight({
        layoutHeight: SCREEN,
        visualHeight: SCREEN - KEYBOARD,
        visualOffsetTop: 40,
        editableFocused: true,
      })
    ).toBe(SCREEN - KEYBOARD + 40);
  });

  it('goes back to full height when the keyboard is dismissed', () => {
    expect(
      computeViewportHeight({
        layoutHeight: SCREEN,
        visualHeight: SCREEN,
        visualOffsetTop: 0,
        editableFocused: false,
      })
    ).toBe(SCREEN);
  });

  it('does not mistake a small viewport change for a keyboard', () => {
    // Rubber-band scrolling and toolbar animations move the visual viewport a
    // little; treating that as a keyboard makes the layout jump around.
    expect(
      computeViewportHeight({
        layoutHeight: SCREEN,
        visualHeight: SCREEN - 40,
        visualOffsetTop: 0,
        editableFocused: true,
      })
    ).toBe(SCREEN);
  });

  it('ignores a shrunken viewport when nothing is focused', () => {
    // No text field has focus, so whatever shrank the viewport was not a
    // keyboard and must not resize the app.
    expect(
      computeViewportHeight({
        layoutHeight: SCREEN,
        visualHeight: SCREEN - KEYBOARD,
        visualOffsetTop: 0,
        editableFocused: false,
      })
    ).toBe(SCREEN);
  });
});
