import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

/** Sign-in is the one screen that commits to a single look regardless of the
 *  viewer's theme: a dark photograph does not have a light-mode counterpart,
 *  and a background that inverts is a background nobody chose. The scrim is
 *  doing real work — text on an unmodified photo is a legibility bug waiting
 *  for the wrong screen and the wrong sunlight, so the image is pushed back
 *  far enough that the form always wins. The URL arrives as --auth-backdrop
 *  so the asset stays in TypeScript where the bundler can fingerprint it. */
export const AuthLayout = style({
  minHeight: '100%',
  backgroundColor: '#05070C',
  color: '#E8ECF3',
  padding: config.space.S400,
  paddingRight: config.space.S200,
  paddingBottom: 0,
  position: 'relative',
  backgroundImage: `linear-gradient(180deg, rgba(5,7,12,0.82) 0%, rgba(5,7,12,0.62) 38%, rgba(5,7,12,0.18) 72%, rgba(5,7,12,0.05) 100%), var(--auth-backdrop)`,
  backgroundSize: 'cover, cover',
  // The card lands top-left, so the scrim is heaviest there and lifts toward
  // the bottom — the Earth's lit limb is the reason to use this picture and
  // burying it under a flat wash would waste it.
  backgroundPosition: 'center, center bottom',
  // Not `fixed`: iOS repaints a fixed background on every scroll frame and it
  // stutters badly on exactly the devices this screen matters most on.
  backgroundAttachment: 'scroll, scroll',
  backgroundRepeat: 'no-repeat, no-repeat',
});

export const AuthCard = style({
  marginTop: '1vh',
  maxWidth: toRem(460),
  width: '100%',
  // Sits on the scene rather than punching a hole in it, but stays opaque
  // enough that the form is readable before the blur is even applied — the
  // blur is a finish, never the thing keeping the text legible.
  backgroundColor: 'rgba(13, 16, 23, 0.86)',
  backdropFilter: 'blur(18px) saturate(120%)',
  WebkitBackdropFilter: 'blur(18px) saturate(120%)',
  color: '#E8ECF3',
  borderRadius: config.radii.R400,
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  overflow: 'hidden',
});

export const AuthLogo = style([
  DefaultReset,
  {
    width: toRem(26),
    height: toRem(26),

    borderRadius: '50%',
  },
]);

export const AuthHeader = style({
  padding: `0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
});

export const AuthCardContent = style({
  maxWidth: toRem(402),
  width: '100%',
  margin: 'auto',
  padding: config.space.S400,
  paddingTop: config.space.S700,
  paddingBottom: toRem(44),
  gap: toRem(44),
});

export const AuthFooter = style({
  padding: config.space.S200,
});

/** The sign-in button is the first thing anyone is asked to press, and the
 *  theme's stock primary is a lavender that belongs to the upstream client,
 *  not to us. On a black-and-blue photograph it reads as somebody else's
 *  product. Scoped to the auth card so nothing else in the app shifts. */
globalStyle(`${AuthCard} button[type="submit"]`, {
  background: 'linear-gradient(90deg, #0098FF, #7B2BFF)',
  color: '#FFFFFF',
  border: 'none',
});

globalStyle(`${AuthCard} button[type="submit"]:hover`, {
  filter: 'brightness(1.08)',
});

globalStyle(`${AuthCard} button[type="submit"] span`, {
  color: '#FFFFFF',
});
