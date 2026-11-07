import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as cpIcons from '../../assets/cp/icons';
import * as settingsIcons from '../../assets/settings/icons';
import * as walletIcons from '../../assets/wallet/icons';
import { useDesignScale } from '../../theme/layout';
import { typography } from '../../theme/tokens';

/**
 * CP Hall of Fame (Figma 2015:10692): CP Ranking (2015:10839, Rules popup 2015:10801),
 * CP Reward (2015:10693) and CP Plaza (2015:10755), one screen switched by the three pills.
 * The frames are 440 wide, so every figure is scaled by 402 / 440. The server serves no CP
 * pairs yet, so the cards show the design's own empty slots and its sample "3,505k".
 */

const FRAME = 440;
const art = {
  bg: require('../../assets/cp/bg.png'),
  sheet: require('../../assets/cp/card-sheet.png'),
  ribbon: require('../../assets/cp/ribbon.png'),
  left: require('../../assets/cp/frame-left.png'),
  right: require('../../assets/cp/frame-right.png'),
  heart: require('../../assets/cp/heart.png'),
  score: require('../../assets/cp/score-sheet.png'),
  lower: require('../../assets/cp/lower-sheet.png'),
  avatarA: require('../../assets/cp/avatar-a.png'),
  avatarB: require('../../assets/cp/avatar-b.png'),
  tabOn: require('../../assets/cp/tab-on.png'),
  tabOff: require('../../assets/cp/tab-off.png'),
  weekOn: require('../../assets/cp/week-on.png'),
  weekOff: require('../../assets/cp/week-off.png'),
  token: require('../../assets/cp/token.png'),
  plazaA: require('../../assets/cp/plaza-a.png'),
  plazaB: require('../../assets/cp/plaza-b.png'),
  plazaMid: require('../../assets/cp/plaza-mid.png'),
};

type Tab = 'ranking' | 'reward' | 'plaza';
const TABS: { key: Tab; label: string; x: number; labelX: number }[] = [
  { key: 'ranking', label: 'CP Ranking', x: 30, labelX: 87 },
  { key: 'reward', label: 'CP Reward', x: 163, labelX: 220 },
  { key: 'plaza', label: 'CP Plaza', x: 296, labelX: 353 },
];
const HEIGHT: Record<Tab, number> = { ranking: 2740, reward: 3139, plaza: 2143 };
// The art layer is 2707 tall in Ranking and 3139 in Reward / Plaza (image 205718).
const ART_HEIGHT: Record<Tab, number> = { ranking: 2707, reward: 3139, plaza: 3139 };

const RULES = [
  '1. Time: Starts on 1 2, 2026',
  '2. Rules: (1) Weekly ranking is based on points (2) Rewards are given based on ranking combined with points (Top 10 CP must have at least 10,000,000 points; no reward if less than 10,000,000 points).',
  '3. Reward Distribution Time: The top 10 CPs on the previous week’s leaderboard will be awarded after 3:00 AM every Monday',
];

// Top 1–3: the card tops in each tab.
const TOP_CARDS = {
  ranking: [967, 1355, 1759],
  reward: [921, 1309, 1713],
} as const;

export default function CpRankingScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('ranking');
  const [thisWeek, setThisWeek] = useState(true);
  const [rules, setRules] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const u = (v: number) => px((v * 402) / FRAME);
  const box = (left: number, top: number, w: number, h: number) => ({ position: 'absolute' as const, left: u(left), top: u(top), width: u(w), height: u(h) });
  const font = (size: number, weight: 'regular' | 'medium' | 'semiBold', color = '#FFFFFF') => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: u(size),
    lineHeight: u(Math.round(size * 1.28)),
    color,
  });
  /** Text centred on x, `width` wide. */
  const centred = (cx: number, top: number, width = 120) => ({ position: 'absolute' as const, left: u(cx - width / 2), top: u(top), width: u(width), textAlign: 'center' as const });

  /** An image drawn into a box at a percentage offset and size (Figma's cropped fills). */
  const crop = (src: ImageSourcePropType, l: number, t: number, w: number, h: number, p: { w: number; h: number; l: number; t: number }, flip = false, key?: string) => (
    <View key={key} style={[box(l, t, w, h), { overflow: 'hidden', transform: flip ? [{ rotate: '180deg' }] : [] }]}>
      <Image source={src} resizeMode="stretch" style={{ position: 'absolute', left: u(p.l * w), top: u(p.t * h), width: u(p.w * w), height: u(p.h * h) }} />
    </View>
  );
  const SHEET = { w: 1.9675, h: 1.2222, l: -0.4878, t: -0.0909 };
  const SCORE = { w: 1.0485, h: 2.7187, l: -0.0241, t: -0.75 };
  const photo = (src: ImageSourcePropType, l: number, t: number, w: number, h: number, key?: string) => (
    <Image key={key} source={src} resizeMode="cover" style={box(l, t, w, h)} />
  );
  const pill = (l: number, t: number, key?: string) => (
    <View key={key}>
      {crop(art.score, l, t, 117.875, 46, SCORE)}
      <Text style={[centred(l + 59.5, t + 11, 117), font(15, 'semiBold')]}>3,505k</Text>
    </View>
  );

  // Top 1 / 2 / 3: a framed card, the ribbon, two empty portrait slots and the score.
  const topCard = (y: number, label: string, withPair: boolean) => (
    <View key={label}>
      {crop(art.sheet, 13, y, 414, 348, SHEET)}
      {photo(art.ribbon, 95, y, 265, 91)}
      <Text style={[centred(228, y + 37, 120), font(20, 'semiBold')]}>{label}</Text>
      {withPair ? (
        <>
          <SvgXml xml={cpIcons.slot} width={u(83)} height={u(83)} style={box(71, y + 147, 83, 83)} />
          <SvgXml xml={cpIcons.slot} width={u(83)} height={u(83)} style={box(282, y + 147, 83, 83)} />
          {photo(art.left, 52, y + 129, 122, 122)}
          {photo(art.right, 266, y + 131, 115, 115)}
          {photo(art.heart, 174, y + 177, 99, 49)}
          {pill(162, y + 237)}
        </>
      ) : (
        <>
          {[0, 1].map((row) =>
            [95, 250].map((x) => (
              <Image key={`${row}-${x}`} source={art.token} style={box(x, y + (label === 'Top 1' ? 114 : label === 'Top 2' ? 120 : 118) + row * 93, 72, 72)} />
            )),
          )}
        </>
      )}
    </View>
  );

  // Top 4 / 5 (and 6-10 in Reward): the long frame in three pieces under a ribbon at `r`.
  const lowerCard = (r: number, label: string, mode: 'ranking' | 'reward') => (
    <View key={label}>
      {photo(art.lower, 16, r + 70, 411, 189)}
      {mode === 'ranking'
        ? crop(art.lower, 22, r + 22, 405, 200, { w: 1, h: 1.3549, l: 0, t: 0.0177 })
        : crop(art.lower, 22, r + 22, 405, 86, { w: 1, h: 3.1508, l: 0, t: 0.0412 })}
      {mode === 'ranking'
        ? crop(art.lower, 22, r + 122, 405, 163, { w: 1, h: 1.3549, l: 0, t: 0.0177 }, true)
        : crop(art.lower, 22, r + 259, 405, 68, { w: 1, h: 3.2477, l: 0, t: 0.0425 }, true)}
      {photo(art.ribbon, 95, r, 265, 91)}
      <Text style={[centred(228.5, r + 37, 140), font(20, 'semiBold')]}>{label}</Text>
      {mode === 'ranking' ? (
        <>
          {photo(art.avatarA, 63, r + 133, 64, 64)}
          {photo(art.avatarB, 152, r + 133, 64, 64)}
          {photo(art.heart, 110, r + 155, 61, 31)}
          {pill(266, r + 142)}
        </>
      ) : (
        [0, 1].map((row) =>
          [95, 250].map((x) => <Image key={`${row}-${x}`} source={art.token} style={box(x, r + 86 + row * 93, 72, 72)} />),
        )
      )}
    </View>
  );

  const ranking = (
    <>
      {TOP_CARDS.ranking.map((y, i) => topCard(y, `Top ${i + 1}`, true))}
      {lowerCard(2130, 'Top 4', 'ranking')}
      {lowerCard(2446, 'Top 5', 'ranking')}
      {/* This Week / Last Week */}
      {([['This Week', true, 50], ['Last Week', false, 230]] as const).map(([label, isThis, x]) => {
        const active = thisWeek === isThis;
        return (
          <Pressable key={label} onPress={() => setThisWeek(isThis)} accessibilityRole="button" accessibilityState={{ selected: active }} style={box(x, 884, 160, 65)}>
            <Image source={active ? art.weekOn : art.weekOff} resizeMode="stretch" style={{ width: u(160), height: u(65) }} />
            <View style={{ position: 'absolute', left: 0, top: u(9), width: u(160), height: u(44), alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={[
                  font(14, 'semiBold', active ? '#FFD98A' : 'rgba(255,255,255,0.6)'),
                  active && { textShadowColor: 'rgba(255,170,40,0.85)', textShadowRadius: u(6), textShadowOffset: { width: 0, height: 0 } },
                ]}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );

  const reward = (
    <>
      {TOP_CARDS.reward.map((y, i) => topCard(y, `Top ${i + 1}`, false))}
      {lowerCard(2084, 'Top 4', 'reward')}
      {lowerCard(2435, 'Top 5', 'reward')}
      {lowerCard(2786, 'Top 6-10', 'reward')}
    </>
  );

  // CP Plaza: four proposal cards, 281 apart.
  const BARS = [
    [64, 1106],
    [64, 1387],
    [56, 1673],
  ] as const;
  const plaza = (
    <>
      {[923, 1202, 1483, 1764].map((y, k) => (
        <View key={k}>
          {crop(art.sheet, k === 0 ? 12 : 13, y, 414, 253, SHEET)}
          {photo(art.heart, 113, 905 + 281 * k, 213, 106)}
          {photo(art.plazaA, 64, 1021 + 281 * k, 80, 80)}
          {photo(art.plazaB, 286, 1021 + 281 * k, 80, 80)}
          <SvgXml xml={cpIcons.pulse} width={u(62)} height={u(48.37)} style={box(148, 1037 + 281 * k, 62, 48.37)} />
          <SvgXml xml={cpIcons.pulse} width={u(62)} height={u(48.37)} style={box(220, 1037 + 281 * k, 62, 48.37)} />
          {photo(art.plazaMid, 187, 1023 + 281 * k, 64, 64)}
        </View>
      ))}
      {BARS.map(([x, y]) => (
        <View key={y} style={[box(x, y, 325, 29), { overflow: 'hidden' }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.78)', 'rgba(255,255,255,0.07)']}
            locations={[0, 0.49038, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[centred(162.5, 8, 325), font(11, 'medium', '#050505')]}>King prapose to queen</Text>
        </View>
      ))}
    </>
  );

  const height = HEIGHT[tab];
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={{ height: u(height) }} showsVerticalScrollIndicator={false}>
        {/* image 205712 / 205718 — the Hall of Fame art, 101.91% tall from -1.93%. */}
        <Image source={art.bg} resizeMode="stretch" style={box(0, -0.0193 * ART_HEIGHT[tab], FRAME, 1.0191 * ART_HEIGHT[tab])} />

        {tab === 'ranking' ? ranking : tab === 'reward' ? reward : plaza}

        {/* The banner's title opens the rules. */}
        {tab === 'ranking' && <Pressable onPress={() => setRules(true)} accessibilityLabel="Rules" style={box(20, 610, 400, 190)} />}

        {/* The three pills and their names. */}
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={box(t.x, 828, 114, 38)}>
            <Image source={tab === t.key ? art.tabOn : art.tabOff} resizeMode="cover" style={{ width: u(114), height: u(38) }} />
            <Text numberOfLines={1} style={[{ position: 'absolute', left: 0, top: u(11), width: u(114), textAlign: 'center' }, font(11, 'medium')]}>{t.label}</Text>
          </Pressable>
        ))}

        <Pressable onPress={() => navigation.goBack()} hitSlop={u(10)} accessibilityLabel="Back" style={box(21, 82, 34, 34)}>
          <SvgXml xml={settingsIcons.arrowLeft} width={u(34)} height={u(34)} />
        </Pressable>
      </ScrollView>

      {/* Frame 1597881670 — Rules. */}
      {rules && (
        <View style={[box(42, 340, 355, 348), styles.popup, { borderRadius: u(16) }]}>
          <Text style={[centred(177.5, 38, 200), font(17, 'medium', '#000000')]}>Rules</Text>
          <Pressable onPress={() => setRules(false)} hitSlop={u(10)} accessibilityLabel="Close" style={box(17, 38, 24, 24)}>
            <SvgXml xml={walletIcons.arrowBack} width={u(24)} height={u(24)} />
          </Pressable>
          <View style={[box(17, 89, 322, 170)]}>
            {RULES.map((p, i) => (
              <Text key={i} style={[font(13, 'regular', '#000000'), { marginBottom: i < 2 ? u(16) : 0 }]}>{p}</Text>
            ))}
          </View>
          <Pressable onPress={() => setRules(false)} style={[box(129, 278, 97, 34), styles.know, { borderRadius: u(27) }]}>
            <Text style={font(13, 'regular')}>I know</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1A0B2E' },
  popup: { backgroundColor: '#FFFFFF', overflow: 'hidden' },
  know: { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
});
