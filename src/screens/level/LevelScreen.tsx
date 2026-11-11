import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { peek, refresh } from '../../lib/swrCache';
import * as icons from '../../assets/level/icons';
import { useAuth } from '../../auth/AuthContext';
import { type Box, Img, Label, useBox } from '../../components/figmaLayers';
import { FrameOverlay } from '../../components/UserAvatar';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { cachedOwned, equippedOf } from '../itemBag/owned';
import { BAR, BLURB, CARD, LIST, type LevelKind, PAGE, TABS, THEME } from './geometry';
import { MEDALS } from './medals';

/**
 * Level — Wealth Level (2015:9314) and Charm Level (2015:9378), one screen with the
 * two names at the top switching between them. The card is the caller's own
 * progression (`GET /progression`): wealth is lifetime coins spent, charm is lifetime
 * diamonds earned, measured against the admin's level ladder. The interval list and
 * its medals are the design's own artwork.
 */

const art = {
  coin: require('../../assets/level/coin.png'),
  avatar: require('../../assets/avatar-placeholder.png'),
};

// The design's last row reads "Lv.101 - Lv.120"; it is the 111–120 band.
const INTERVALS = Array.from({ length: 12 }, (_, i) => `Lv.${i * 10 + 1} - Lv.${i * 10 + 10}`);

type Track = {
  level: number | null;
  threshold: number | null;
  lifetime_value: number;
  next_level: { level: number; threshold: number } | null;
};
type Progression = Record<LevelKind, Track>;

const lv = (n: number | null | undefined) => `LV.${String(n ?? 0).padStart(2, '0')}`;

export default function LevelScreen() {
  const { px } = useDesignScale();
  const abs = useBox();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const initial = useRoute<RouteProp<RootStackParamList, 'Level'>>().params?.kind ?? 'wealth';
  const [kind, setKind] = useState<LevelKind>(initial);
  const [progression, setProgression] = useState<Progression | null>(() => peek<Progression>('/progression', token));

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  useEffect(() => {
    return refresh<Progression>('/progression', token, setProgression);
  }, [token]);

  const T = THEME[kind];
  const track = progression?.[kind];
  const value = track?.lifetime_value ?? 0;
  const next = track?.next_level ?? null;
  // Share of the way from this level's start to the next one; full once at the top level.
  const from = track?.threshold ?? 0;
  const progress = next ? Math.min(1, Math.max(0, (value - from) / Math.max(1, next.threshold - from))) : track ? 1 : 0;
  const thumbX = T.thumbX + progress * (BAR.thumbEnd - T.thumbX);

  // Card and list children are measured from inside their 1px border.
  const C = CARD;
  const inCard = (x: number, y: number) => ({ x: x + C.box.x + 1, y: y + C.box.y + 1 });
  const card = (b: Box) => ({ ...b, ...inCard(b.x, b.y) });
  const L = LIST;
  const inList = (x: number, y: number) => ({ x: x + L.box.x + 1, y: y + L.box.y + 1 });

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={{ height: px(PAGE.height), overflow: 'hidden' }}>
        <SvgXml xml={icons.background} width={px(PAGE.background.w)} height={px(PAGE.background.h)} style={abs(PAGE.background)} />

        {/* Back */}
        <Pressable style={abs(PAGE.back)} onPress={() => navigation.goBack()} hitSlop={px(8)} accessibilityLabel="Back">
          <SvgXml
            xml={icons.chevronBackward}
            width={px(PAGE.glyph.w)}
            height={px(PAGE.glyph.h)}
            style={{
              position: 'absolute',
              left: px((PAGE.back.w - PAGE.glyph.w) / 2),
              top: px((PAGE.back.h - PAGE.glyph.h) / 2),
            }}
          />
        </Pressable>

        {/* wealth | Charm */}
        {(['wealth', 'charm'] as const).map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={abs({ x: TABS[k].x, y: TABS.y, w: TABS[k].w, h: TABS.lineHeight })}>
            <Label x={0} y={0} size={TABS.size} lineHeight={TABS.lineHeight} weight="medium" width={TABS[k].w + 10} opacity={kind === k ? 1 : 0.5}>
              {THEME[k].name}
            </Label>
          </Pressable>
        ))}

        {/* The card */}
        <View
          style={[
            abs(C.box),
            { backgroundColor: T.card, borderWidth: 1, borderColor: C.border, borderRadius: px(C.radius) },
          ]}
        />
        {[
          { x: C.levels.left, text: lv(track?.level) },
          // At the top level there is no next one: both ends read the same.
          { x: C.levels.right, text: lv(track ? (next?.level ?? track.level) : 1) },
        ].map(({ x, text }) => (
          <Label
            key={x}
            {...inCard(x, C.levels.y)}
            size={C.levels.size}
            lineHeight={C.levels.lineHeight}
            weight="medium"
            width={C.levels.w + 10}
          >
            {text}
          </Label>
        ))}
        <View style={abs(card(C.avatar))}>
          <Image
            source={user?.avatar_url ? { uri: user.avatar_url } : art.avatar}
            resizeMode="cover"
            style={{ width: '100%', height: '100%', borderRadius: px(C.avatar.w / 2) }}
          />
          {/* Your own frame from the Item Bag — the Profile loaded it on the way here. */}
          <FrameOverlay frame={equippedOf(cachedOwned(), 'frame')} size={px(C.avatar.w)} />
        </View>
        <Stat box={card(C.stats[0])} label={T.stat} value={String(value)} />
        <Stat box={card(C.stats[1])} label="Next Level" value={!track ? '—' : next ? String(next.threshold) : 'Max'} />

        {/* Progress */}
        <LinearGradient
          colors={BAR.trackColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[abs(BAR.track), { borderWidth: 1, borderColor: BAR.trackBorder, borderRadius: px(100) }]}
        />
        <View
          style={[
            abs({ x: BAR.fill.x, y: BAR.track.y, w: BAR.fill.w + (thumbX - T.thumbX), h: BAR.track.h }),
            {
              backgroundColor: T.fill.color,
              borderRadius: px(100),
              ...(T.fill.border ? { borderWidth: 1, borderColor: T.fill.border } : null),
            },
          ]}
        />
        <SvgXml
          xml={icons.knob}
          width={px(BAR.thumbSvg.size)}
          height={px(BAR.thumbSvg.size)}
          style={abs({ x: thumbX + BAR.thumbSvg.dx, y: 275.2 + BAR.thumbSvg.dy, w: BAR.thumbSvg.size, h: BAR.thumbSvg.size })}
        />

        <Label x={BLURB.x} y={BLURB.y} size={BLURB.size} lineHeight={BLURB.lineHeight} weight="medium" width={BLURB.w} lines={3} opacity={0.5}>
          {T.blurb}
        </Label>

        {/* Level Intervals & Grade Medals */}
        <View style={[abs(L.box), { backgroundColor: L.fill, borderWidth: 1, borderColor: C.border, borderRadius: px(L.radius) }]} />
        <Label {...inList(L.title.x, L.title.y)} size={L.title.size} lineHeight={L.title.lineHeight} weight="semiBold" width={L.title.w + 20}>
          {'Level Intervals & Grade Medals'}
        </Label>
        {INTERVALS.map((text, i) => (
          <Label key={text} {...inList(L.row.x, L.rowY[i])} size={L.row.size} lineHeight={L.row.lineHeight} weight="semiBold" width={L.row.w}>
            {text}
          </Label>
        ))}
        {L.dividerY.map((y) => {
          const at = inList(L.divider.x, y - 1);
          return <SvgXml key={y} xml={icons.divider} width={px(L.divider.w)} height={px(1)} style={abs({ ...at, w: L.divider.w, h: 1 })} />;
        })}
        {T.medals.map((slot, i) => (
          <Img key={i} source={MEDALS[kind][i]} box={{ ...inList(slot.x, slot.y), ...L.medal }} resizeMode="cover" />
        ))}
      </View>
    </ScrollView>
  );
}

/** One of the two outlined boxes: a caption over an amount with the coin after it. */
function Stat({ box, label, value }: { box: Box; label: string; value: string }) {
  const { px } = useDesignScale();
  const abs = useBox();
  const S = CARD.stat;
  return (
    <View style={[abs(box), { borderWidth: 1, borderColor: S.border, borderRadius: px(S.radius), overflow: 'hidden' }]}>
      <Label cx={(box.w - 2) / 2} y={S.labelY} size={S.labelSize} lineHeight={S.lineHeight} weight="medium" width={box.w - 2}>
        {label}
      </Label>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          // Figma's 24px row, grown to the taller text line around the same centre.
          top: px(S.rowY - (S.valueLineHeight - S.rowH) / 2),
          height: px(S.valueLineHeight),
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: px(S.gap),
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.medium,
            fontSize: px(S.valueSize),
            lineHeight: px(S.valueLineHeight),
            includeFontPadding: false,
            color: colors.white,
          }}
        >
          {value}
        </Text>
        <Image source={art.coin} resizeMode="cover" style={{ width: px(S.coin), height: px(S.coin) }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // The frame's own fill; the background svg is a 90%-opaque gradient over it.
    backgroundColor: colors.white,
  },
});
