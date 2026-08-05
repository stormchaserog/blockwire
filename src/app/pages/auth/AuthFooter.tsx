import { Box, Text } from 'folds';
import { versionLabel } from '$utils/platform';
import * as css from './styles.css';

/** Footer of the sign-in screens.
 *
 *  Only BlockWire belongs on this page — a login screen advertising the
 *  upstream client and the protocol is three brands competing for the one
 *  moment a new person is deciding what this app is.
 *
 *  The source link stays. BlockWire is built on Sable, which is AGPL-3.0, and
 *  §13 of that licence requires offering the source to anyone who uses the app
 *  over a network. That obligation is not optional and not something branding
 *  gets to remove; the attribution itself lives in Settings > About, where it
 *  is honest without being the first thing anyone reads.
 */
export function AuthFooter() {
  return (
    <Box className={css.AuthFooter} justifyContent="Center" gap="400" wrap="Wrap">
      <Text
        as="a"
        size="T300"
        href="https://github.com/SableClient/Sable"
        target="_blank"
        rel="noreferrer"
      >
        {versionLabel()}
      </Text>
    </Box>
  );
}
