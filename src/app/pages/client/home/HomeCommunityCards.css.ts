import { style } from '@vanilla-extract/css';
import { config } from 'folds';
import { ContainerColor } from '$styles/ContainerColor.css';

export const CommunityCard = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    cursor: 'pointer',
  },
]);

/** Horizontal scroller with the scrollbar hidden on every engine -- the
 *  Discover row is a swipe surface, not a scroll-tracked document. */
export const DiscoverRow = style({
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

export const DiscoverCard = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    cursor: 'pointer',
    minWidth: '8.5rem',
    maxWidth: '8.5rem',
    flexShrink: 0,
  },
]);
