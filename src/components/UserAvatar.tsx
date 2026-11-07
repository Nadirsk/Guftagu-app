import { useState } from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { SvgaPlayer } from './SvgaPlayer';

/**
 * The frame a user wears from the Item Bag, as every person card carries it
 * (`SocialPresenter::user()['frame']`, `auth/me`, rankings). Null once taken off.
 */
export type AvatarFrame = { image_url: string | null; animation_url: string | null; animation_type: string | null };

/** The Store's proportion: a 96px photo sits in a 141px frame (Figma 4001:7953). */
export const FRAME_RATIO = 141 / 96;

/**
 * The frame alone, centred over a `size` × `size` photo that sits at this view's
 * parent's origin. It overhangs the photo on every side and never takes touches.
 * `animate` (on by default, so a frame looks the same on every screen and for every
 * viewer) plays an animated frame; pass `animate={false}` to keep the still.
 */
export function FrameOverlay({ frame, size, animate = true }: { frame?: AvatarFrame | null; size: number; animate?: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null);
  if (!frame || (!frame.image_url && !frame.animation_url)) return null;
  const box = size * FRAME_RATIO;
  const at = -(box - size) / 2;
  const svga = animate ? frame.animation_url : null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: at, top: at, width: box, height: box }}>
      {frame.image_url && !(svga && playing === svga) ? (
        <Image source={{ uri: frame.image_url }} resizeMode="contain" style={StyleSheet.absoluteFill} />
      ) : null}
      {svga ? <SvgaPlayer key={svga} url={svga} style={StyleSheet.absoluteFill} onFirstFrame={() => setPlaying(svga)} /> : null}
    </View>
  );
}

/**
 * A round photo with the user's frame around it — use it wherever a person's photo
 * shows, so equipping or unequipping a frame changes it everywhere. `size` is in
 * device points; `style` places the photo (as the bare Image used to be placed) and
 * `imageStyle` adds to the photo itself (a ring, a background).
 */
export function UserAvatar({
  source,
  frame,
  size,
  style,
  imageStyle,
  animate = true,
}: {
  source: ImageSourcePropType;
  frame?: AvatarFrame | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  animate?: boolean;
}) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image source={source} resizeMode="cover" style={[{ width: size, height: size, borderRadius: size / 2 }, imageStyle]} />
      <FrameOverlay frame={frame} size={size} animate={animate} />
    </View>
  );
}
