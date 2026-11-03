import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { api } from '../../api/client';

/** Photo urls for ranks 1, 2 and 3; a slot is undefined when nobody holds it yet. */
export type Podium = (string | undefined)[];

type Row = { rank: number; avatar_url: string | null };

const top3 = (rows: Row[] | undefined): Podium =>
  [1, 2, 3].map((rank) => rows?.find((r) => r.rank === rank)?.avatar_url ?? undefined);

/**
 * The top three behind the home banners: the Ranking banner is today's Rich
 * board, the Weekly Star one is the running weekly_star event's board. A failed
 * or empty board leaves its slots undefined, and the banner keeps its artwork.
 * There is no CP data on the server yet, so that banner stays as drawn.
 */
export function useHomeBoards(token: string | null | undefined) {
  const [ranking, setRanking] = useState<Podium>([]);
  const [weeklyStar, setWeeklyStar] = useState<Podium>([]);

  useFocusEffect(
    useCallback(() => {
      let live = true;

      api<{ entries: Row[] }>('/rankings?board=wealth&period=daily', { token })
        .then((d) => live && setRanking(top3(d.entries)))
        .catch(() => undefined);

      api<{ uuid: string; type: string }[]>('/events', { token })
        .then((events) => {
          const uuid = events.find((e) => e.type === 'weekly_star')?.uuid;
          return uuid ? api<{ board?: Row[] }>(`/events/${uuid}`, { token }) : undefined;
        })
        .then((d) => live && d && setWeeklyStar(top3(d.board)))
        .catch(() => undefined);

      return () => {
        live = false;
      };
    }, [token]),
  );

  return { ranking, weeklyStar };
}
