import { Box, config } from 'folds';
import { Page, PageHero, PageHeroSection } from '$components/page';
import { versionLabel } from '$utils/platform';
import LogoSVG from '$public/res/svg/logo.svg';

/* The AGPL source offer deliberately does not live here: the welcome screen is
 * product surface, not a compliance surface. The offer stays discharged by the
 * /source page and the Settings > About link. */
export function WelcomePage() {
  return (
    <Page>
      <Box
        grow="Yes"
        style={{ padding: config.space.S400, paddingBottom: config.space.S700 }}
        alignItems="Center"
        justifyContent="Center"
      >
        <PageHeroSection>
          <PageHero
            icon={<img width="70" height="70" src={LogoSVG} alt={SABLE_PRODUCT_NAME} />}
            title={`Welcome to ${SABLE_PRODUCT_NAME}`}
            subTitle={
              <span>Private groups, public channels and direct messages. {versionLabel()}</span>
            }
          />
        </PageHeroSection>
      </Box>
    </Page>
  );
}
