import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Dialog, Overlay, OverlayBackdrop, OverlayCenter, Text, config } from 'folds';
import FocusTrap from 'focus-trap-react';
import { ArrowUp } from '$components/icons/phosphor';
import { useRegisterGlobalBanner, type GlobalBanner } from '$state/globalBanners';
import { getLocalStorageItem, setLocalStorageItem } from '$state/utils/atomWithLocalStorage';
import { stopPropagation } from '$utils/keyboard';
import { Button } from '$components/button';
import {
  getInstallOffer,
  isInAppBrowser,
  isIosDevice,
  isStandalone,
  type NativeInstallPrompt,
} from '$utils/installPrompt';

const DISMISSED_KEY = 'bw_install_prompt_dismissed';

/** Offers to install the app to the home screen.
 *
 *  Everything needed to be installable was already true — HTTPS, manifest,
 *  icons, service worker — but nothing offered it, so it was only discoverable
 *  through Chrome's overflow menu or Safari's Share sheet. Most people have
 *  never installed a PWA and have no reason to look there.
 *
 *  On iOS this is not a nicety: web push only works once the app is on the
 *  Home Screen, so an uninstalled iOS user silently gets no notifications.
 */
export function InstallPrompt() {
  const [nativePrompt, setNativePrompt] = useState<NativeInstallPrompt | null>(null);
  const [dismissed, setDismissed] = useState(() => getLocalStorageItem(DISMISSED_KEY, false));
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (ev: Event) => {
      // Chrome shows its own mini-infobar unless this is prevented, and two
      // competing prompts is worse than either alone.
      ev.preventDefault();
      setNativePrompt(ev as unknown as NativeInstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setNativePrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const offer = getInstallOffer({
    standalone: installed,
    hasNativePrompt: nativePrompt !== null,
    isIos: isIosDevice(),
    inAppBrowser: isInAppBrowser(),
    dismissed,
  });

  const handleDismiss = useCallback(() => {
    setLocalStorageItem(DISMISSED_KEY, true);
    setDismissed(true);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!nativePrompt) {
      setShowIosHelp(true);
      return;
    }
    await nativePrompt.prompt();
    const choice = await nativePrompt.userChoice.catch(() => undefined);
    // The event is single-use either way; keeping it would fire a prompt the
    // browser has already spent.
    setNativePrompt(null);
    if (choice?.outcome === 'dismissed') handleDismiss();
  }, [nativePrompt, handleDismiss]);

  const bannerData = useMemo<GlobalBanner | null>(() => {
    if (!offer) return null;

    return {
      id: 'install-app',
      // Above the update banner (200), because only ONE banner renders at a
      // time and this one only appears when the app is NOT installed. A
      // browser tab picks up new builds on its next load anyway, so telling
      // someone to refresh matters far less than telling them the app can
      // live on their home screen — and losing that message behind an update
      // notice is exactly how two iPhone users missed it.
      priority: 250,
      icon: ArrowUp,
      title: `Install ${SABLE_PRODUCT_NAME}`,
      description:
        // eslint-disable-next-line no-nested-ternary
        offer === 'open-in-safari'
          ? 'Open this page in Safari to add it to your Home Screen.'
          : offer === 'ios-instructions'
            ? 'Add it to your Home Screen for a full-screen app and notifications.'
            : 'Add it to your home screen for a full-screen app that opens instantly.',
      primaryAction: {
        label: offer === 'native' ? 'Install' : 'Show me how',
        variant: 'Primary',
        onClick: () => {
          void handleInstall();
        },
      },
      secondaryAction: {
        label: 'Not now',
        variant: 'Secondary',
        onClick: handleDismiss,
      },
    };
  }, [offer, handleInstall, handleDismiss]);

  useRegisterGlobalBanner(bannerData);

  if (!showIosHelp) return null;

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: () => setShowIosHelp(false),
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog>
            <Box
              direction="Column"
              gap="400"
              style={{ padding: config.space.S500, maxWidth: '22rem' }}
            >
              <Text size="H4">Add to Home Screen</Text>
              {offer === 'open-in-safari' ? (
                <>
                  <Text size="T300" priority="300">
                    You&apos;re viewing this inside another app, which can&apos;t add anything to
                    your Home Screen. Get into Safari first:
                  </Text>
                  <Box direction="Column" gap="200">
                    <Text size="T300">
                      1. Tap the <b>•••</b> or <b>Share</b> button in this app.
                    </Text>
                    <Text size="T300">
                      2. Choose <b>Open in Safari</b>.
                    </Text>
                    <Text size="T300">
                      3. In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>.
                    </Text>
                  </Box>
                </>
              ) : (
                <>
                  <Text size="T300" priority="300">
                    Safari can&apos;t install apps on its own, so this takes two taps:
                  </Text>
                  <Box direction="Column" gap="200">
                    <Text size="T300">
                      1. Tap the <b>Share</b> button at the bottom of Safari.
                    </Text>
                    <Text size="T300">
                      2. Choose <b>Add to Home Screen</b>.
                    </Text>
                  </Box>
                </>
              )}
              <Text size="T200" priority="300">
                Notifications on iPhone only work once {SABLE_PRODUCT_NAME} is on your Home Screen —
                this is what turns them on.
              </Text>
              <Button variant="Primary" onClick={() => setShowIosHelp(false)}>
                <Text size="B400">Got it</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
