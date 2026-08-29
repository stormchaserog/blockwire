import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';
import { ContainerColor } from '$styles/ContainerColor.css';

export const CommunityCard = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    cursor: 'pointer',
  },
]);

/** Small green presence dot sitting between "N members" and "N online" in
 *  the card footer, per the design mock. */
export const OnlineDot = style({
  width: '0.375rem',
  height: '0.375rem',
  borderRadius: '50%',
  backgroundColor: color.Success.Main,
  flexShrink: 0,
});

/** Bare-text purple link button ("View all", section header actions). */
export const LinkButton = style({
  color: color.Primary.Main,
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
});

/** Rounded purple-tinted square housing the rocket icon on the Discover
 *  Projects banner. */
export const DiscoverBannerIcon = style({
  width: toRemSize(40),
  height: toRemSize(40),
  borderRadius: config.radii.R400,
  backgroundColor: color.Primary.Container,
  color: color.Primary.OnContainer,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

/** Pill-shaped purple-outline "Explore" button on the Discover banner. */
export const ExploreButton = style({
  color: color.Primary.Main,
  background: 'none',
  border: `${config.borderWidth.B300} solid ${color.Primary.Main}`,
  borderRadius: config.radii.Pill,
  padding: `${config.space.S100} ${config.space.S300}`,
  cursor: 'pointer',
  flexShrink: 0,
});

/** Horizontal scroller with the scrollbar hidden on every engine -- the
 *  Watchlist row is a swipe surface, not a scroll-tracked document. */
export const WatchlistRow = style({
  display: 'flex',
  gap: config.space.S200,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

export const WatchlistCard = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    minWidth: '8.5rem',
    maxWidth: '8.5rem',
    flexShrink: 0,
  },
]);

/** Small filled star at the top-right of a Watchlist card -- the
 *  unfavorite affordance. Bare button chrome; the icon is the visual. */
export const WatchlistStarButton = style({
  color: color.Primary.Main,
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
});

function toRemSize(px: number): string {
  return `${px / 16}rem`;
}
