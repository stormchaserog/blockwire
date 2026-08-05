import { NotificationBanner } from '$components/notification-banner';
import { ThemeMigrationBanner } from '$components/theme/ThemeMigrationBanner';
import { TelemetryConsentBanner } from '$components/telemetry-consent';
import { GlobalBannerRenderer } from '$components/global-banner/GlobalBannerRenderer';

// UnverifiedNoticeBanner is deliberately not mounted. It fires on every fresh
// login and greets new users with a red shield before they have sent a single
// message, which reads as "something is broken" rather than as the security
// nicety it is. Verification itself is untouched: Settings > Devices still
// lists unverified sessions and offers to verify them.
export function GlobalBanners() {
  return (
    <>
      <NotificationBanner />
      <TelemetryConsentBanner />
      <GlobalBannerRenderer />
      <ThemeMigrationBanner />
    </>
  );
}
