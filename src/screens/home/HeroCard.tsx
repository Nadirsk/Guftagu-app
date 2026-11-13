import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import LevelMeter from '../../components/LevelMeter';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { HERO, LIVE_CARD } from './geometry';

// Node 483:2740's scrim reads as `rgba(217,217,217,0) 14.768% -> rgba(0,0,0,0.53)
// 51.152%`, but Figma interpolates it in STRAIGHT (non-premultiplied) RGBA: the
// colour fades 217->0 while the alpha climbs 0->0.53, so mid-ramp it is a
// translucent grey that lightens the photo before the black takes over. CSS and
// CoreAnimation interpolate premultiplied, which collapses that to plain black
// and darkens the transition band by up to ~30/255.
//
// Baking the straight-alpha ramp into explicit stops reproduces Figma's curve on
// every platform; the premultiplied error left inside each short segment is well
// under 1/255. The anchors at 0 and 1 hold the ends flat regardless of clamping.
const SCRIM_STEPS = 10;
const SCRIM_FROM = 217;
const SCRIM_ALPHA = 0.53;
const [SCRIM_START, SCRIM_END] = HERO.scrimStops;

const scrimRamp = Array.from({ length: SCRIM_STEPS + 1 }, (_, i) => i / SCRIM_STEPS);

const SCRIM_COLORS = [
  `rgba(${SCRIM_FROM},${SCRIM_FROM},${SCRIM_FROM},0)`,
  ...scrimRamp.map((t) => {
    const c = Math.round(SCRIM_FROM * (1 - t));
    return `rgba(${c},${c},${c},${(SCRIM_ALPHA * t).toFixed(4)})`;
  }),
  `rgba(0,0,0,${SCRIM_ALPHA})`,
] as unknown as readonly [string, string, ...string[]];

const SCRIM_LOCATIONS = [
  0,
  ...scrimRamp.map((t) => SCRIM_START + t * (SCRIM_END - SCRIM_START)),
  1,
] as unknown as readonly [number, number, ...number[]];

/**
 * The Live tab's card — node 483:2739. A full-bleed still with a scrim over its
 * lower half, the streamer's name bottom-left, a large viewer-count tab
 * top-right and the carousel dots at the bottom.
 *
 * The count tab runs a fraction of a pixel past the card's right edge, and Figma
 * clips it — hence the `overflow: 'hidden'` rather than letting it hang over.
 *
 * `originY` is the frame y its container starts at; `LIVE_CARD` is absolute.
 */
/** A live room as the card needs it (a row of `GET /rooms/live`). */
export type HeroRoom = {
  uuid: string;
  name: string | null;
  cover_url: string | null;
  listener_count: number;
  owner: { display_name?: string | null; avatar_url?: string | null } | null;
};

const ROTATE_MS = 4500;

/**
 * Real lives, one at a time, turning over every few seconds (the dots show which). Tapping a card opens that
 * live. With nobody live it says so and sends you to start one — it never shows a made-up streamer.
 */
export default function HeroCard({
  originY = 0,
  rooms = [],
  onOpenRoom,
  onEmpty,
}: {
  originY?: number;
  rooms?: HeroRoom[];
  onOpenRoom?: (room: HeroRoom) => void;
  onEmpty?: () => void;
}) {
  const { px } = useDesignScale();
  const [index, setIndex] = useState(0);
  const count = rooms.length;
  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count]);
  const current = count > 0 ? rooms[index % count] : null;
  const pic = current?.cover_url ?? current?.owner?.avatar_url ?? null;
  const title = current ? (current.name || current.owner?.display_name || 'Live') : 'Nobody is live right now';
  const onPress = current ? () => onOpenRoom?.(current) : onEmpty;
  const hero = LIVE_CARD;
  const { scrim, dots, streamer, badge, badgeWave, badgeCount } = HERO;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={current ? `Open ${title}` : 'Go live'}
      style={{
        position: 'absolute',
        left: px(hero.x),
        top: px(hero.y - originY),
        width: px(hero.width),
        height: px(hero.height),
        borderRadius: px(hero.radius),
        overflow: 'hidden',
      }}
    >
      <Image
        source={pic ? { uri: pic } : require('../../assets/home/hero-cover.jpg')}
        style={{ position: 'absolute', width: px(hero.width), height: px(hero.height) }}
        resizeMode="cover"
      />

      {/* Node 483:2740 — 179.85deg in Figma, i.e. straight down. See SCRIM_*. */}
      <LinearGradient
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: px(scrim.x),
          top: px(scrim.y),
          width: px(scrim.width),
          height: px(scrim.height),
        }}
      />

      {count > 1 ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: px(dots.y), height: px(dots.height), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: px(5) }}>
          {rooms.slice(0, 8).map((r, i) => (
            <View key={r.uuid} style={{ width: px(i === index % count ? 16 : 7), height: px(7), borderRadius: px(4), backgroundColor: i === index % count ? colors.white : 'rgba(255,255,255,0.45)' }} />
          ))}
        </View>
      ) : null}

      {/* node 483:2746 — avatar, then flag + title */}
      <View
        style={[
          styles.streamer,
          { left: px(streamer.x), top: px(streamer.y), gap: px(streamer.gap) },
        ]}
      >
        <Image
          source={current?.owner?.avatar_url ? { uri: current.owner.avatar_url } : require('../../assets/home/hero-avatar.png')}
          style={{ width: px(streamer.avatar), height: px(streamer.avatar), borderRadius: px(streamer.avatar / 2) }}
        />
        <View style={[styles.streamerName, { gap: px(streamer.innerGap) }]}>
          <SvgXml xml={icons.flagIN} width={px(19)} height={px(12)} />
          <Text numberOfLines={1} style={[styles.streamerLabel, { fontSize: px(streamer.fontSize), maxWidth: px(220) }]}>{title}</Text>
        </View>
      </View>

      {/* node 483:2751 — the large viewer-count tab */}
      <View style={{ position: 'absolute', left: px(badge.x), top: px(badge.y) }}>
        <SvgXml xml={icons.heroBadge.replace('fill-opacity="0.32"', 'fill-opacity="0.85"')} width={px(badge.width)} height={px(badge.height)} />
        {/* Vector 1: 27 x 23, five 3px bars of 4.4, 2.2, 13.3, 20 and 4.4 long, now bouncing like Party's meter. */}
        <View style={{ position: 'absolute', left: px(badgeWave.x), top: px(badgeWave.y), width: px(badgeWave.width), height: px(badgeWave.height), alignItems: 'center', justifyContent: 'center' }}>
          <LevelMeter heights={[7.44, 5.22, 16.33, 23, 7.44]} width={3} gap={3} />
        </View>
        <Text
          style={[
            styles.badgeCount,
            {
              left: px(badgeCount.x),
              top: px(badgeCount.y),
              width: px(badgeCount.width),
              fontSize: px(badgeCount.fontSize),
              lineHeight: px(badgeCount.height),
            },
          ]}
        >
          {current ? current.listener_count : 0}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  streamer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamerName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamerLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  badgeCount: {
    position: 'absolute',
    fontFamily: typography.fontFamily.semiBold,
    color: colors.black,
    textAlign: 'center',
  },
});
