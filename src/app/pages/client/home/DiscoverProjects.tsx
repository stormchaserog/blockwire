import { useNavigate } from 'react-router-dom';
import { Box, Text, color } from 'folds';
import { getExplorePath } from '$pages/pathUtils';
import { sizedIcon, Rocket } from '$components/icons/phosphor';
import * as css from './HomeCommunityCards.css';

/** Design mock ("image 3"): the old avatar-rail Discover row is replaced by
 *  a single banner card -- rocket icon in a rounded purple-tinted square,
 *  title + subline, and a pill-shaped purple-outline "Explore" button that
 *  jumps to the existing Discover route. Static chrome, so unlike the old
 *  rail there is no directory fetch here at all -- the Discover tab itself
 *  owns the real project list. */
export function DiscoverProjects() {
  const navigate = useNavigate();

  return (
    <Box className={css.CommunityCard} alignItems="Center" gap="300">
      <div className={css.DiscoverBannerIcon}>{sizedIcon(Rocket, '100')}</div>
      <Box grow="Yes" direction="Column" gap="0">
        <Text size="T400">
          <b>Discover Projects</b>
        </Text>
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Find trending crypto projects and growing communities.
        </Text>
      </Box>
      <Text
        as="button"
        type="button"
        size="B300"
        className={css.ExploreButton}
        onClick={() => navigate(getExplorePath())}
      >
        Explore
      </Text>
    </Box>
  );
}
