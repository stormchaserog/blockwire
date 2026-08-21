import { useState } from 'react';
import { Box, Text, color, config } from 'folds';
import { CaretDown, CaretRight, sizedIcon } from '$components/icons/phosphor';
import { AddChainAssetForm } from './AddChainAssetForm';
import { AddProjectLinkForm } from './AddProjectLinkForm';

type ManageProjectPanelProps = {
  projectId: number;
  onDetailsChanged: () => void;
};

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Box direction="Column" gap="200">
      <Box
        as="button"
        type="button"
        alignItems="Center"
        gap="100"
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        {sizedIcon(open ? CaretDown : CaretRight, '50')}
        <Text size="L400">{title}</Text>
      </Box>
      {open && (
        <Box
          direction="Column"
          style={{
            background: color.SurfaceVariant.Container,
            borderRadius: config.radii.R400,
            padding: config.space.S400,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}

/** Bible/PRD gap this closes: addChainAsset() and addProjectLink() were
 *  built, tested, and wired into the server months before any UI called
 *  them -- Buy Feed, Whale Alerts, and the Official Links Vault were all
 *  correctly implemented but permanently empty because there was no form
 *  anywhere to give a project a token or a link. This panel is that form,
 *  gated to users who can already edit this room's settings (the same
 *  power-level threshold General.tsx uses for RoomProfile) since adding a
 *  contract address or official link is a project-management action, not
 *  something every member should see. */
export function ManageProjectPanel({ projectId, onDetailsChanged }: ManageProjectPanelProps) {
  return (
    <Box
      direction="Column"
      gap="400"
      style={{
        border: `1px solid ${color.Surface.ContainerLine}`,
        borderRadius: config.radii.R400,
        padding: config.space.S400,
      }}
    >
      <Text size="H6">Manage Project</Text>
      <CollapsibleSection title="Add a Token">
        <AddChainAssetForm projectId={projectId} onAdded={() => onDetailsChanged()} />
      </CollapsibleSection>
      <CollapsibleSection title="Add an Official Link">
        <AddProjectLinkForm projectId={projectId} onAdded={() => onDetailsChanged()} />
      </CollapsibleSection>
    </Box>
  );
}
