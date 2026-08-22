import { ScreenSize, useScreenSizeContext } from '$hooks/useScreenSize';
import { MobileBottomNav } from '$pages/client/MobileBottomNav';

export function UserQuickToolsProvider() {
  const screenSize = useScreenSizeContext();
  const compact = screenSize === ScreenSize.Mobile;
  if (!compact) return null;
  return <MobileBottomNav />;
}
