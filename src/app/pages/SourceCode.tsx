import { Box, Text, config } from 'folds';
import { Link } from 'react-router-dom';
import { ROOT_PATH } from '$pages/paths';
import { BLOCKWIRE_SOURCE_URL } from '$utils/blockwire/source';

/** The source offer required by AGPL-3.0 §13.
 *
 *  BlockWire is a derivative work of Sable, which is AGPL-3.0. §13 requires
 *  that anyone who interacts with the software *over a network* be offered the
 *  corresponding source — it is not satisfied by shipping a licence file
 *  somewhere in a repository nobody is told about.
 *
 *  So this is a real page at a stable, guessable URL, linked from Settings and
 *  reachable without an account. Compliance is a thing you can point at, not a
 *  thing you assert.
 */
export function SourceCode() {
  return (
    <Box
      grow="Yes"
      direction="Column"
      alignItems="Center"
      style={{ padding: config.space.S500, overflow: 'auto' }}
    >
      <Box direction="Column" gap="500" style={{ maxWidth: '42rem', width: '100%' }}>
        <Box direction="Column" gap="200">
          <Text size="H3">Source code</Text>
          <Text size="T300" priority="300">
            {SABLE_PRODUCT_NAME} is free software. You are entitled to its source code, and this
            page is how we hand it over.
          </Text>
        </Box>

        <Box direction="Column" gap="200">
          <Text size="H5">The client</Text>
          <Text size="T300" priority="300">
            The source for the version you are running is at{' '}
            <a href={BLOCKWIRE_SOURCE_URL} target="_blank" rel="noreferrer noopener">
              {BLOCKWIRE_SOURCE_URL.replace('https://', '')}
            </a>
            . It is licensed under the{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noreferrer noopener"
            >
              GNU Affero General Public License v3.0
            </a>
            , as a modified version of{' '}
            <a
              href="https://github.com/SableClient/Sable"
              target="_blank"
              rel="noreferrer noopener"
            >
              Sable
            </a>
            , whose licence our modifications inherit.
          </Text>
        </Box>

        <Box direction="Column" gap="200">
          <Text size="H5">What that means for you</Text>
          <Text size="T300" priority="300">
            You may run it, read it, change it, and share it — including running your own
            {` ${SABLE_PRODUCT_NAME}`}. If you distribute a modified version, or offer one over a
            network, you must offer its source under the same terms.
          </Text>
        </Box>

        <Box direction="Column" gap="200">
          <Text size="H5">The rest of the stack</Text>
          <Text size="T300" priority="300">
            The bot gateway, push service and calls backend are our own work and are not derived
            from Sable. They are not covered by the AGPL and are not published here.
          </Text>
        </Box>

        <Box direction="Column" gap="200">
          <Text size="H5">Trouble getting it?</Text>
          <Text size="T300" priority="300">
            If the link above ever fails, the offer still stands — write to us and we will send you
            the corresponding source for the version you are running.
          </Text>
        </Box>

        <Box>
          <Text size="T300">
            <Link to={ROOT_PATH}>Back to {SABLE_PRODUCT_NAME}</Link>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
