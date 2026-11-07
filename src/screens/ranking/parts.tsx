import { useCallback, useEffect, useState } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { type Box, Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import { type Board, type Period, PODIUM_INFO, type PodiumSpec } from './geometry';

export type RankingEntry = {
  rank: number;
  entity_id: number;
  score: number;
  guftagu_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export const art = {
  photo: require('../../assets/ranking/backdrop-photo.png'),
  sparkle: require('../../assets/ranking/sparkle.png'),
  coin: require('../../assets/ranking/coin.png'),
  podium: [
    require('../../assets/ranking/top1-frame.png'),
    require('../../assets/ranking/top2-frame.png'),
    require('../../assets/ranking/top3-frame.png'),
  ] as ImageSourcePropType[],
  richBackdrop: require('../../assets/ranking/rich-backdrop.png'),
  richRewardStage: require('../../assets/ranking/rich-reward-stage.png'),
  richRewardTop1: require('../../assets/ranking/rich-reward-top1-frame.png'),
  rewardButton: require('../../assets/ranking/reward-button.png'),
  ribbon: require('../../assets/ranking/title-ribbon.png'),
  cardBg: require('../../assets/ranking/card-bg.png'),
  cardEdge: require('../../assets/ranking/card-edge.png'),
  countdownBg: require('../../assets/ranking/countdown-bg.png'),
  // Same bitmaps as Weekly Star's tiles and coin stack.
  tile: require('../../assets/weekly-star/item-tile.png'),
  coins: require('../../assets/weekly-star/reward-coins.png'),
  diamonds: require('../../assets/home/reward-diamonds.png'),
  avatarMale: require('../../assets/avatar-male.png'),
  avatarFemale: require('../../assets/avatar-female.png'),
};

/** 517.17K / 458.10K — two decimals, kept, as every Figma sample shows them. */
export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}K`;
  return String(n);
}

/**
 * `GET /rankings?board=&period=`. A board with no rule configured (monthly, today)
 * answers 404, which is an empty board here rather than an error. `reload` is for
 * pull-to-refresh: it keeps the current board on screen until the new one lands.
 */
export function useBoard(board: Board, period: Period) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<RankingEntry[]>([]);

  const fetchBoard = useCallback(
    () =>
      api<{ entries: RankingEntry[] }>(`/rankings?board=${board}&period=${period}`, { token })
        .then((data) => data.entries)
        .catch((e): RankingEntry[] => {
          if (!(e instanceof ApiError)) throw e;
          return [];
        }),
    [board, period, token],
  );

  useEffect(() => {
    let live = true;
    setEntries([]);
    fetchBoard().then((next) => live && setEntries(next));
    return () => {
      live = false;
    };
  }, [fetchBoard]);

  const reload = useCallback(() => fetchBoard().then(setEntries), [fetchBoard]);

  return { entries, reload };
}

/** Seconds to the weekly board's close — Carbon's end of week, Sunday 23:59:59 UTC. */
export function secondsToWeekEnd(now = new Date()) {
  const daysToMonday = (8 - now.getUTCDay()) % 7 || 7;
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday);
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

/** A circular (or, for 71x62, elliptical) photo, falling back to the placeholder. */
export function Avatar({
  uri,
  box,
  seed,
}: {
  uri: string | null | undefined;
  box: Box;
  /** Picks the default avatar when there is no photo — the same alternation the server uses. */
  seed?: number;
}) {
  const abs = useBox();
  const fallback = (seed ?? 0) % 2 === 0 ? art.avatarFemale : art.avatarMale;
  return <Image source={uri ? { uri } : fallback} resizeMode="cover" style={[abs(box), { borderRadius: '50%' }]} />;
}

/**
 * The top three under their Figma frames. Top 1 and 2 draw the photo over the
 * frame, Top 3 under it, as the file layers them; `withScore` adds the coin row
 * and `frames` swaps in another set of frame bitmaps.
 */
export function Podium({
  spec,
  entries,
  withScore,
  frames = art.podium,
}: {
  spec: PodiumSpec;
  entries: RankingEntry[];
  withScore: boolean;
  frames?: ImageSourcePropType[];
}) {
  const I = PODIUM_INFO;
  return (
    <>
      {spec.map((spot, i) => {
        const e = entries[i];
        const avatar = <Avatar key={`a${i}`} uri={e?.avatar_url} box={spot.avatar} seed={e?.entity_id} />;
        const { x, y } = spot.info;
        return [
          spot.frameCrop ? (
            <Cropped key={`f${i}`} source={frames[i]} box={spot.frame} crop={spot.frameCrop} />
          ) : (
            <Img key={`f${i}`} source={frames[i]} box={spot.frame} resizeMode="cover" />
          ),
          spot.avatarOnTop ? null : avatar,
          <Label key={`n${i}`} cx={x + I.nameDx} y={y + I.nameY} size={11} lineHeight={16.5} weight="medium" width={120}>
            {e?.display_name ?? ''}
          </Label>,
          <Label
            key={`i${i}`}
            cx={x + I.idDx}
            y={y + I.idY}
            size={8}
            lineHeight={12}
            weight="regular"
            color="rgba(255,255,255,0.66)"
            width={120}
          >
            {e?.guftagu_id ? `ID : ${e.guftagu_id}` : ''}
          </Label>,
          withScore && e ? <Img key={`c${i}`} source={art.coin} box={{ ...I.coin, x: x + I.coin.x, y: y + I.coin.y }} /> : null,
          withScore && e ? (
            // Figma's 46px box is narrower than "517.17K" itself; it just overflows.
            // Centre on the same point with room to spare instead of truncating.
            <Label key={`s${i}`} cx={x + I.scoreX + I.scoreW / 2} y={y + I.scoreY} size={13} lineHeight={19.5} width={80}>
              {compact(e.score)}
            </Label>
          ) : null,
          spot.avatarOnTop ? avatar : null,
        ];
      })}
    </>
  );
}
