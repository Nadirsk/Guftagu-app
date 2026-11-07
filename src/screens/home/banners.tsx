import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BANNERS, FONT_SIZE } from './geometry';

// The header's three "trio" ranking banners — Groups 8921, 8922 and 8923. Each is
// a bitmap backdrop with three portraits under ornamental crown frames, and two of
// them carry a ribbon that overhangs the top edge.

const art = {
  // The exports are 40-60% transparent, so on the home screen's black they read as
  // dim, edgeless panels next to the wide banner. These are the same artwork with
  // the alpha made solid inside the same rounded outline.
  smallLeft: require('../../assets/home/banner-small-left-solid.png'),
  smallRight: require('../../assets/home/banner-small-right-solid.png'),
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

/**
 * The ribbon on the two small banners. Figma's 116x44 ribbon is a third of the
 * wide banner's width but two thirds of a small one's, so it was off-centre and
 * its lower tip rode up over the centre portrait's crown. Scaled to 36 tall and
 * centred on the 177.878 card it straddles the top edge the way the CP Ranking
 * ribbon does, ending 3px into the crown's frame like that one.
 */
const SMALL_RIBBON_BOX: Box = { x: 41.5, y: -18, width: 95, height: 36 };

/**
 * Group 8921 — the left banner. Figma draws it without a ribbon; it wears the
 * Weekly Star one (same art, same placement) labelled "Ranking", and opens the
 * rankings screen.
 */
export const BANNER_LEFT: BannerSpec = {
  at: BANNERS.left,
  background: art.smallLeft,
  size: { width: 177.878, height: 80 },
  photos: {
    left: { x: 23.45, y: 47.14, width: 28.534, height: 28.534 },
    right: { x: 129.39, y: 47.14, width: 28.534, height: 28.534 },
    center: { x: 69.42, y: 24.74, width: 41, height: 41 },
  },
  frames: {
    left: { x: 9, y: 39, width: 45.459, height: 40.531 },
    right: { x: 127, y: 39, width: 45.444, height: 40.531 },
    center: { x: 59, y: 15, width: 61, height: 58 },
  },
  ribbon: {
    source: art.ribbonWeeklyStar,
    label: 'Ranking',
    box: SMALL_RIBBON_BOX,
    paddingTop: 15,
    paddingBottom: 16,
  },
  photoSources: {
    left: require('../../assets/avatar-placeholder.png'),
    right: require('../../assets/avatar-placeholder.png'),
    center: require('../../assets/avatar-placeholder.png'),
  },
};

/** Group 8922 — same trio layout, plus the "Weekly Star" ribbon above it. */
export const BANNER_RIGHT: BannerSpec = {
  at: BANNERS.right,
  background: art.smallRight,
  size: { width: 177.878, height: 80 },
  photos: {
    left: { x: 23.45, y: 47.14, width: 28.534, height: 28.534 },
    right: { x: 129.39, y: 47.14, width: 28.534, height: 28.534 },
    center: { x: 69.42, y: 24.74, width: 41, height: 41 },
  },
  frames: {
    left: { x: 9, y: 39, width: 45.459, height: 40.531 },
    right: { x: 127, y: 39, width: 45.444, height: 40.531 },
    center: { x: 59, y: 15, width: 61, height: 58 },
  },
  ribbon: {
    source: art.ribbonWeeklyStar,
    label: 'Weekly Star',
    box: SMALL_RIBBON_BOX,
    paddingTop: 15,
    paddingBottom: 16,
  },
  photoSources: {
    left: require('../../assets/avatar-placeholder.png'),
    right: require('../../assets/avatar-placeholder.png'),
    center: require('../../assets/avatar-placeholder.png'),
  },
};

/**
 * Group 8923 — the full-width "CP Ranking" banner. Its artwork starts 19px below
 * the group's origin so the ribbon can overhang; `at` is the artwork, and every
 * child coordinate below is relative to it rather than to the group.
 */
export const BANNER_WIDE: BannerSpec = {
  at: BANNERS.wide,
  background: art.wide,
  size: { width: 372, height: 105 },
  photos: {
    left: { x: 68.62, y: 42.85, width: 42.683, height: 41.489 },
    right: { x: 271.84, y: 38.9, width: 45.836, height: 45.216 },
    center: { x: 163.8, y: 35, width: 48, height: 49 },
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
    left: require('../../assets/avatar-placeholder.png'),
    right: require('../../assets/avatar-placeholder.png'),
    center: require('../../assets/avatar-placeholder.png'),
  },
};

// Photo slots are centred on the hollow of their crown frame, not on the frame's
// box: the side crowns carry a wing, so the hollow sits at ~63% / ~37% of the
// bitmap width and ~55% down; the centre crown's is at ~51% x 52%.

/**
 * `faces` are the live top three — [1st, 2nd, 3rd] photo urls. 1st takes the
 * centre crown, 2nd the left and 3rd the right; an empty slot keeps the artwork.
 */
export function TrioBanner({
  spec,
  onPress,
  faces = [],
}: {
  spec: BannerSpec;
  onPress?: () => void;
  faces?: (string | undefined)[];
}) {
  const { px } = useDesignScale();
  const photo = (url: string | undefined, fallback: ImageSourcePropType) => (url ? { uri: url } : fallback);
  const sources = {
    center: photo(faces[0], spec.photoSources.center),
    left: photo(faces[1], spec.photoSources.left),
    right: photo(faces[2], spec.photoSources.right),
  };
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
    <Pressable
      disabled={!onPress}
      onPress={onPress}
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
      <Image source={sources.left} style={box(spec.photos.left)} resizeMode="cover" />
      <Image source={art.frameLeft} style={box(spec.frames.left)} resizeMode="stretch" />

      <Image source={sources.right} style={box(spec.photos.right)} resizeMode="cover" />
      <Image source={art.frameRight} style={box(spec.frames.right)} resizeMode="stretch" />

      <Image source={sources.center} style={box(spec.photos.center)} resizeMode="cover" />
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
    </Pressable>
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
