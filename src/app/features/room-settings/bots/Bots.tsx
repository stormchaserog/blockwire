import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Input, Scroll, Spinner, Text, color, config } from 'folds';

import { Button } from '$components/button';
import { PageContent, SettingsSectionPage } from '$components/page';
import { SequenceCard, SequenceCardStyle } from '$components/sequence-card';
import { SettingTile } from '$components/setting-tile';
import { useRoom } from '$hooks/useRoom';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { usePowerLevels } from '$hooks/usePowerLevels';
import { useRoomCreators } from '$hooks/useRoomCreators';
import { useRoomPermissions } from '$hooks/useRoomPermissions';
import { createLogger } from '$utils/debug';
import { botMxid, fetchPublicBots, type PublicBot } from '$utils/blockwire/botDirectory';

const log = createLogger('BotDirectory');

type BotsProps = {
  requestBack?: () => void;
  requestClose: () => void;
};

/** Browse bots published to the BlockWire directory and add one to this room.
 *
 *  Adding a bot is an ordinary Matrix invite of its `@bot_*` ghost — there is
 *  no separate bot-membership concept — so this needs the same `invite`
 *  power as inviting a person, and nothing more. */
export function Bots({ requestBack, requestClose }: BotsProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const canInvite = permissions.action('invite', mx.getSafeUserId());

  const [bots, setBots] = useState<PublicBot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicBots(mx)
      .then((list) => {
        if (!cancelled) setBots(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        log.warn('directory fetch failed', err);
        setLoadError(err instanceof Error ? err.message : 'Could not load the bot directory.');
        setBots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [mx]);

  const visibleBots = useMemo(() => {
    if (!bots) return [];
    const q = query.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter(
      (b) =>
        b.username.toLowerCase().includes(q) ||
        b.first_name.toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q)
    );
  }, [bots, query]);

  const handleAdd = useCallback(
    async (bot: PublicBot) => {
      if (addingId !== null) return;
      setAddingId(bot.id);
      setAddError(null);
      try {
        await mx.invite(room.roomId, botMxid(mx, bot));
        setAddedIds((prev) => new Set(prev).add(bot.id));
      } catch (err) {
        log.warn('bot invite failed', err);
        const message = err instanceof Error ? err.message : 'Could not add that bot.';
        // Already in the room is a success as far as anyone cares.
        if (/already in the room|already joined|already invited/i.test(message)) {
          setAddedIds((prev) => new Set(prev).add(bot.id));
        } else {
          setAddError(message);
        }
      } finally {
        setAddingId(null);
      }
    },
    [mx, room.roomId, addingId]
  );

  return (
    <SettingsSectionPage title="Bots" requestBack={requestBack} requestClose={requestClose}>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="400">
              <Box direction="Column" gap="100">
                <Text size="L400">Bot Directory</Text>
                <Text size="T200" priority="300">
                  Add a bot to this room. Bots can post updates, answer commands and help moderate.
                </Text>
              </Box>

              {!canInvite && (
                <Text size="T200" style={{ color: color.Critical.Main }}>
                  You do not have permission to add bots to this room.
                </Text>
              )}

              <Input
                variant="Background"
                radii="300"
                placeholder="Search bots"
                value={query}
                onChange={(evt) => setQuery(evt.currentTarget.value)}
                aria-label="Search bots"
              />

              {bots === null && (
                <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
                  <Spinner size="400" />
                </Box>
              )}

              {loadError && (
                <Text size="T200" style={{ color: color.Critical.Main }}>
                  {loadError}
                </Text>
              )}

              {addError && (
                <Text size="T200" style={{ color: color.Critical.Main }}>
                  {addError}
                </Text>
              )}

              {bots !== null && !loadError && visibleBots.length === 0 && (
                <Text size="T200" priority="300">
                  {bots.length === 0
                    ? 'No bots have been published yet.'
                    : 'No bots match that search.'}
                </Text>
              )}

              <Box direction="Column" gap="100">
                {visibleBots.map((bot) => {
                  const added = addedIds.has(bot.id);
                  return (
                    <SequenceCard
                      key={bot.id}
                      className={SequenceCardStyle}
                      variant="SurfaceVariant"
                      direction="Column"
                    >
                      <SettingTile
                        title={`${bot.first_name} (@${bot.username})`}
                        description={bot.description ?? undefined}
                        after={
                          <Button
                            type="button"
                            size="300"
                            variant={added ? 'Success' : 'Primary'}
                            fill="Soft"
                            outlined
                            radii="300"
                            disabled={!canInvite || added || addingId !== null}
                            loading={addingId === bot.id}
                            spinnerSize="100"
                            onClick={() => handleAdd(bot)}
                          >
                            <Text size="B300">{added ? 'Added' : 'Add'}</Text>
                          </Button>
                        }
                      />
                    </SequenceCard>
                  );
                })}
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </SettingsSectionPage>
  );
}
