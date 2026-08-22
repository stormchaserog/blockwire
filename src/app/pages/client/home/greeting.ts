/** Pure helpers for the Home greeting header (UI Bible §7: Home should
 *  open with a personal, role-aware surface). Kept free of React/Matrix
 *  imports so the time-boundary and name-fallback rules are trivially
 *  unit-testable. */

/** Time-of-day greeting by local hour: <12 morning, <18 afternoon,
 *  otherwise evening. */
export function getGreetingByHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The name to greet the user with: their Matrix display name when set,
 *  otherwise the localpart of their mxid (strip leading @ and :server),
 *  otherwise a neutral "there" so the header never renders empty. */
export function getGreetingName(
  displayName: string | undefined,
  userId: string | null | undefined
): string {
  if (displayName) return displayName;
  if (userId) {
    const localpart = userId.replace(/^@/, '').split(':')[0];
    if (localpart) return localpart;
  }
  return 'there';
}
