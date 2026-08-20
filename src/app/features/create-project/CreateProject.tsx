import type { FormEventHandler, ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import { RoomType, type MatrixError } from '$types/matrix-sdk';
import { Box, color, Input, Text, TextArea } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAlive } from '$hooks/useAlive';
import { createRoom, CreateRoomAccess } from '$components/create-room';
import { createProject, type ProjectRecord } from '$utils/blockwire/projects';
import { Button } from '$components/button';
import { Warning, sizedIcon } from '$components/icons/phosphor';

/** Turns a project name into a URL-safe slug candidate. The server is the
 *  final authority on validity/uniqueness (see projects.ts's SLUG_PATTERN
 *  and the 409-on-duplicate check) — this is only a starting point the user
 *  can edit, never something the client asserts is already correct. */
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
 * default — a project's home space is administrative, not a public room to
 * wander into), then binds a BlockWire Project record to it.
 *
 * These are two separate network calls with two separate failure modes:
 * if the space is created but the project bind fails (e.g. a slug
 * collision), the user is left with a bare, unbound space rather than a
 * silently half-finished project. That's surfaced explicitly rather than
 * papered over, since automatically deleting the space on failure would be
 * a surprising side effect of a form validation error.
 */
export function CreateProjectForm({ onCreate }: CreateProjectFormProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugValue, setSlugValue] = useState('');

  const [createState, create] = useAsyncCallback<
    ProjectRecord,
    Error | MatrixError,
    [{ name: string; slug: string; ticker?: string; description?: string }]
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
        // space still exists (see the component doc comment above) — surface
        // the error rather than silently discarding it.
        return createProject(mx, {
          slug: data.slug,
          name: data.name,
          ticker: data.ticker || null,
          description: data.description || null,
          spaceRoomId,
        });
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
    const slugInput = form.slugInput as HTMLInputElement | undefined;
    const tickerInput = form.tickerInput as HTMLInputElement | undefined;
    const descriptionTextArea = form.descriptionTextArea as HTMLTextAreaElement | undefined;

    const name = nameInput?.value.trim();
    const slug = slugInput?.value.trim();
    if (!name || !slug) return;

    create({
      name,
      slug,
      ticker: tickerInput?.value.trim() || undefined,
      description: descriptionTextArea?.value.trim() || undefined,
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
          onChange={(evt: ChangeEvent<HTMLInputElement>) => {
            if (!slugTouched) setSlugValue(slugify(evt.target.value));
          }}
        />
      </Box>

      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Project Slug</Text>
        <Input
          required
          name="slugInput"
          size="500"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={disabled}
          value={slugValue}
          onChange={(evt: ChangeEvent<HTMLInputElement>) => {
            setSlugTouched(true);
            setSlugValue(slugify(evt.target.value));
          }}
        />
        <Text size="T200" style={{ color: color.Surface.OnContainer }}>
          Used in the project&apos;s URL. Lowercase letters, numbers, and hyphens only.
        </Text>
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
        />
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
