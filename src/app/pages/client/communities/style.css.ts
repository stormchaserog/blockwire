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
