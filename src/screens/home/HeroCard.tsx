import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
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
export default function HeroCard({ originY = 0, onPress }: { originY?: number; onPress?: () => void }) {
  const { px } = useDesignScale();
  const hero = LIVE_CARD;
  const { scrim, dots, streamer, badge, badgeWave, badgeCount } = HERO;

  return (
    <Pressable
      onPress={onPress}
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
        source={require('../../assets/home/hero-cover.jpg')}
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

      <View style={{ position: 'absolute', left: px(dots.x), top: px(dots.y) }}>
        <SvgXml xml={icons.heroDots} width={px(dots.width)} height={px(dots.height)} />
      </View>

      {/* node 483:2746 — avatar, then flag + title */}
      <View
        style={[
          styles.streamer,
          { left: px(streamer.x), top: px(streamer.y), gap: px(streamer.gap) },
        ]}
      >
        <Image
          source={require('../../assets/home/hero-avatar.png')}
          style={{ width: px(streamer.avatar), height: px(streamer.avatar) }}
        />
        <View style={[styles.streamerName, { gap: px(streamer.innerGap) }]}>
          <SvgXml xml={icons.flagIN} width={px(19)} height={px(12)} />
          <Text style={[styles.streamerLabel, { fontSize: px(streamer.fontSize) }]}>Riya’s Live</Text>
        </View>
      </View>

      {/* node 483:2751 — the large viewer-count tab */}
      <View style={{ position: 'absolute', left: px(badge.x), top: px(badge.y) }}>
        <SvgXml xml={icons.heroBadge} width={px(badge.width)} height={px(badge.height)} />
        <View style={{ position: 'absolute', left: px(badgeWave.x), top: px(badgeWave.y) }}>
          <SvgXml xml={icons.heroWave} width={px(badgeWave.width)} height={px(badgeWave.height)} />
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
          14
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
