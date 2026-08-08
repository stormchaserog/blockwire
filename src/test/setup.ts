import '@testing-library/jest-dom';

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverPolyfill;

/** jsdom has no IntersectionObserver, and @lottiefiles/dotlottie-web started
 *  constructing one in `setRenderConfig` as of 0.78 (pulled in by
 *  dotlottie-react 0.19). It throws during the mount effect, which takes down
 *  the whole render - every lottie case in Image.test.tsx failed with an empty
 *  document body rather than an assertion, which reads like the component
 *  vanished. Real browsers have it; this only closes the jsdom gap. */
class IntersectionObserverPolyfill implements IntersectionObserver {
  readonly root: Element | Document | null = null;

  readonly rootMargin: string = '';

  // TypeScript 6's updated DOM lib added `scrollMargin` to the interface
  // (a scroll-driven-animations addition); this polyfill only needs to
  // satisfy the shape, so an empty default is fine.
  readonly scrollMargin: string = '';

  readonly thresholds: ReadonlyArray<number> = [];

  observe() {}

  unobserve() {}

  disconnect() {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.IntersectionObserver = globalThis.IntersectionObserver ?? IntersectionObserverPolyfill;
