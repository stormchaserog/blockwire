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

export const ChipRow = style({
  display: 'flex',
  flexDirection: 'row',
  gap: config.space.S200,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '::-webkit-scrollbar': {
    display: 'none',
  },
});

export const FilterChip = style({
  flexShrink: 0,
  padding: `${config.space.S100} ${config.space.S300}`,
  borderRadius: config.radii.Pill,
  border: 'none',
  cursor: 'pointer',
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  selectors: {
    '&[aria-pressed="true"]': {
      backgroundColor: color.Primary.Main,
      color: color.Primary.OnMain,
    },
  },
});
