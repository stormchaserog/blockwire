import type { ChangeEventHandler } from 'react';
import { useCallback, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isTauri } from '@tauri-apps/api/core';
import { Box, Checkbox, Dialog, Header, Input, Text, color, config } from 'folds';
import type { AuthDict, MatrixError, UIAFlow } from '$types/matrix-sdk';
import { SequenceCard, SequenceCardStyle } from '$components/sequence-card';
import { SettingTile } from '$components/setting-tile';
import { ActionUIA, ActionUIAFlowsLoader } from '$components/ActionUIA';
import { ModalOverlay } from '$components/modal-overlay/ModalOverlay';
import { AsyncError } from '$components/AsyncError';
import { Button } from '$components/button';
import { AsyncStatus, useAsync } from '$hooks/useAsyncCallback';
import type { AsyncState } from '$hooks/useAsyncCallback';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useUIAMatrixError } from '$hooks/useUIAFlows';
import { useAuthMetadata } from '$hooks/useAuthMetadata';
import { getAccountManagementUrl, useAccountManagementActions } from '$hooks/useAccountManagement';
import { logoutClient } from '$client/initMatrix';
import { activeSessionIdAtom, sessionsAtom } from '$state/sessions';

function renderUnsupportedUIAFlow() {
  return (
    <Text size="T200">
      Authentication steps to perform this action are not supported by client.
    </Text>
  );
}

type DeactivateDialogProps = {
  requestClose: () => void;
};
function DeactivateDialog({ requestClose }: DeactivateDialogProps) {
  const mx = useMatrixClient();
  const userId = mx.getSafeUserId();
  const sessions = useAtomValue(sessionsAtom);
  const activeSessionId = useAtomValue(activeSessionIdAtom);
  const setSessions = useSetAtom(sessionsAtom);
  const setActiveSessionId = useSetAtom(activeSessionIdAtom);
  const activeSession = sessions.find((s) => s.userId === activeSessionId) ?? sessions[0];

  const [erase, setErase] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const confirmed = confirmText.trim() === userId;

  const [deactivateState, setDeactivateState] = useState<AsyncState<void, MatrixError>>({
    status: AsyncStatus.Idle,
  });

  const deactivate = useAsync(
    useCallback(
      async (authDict?: AuthDict) => {
        // The account dies server-side first; only then do we tear down local
        // state, so a failed request leaves the session fully usable.
        await mx.deactivateAccount(authDict, erase);
        await logoutClient(mx, activeSession);
        if (activeSession) {
          setSessions({ type: 'DELETE', session: activeSession });
          setActiveSessionId(
            sessions.find((s) => s.userId !== activeSession.userId)?.userId ?? undefined
          );
        }
        window.location.reload();
      },
      [mx, erase, activeSession, sessions, setSessions, setActiveSessionId]
    ),
    setDeactivateState
  );

  const [authData, deactivateError] = useUIAMatrixError(
    deactivateState.status === AsyncStatus.Error ? deactivateState.error : undefined
  );
  const deactivating = deactivateState.status === AsyncStatus.Loading || authData !== undefined;

  const handleCancelAuth = useCallback(() => {
    setDeactivateState({ status: AsyncStatus.Idle });
  }, []);

  const renderDeactivateUIA = useCallback(
    (ongoingFlow: UIAFlow) =>
      authData ? (
        <ActionUIA
          authData={authData}
          ongoingFlow={ongoingFlow}
          action={deactivate}
          onCancel={handleCancelAuth}
        />
      ) : null,
    [authData, deactivate, handleCancelAuth]
  );

  const handleConfirmChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setConfirmText(evt.currentTarget.value);
  };

  return (
    <ModalOverlay requestClose={requestClose}>
      <Dialog variant="Surface">
        <Header
          style={{
            padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
            borderBottomWidth: config.borderWidth.B300,
          }}
          variant="Surface"
          size="500"
        >
          <Box grow="Yes">
            <Text size="H4">Delete account</Text>
          </Box>
        </Header>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          <Text priority="400">
            This permanently deactivates <b>{userId}</b>. You will be logged out everywhere, you
            will not be able to log back in, and this username can never be registered again — by
            you or anyone else. This cannot be undone.
          </Text>
          <Text priority="400" size="T300">
            Messages you sent stay visible to the people you sent them to, like an email someone
            already received.
          </Text>
          <Box as="label" alignItems="Center" gap="200">
            <Checkbox
              variant="Critical"
              checked={erase}
              onClick={() => setErase(!erase)}
              disabled={deactivating}
            />
            <Text size="T300">
              Also ask the server to hide my past messages from anyone who joins in future.
            </Text>
          </Box>
          <Box direction="Column" gap="100">
            <Text size="T300" priority="300">
              Type <b>{userId}</b> to confirm:
            </Text>
            <Input
              variant="Background"
              size="400"
              radii="300"
              value={confirmText}
              onChange={handleConfirmChange}
              placeholder={userId}
              disabled={deactivating}
              autoComplete="off"
              spellCheck="false"
              data-testid="deactivate-confirm-input"
            />
          </Box>
          {deactivateError && (
            <Text size="T200" style={{ color: color.Critical.Main }}>
              {deactivateError.message}
            </Text>
          )}
          <AsyncError state={deactivateState} prefix="Failed to delete account" size="T300" />
          <Box direction="Column" gap="200">
            <Button
              variant="Critical"
              onClick={() => deactivate()}
              disabled={!confirmed}
              loading={deactivating}
              spinnerVariant="Critical"
              spinnerSize="200"
            >
              <Text size="B400">Delete account forever</Text>
            </Button>
            <Button variant="Secondary" fill="Soft" onClick={requestClose} disabled={deactivating}>
              <Text size="B400">Cancel</Text>
            </Button>
          </Box>
          {authData && (
            <ActionUIAFlowsLoader authData={authData} unsupported={renderUnsupportedUIAFlow}>
              {renderDeactivateUIA}
            </ActionUIAFlowsLoader>
          )}
        </Box>
      </Dialog>
    </ModalOverlay>
  );
}

/** In-app account deletion.
 *
 *  Apple (guideline 5.1.1(v)) and Google Play both require that an app
 *  offering account creation also offers account deletion, in the app. On
 *  OIDC homeservers the deletion lives in the account dashboard, so we send
 *  the user there; everywhere else we drive the Matrix deactivate endpoint
 *  through the normal UIA flow.
 */
export function DeactivateAccount() {
  const mx = useMatrixClient();
  const authMetadata = useAuthMetadata();
  const accountManagementActions = useAccountManagementActions();
  const [prompt, setPrompt] = useState(false);

  const dashboardUrl = getAccountManagementUrl(
    authMetadata,
    accountManagementActions.accountDeactivate,
    undefined,
    mx.getHomeserverUrl()
  );

  const handleDashboard = () => {
    if (!dashboardUrl) return;
    if (isTauri()) {
      import('@tauri-apps/plugin-opener')
        .then(({ openUrl }) => openUrl(dashboardUrl))
        .catch(() => window.open(dashboardUrl, '_blank'));
      return;
    }
    window.open(dashboardUrl, '_blank');
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Danger zone</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          focusId="delete-account"
          title={<Text style={{ color: color.Critical.Main }}>Delete account</Text>}
          description="Permanently deactivate this account. This cannot be undone."
          after={
            <Button
              size="300"
              variant="Critical"
              fill="Soft"
              radii="300"
              onClick={dashboardUrl ? handleDashboard : () => setPrompt(true)}
            >
              <Text size="B300">Delete…</Text>
            </Button>
          }
        />
      </SequenceCard>
      {prompt && <DeactivateDialog requestClose={() => setPrompt(false)} />}
    </Box>
  );
}
