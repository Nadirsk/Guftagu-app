import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/ranking/icons';
import { Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import {
  type Board,
  BOARD_TOGGLE,
  CHARM_BACKDROP,
  type GradientBackdrop,
  PAGE,
  type Period,
  PERIOD_SWITCH,
  PODIUM_PAGE,
  REWARD_BUTTON,
  RICH_BACKDROP,
  ROWS,
} from './geometry';
import { art, Avatar, compact, Podium, type RankingEntry, useBoard } from './parts';

/**
 * Rankings — "23. Ranking Charm Daily page" (590:6567) and its Weekly / Monthly
 * twins, and the Rich pages (590:5996 …). Rich is the `wealth` board and Charm the
 * `charm` one, both from `GET /rankings`. The Weekly page carries the Reward
 * plaque (590:7026), which opens that week's reward screen.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'Ranking'>;

const BOARDS: [Board, string][] = [
  ['wealth', 'Rich'],
  ['charm', 'Charm'],
];
const PERIODS: [Period, string][] = [
  ['daily', 'Daily'],
  ['weekly', 'Weekly'], // "Weakly" in Figma
  ['monthly', 'Monthly'],
];

export default function RankingScreen() {
  const { px } = useDesignScale();
  const abs = useBox();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Ranking'>>();
  // Opens on Rich unless the caller asks for a board.
  const [board, setBoard] = useState<Board>(route.params?.board ?? 'wealth');
  const [period, setPeriod] = useState<Period>('daily');
  const entries = useBoard(board, period);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const rows = entries.slice(3);
  const height = Math.max(PAGE.height, ROWS.y + rows.length * ROWS.step + 150);
  const S = PERIOD_SWITCH;

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={{ height: px(height), overflow: 'hidden' }}>
        {board === 'wealth' ? (
          <Cropped source={art.richBackdrop} box={RICH_BACKDROP.box} crop={RICH_BACKDROP.crop} />
        ) : (
          <GradientPage backdrop={CHARM_BACKDROP} height={height} />
        )}

        {BOARDS.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setBoard(key)}
            style={abs({ x: BOARD_TOGGLE.cx[key] - 36, y: BOARD_TOGGLE.y - 8, w: 72, h: 38 })}
          >
            <Label
              cx={36}
              y={8}
              size={BOARD_TOGGLE.size}
              lineHeight={BOARD_TOGGLE.lineHeight}
              width={72}
              opacity={board === key ? 1 : BOARD_TOGGLE.idleOpacity[key]}
            >
              {label}
            </Label>
          </Pressable>
        ))}

        <View
          style={[
            abs(S.bar),
            {
              backgroundColor: S.barFill,
              borderColor: S.barStroke,
              borderWidth: px(0.5),
              borderRadius: px(50),
            },
          ]}
        />
        <LinearGradient
          colors={S.pillColors}
          style={[
            abs({ x: S.pillX[period], y: S.pill.y, w: S.pill.w, h: S.pill.h }),
            { borderColor: S.pillStroke, borderWidth: px(0.5), borderRadius: px(50) },
          ]}
        />
        {PERIODS.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setPeriod(key)}
            style={abs({ x: S.labelCx[key] - 36, y: S.bar.y, w: 72, h: S.bar.h })}
          >
            <Label
              cx={36}
              y={S.labelY - S.bar.y}
              size={S.labelSize}
              lineHeight={S.labelHeight}
              weight="regular"
              color={period === key ? S.selected : colors.white}
              width={72}
            >
              {label}
            </Label>
          </Pressable>
        ))}

        <Podium spec={PODIUM_PAGE} entries={entries} withScore />

        {rows.map((e, i) => (
          <Row key={e.entity_id} entry={e} y={ROWS.y + i * ROWS.step} />
        ))}

        {period === 'weekly' ? (
          <Pressable style={abs(REWARD_BUTTON.box)} onPress={() => navigation.navigate('RankingReward', { board })}>
            <Cropped
              source={art.rewardButton}
              box={{ ...REWARD_BUTTON.box, x: 0, y: 0 }}
              crop={REWARD_BUTTON.crop}
            />
            <Label
              cx={REWARD_BUTTON.labelCx}
              y={REWARD_BUTTON.labelY}
              size={14}
              lineHeight={21}
              weight="medium"
              color={colors.black}
              width={100}
            >
              Reward
            </Label>
          </Pressable>
        ) : null}

        <Pressable style={abs(PAGE.back)} onPress={() => navigation.goBack()} hitSlop={px(8)}>
          <SvgXml xml={icons.backArrow} width={px(PAGE.back.w)} height={px(PAGE.back.h)} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** Charm's backdrop: gradient, crowd photo, glitter, fade. */
function GradientPage({ backdrop: B, height }: { backdrop: GradientBackdrop; height: number }) {
  const { px } = useDesignScale();
  const abs = useBox();
  return (
    <>
      <LinearGradient
        colors={B.gradient.colors}
        locations={B.gradient.locations}
        style={{ position: 'absolute', left: 0, top: 0, width: px(402), height: px(height) }}
      />
      <Img source={art.photo} box={B.photo} resizeMode="cover" />
      <Img source={art.sparkle} box={B.sparkle} resizeMode="cover" />
      <LinearGradient colors={B.fade.colors} locations={B.fade.locations} style={abs(B.fade.box)} />
    </>
  );
}

function Row({ entry, y }: { entry: RankingEntry; y: number }) {
  const R = ROWS;
  return (
    <>
      <Label cx={R.rankCx} y={y + R.rankDy} size={21} lineHeight={31.5} width={44}>
        {entry.rank}
      </Label>
      <Avatar uri={entry.avatar_url} box={{ ...R.avatar, y: y + R.avatar.y }} />
      <Label x={R.nameX} y={y + R.nameDy} size={21} lineHeight={31.5} weight="medium" width={R.nameW}>
        {entry.display_name ?? ''}
      </Label>
      <Label x={R.idX} y={y + R.idDy} size={12} lineHeight={18} weight="medium" width={R.nameW}>
        {entry.guftagu_id ? `ID:${entry.guftagu_id}` : ''}
      </Label>
      <Img source={art.coin} box={{ ...R.coin, y: y + R.coin.y }} resizeMode="cover" />
      <Label cx={R.scoreCx} y={y + R.scoreDy} size={16} lineHeight={24} weight="regular" width={R.scoreW + 20}>
        {compact(entry.score)}
      </Label>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
