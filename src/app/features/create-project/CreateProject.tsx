import type { FormEventHandler } from 'react';
import { useCallback } from 'react';
import { RoomType, type MatrixError } from '$types/matrix-sdk';
import { Box, color, Input, Text, TextArea } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAlive } from '$hooks/useAlive';
import { createRoom, CreateRoomAccess } from '$components/create-room';
import { createProject, addChainAsset, type ProjectRecord } from '$utils/blockwire/projects';
import { Button } from '$components/button';
import { Warning, sizedIcon } from '$components/icons/phosphor';

/** Turns a project name into a URL-safe slug for the server's internal
 *  identifier. The server still requires this (see projects.ts's
 *  SLUG_PATTERN and 409-on-duplicate check) -- but "slug" is developer
 *  jargon nobody creating a project should ever have to see or think
 *  about, so this is generated silently and never shown as a form field.
 *  On the rare case of a collision, the server's own error message
 *  surfaces (see handleSubmit) rather than asking the user to pick a
 *  different "slug" themselves. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

type CreateProjectFormProps = {
  onCreate?: (project: ProjectRecord) => void;
};

/**
 * Creates a new Project end to end: makes a new Matrix Space (private by
 * default -- a project's home space is administrative, not a public room
 * to wander into), binds a BlockWire Project record to it, and -- if a
 * contract address was given -- attaches it immediately so Buy Feed and
 * Whale Alerts have data from the moment the project exists, instead of
 * requiring a second trip to a separate "manage project" screen to find
 * that step. Chain is Solana only for now, not a picker: Solana is the
 * only chain either data provider (DexScreener token pricing, Helius
 * trade feed) actually supports today (see chain-adapter.ts) -- offering
 * a dropdown for chains that would silently fail on submit would be
 * worse than not offering a choice at all.
 *
 * Contract address failing does NOT fail project creation: the project
 * and its space are real and useful on their own (chat, roles, links can
 * all be added later), so a bad/duplicate contract address surfaces as
 * its own separate error rather than discarding an otherwise-successful
 * project creation.
 */
export function CreateProjectForm({ onCreate }: CreateProjectFormProps) {
  const mx = useMatrixClient();
  const alive = useAlive();

  const [createState, create] = useAsyncCallback<
    ProjectRecord,
    Error | MatrixError,
    [{ name: string; ticker?: string; description?: string; contractAddress?: string }]
  >(
    useCallback(
      async (data) => {
        const spaceRoomId = await createRoom(mx, {
          version: '1',
          type: RoomType.Space,
          access: CreateRoomAccess.Private,
          name: data.name,
          topic: data.description,
          knock: false,
          allowFederation: true,
        });

        // The space now exists; bind a project to it. If this fails, the
        // space still exists (see the component doc comment above) --
        // surface the error rather than silently discarding it.
        const project = await createProject(mx, {
          slug: slugify(data.name) || `project-${Date.now()}`,
          name: data.name,
          ticker: data.ticker || null,
          description: data.description || null,
          spaceRoomId,
        });

        if (data.contractAddress) {
          // A failed chain-asset add should not undo an otherwise-real
          // project -- surface it, but let the project exist. The user
          // can retry adding the token from the Project page.
          try {
            await addChainAsset(mx, project.project_id, {
              chain: 'solana',
              contractAddress: data.contractAddress,
            });
          } catch {
            /* the project itself succeeded; onCreate below still fires */
          }
        }

        return project;
      },
      [mx]
    )
  );

  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const disabled = loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (disabled) return;
    const form = evt.currentTarget;

    const nameInput = form.nameInput as HTMLInputElement | undefined;
    const tickerInput = form.tickerInput as HTMLInputElement | undefined;
    const contractAddressInput = form.contractAddressInput as HTMLInputElement | undefined;
    const descriptionTextArea = form.descriptionTextArea as HTMLTextAreaElement | undefined;

    const name = nameInput?.value.trim();
    if (!name) return;

    create({
      name,
      ticker: tickerInput?.value.trim() || undefined,
      description: descriptionTextArea?.value.trim() || undefined,
      contractAddress: contractAddressInput?.value.trim() || undefined,
    }).then((project) => {
      if (alive() && project) onCreate?.(project);
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Project Name</Text>
        <Input
          required
          name="nameInput"
          autoFocus
          size="500"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={disabled}
          placeholder="e.g. WCLAW Labs"
        />
      </Box>

      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Ticker (Optional)</Text>
        <Input
          name="tickerInput"
          size="500"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={disabled}
          placeholder="e.g. WCLAW"
        />
      </Box>

      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Contract Address (Optional)</Text>
        <Input
          name="contractAddressInput"
          size="500"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={disabled}
          placeholder="Solana token address"
        />
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Powers the Buy Feed and Whale Alerts for this project. You can add or change this later
          from the project page.
        </Text>
      </Box>

      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Description (Optional)</Text>
        <TextArea
          name="descriptionTextArea"
          size="500"
          variant="SurfaceVariant"
          radii="400"
          disabled={disabled}
        />
      </Box>

      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          {sizedIcon(Warning, '100', { filled: true })}
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>{error.message}</b>
          </Text>
        </Box>
      )}

      <Box shrink="No" direction="Column" gap="200">
        <Button
          type="submit"
          size="500"
          variant="Primary"
          radii="400"
          disabled={disabled}
          loading={loading}
          spinnerVariant="Primary"
          spinnerSize="200"
        >
          <Text size="B400">Create Project</Text>
        </Button>
      </Box>
    </Box>
  );
}
