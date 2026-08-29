import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

/** Design-mock parity styles for the Project Info Sheet: centered hero,
 *  price card with sparkline, icon action tiles, and a details card with
 *  hairline row dividers. Kept in vanilla-extract (not inline styles) so
 *  hover/last-child states are expressible. */

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

export const HeroAvatar = style({
  width: '76px',
  height: '76px',
  borderRadius: '50%',
  overflow: 'hidden',
  flexShrink: 0,
  // Slightly floating above the sheet body, per the mock's overlapping
  // avatar treatment.
  marginTop: `calc(-1 * ${config.space.S200})`,
  border: `${config.borderWidth.B600} solid ${color.Surface.Container}`,
  boxShadow: `0 4px 16px 0 rgba(0, 0, 0, 0.35)`,
});

/** The Info tab's page-sized hero avatar per the locked mock (~88px),
 *  vs the sheet's more compact 76px. No negative top margin: the page
 *  hero sits in normal flow, not overlapping a sheet edge. */
export const HeroAvatarPage = style({
  width: '88px',
  height: '88px',
  borderRadius: '50%',
  overflow: 'hidden',
  flexShrink: 0,
  border: `${config.borderWidth.B600} solid ${color.Surface.Container}`,
  boxShadow: `0 4px 16px 0 rgba(0, 0, 0, 0.35)`,
});

export const HeroAvatarImg = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const VerifiedChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `${config.space.S100} ${config.space.S300}`,
  borderRadius: config.radii.Pill,
  backgroundColor: color.Success.Container,
  color: color.Success.OnContainer,
});

export const PriceCard = style({
  padding: config.space.S400,
  borderRadius: config.radii.R400,
  backgroundColor: color.SurfaceVariant.Container,
});

export const ActionTile = style({
  padding: `${config.space.S300} ${config.space.S100}`,
  borderRadius: config.radii.R400,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: 'none',
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: color.SurfaceVariant.ContainerHover,
    },
    '&:active': {
      backgroundColor: color.SurfaceVariant.ContainerActive,
    },
  },
});

export const DetailsCard = style({
  padding: `0 ${config.space.S400}`,
  borderRadius: config.radii.R400,
  backgroundColor: color.SurfaceVariant.Container,
});

export const DetailRow = style({
  padding: `${config.space.S300} 0`,
  borderBottom: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const DetailLink = style({
  color: color.Primary.Main,
  textDecoration: 'none',
});
