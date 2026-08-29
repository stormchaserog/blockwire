import { Box, Button, IconButton, Text } from 'folds';
import { X, sizedIcon } from '$components/icons/phosphor';
import type {
  ProjectChainAsset,
  ProjectLinkRecord,
  ProjectRecord,
} from '$utils/blockwire/projects';
import { ProjectInfoOverview } from './ProjectInfoOverview';
import * as css from './ProjectInfoSheet.css';

export type ProjectInfoSheetProps = {
  project: ProjectRecord;
  chainAssets: ProjectChainAsset[];
  links: ProjectLinkRecord[];
  selectedAsset: ProjectChainAsset | null;
  spaceRoomId: string;
  onClose: () => void;
};

/** Project Info Sheet: the bottom sheet a room header tap opens inside a
 *  project-bound space. Identity, live price, quick actions, and the
 *  details list (contract, chain, explorer, website, X, first seen) --
 *  the "who am I actually in a room with" summary, one tap away, without
 *  leaving the conversation.
 *
 *  The body is the shared ProjectInfoOverview -- the SAME component the
 *  project page's Info tab renders -- so the sheet and the page can never
 *  drift apart. This wrapper only owns sheet chrome: the close icon and
 *  the Close button -- the tiles act in place (Buy Feed opens its own
 *  sheet, Info scrolls), so nothing here needs to close-before-navigate. */
export function ProjectInfoSheet({
  project,
  chainAssets,
  links,
  selectedAsset,
  spaceRoomId,
  onClose,
}: ProjectInfoSheetProps) {
  return (
    <Box direction="Column" gap="400" className={css.Sheet}>
      <IconButton
        className={css.CloseIconButton}
        size="300"
        variant="Background"
        radii="Pill"
        aria-label="Close"
        onClick={onClose}
      >
        {sizedIcon(X, '100')}
      </IconButton>

      <ProjectInfoOverview
        project={project}
        chainAssets={chainAssets}
        links={links}
        selectedAsset={selectedAsset}
        spaceRoomId={spaceRoomId}
        variant="sheet"
      />

      <Button
        type="button"
        size="400"
        variant="Secondary"
        fill="Soft"
        radii="400"
        onClick={onClose}
      >
        <Text size="B400">Close</Text>
      </Button>
    </Box>
  );
}
