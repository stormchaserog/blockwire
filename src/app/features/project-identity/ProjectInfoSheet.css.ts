import { style } from '@vanilla-extract/css';
import { config } from 'folds';

/** Exact-replica mock palette (approved design contract:
 *  labs/blockwire_blueprint/sketches/exact-replica/index.html). These
 *  surfaces are pixel-locked to the mock, so the hex values live here
 *  verbatim rather than routing through folds tokens. */
const card = '#16161f';
const card2 = '#1c1c27';
const pill = '#2b2440';
const text = '#f2f2f7';
const text2 = '#8e8e9a';
const purple2 = '#a08aff';
const green = '#34d399';
const border = '#23232f';
export const mock = {
  card,
  card2,
  pill,
  text,
  text2,
  purple2,
  green,
  red: '#f47174',
  border,
};

export const Sheet = style({
  position: 'relative',
  padding: config.space.S400,
});

export const CloseIconButton = style({
  position: 'absolute',
  top: config.space.S300,
  right: config.space.S300,
  zIndex: 1,
});

const heroAvatarBase = {
  borderRadius: '50%',
  overflow: 'hidden',
  flexShrink: 0,
  backgroundColor: pill,
  color: purple2,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: `0 4px 16px 0 rgba(0, 0, 0, 0.35)`,
} as const;

/** Sheet hero avatar: compact 76px, floating above the sheet body per the
 *  mock's overlapping avatar treatment. Doubles as the initials-fallback
 *  frame -- overflow hidden + flex centering means a missing image NEVER
 *  renders as raw text spilling out of the circle. */
export const HeroAvatar = style({
  ...heroAvatarBase,
  width: '76px',
  height: '76px',
  fontSize: '26px',
  marginTop: `calc(-1 * ${config.space.S200})`,
});

/** Mock .slogo img: the page/sheet hero at 88px, centered, normal flow. */
export const HeroAvatarPage = style({
  ...heroAvatarBase,
  width: '88px',
  height: '88px',
  fontSize: '30px',
});

export const HeroAvatarImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** Mock .sname: 23px / 700 centered. */
export const HeroName = style({
  fontSize: '23px',
  fontWeight: 700,
  color: text,
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
});

/** Mock .stick: "$WCLAW • Solana" 14.5px muted centered. */
export const HeroSubtitle = style({
  fontSize: '14.5px',
  color: text2,
  textAlign: 'center',
});

export const VerifiedChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `${config.space.S100} ${config.space.S300}`,
  borderRadius: '999px',
  backgroundColor: 'rgba(52, 211, 153, 0.14)',
  color: green,
  fontSize: '14px',
  fontWeight: 600,
});

/** Mock .pricebox: #16161f, radius 16, padding 16. */
export const PriceCard = style({
  padding: '16px',
  borderRadius: '16px',
  backgroundColor: card,
});

/** Mock .pl .pv: 26px / 700 price figure. */
export const PriceValue = style({
  fontSize: '26px',
  fontWeight: 700,
  color: text,
});

/** Mock .pl .pchg: 14px / 600 change; the "(24h)" span stays muted. */
export const PriceChangeText = style({
  fontSize: '14px',
  fontWeight: 600,
});

export const PriceChangeMuted = style({
  fontSize: '14px',
  color: text2,
  fontWeight: 400,
});

/** Mock .act: #16161f tile, radius 14. */
export const ActionTile = style({
  padding: '14px 4px',
  borderRadius: '14px',
  backgroundColor: card,
  color: text,
  border: 'none',
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: card2,
    },
    '&:active': {
      backgroundColor: card2,
    },
  },
});

/** Mock .act .ico: 34px circle with a 1.5px #3a3a4a outline, 16px icon. */
export const ActionTileIcon = style({
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  border: '1.5px solid #3a3a4a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/** Mock .act .lb: 12.5px label. */
export const ActionTileLabel = style({
  fontSize: '12.5px',
  color: text,
});

/** Mock .rows: #16161f, radius 16. */
export const DetailsCard = style({
  padding: `${config.space.S100} 16px`,
  borderRadius: '16px',
  backgroundColor: card,
});

/** Mock .drow: 13px vertical padding, hairline #23232f separators. */
export const DetailRow = style({
  padding: '13px 0',
  borderBottom: `1px solid ${border}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

/** Mock .drow .k: muted 14.5px key. */
export const DetailKey = style({
  fontSize: '14.5px',
  color: text2,
});

/** Mock .drow .v: 14.5px on-text value with 15px muted trailing icon. */
export const DetailValue = style({
  fontSize: '14.5px',
  color: text,
});

export const DetailLink = style({
  color: purple2,
  fontSize: '14.5px',
  textDecoration: 'none',
});
