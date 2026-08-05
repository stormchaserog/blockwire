import { useCallback, useState } from 'react';
import { Box, Text, color, config } from 'folds';

import { Button } from '$components/button';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { createLogger } from '$utils/debug';
import {
  BW_CALLBACK_EVENT,
  type BwInlineKeyboardButton,
  type BwInlineKeyboardMarkup,
} from '$utils/blockwire/replyMarkup';

const log = createLogger('InlineKeyboard');

type InlineKeyboardProps = {
  roomId: string | undefined;
  keyboard: BwInlineKeyboardMarkup;
};

/** The buttons bots attach to a message.
 *
 *  The gateway has written `com.blockwire.reply_markup` since day one, but
 *  nothing here rendered it — so every bot that answers with buttons (which
 *  is most of the useful ones: price alerts, chart bots, anything with a
 *  menu) looked broken in the app while working perfectly over the API.
 *
 *  A tap sends a `com.blockwire.callback_query` event carrying only the
 *  button's `callback_data`; the gateway reads `content.data` and nothing
 *  else. There is no reply to wait for — answering is the bot's job, and it
 *  arrives as an ordinary message.
 */
export function InlineKeyboard({ roomId, keyboard }: InlineKeyboardProps) {
  const mx = useMatrixClient();
  // Which button is mid-flight, so a slow bot cannot be double-tapped.
  const [sending, setSending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const handleTap = useCallback(
    async (button: BwInlineKeyboardButton) => {
      const data = button.callback_data;
      if (!data || !roomId || sending) return;

      setSending(data);
      setFailed(false);
      try {
        await mx.sendEvent(roomId, BW_CALLBACK_EVENT as never, { data } as never);
      } catch (err) {
        log.warn('callback_query failed to send', err);
        setFailed(true);
      } finally {
        setSending(null);
      }
    },
    [mx, roomId, sending]
  );

  return (
    <Box direction="Column" gap="100" style={{ marginTop: config.space.S200, maxWidth: '20rem' }}>
      {keyboard.inline_keyboard.map((row, rowIndex) => (
        // Rows have no identity of their own; position is all there is.
        // eslint-disable-next-line react/no-array-index-key
        <Box key={rowIndex} gap="100">
          {row.map((button, buttonIndex) => {
            const key = `${button.text}:${button.url ?? button.callback_data ?? buttonIndex}`;

            if (button.url) {
              return (
                <Button
                  key={key}
                  as="a"
                  href={button.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  outlined
                  radii="300"
                  style={{ flexGrow: 1 }}
                >
                  <Text size="B300" truncate>
                    {button.text}
                  </Text>
                </Button>
              );
            }

            return (
              <Button
                key={key}
                type="button"
                size="300"
                variant="Secondary"
                fill="Soft"
                outlined
                radii="300"
                style={{ flexGrow: 1 }}
                disabled={!button.callback_data || sending !== null}
                loading={sending === button.callback_data}
                spinnerSize="100"
                onClick={() => handleTap(button)}
              >
                <Text size="B300" truncate>
                  {button.text}
                </Text>
              </Button>
            );
          })}
        </Box>
      ))}
      {failed && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          Could not reach the bot. Tap again to retry.
        </Text>
      )}
    </Box>
  );
}
