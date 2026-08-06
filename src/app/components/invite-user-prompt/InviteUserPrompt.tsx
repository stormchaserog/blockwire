import type { ChangeEventHandler, FormEventHandler, KeyboardEventHandler } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Box,
  Header,
  config,
  Text,
  IconButton,
  Input,
  TextArea,
  Dialog,
  Menu,
  toRem,
  Scroll,
  MenuItem,
} from 'folds';
import type { Room } from '$types/matrix-sdk';
import { isKeyHotkey } from 'is-hotkey';
import FocusTrap from 'focus-trap-react';
import { stopPropagation } from '$utils/keyboard';
import { useDirectUsers } from '$hooks/useDirectUsers';
import { getMxIdLocalPart } from '$utils/matrix';
import { useUserDirectorySearch } from '$hooks/useUserDirectorySearch';
import { completeUserId } from '$utils/userSearch';
import { highlightText, makeHighlightRegex } from '$plugins/react-custom-html-parser';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { AsyncError } from '$components/AsyncError';
import { composerIcon, X } from '$components/icons/phosphor';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useAlive } from '$hooks/useAlive';
import { getMxIdServer } from '$utils/mxIdHelper';
import { KnownMembership } from '$types/matrix-sdk';
import { Button } from '$components/button';

type InviteUserProps = {
  room: Room;
  requestClose: () => void;
};
export function InviteUserPrompt({ room, requestClose }: InviteUserProps) {
  const mx = useMatrixClient();
  const alive = useAlive();

  const inputRef = useRef<HTMLInputElement>(null);
  const directUsers = useDirectUsers();
  const [validUserId, setValidUserId] = useState<string>();

  // People already in the room are not candidates to invite.
  const knownUsers = useMemo(
    () =>
      directUsers
        .filter((userId) => room.getMember(userId)?.membership !== KnownMembership.Join)
        .map((userId) => ({ userId })),
    [directUsers, room]
  );

  const {
    term,
    search,
    reset: resetSearch,
    results,
    homeServer,
  } = useUserDirectorySearch(knownUsers);

  // Someone already in the room can still surface from the directory; drop
  // them rather than offering an invite that would fail.
  const suggestions = useMemo(
    () =>
      results.filter((user) => room.getMember(user.userId)?.membership !== KnownMembership.Join),
    [results, room]
  );

  const queryHighlighRegex = term.trim()
    ? makeHighlightRegex(term.trim().replace(/^@/, '').split(' '))
    : undefined;

  const [inviteState, invite] = useAsyncCallback<void, Error, [string, string | undefined]>(
    useCallback(
      async (userId, reason) => {
        await mx.invite(room.roomId, userId, reason);
      },
      [mx, room]
    )
  );

  const inviting = inviteState.status === AsyncStatus.Loading;

  const handleReset = () => {
    if (inputRef.current) inputRef.current.value = '';
    setValidUserId(undefined);
    resetSearch();
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const target = evt.target as HTMLFormElement | undefined;

    if (inviting || !validUserId) return;

    const reasonInput = target?.reasonInput as HTMLTextAreaElement | undefined;
    const reason = reasonInput?.value.trim();

    invite(validUserId, reason || undefined).then(() => {
      if (alive()) {
        handleReset();
        if (reasonInput) reasonInput.value = '';
      }
    });
  };

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const value = evt.currentTarget.value.trim();
    // A bare handle is a valid thing to submit — it just needs our server
    // filling in — so the Invite button unlocks as soon as what was typed
    // could name somebody, while the directory keeps suggesting below.
    setValidUserId(completeUserId(value, homeServer));
    search(value);
  };

  const handleUserId = (userId: string) => {
    if (inputRef.current) {
      inputRef.current.value = userId;
      setValidUserId(userId);
      resetSearch();
      inputRef.current.focus();
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('escape', evt)) {
      resetSearch();
      return;
    }
    if (isKeyHotkey('tab', evt) && suggestions.length > 0) {
      evt.preventDefault();
      const first = suggestions[0];
      if (!first) return;
      handleUserId(first.userId);
    }
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => inputRef.current,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog>
            <Box grow="Yes" direction="Column">
              <Header
                size="500"
                style={{ padding: `0 ${config.space.S200} 0 ${config.space.S400}` }}
              >
                <Box grow="Yes">
                  <Text size="H4" truncate>
                    Invite
                  </Text>
                </Box>
                <Box shrink="No">
                  <IconButton size="300" radii="300" onClick={requestClose}>
                    {composerIcon(X)}
                  </IconButton>
                </Box>
              </Header>
              <Box
                as="form"
                onSubmit={handleSubmit}
                shrink="No"
                style={{ padding: config.space.S400 }}
                direction="Column"
                gap="400"
              >
                <Box direction="Column" gap="100">
                  <Text size="L400">User ID</Text>
                  <div>
                    <Input
                      size="500"
                      ref={inputRef}
                      onChange={handleSearchChange}
                      onKeyDown={handleKeyDown}
                      placeholder="@username:server"
                      name="userIdInput"
                      variant="Background"
                      disabled={inviting}
                      autoComplete="off"
                      required
                    />
                    {suggestions.length > 0 && (
                      <FocusTrap
                        focusTrapOptions={{
                          initialFocus: false,
                          onDeactivate: resetSearch,
                          returnFocusOnDeactivate: false,
                          clickOutsideDeactivates: true,
                          allowOutsideClick: true,
                          isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
                          isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
                          escapeDeactivates: stopPropagation,
                        }}
                      >
                        <Box style={{ position: 'relative' }}>
                          <Menu
                            style={{
                              position: 'absolute',
                              top: 0,
                              zIndex: 1,
                              width: '100%',
                            }}
                          >
                            <Scroll size="300" style={{ maxHeight: toRem(100) }}>
                              <div
                                style={{
                                  padding: config.space.S100,
                                }}
                              >
                                {suggestions.map((user) => {
                                  const username = getMxIdLocalPart(user.userId) ?? user.userId;
                                  const label = user.displayName || username;
                                  const userServer = getMxIdServer(user.userId);

                                  return (
                                    <MenuItem
                                      key={user.userId}
                                      type="button"
                                      size="300"
                                      variant="Surface"
                                      radii="300"
                                      onClick={() => handleUserId(user.userId)}
                                      after={
                                        <Text size="T200" truncate>
                                          {userServer}
                                        </Text>
                                      }
                                      disabled={inviting}
                                    >
                                      <Box grow="Yes">
                                        <Text size="T300" truncate>
                                          <b>
                                            {queryHighlighRegex
                                              ? highlightText(queryHighlighRegex, [label])
                                              : label}
                                          </b>
                                        </Text>
                                      </Box>
                                    </MenuItem>
                                  );
                                })}
                              </div>
                            </Scroll>
                          </Menu>
                        </Box>
                      </FocusTrap>
                    )}
                  </div>
                </Box>
                <Box direction="Column" gap="100">
                  <Text size="L400">Reason (Optional)</Text>
                  <TextArea
                    size="500"
                    name="reasonInput"
                    variant="Background"
                    rows={4}
                    resize="None"
                  />
                </Box>
                <AsyncError state={inviteState} bold />
                <Button
                  type="submit"
                  loading={inviting}
                  spinnerSize="200"
                  spinnerVariant="Primary"
                  spinnerFill="Solid"
                  disabled={!validUserId}
                >
                  <Text size="B400">Invite</Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
