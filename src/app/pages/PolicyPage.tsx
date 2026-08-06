import { useMemo } from 'react';
import { Box, Text, config } from 'folds';
import { Link } from 'react-router-dom';
import { Marked } from 'marked';
import { sanitizeCustomHtml } from '$utils/sanitize';
import { ROOT_PATH } from '$pages/paths';
import privacyMd from '../../../docs/PRIVACY.md?raw';
import termsMd from '../../../docs/TERMS.md?raw';
import * as css from './PolicyPage.css';

/** Legal pages at stable, guessable URLs, reachable without an account.
 *
 *  Apple and Google both require a public privacy-policy URL to list the app,
 *  and Apple's UGC guideline additionally wants published terms and a way to
 *  reach the moderators. The documents live in docs/ as the single source of
 *  truth — this page renders them, so the site and the repo cannot drift.
 */
function PolicyPage({ markdown }: { markdown: string }) {
  const html = useMemo(() => {
    const rendered = new Marked().parse(markdown, { async: false });
    return sanitizeCustomHtml(rendered);
  }, [markdown]);

  return (
    <Box
      grow="Yes"
      direction="Column"
      alignItems="Center"
      style={{ padding: config.space.S500, overflow: 'auto' }}
    >
      <Box direction="Column" gap="500" style={{ maxWidth: '42rem', width: '100%' }}>
        <Text
          as="div"
          size="T300"
          className={css.PolicyDocument}
          // Repo-controlled markdown, rendered and then sanitized with the
          // same sanitizer used for remote message HTML.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <Box>
          <Text size="T300">
            <Link to={ROOT_PATH}>Back to {SABLE_PRODUCT_NAME}</Link>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function PrivacyPolicy() {
  return <PolicyPage markdown={privacyMd} />;
}

export function TermsOfService() {
  return <PolicyPage markdown={termsMd} />;
}
