import { useState } from 'react';
import { Text } from 'folds';
import { ModalOverlay } from '$components/modal-overlay/ModalOverlay';
import { useProjectIdentity } from './useProjectIdentity';
import { ProjectInfoSheet } from './ProjectInfoSheet';

export type RoomHeaderProjectNameProps = {
  /** The parent space's room id, or null when the room isn't inside a
   *  space at all (Home rooms, DMs) -- in that case this renders the
   *  exact same plain title the header always had. */
  spaceRoomId: string | null;
  name: string;
  textSize: 'H5' | 'H3';
};

/** The room header's title, upgraded to a Project Info Sheet trigger when
 *  the room lives inside a project-bound space (Bible §12: project
 *  identity should be one tap away from the conversation, not buried).
 *
 *  Split in two so the identity fetch hook is only mounted when there is
 *  a space to check -- hooks can't be called conditionally, but a
 *  component can be. Rooms outside any space, and rooms in spaces with
 *  no bound project, keep the untouched non-interactive title: no new
 *  tap target appears unless there is genuinely a sheet to open. */
export function RoomHeaderProjectName({ spaceRoomId, name, textSize }: RoomHeaderProjectNameProps) {
  if (!spaceRoomId) {
    return (
      <Text size={textSize} truncate>
        {name}
      </Text>
    );
  }
  return <ProjectBoundHeaderName spaceRoomId={spaceRoomId} name={name} textSize={textSize} />;
}

function ProjectBoundHeaderName({
  spaceRoomId,
  name,
  textSize,
}: RoomHeaderProjectNameProps & { spaceRoomId: string }) {
  const { project, chainAssets, links, selectedAsset } = useProjectIdentity(spaceRoomId);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Loading and no-project both render the plain title; a header must
  // never flash a disabled-looking state while the check is in flight.
  if (!project) {
    return (
      <Text size={textSize} truncate>
        {name}
      </Text>
    );
  }

  return (
    <>
      <Text
        as="button"
        type="button"
        size={textSize}
        truncate
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
        }}
      >
        {name}
      </Text>
      <ModalOverlay
        open={sheetOpen}
        requestClose={() => setSheetOpen(false)}
        mobile="sheet"
        size="400"
      >
        <ProjectInfoSheet
          project={project}
          chainAssets={chainAssets}
          links={links}
          selectedAsset={selectedAsset}
          spaceRoomId={spaceRoomId}
          onClose={() => setSheetOpen(false)}
        />
      </ModalOverlay>
    </>
  );
}
