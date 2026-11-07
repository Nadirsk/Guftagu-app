import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/ranking/icons';
import { useAuth } from '../../auth/AuthContext';
import { CountdownCells, Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import { useCountdown } from '../../hooks/useCountdown';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { type Board, REWARD_CARD, REWARD_PAGE, REWARD_THEME } from './geometry';
import { art, Podium, secondsToWeekEnd, useBoard } from './parts';

/**
 * The weekly reward screen — 590:7029 for Charm, 590:6460 for Rich, which differ
 * in colours, backdrop and a few offsets (`REWARD_THEME`). Opened from the Weekly
 * page's Reward plaque and drawn over it, which is why its top corners are
 * rounded. The podium is the live weekly board and the countdown runs to that
 * board's close.
 *
 * The three cards come from GET /rankings/rewards, i.e. whatever the admin
 * panel's Rankings page sets for each rank: coins, diamonds or a store item for
 * N days, up to three per rank — one per slot of the Figma card.
 */

type RankReward = {
  id: number;
  rank_from: number;
  rank_to: number;
  reward_type: string;
  reward_value: number;
  duration_days: number | null;
  item: { id: number; type: string; name: string; image_url: string | null } | null;
};

function useRankRewards(board: Board) {
  const { token } = useAuth();
  const [rewards, setRewards] = useState<RankReward[]>([]);

  const fetchRewards = useCallback(
    () =>
      // No weekly rule configured answers 404, which is just no rewards here.
      api<{ rewards: RankReward[] }>(`/rankings/rewards?board=${board}&period=weekly`, { token })
        .then((data) => data.rewards)
        .catch((e): RankReward[] => {
          if (!(e instanceof ApiError)) throw e;
          return [];
        }),
    [board, token],
  );

  useEffect(() => {
    let live = true;
    setRewards([]);
    fetchRewards().then((next) => live && setRewards(next));
    return () => {
      live = false;
    };
  }, [fetchRewards]);

  const reload = useCallback(() => fetchRewards().then(setRewards), [fetchRewards]);

  return { rewards, reload };
}

export default function RankingRewardScreen() {
  const { px } = useDesignScale();
  const abs = useBox();
  const navigation = useNavigation();
  const { board } = useRoute<RouteProp<RootStackParamList, 'RankingReward'>>().params;
  const { entries, reload: reloadBoard } = useBoard(board, 'weekly');
  const { rewards, reload: reloadRewards } = useRankRewards(board);
  const { secondsLeft, start } = useCountdown();
  const P = REWARD_PAGE;
  const T = REWARD_THEME[board];

  // Pull-to-refresh, as on Home: the podium, the three reward cards and the countdown.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadBoard(), reloadRewards()]);
      start(secondsToWeekEnd());
    } finally {
      setRefreshing(false);
    }
  }, [reloadBoard, reloadRewards, start]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  useEffect(() => start(secondsToWeekEnd()), [start]);

  const charmLike = board === 'charm';
  const backdrop = (
    <SvgXml
      xml={charmLike ? icons.rewardBackdrop : icons.richRewardBackdrop}
      width={px(T.backdrop.w)}
      height={px(T.backdrop.h)}
      style={abs(T.backdrop)}
    />
  );

  return (
    <ScrollView
      style={[styles.root, { borderTopLeftRadius: px(P.radius), borderTopRightRadius: px(P.radius) }]}
      showsVerticalScrollIndicator={false}
      // No `bounces={false}`: iOS only pulls to refresh when the scroll view can bounce.
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.white}
          colors={[colors.homeAccent]}
        />
      }
    >
      <View style={{ height: px(T.height), overflow: 'hidden' }}>
        <LinearGradient
          colors={T.gradient.colors}
          locations={T.gradient.locations}
          style={{ position: 'absolute', left: 0, top: 0, width: px(402), height: px(T.height) }}
        />
        {T.stage ? <Cropped source={art.richRewardStage} box={T.stage.box} crop={T.stage.crop} /> : null}
        {/* Charm lays its gradient under the back control, Rich over it (it starts lower). */}
        {charmLike ? backdrop : null}

        <View style={abs(P.backDisc)} pointerEvents="none">
          <SvgXml xml={icons.rewardBackDisc} width={px(P.backDisc.w)} height={px(P.backDisc.h)} />
        </View>
        <View style={abs(P.backArrow)} pointerEvents="none">
          <SvgXml xml={icons.rewardBackArrow} width={px(P.backArrow.w)} height={px(P.backArrow.h)} />
        </View>
        {charmLike ? null : backdrop}

        <Cropped source={art.ribbon} box={P.ribbon} crop={P.ribbonCrop} />
        <Label cx={P.title.cx} y={P.title.y} size={P.title.size} lineHeight={P.title.lineHeight} weight="medium">
          Weekly  List
        </Label>

        {[1, 2, 3].map((rank, i) => (
          <RewardCard
            key={rank}
            title={`Week Top ${rank}`}
            rewards={rewards.filter((r) => r.rank_from <= rank && r.rank_to >= rank).slice(0, 3)}
            x={T.cards.x}
            y={T.cards.y + i * REWARD_CARD.step}
          />
        ))}

        {T.photo ? <Img source={art.photo} box={T.photo} resizeMode="cover" /> : null}

        <Label
          cx={P.honor.cx}
          y={T.honor.y}
          size={P.honor.size}
          lineHeight={P.honor.lineHeight}
          weight="bold" // Futura Bold in Figma
          color={T.honor.color}
          width={P.honor.w + 40}
        >
          Honorary Titles
        </Label>
        <Label
          cx={P.blurb.cx}
          y={T.blurbY}
          size={P.blurb.size}
          lineHeight={P.blurb.lineHeight}
          weight="regular"
          color={P.blurb.color}
          width={P.blurb.w}
          lines={4}
        >
          {`Guftagu Weekly ${charmLike ? 'Charm' : 'Rich'} congratulates top 3 users who worked hard to reach from top 1 to top 3 and also gives rewards to 3 user`}
        </Label>

        <Img source={art.countdownBg} box={T.countdownBg} resizeMode="cover" />
        <CountdownCells x={T.countdownRow.x} y={T.countdownRow.y} seconds={secondsLeft} />

        <Podium
          spec={T.podium}
          entries={entries}
          withScore
          frames={charmLike ? art.podium : [art.richRewardTop1, art.podium[1], art.podium[2]]}
        />

        {/* The back control is drawn under the photo wash; its hit area sits on top. */}
        <Pressable style={abs(P.backDisc)} onPress={() => navigation.goBack()} hitSlop={px(10)} />
      </View>
    </ScrollView>
  );
}

/**
 * Figma's card has three slots (item · coins · item). Rewards fill them in the
 * admin's order: one reward sits in the middle, two take the outer slots.
 */
function RewardCard({ title, rewards, x, y }: { title: string; rewards: RankReward[]; x: number; y: number }) {
  const C = REWARD_CARD;
  const at = (b: { x: number; y: number; w: number; h: number }) => ({ ...b, x: x + b.x, y: y + b.y });
  const label = (cx: number, text: string) => (
    <Label cx={x + cx} y={y + C.labelY} size={14} lineHeight={21} width={90}>
      {text}
    </Label>
  );
  const { left, middle, right } = C.labelCx;
  const slots = rewards.length === 1 ? [middle] : rewards.length === 2 ? [left, right] : [left, middle, right];
  const tileW = C.tileLeft.w;
  const stackW = C.coins.w;

  return (
    <>
      <Cropped source={art.cardBg} box={at(C.bg)} crop={C.bgCrop} radius={22} />
      <Cropped source={art.cardEdge} box={at(C.edgeBottom)} crop={C.edgeCrop} transform="mirror" />
      <Cropped source={art.cardEdge} box={at(C.edgeTop)} crop={C.edgeCrop} transform="flipY" />
      <Cropped source={art.ribbon} box={at(C.ribbon)} crop={C.ribbonCrop} />
      <Label cx={x + C.titleCx} y={y + C.titleY} size={16} lineHeight={24} width={200}>
        {title}
      </Label>

      {rewards.length === 0 ? label(middle, 'Coming soon') : null}

      {rewards.map((reward, i) => {
        const cx = slots[i];
        if (reward.item) {
          const tile = { x: cx - tileW / 2, y: C.tileLeft.y, w: tileW, h: C.tileLeft.h };
          return (
            <Fragment key={reward.id}>
              <Img source={art.tile} box={at(tile)} resizeMode="cover" />
              {reward.item.image_url ? (
                <Img
                  source={{ uri: reward.item.image_url }}
                  box={at({ x: tile.x + 4, y: tile.y + 4, w: tile.w - 8, h: tile.h - 8 })}
                  resizeMode="contain"
                />
              ) : null}
              {label(cx, reward.duration_days ? `${reward.duration_days} Day` : 'Forever')}
            </Fragment>
          );
        }
        const stack = { x: cx - stackW / 2, y: C.coins.y, w: stackW, h: C.coins.h };
        return (
          <Fragment key={reward.id}>
            {reward.reward_type === 'diamonds' ? (
              <Img source={art.diamonds} box={at(stack)} resizeMode="contain" />
            ) : (
              <Cropped source={art.coins} box={at(stack)} crop={C.coinsCrop} />
            )}
            {label(cx, String(reward.reward_value))}
          </Fragment>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
