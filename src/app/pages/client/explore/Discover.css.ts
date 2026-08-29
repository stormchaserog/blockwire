import { style } from '@vanilla-extract/css';
import { toRem } from 'folds';

/** Discover project cards (E2E audit polish). Locked dark-theme hexes,
 *  same pattern as HomeCommunityCards.css.ts — plain styled divs where
 *  folds fights the design. */
const CARD = '#16161f';
const CARD_HOVER = '#1c1c27';
const HAIRLINE = '#23232f';
const PILL_BG = '#2b2440';
const PURPLE_LIGHT = '#a08aff';
const TEXT = '#f2f2f7';
const MUTED = '#8e8e9a';

export const ProjectCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(12),
  padding: toRem(16),
  backgroundColor: CARD,
  border: `1px solid ${HAIRLINE}`,
  borderRadius: toRem(18),
  cursor: 'pointer',
  transition: 'background-color 120ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: CARD_HOVER,
    },
  },
});

export const ProjectAvatar = style({
  width: toRem(52),
  height: toRem(52),
  flexShrink: 0,
  borderRadius: '50%',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: PILL_BG,
  color: PURPLE_LIGHT,
  fontSize: toRem(20),
  fontWeight: 700,
});

export const ProjectAvatarImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const ProjectBody = style({
  flexGrow: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: toRem(2),
});

export const ProjectTitleRow = style({
  display: 'flex',
  alignItems: 'baseline',
  gap: toRem(6),
  minWidth: 0,
});

export const ProjectName = style({
  fontWeight: 700,
  color: TEXT,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const ProjectTicker = style({
  color: MUTED,
  fontSize: toRem(13),
  flexShrink: 0,
});

export const ProjectDescription = style({
  fontSize: toRem(13),
  lineHeight: 1.4,
  color: MUTED,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const ProjectChevron = style({
  flexShrink: 0,
  color: MUTED,
  display: 'flex',
  alignItems: 'center',
});
