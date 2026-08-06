import { style, globalStyle } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const PolicyDocument = style({
  maxWidth: '42rem',
  width: '100%',
  lineHeight: 1.6,
});

globalStyle(`${PolicyDocument} h1`, {
  fontSize: config.fontSize.H3,
  lineHeight: config.lineHeight.H3,
  marginBottom: config.space.S400,
});

globalStyle(`${PolicyDocument} h2`, {
  fontSize: config.fontSize.H5,
  lineHeight: config.lineHeight.H5,
  marginTop: config.space.S500,
  marginBottom: config.space.S200,
});

globalStyle(`${PolicyDocument} h3`, {
  fontSize: config.fontSize.H6,
  lineHeight: config.lineHeight.H6,
  marginTop: config.space.S400,
  marginBottom: config.space.S200,
});

globalStyle(`${PolicyDocument} p`, {
  marginBottom: config.space.S300,
});

globalStyle(`${PolicyDocument} ul, ${PolicyDocument} ol`, {
  paddingLeft: config.space.S600,
  marginBottom: config.space.S300,
});

globalStyle(`${PolicyDocument} li`, {
  marginBottom: config.space.S100,
});

globalStyle(`${PolicyDocument} a`, {
  color: color.Primary.Main,
});
