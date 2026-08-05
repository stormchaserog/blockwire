/** Inline keyboards from the BlockWire bot gateway.
 *
 *  These two constants are the single coupling seam between blockwire-botgw
 *  and this client (see blockwire-botgw/src/translate.ts, which defines the
 *  same names). The gateway writes `com.blockwire.reply_markup` as an extra
 *  field on `m.room.message`; tapping a button sends a
 *  `com.blockwire.callback_query` room event back, which the gateway turns
 *  into a bot Update. Rename either side without the other and every bot with
 *  buttons goes silent.
 */
export const BW_KEYBOARD_FIELD = 'com.blockwire.reply_markup';
export const BW_CALLBACK_EVENT = 'com.blockwire.callback_query';

export type BwInlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type BwInlineKeyboardMarkup = {
  inline_keyboard: BwInlineKeyboardButton[][];
};

const isButton = (v: unknown): v is BwInlineKeyboardButton => {
  if (!v || typeof v !== 'object') return false;
  const b = v as Record<string, unknown>;
  return (
    typeof b.text === 'string' &&
    (b.callback_data === undefined || typeof b.callback_data === 'string') &&
    (b.url === undefined || typeof b.url === 'string')
  );
};

/** Lenient in the same way the gateway is: drop malformed rows/buttons rather
 *  than refusing to render, so one bad field in a bot's payload can't blank
 *  out the message it came with. */
export const getReplyMarkup = (
  content: Record<string, unknown> | undefined
): BwInlineKeyboardMarkup | undefined => {
  const raw = content?.[BW_KEYBOARD_FIELD];
  if (!raw || typeof raw !== 'object') return undefined;

  const rows = (raw as Record<string, unknown>).inline_keyboard;
  if (!Array.isArray(rows)) return undefined;

  const inlineKeyboard = rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => row.filter(isButton))
    .filter((row) => row.length > 0);

  if (inlineKeyboard.length === 0) return undefined;
  return { inline_keyboard: inlineKeyboard };
};
