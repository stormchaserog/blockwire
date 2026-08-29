import { useNavigate } from 'react-router-dom';
import { Box } from 'folds';
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
      <div className={css.DiscoverBannerIcon}>{sizedIcon(Rocket, '200')}</div>
      <Box grow="Yes" direction="Column" gap="0">
        <span className={css.DiscoverTitle}>Discover Projects</span>
        <span className={css.DiscoverSubline}>
          Find trending crypto projects and growing communities.
        </span>
      </Box>
      <button
        type="button"
        className={css.ExploreButton}
        onClick={() => navigate(getExplorePath())}
      >
        Explore
      </button>
    </Box>
  );
}
