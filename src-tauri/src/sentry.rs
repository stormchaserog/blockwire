use std::sync::atomic::{AtomicBool, Ordering};

use sentry::protocol::Event;

static CONSENT: AtomicBool = AtomicBool::new(false);

/// Initialise Sentry before the Tauri runtime spawns threads. The guard
/// flushes pending events on drop. No-op when no DSN was baked in at build time.
#[allow(clippy::field_reassign_with_default)]
pub fn init() -> Option<sentry::ClientInitGuard> {
    let dsn = option_env!("SENTRY_DSN")?;
    let environment = option_env!("SENTRY_ENVIRONMENT");
    let release = option_env!("SENTRY_APP_VERSION").map(|v| format!("sable@{v}"));

    // sentry 0.49 marks ClientOptions #[non_exhaustive], so a struct literal is
    // rejected even with `..Default::default()`. Build from a default and assign
    // the fields we set instead.
    let mut options = sentry::ClientOptions::default();
    options.dsn = dsn.parse().ok();
    options.release = release.map(Into::into);
    options.environment = environment.map(Into::into);
    options.send_default_pii = false;
    options.before_send = Some(std::sync::Arc::new(|event: Event<'static>| {
        if CONSENT.load(Ordering::Relaxed) {
            Some(event)
        } else {
            None
        }
    }));
    let guard = sentry::init(options);

    Some(guard)
}

#[tauri::command]
pub fn set_native_sentry_enabled(enabled: bool) {
    CONSENT.store(enabled, Ordering::Relaxed);
}
