import { style } from '@vanilla-extract/css';

/** Exact-replica mock palette (approved design contract:
 *  labs/blockwire_blueprint/sketches/exact-replica/index.html). These
 *  surfaces are pixel-locked to the mock, so the hex values live here
 *  verbatim rather than routing through folds tokens. */
const card = '#16161f';
const card2 = '#1c1c27';
const pill = '#2b2440';
const text = '#f2f2f7';
const text2 = '#8e8e9a';
const purple = '#7c5cff';
const purple2 = '#a08aff';
const green = '#34d399';
export const mock = { card, card2, pill, text, text2, purple, purple2, green, red: '#f47174' };

/** Mock .hcard: 18px radius, 16px padding, #16161f. */
export const CommunityCard = style({
  backgroundColor: card,
  borderRadius: '18px',
  padding: '16px',
  cursor: 'pointer',
  selectors: {
    '&:active': {
      backgroundColor: card2,
    },
  },
});

/** Mock .av: 58px circle. Doubles as the initials-fallback frame --
 *  overflow hidden + flex centering so a missing image NEVER renders as
 *  raw text spilling out of the circle. */
export const CardAvatar = style({
  width: '58px',
  height: '58px',
  borderRadius: '50%',
  overflow: 'hidden',
  flexShrink: 0,
  backgroundColor: pill,
  color: purple2,
  fontSize: '20px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/** Mock .av.sm: 52px circle for non-project spaces. */
export const CardAvatarSm = style({
  width: '52px',
  height: '52px',
});

export const AvatarImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

/** Mock .hname: 18px / 700. */
export const CardName = style({
  fontSize: '18px',
  fontWeight: 700,
  color: text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
});

/** Mock .hmeta: 14px muted. */
export const CardMeta = style({
  fontSize: '14px',
  color: text2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** Mock .hprice: 15px / 700. */
export const CardPrice = style({
  fontSize: '15px',
  fontWeight: 700,
  color: text,
});

/** Mock .hprice .chg: 14px / 600 beside the price. */
export const CardPriceChange = style({
  fontSize: '14px',
  fontWeight: 600,
});

/** Mock .hfoot: 13px muted, single-line. */
export const CardFooter = style({
  fontSize: '13px',
  color: text2,
  whiteSpace: 'nowrap',
});

/** Mock .mpill / .upill: #2b2440 pill, #a08aff 12.5px/600, 5x12. */
export const UnreadPill = style({
  backgroundColor: pill,
  color: purple2,
  fontSize: '12.5px',
  fontWeight: 600,
  padding: '5px 12px',
  borderRadius: '999px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

/** Mock .dishead h2: 19px / 700 section headers. */
export const SectionHeader = style({
  fontSize: '19px',
  fontWeight: 700,
  color: text,
});

/** Small green presence dot sitting between "N members" and "N online" in
 *  the card footer, per the design mock. */
export const OnlineDot = style({
  width: '0.375rem',
  height: '0.375rem',
  borderRadius: '50%',
  backgroundColor: green,
  flexShrink: 0,
});

/** Bare-text purple link button ("View all", section header actions).
 *  Mock .dishead a: 14px, purple2. */
export const LinkButton = style({
  color: purple2,
  fontSize: '14px',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
});

/** Rounded purple-tinted square housing the rocket icon on the Discover
 *  Projects banner: 44px, #2b2440 bg, #a08aff icon. */
export const DiscoverBannerIcon = style({
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  backgroundColor: pill,
  color: purple2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

/** Discover banner title: 16px / 700. */
export const DiscoverTitle = style({
  fontSize: '16px',
  fontWeight: 700,
  color: text,
});

/** Discover banner subline: 13px muted. */
export const DiscoverSubline = style({
  fontSize: '13px',
  color: text2,
});

/** Pill-shaped purple-outline "Explore" button on the Discover banner. */
export const ExploreButton = style({
  color: purple2,
  background: 'transparent',
  border: `1.5px solid ${purple}`,
  borderRadius: '999px',
  padding: '8px 18px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
});

/** Horizontal scroller with the scrollbar hidden on every engine -- the
 *  Watchlist row is a swipe surface, not a scroll-tracked document. */
export const WatchlistRow = style({
  display: 'flex',
  gap: '10px',
  overflowX: 'auto',
  scrollbarWidth: 'none',
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
});

/** Mock .dcard: #16161f, 16px radius, 12px padding, min-width 150px. */
export const WatchlistCard = style({
  backgroundColor: card,
  borderRadius: '16px',
  padding: '12px',
  minWidth: '150px',
  maxWidth: '150px',
  flexShrink: 0,
});

/** Mock .dcard img: 40px circle token icon; same initials-fallback frame
 *  as the community-card avatar (overflow hidden + centered). */
export const WatchTokenIcon = style({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  overflow: 'hidden',
  flexShrink: 0,
  backgroundColor: pill,
  color: purple2,
  fontSize: '14px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/** Mock .dcard .n: 14px / 700 token symbol. */
export const WatchSymbol = style({
  fontSize: '14px',
  fontWeight: 700,
  color: text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** Watchlist price line: 13px on-text. */
export const WatchPrice = style({
  fontSize: '13px',
  color: text,
});

/** Mock .dcard .pc: 13px / 600 change. */
export const WatchChange = style({
  fontSize: '13px',
  fontWeight: 600,
});

/** Small filled star at the top-right of a Watchlist card -- the
 *  unfavorite affordance. Bare button chrome; the icon is the visual. */
export const WatchlistStarButton = style({
  color: purple2,
  fontSize: '16px',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
});

/** Mock .hgreet h1: 25px / 700. */
export const GreetingTitle = style({
  fontSize: '25px',
  fontWeight: 700,
  color: text,
  margin: 0,
});

/** Mock .hsub: 14px muted. */
export const GreetingSub = style({
  fontSize: '14px',
  color: text2,
});
