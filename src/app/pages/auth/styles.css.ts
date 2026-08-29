import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

/** BlockWire branded auth (E2E audit polish). Sign-in commits to the app's
 *  locked dark theme regardless of the viewer's OS setting — the auth pages
 *  never receive .dark-theme (theme mounts inside the client), so the exact
 *  theme hexes are restated here: bg #0a0a0f, card #16161f, hairline
 *  #23232f, accent #7c5cff (light #a08aff), text #f2f2f7, muted #8e8e9a. */
const BG = '#0a0a0f';
const CARD = '#16161f';
const CARD_HOVER = '#1c1c27';
const HAIRLINE = '#23232f';
const PURPLE = '#7c5cff';
const PURPLE_LIGHT = '#a08aff';
const TEXT = '#f2f2f7';
const MUTED = '#8e8e9a';

export const AuthLayout = style({
  minHeight: '100%',
  backgroundColor: BG,
  color: TEXT,
  padding: config.space.S400,
  paddingRight: config.space.S200,
  paddingBottom: 0,
  position: 'relative',
  // A single soft purple glow behind the brand block — depth without a
  // photograph, so the dark theme reads as designed, not as unstyled.
  backgroundImage: `radial-gradient(ellipse 80% 42% at 50% -4%, rgba(124, 92, 255, 0.16) 0%, rgba(124, 92, 255, 0) 70%)`,
  backgroundRepeat: 'no-repeat',
});

/** Centered brand block above the form card. */
export const AuthBrand = style([
  DefaultReset,
  {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: toRem(8),
    marginTop: '5vh',
    marginBottom: toRem(20),
    textAlign: 'center',
  },
]);

export const AuthBrandLogo = style([
  DefaultReset,
  {
    width: toRem(56),
    height: toRem(56),
    borderRadius: '50%',
  },
]);

export const AuthBrandWordmark = style([
  DefaultReset,
  {
    fontSize: toRem(28),
    lineHeight: 1.2,
    fontWeight: 800,
    color: TEXT,
    letterSpacing: '-0.02em',
  },
]);

export const AuthBrandWordmarkAccent = style({
  color: PURPLE,
});

export const AuthBrandTagline = style([
  DefaultReset,
  {
    fontSize: toRem(14),
    lineHeight: 1.4,
    color: MUTED,
  },
]);

export const AuthCard = style({
  maxWidth: toRem(460),
  width: '100%',
  backgroundColor: CARD,
  color: TEXT,
  borderRadius: toRem(18),
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
  border: `1px solid ${HAIRLINE}`,
  overflow: 'hidden',
});

export const AuthCardContent = style({
  maxWidth: toRem(402),
  width: '100%',
  margin: 'auto',
  padding: toRem(24),
  paddingTop: toRem(28),
  paddingBottom: toRem(36),
  gap: toRem(36),
  '@media': {
    'screen and (max-width: 480px)': {
      padding: toRem(20),
      paddingTop: toRem(24),
      paddingBottom: toRem(28),
    },
  },
});

export const AuthAddingAccountRow = style({
  padding: `${config.space.S200} ${toRem(24)}`,
  borderBottom: `1px solid ${HAIRLINE}`,
});

export const AuthFooter = style({
  padding: config.space.S200,
});

/** Dark inputs inside the auth card only: folds' Input takes its palette
 *  from theme vars the auth pages never receive, so the card restates the
 *  locked dark-theme input look. Scoped to the card — nothing else shifts. */
globalStyle(`${AuthCard} input`, {
  backgroundColor: CARD_HOVER,
  color: TEXT,
  caretColor: PURPLE_LIGHT,
});

globalStyle(`${AuthCard} input::placeholder`, {
  color: MUTED,
});

globalStyle(`${AuthCard} div:has(> input)`, {
  backgroundColor: CARD_HOVER,
  border: `1px solid ${HAIRLINE}`,
  boxShadow: 'none',
});

globalStyle(`${AuthCard} div:has(> input:focus)`, {
  borderColor: PURPLE,
  outline: 'none',
});

/** Primary submit: filled purple pill, white text — the app's locked button
 *  style. Scoped to the auth card so nothing else in the app shifts. */
globalStyle(`${AuthCard} button[type="submit"]`, {
  background: PURPLE,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: toRem(999),
});

globalStyle(`${AuthCard} button[type="submit"]:hover`, {
  filter: 'brightness(1.1)',
});

globalStyle(`${AuthCard} button[type="submit"] span`, {
  color: '#FFFFFF',
});

/** Links inside the auth card pick up the light accent. */
globalStyle(`${AuthCard} a`, {
  color: PURPLE_LIGHT,
});
