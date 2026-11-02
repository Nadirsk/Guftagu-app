import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/ranking/icons';
import { CountdownCells, Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import { useCountdown } from '../../hooks/useCountdown';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { REWARD_CARD, REWARD_PAGE, REWARD_THEME } from './geometry';
import { art, Podium, secondsToWeekEnd, useBoard } from './parts';

/**
 * The weekly reward screen — 590:7029 for Charm, 590:6460 for Rich, which differ
 * in colours, backdrop and a few offsets (`REWARD_THEME`). Opened from the Weekly
 * page's Reward plaque and drawn over it, which is why its top corners are
 * rounded. The podium is the live weekly board and the countdown runs to that
 * board's close.
 *
 * Nothing in the app API lists ranking rewards yet (only the admin side has
 * `ranking-rules/{rule}/rewards`, and only for coins/diamonds), so the three
 * bands are Figma's own: N-day items either side of a coin amount.
 */

const SAMPLE_BANDS = [
  { title: 'Week Top 1', days: 10, coins: 10000 },
  { title: 'Week Top 2', days: 7, coins: 7000 },
  { title: 'Week Top 3', days: 5, coins: 5000 },
];

export default function RankingRewardScreen() {
  const { px } = useDesignScale();
  const abs = useBox();
  const navigation = useNavigation();
  const { board } = useRoute<RouteProp<RootStackParamList, 'RankingReward'>>().params;
  const entries = useBoard(board, 'weekly');
  const { secondsLeft, start } = useCountdown();
  const P = REWARD_PAGE;
  const T = REWARD_THEME[board];

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
      bounces={false}
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

        {SAMPLE_BANDS.map((band, i) => (
          <RewardCard key={band.title} band={band} x={T.cards.x} y={T.cards.y + i * REWARD_CARD.step} />
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
          withScore={false}
          frames={charmLike ? art.podium : [art.richRewardTop1, art.podium[1], art.podium[2]]}
        />

        {/* The back control is drawn under the photo wash; its hit area sits on top. */}
        <Pressable style={abs(P.backDisc)} onPress={() => navigation.goBack()} hitSlop={px(10)} />
      </View>
    </ScrollView>
  );
}

function RewardCard({ band, x, y }: { band: (typeof SAMPLE_BANDS)[number]; x: number; y: number }) {
  const C = REWARD_CARD;
  const at = (b: { x: number; y: number; w: number; h: number }) => ({ ...b, x: x + b.x, y: y + b.y });
  const label = (cx: number, text: string) => (
    <Label cx={x + cx} y={y + C.labelY} size={14} lineHeight={21} width={90}>
      {text}
    </Label>
  );
  return (
    <>
      <Cropped source={art.cardBg} box={at(C.bg)} crop={C.bgCrop} radius={22} />
      <Cropped source={art.cardEdge} box={at(C.edgeBottom)} crop={C.edgeCrop} transform="mirror" />
      <Cropped source={art.cardEdge} box={at(C.edgeTop)} crop={C.edgeCrop} transform="flipY" />
      <Cropped source={art.ribbon} box={at(C.ribbon)} crop={C.ribbonCrop} />
      <Label cx={x + C.titleCx} y={y + C.titleY} size={16} lineHeight={24} width={200}>
        {band.title}
      </Label>
      <Img source={art.tile} box={at(C.tileLeft)} resizeMode="cover" />
      {label(C.labelCx.left, `${band.days} Day`)}
      <Cropped source={art.coins} box={at(C.coins)} crop={C.coinsCrop} />
      {label(C.labelCx.middle, String(band.coins))}
      <Img source={art.tile} box={at(C.tileRight)} resizeMode="cover" />
      {label(C.labelCx.right, `${band.days} Day`)}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
