import { Box, Button, Text, config, toRem } from 'folds';
import { Code, menuIcon } from '$components/icons/phosphor';
import { Page, PageHero, PageHeroSection } from '$components/page';
import { versionLabel } from '$utils/platform';
import LogoSVG from '$public/res/svg/logo.svg';

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
              <span>
                Private groups, public channels and direct messages.{' '}
                <a
                  href="https://github.com/SableClient/Sable"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {versionLabel()}
                </a>
              </span>
            }
          >
            <Box justifyContent="Center">
              <Box grow="Yes" style={{ maxWidth: toRem(300) }} direction="Column" gap="300">
                <Button
                  as="a"
                  href="https://github.com/SableClient/Sable"
                  target="_blank"
                  rel="noreferrer noopener"
                  before={menuIcon(Code)}
                >
                  <Text as="span" size="B400" truncate>
                    Source Code
                  </Text>
                </Button>
              </Box>
            </Box>
            <Box direction="Column" gap="200" alignItems="Center"></Box>
          </PageHero>
        </PageHeroSection>
      </Box>
    </Page>
  );
}
