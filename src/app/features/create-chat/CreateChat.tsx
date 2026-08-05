import { Box, color, config, Input, Menu, MenuItem, Scroll, Switch, Text, toRem } from 'folds';
import { sizedIcon, Warning } from '$components/icons/phosphor';
import type { ChangeEventHandler, FormEventHandler } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { ICreateRoomStateEvent } from '$types/matrix-sdk';
import { MatrixError, Preset, Visibility } from '$types/matrix-sdk';
import { useNavigate } from 'react-router-dom';
import { SettingTile } from '$components/setting-tile';
import { SequenceCard } from '$components/sequence-card';
import { addRoomIdToMDirect, getMxIdLocalPart } from '$utils/matrix';
import { useUserDirectorySearch } from '$hooks/useUserDirectorySearch';
import { completeUserId } from '$utils/userSearch';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { millisecondsToMinutes } from '$utils/common';
import { createRoomEncryptionState } from '$components/create-room';
import { useAlive } from '$hooks/useAlive';
import { getDirectRoomPath } from '$pages/pathUtils';
import { ErrorCode } from '../../cs-errorcode';
import { Button } from '$components/button';

type CreateChatProps = {
  defaultUserId?: string;
};
export function CreateChat({ defaultUserId }: CreateChatProps) {
  const mx = useMatrixClient();
  const alive = useAlive();
  const navigate = useNavigate();

  const [encryption, setEncryption] = useState(true);
  const [invalidUserId, setInvalidUserId] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Until now this field demanded a full "@name:server" and offered no way to
  // look anyone up, so finding a person you had not already messaged was
  // impossible. Now a bare handle is enough and the server's directory
  // suggests as you type.
  const { search, reset: resetSearch, results, homeServer } = useUserDirectorySearch();

  const [createState, create] = useAsyncCallback<string, Error | MatrixError, [string, boolean]>(
    useCallback(
      async (userId, encrypted) => {
        const initialState: ICreateRoomStateEvent[] = [];

        if (encrypted) initialState.push(createRoomEncryptionState());

        const result = await mx.createRoom({
          is_direct: true,
          invite: [userId],
          visibility: Visibility.Private,
          preset: Preset.TrustedPrivateChat,
          initial_state: initialState,
          creation_content: {
            additional_creators: [userId],
          },
        });

        addRoomIdToMDirect(mx, result.room_id, userId);

        return result.room_id;
      },
      [mx]
    )
  );
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const disabled = createState.status === AsyncStatus.Loading;

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setInvalidUserId(false);
    search(evt.currentTarget.value);
  };

  const handlePickUser = (userId: string) => {
    if (inputRef.current) {
      inputRef.current.value = userId;
      inputRef.current.focus();
    }
    resetSearch();
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    setInvalidUserId(false);

    const target = evt.target as HTMLFormElement | undefined;
    const userIdInput = target?.userIdInput as HTMLInputElement | undefined;
    const userId = userIdInput?.value.trim();

    if (!userIdInput || !userId) return;
    const fullUserId = completeUserId(userId, homeServer);
    if (!fullUserId) {
      setInvalidUserId(true);
      return;
    }

    create(fullUserId, encryption).then((roomId) => {
      if (alive()) {
        userIdInput.value = '';
        resetSearch();
        navigate(getDirectRoomPath(roomId));
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="L400">To</Text>
        <div style={{ position: 'relative' }}>
          <Input
            ref={inputRef}
            defaultValue={defaultUserId}
            placeholder="Search by name"
            name="userIdInput"
            variant="SurfaceVariant"
            size="500"
            radii="400"
            required
            autoFocus
            autoComplete="off"
            disabled={disabled}
            onChange={handleSearchChange}
          />
          {results.length > 0 && (
            <Menu style={{ position: 'absolute', top: '100%', zIndex: 1, width: '100%' }}>
              <Scroll size="300" style={{ maxHeight: toRem(220) }}>
                <div style={{ padding: config.space.S100 }}>
                  {results.map((user) => {
                    const username = getMxIdLocalPart(user.userId) ?? user.userId;
                    return (
                      <MenuItem
                        key={user.userId}
                        type="button"
                        size="300"
                        variant="Surface"
                        radii="300"
                        disabled={disabled}
                        onClick={() => handlePickUser(user.userId)}
                      >
                        <Box grow="Yes" direction="Column">
                          <Text size="T300" truncate>
                            <b>{user.displayName || username}</b>
                          </Text>
                          <Text size="T200" priority="300" truncate>
                            @{username}
                          </Text>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </div>
              </Scroll>
            </Menu>
          )}
        </div>
        {invalidUserId && (
          <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
            {sizedIcon(Warning, '50', { filled: true })}
            <Text size="T200" style={{ color: color.Critical.Main }}>
              <b>We couldn&apos;t find anyone by that name.</b>
            </Text>
          </Box>
        )}
      </Box>
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Options</Text>
        <SequenceCard
          style={{ padding: config.space.S300 }}
          variant="SurfaceVariant"
          direction="Column"
          gap="500"
        >
          <SettingTile
            title="End-to-End Encryption"
            description="Once this feature is enabled, it can't be disabled after the room is created."
            after={
              <Switch
                variant="Primary"
                value={encryption}
                onChange={setEncryption}
                disabled={disabled}
              />
            }
          />
        </SequenceCard>
      </Box>
      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          {sizedIcon(Warning, '100', { filled: true })}
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>
              {error instanceof MatrixError && error.name === (ErrorCode.M_LIMIT_EXCEEDED as string)
                ? `Server rate-limited your request for ${millisecondsToMinutes(
                    (error.data.retry_after_ms as number | undefined) ?? 0
                  )} minutes!`
                : error.message}
            </b>
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
          <Text size="B400">Create Chat</Text>
        </Button>
      </Box>
    </Box>
  );
}
