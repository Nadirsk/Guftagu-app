import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { FONT_SIZE, TABS } from './geometry';

// The Party tab's three "trio" banners — nodes 19:63, 19:346 and 19:343. Each is
// a bitmap backdrop with three portraits under ornamental crown frames, and two of
// them carry a ribbon that overhangs the top edge.

const art = {
  smallLeft: require('../../assets/home/banner-small-left.png'),
  smallRight: require('../../assets/home/banner-small-right.png'),
  wide: require('../../assets/home/banner-wide.png'),
  frameLeft: require('../../assets/home/frame-side-left.png'),
  frameRight: require('../../assets/home/frame-side-right.png'),
  frameCenter: require('../../assets/home/frame-center.png'),
  ribbonWeeklyStar: require('../../assets/home/ribbon-weekly-star.png'),
  ribbonCpRanking: require('../../assets/home/ribbon-cp-ranking.png'),
};

type Box = { x: number; y: number; width: number; height: number };

type Ribbon = {
  source: ImageSourcePropType;
  label: string;
  box: Box;
  paddingTop: number;
  paddingBottom: number;
};

type BannerSpec = {
  /** Where the banner artwork sits on the frame. */
  at: { x: number; y: number };
  background: ImageSourcePropType;
  size: { width: number; height: number };
  /** The three portraits, drawn under their crown frames. */
  photos: { left: Box; right: Box; center: Box };
  frames: { left: Box; right: Box; center: Box };
  /**
   * The centre crown is exported at a different aspect ratio than its slot in the
   * wide banner, so Figma insets the bitmap inside the slot instead of stretching
   * it. The small banners stretch it to fill.
   */
  centerInset?: { x: number; width: number; height: number };
  ribbon?: Ribbon;
  photoSources: {
    left: ImageSourcePropType;
    right: ImageSourcePropType;
    center: ImageSourcePropType;
  };
};

/** Node 19:63 — the left banner, the only one without a ribbon. */
export const BANNER_LEFT: BannerSpec = {
  at: TABS.Party.banners.left,
  background: art.smallLeft,
  size: { width: 177.878, height: 80 },
  photos: {
    left: { x: 23.295, y: 47.403, width: 28.534, height: 28.534 },
    right: { x: 131.215, y: 48.403, width: 28.534, height: 28.534 },
    center: { x: 69, y: 21, width: 41, height: 41 },
  },
  frames: {
    left: { x: 9, y: 39, width: 45.459, height: 40.531 },
    right: { x: 127, y: 39, width: 45.444, height: 40.531 },
    center: { x: 59, y: 15, width: 61, height: 58 },
  },
  photoSources: {
    left: require('../../assets/home/b1-left.png'),
    right: require('../../assets/home/b1-right.png'),
    center: require('../../assets/home/b1-center.png'),
  },
};

/** Node 19:346 — same trio layout, plus the "Weekly Star" ribbon above it. */
export const BANNER_RIGHT: BannerSpec = {
  at: TABS.Party.banners.right,
  background: art.smallRight,
  size: { width: 177.878, height: 80 },
  photos: {
    left: { x: 23.295, y: 47.403, width: 28.534, height: 28.534 },
    right: { x: 129.215, y: 47.403, width: 28.534, height: 28.534 },
    center: { x: 69, y: 26, width: 41, height: 41 },
  },
  frames: {
    left: { x: 9, y: 39, width: 45.459, height: 40.531 },
    right: { x: 127, y: 39, width: 45.444, height: 40.531 },
    center: { x: 59, y: 15, width: 61, height: 58 },
  },
  ribbon: {
    source: art.ribbonWeeklyStar,
    label: 'Weekly Star',
    box: { x: 28, y: -18, width: 116, height: 44 },
    paddingTop: 15,
    paddingBottom: 16,
  },
  photoSources: {
    left: require('../../assets/home/b2-left.png'),
    right: require('../../assets/home/b2-right.png'),
    center: require('../../assets/home/b2-center.png'),
  },
};

/**
 * Node 19:343 — the full-width "CP Ranking" banner. Its artwork starts 19px below
 * the section origin so the ribbon can overhang, so `at.y` is offset and every
 * child coordinate below is relative to the artwork rather than to the section.
 */
export const BANNER_WIDE: BannerSpec = {
  at: { x: TABS.Party.banners.wide.x, y: TABS.Party.banners.wide.y + 19 },
  background: art.wide,
  size: { width: 372, height: 105 },
  photos: {
    left: { x: 66.887, y: 46.127, width: 42.683, height: 41.489 },
    right: { x: 271.558, y: 37.731, width: 45.836, height: 45.216 },
    center: { x: 164, y: 36, width: 48, height: 49 },
  },
  frames: {
    left: { x: 47, y: 31, width: 68, height: 58.933 },
    right: { x: 268, y: 26, width: 73, height: 64.227 },
    center: { x: 146, y: 23, width: 78, height: 70 },
  },
  centerInset: { x: 4.922, width: 72.751, height: 70 },
  ribbon: {
    source: art.ribbonCpRanking,
    label: 'CP Ranking',
    box: { x: 127, y: -19, width: 116, height: 45 },
    paddingTop: 16,
    paddingBottom: 16,
  },
  photoSources: {
    left: require('../../assets/home/b3-left.png'),
    right: require('../../assets/home/b3-right.png'),
    center: require('../../assets/home/b3-center.png'),
  },
};

export function TrioBanner({ spec }: { spec: BannerSpec }) {
  const { px } = useDesignScale();
  const box = (b: Box) => ({
    position: 'absolute' as const,
    left: px(b.x),
    top: px(b.y),
    width: px(b.width),
    height: px(b.height),
  });

  const { ribbon, centerInset } = spec;
  // An explicit size, not StyleSheet.absoluteFill: a stretched <Image> with only
  // inset styles falls back to the bitmap's intrinsic size on react-native-web.
  const fill = { width: px(spec.size.width), height: px(spec.size.height) };

  return (
    <View
      style={{
        position: 'absolute',
        left: px(spec.at.x),
        top: px(spec.at.y),
        width: px(spec.size.width),
        height: px(spec.size.height),
      }}
    >
      <Image source={spec.background} style={fill} resizeMode="stretch" />

      {/* photo first, crown frame on top — the frames have a hollow centre */}
      <Image source={spec.photoSources.left} style={box(spec.photos.left)} resizeMode="cover" />
      <Image source={art.frameLeft} style={box(spec.frames.left)} resizeMode="stretch" />

      <Image source={spec.photoSources.right} style={box(spec.photos.right)} resizeMode="cover" />
      <Image source={art.frameRight} style={box(spec.frames.right)} resizeMode="stretch" />

      <Image source={spec.photoSources.center} style={box(spec.photos.center)} resizeMode="cover" />
      {centerInset ? (
        <View style={[box(spec.frames.center), styles.clip]}>
          <Image
            source={art.frameCenter}
            style={{
              position: 'absolute',
              left: px(centerInset.x),
              top: 0,
              width: px(centerInset.width),
              height: px(centerInset.height),
            }}
            resizeMode="stretch"
          />
        </View>
      ) : (
        <Image source={art.frameCenter} style={box(spec.frames.center)} resizeMode="stretch" />
      )}

      {ribbon ? (
        <View style={[box(ribbon.box), styles.ribbon]}>
          <Image
            source={ribbon.source}
            style={{
              position: 'absolute',
              width: px(ribbon.box.width),
              height: px(ribbon.box.height),
            }}
            resizeMode="stretch"
          />
          <Text
            numberOfLines={1}
            style={[
              styles.ribbonLabel,
              {
                fontSize: px(FONT_SIZE.ribbon),
                lineHeight: px(13),
                marginTop: px(ribbon.paddingTop - ribbon.paddingBottom),
              },
            ]}
          >
            {ribbon.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  ribbon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonLabel: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
    textAlign: 'center',
  },
});
