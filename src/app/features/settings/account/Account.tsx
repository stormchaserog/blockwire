import { Box, Scroll } from 'folds';
import { PageContent, SettingsSectionPage } from '$components/page';
import { MatrixId } from './MatrixId';
import { Profile } from './Profile';
import { ContactInformation } from './ContactInfo';
import { IgnoredUserList } from './IgnoredUserList';
import { DeactivateAccount } from './DeactivateAccount';

type AccountProps = {
  requestBack?: () => void;
  requestClose: () => void;
};
export function Account({ requestBack, requestClose }: AccountProps) {
  return (
    <SettingsSectionPage title="Account" requestBack={requestBack} requestClose={requestClose}>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Profile />
              <MatrixId />
              <ContactInformation />
              <IgnoredUserList />
              <DeactivateAccount />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </SettingsSectionPage>
  );
}
