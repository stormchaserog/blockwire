import type { FormEventHandler } from 'react';
import { useCallback, useState } from 'react';
import { Box, color, Input, Text } from 'folds';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useAlive } from '$hooks/useAlive';
import { addProjectLink, type ProjectLinkRecord } from '$utils/blockwire/projects';
import { Button } from '$components/button';
import { Warning, sizedIcon } from '$components/icons/phosphor';

const LINK_TYPE_OPTIONS = ['website', 'x', 'reddit', 'github', 'other'] as const;

type AddProjectLinkFormProps = {
  projectId: number;
  onAdded: (link: ProjectLinkRecord) => void;
};

/** PRD §17 (Official Links Vault): "Critical links should be easy for
 *  members to find without searching chat history." OfficialLinksVault
 *  already renders these correctly once they exist -- the addProjectLink()
 *  call this form uses was already built and tested; there was simply no
 *  UI anywhere that called it, so the vault was permanently empty. */
export function AddProjectLinkForm({ projectId, onAdded }: AddProjectLinkFormProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const [linkType, setLinkType] = useState<string>('website');

  const [addState, add] = useAsyncCallback<
    ProjectLinkRecord,
    Error,
    [{ linkType: string; url: string }]
  >(
    useCallback(
      (data) => addProjectLink(mx, projectId, { linkType: data.linkType, url: data.url }),
      [mx, projectId]
    )
  );

  const loading = addState.status === AsyncStatus.Loading;
  const error = addState.status === AsyncStatus.Error ? addState.error : undefined;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (loading) return;
    const form = evt.currentTarget;
    const urlInput = form.urlInput as HTMLInputElement | undefined;
    const url = urlInput?.value.trim();
    if (!url || !urlInput) return;

    add({ linkType, url }).then((link) => {
      if (alive() && link) {
        urlInput.value = '';
        onAdded(link);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="300">
      <Box direction="Column" gap="100">
        <Text size="L400">Link Type</Text>
        <Box gap="100" style={{ flexWrap: 'wrap' }}>
          {LINK_TYPE_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="300"
              variant={linkType === option ? 'Primary' : 'Secondary'}
              radii="400"
              onClick={() => setLinkType(option)}
              disabled={loading}
            >
              <Text size="B300" truncate>
                {option === 'x' ? 'X' : option[0]!.toUpperCase() + option.slice(1)}
              </Text>
            </Button>
          ))}
        </Box>
      </Box>
      <Box direction="Column" gap="100">
        <Text size="L400">URL</Text>
        <Input
          required
          name="urlInput"
          type="url"
          size="400"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={loading}
          placeholder="https://..."
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
      <Box>
        <Button type="submit" size="400" variant="Primary" radii="400" loading={loading}>
          <Text size="B400">Add Link</Text>
        </Button>
      </Box>
    </Box>
  );
}
