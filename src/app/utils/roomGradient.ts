/** The picture a room gets before anyone uploads one.
 *
 *  Most rooms will never have a photo set, so the placeholder is what people
 *  actually look at — it is the product's texture, not a gap waiting to be
 *  filled. The old one was a single flat pastel with a dark letter on it,
 *  which read as "no image" rather than as a design.
 *
 *  Two rules shaped this:
 *
 *  1. It has to be recognisable. You should learn a room's colour the way you
 *     learn a friend's avatar, so the same room must always produce the same
 *     result — no randomness, no server round trip, derived only from the id
 *     that never changes.
 *
 *  2. It has to look like BlockWire. A hue picked straight off a hash gives
 *     you the full rainbow including the muddy parts, and a wall of them looks
 *     accidental. These are hand-picked pairs in the brand's blue-to-purple
 *     family, widened just enough — teal one way, magenta the other — that a
 *     list of rooms is easy to tell apart without ever leaving the family.
 *
 *  Stops are kept deep enough that white sits on them legibly at the small
 *  sizes the room list uses.
 */

export interface Gradient {
  from: string;
  to: string;
  /** Degrees. Varying the sweep separates rooms that land on the same pair. */
  angle: number;
}

/** Hand-picked, all legible under white, all recognisably the same family. */
export const GRADIENTS: readonly Gradient[] = [
  { from: '#0B6FD6', to: '#6A1FE0', angle: 135 }, // the brand pair, deepened
  { from: '#0090B8', to: '#0B6FD6', angle: 160 }, // teal into blue
  { from: '#6A1FE0', to: '#B32DB0', angle: 120 }, // violet into magenta
  { from: '#00857A', to: '#0090B8', angle: 145 }, // deep teal
  { from: '#3B3FCF', to: '#7B2BFF', angle: 130 }, // indigo into purple
  { from: '#B32DB0', to: '#D1436B', angle: 150 }, // magenta into rose
  { from: '#1668C7', to: '#3B3FCF', angle: 115 }, // cobalt
  { from: '#5A18B8', to: '#2F1F9E', angle: 165 }, // deep violet
];

/**
 * Stable 32-bit hash. Same string in, same number out, on every device and
 * every reload — which is the entire point.
 */
export const hashId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = Math.trunc((hash << 5) - hash + (id.codePointAt(i) ?? 0));
  }
  return Math.abs(hash);
};

/** The gradient for a room (or anything else with a stable id). */
export const gradientFor = (id: string): Gradient => {
  const hash = hashId(id);
  const base = GRADIENTS[hash % GRADIENTS.length] ?? GRADIENTS[0]!;
  // Nudge the sweep by up to ±20° so two rooms sharing a pair still differ.
  const skew = ((hash >> 3) % 5) * 10 - 20;
  return { ...base, angle: base.angle + skew };
};

/** Ready to drop into a `background` declaration. */
export const roomGradientCss = (id: string): string => {
  const { from, to, angle } = gradientFor(id);
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
};
