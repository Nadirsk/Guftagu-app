import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, Text, type TextStyle, View } from 'react-native';

import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

// Building blocks for the bitmap-heavy event screens (Weekly Star, Rankings), which
// are laid out on their Figma frame's own coordinates rather than with flexbox.

export type Box = { x: number; y: number; w: number; h: number };

/**
 * How a bitmap sits inside its clipping box, in percent of the box — Figma's
 * own numbers for an image that is cropped rather than fitted.
 */
export type Crop = { w: number; h: number; l: number; t: number };

export function useBox() {
  const { px } = useDesignScale();
  return (b: Box, dx = 0, dy = 0) => ({
    position: 'absolute' as const,
    left: px(b.x + dx),
    top: px(b.y + dy),
    width: px(b.w),
    height: px(b.h),
  });
}

/** A bitmap fitted to its box. Explicit size: insets alone break on react-native-web. */
export function Img({
  source,
  box,
  resizeMode = 'stretch',
  radius,
  opacity,
}: {
  source: ImageSourcePropType;
  box: Box;
  resizeMode?: 'stretch' | 'cover';
  radius?: number;
  opacity?: number;
}) {
  const { px } = useDesignScale();
  const abs = useBox();
  return (
    <Image
      source={source}
      resizeMode={resizeMode}
      style={[abs(box), radius != null ? { borderRadius: px(radius) } : null, opacity != null ? { opacity } : null]}
    />
  );
}

/** A bitmap cropped by its box, positioned by Figma's percentages. */
export function Cropped({
  source,
  box,
  crop,
  transform,
  radius,
}: {
  source: ImageSourcePropType;
  box: Box;
  crop: Crop;
  /** `flip` is a 180° turn, `mirror` a left-right flip, `flipY` an upside-down one. */
  transform?: 'flip' | 'mirror' | 'flipY';
  radius?: number;
}) {
  const { px } = useDesignScale();
  const abs = useBox();
  return (
    <View
      style={[
        abs(box),
        { overflow: 'hidden' },
        radius != null ? { borderRadius: px(radius) } : null,
        transform === 'flip' ? { transform: [{ rotate: '180deg' }] } : null,
        transform === 'mirror' ? { transform: [{ scaleX: -1 }] } : null,
        transform === 'flipY' ? { transform: [{ scaleY: -1 }] } : null,
      ]}
    >
      <Image
        source={source}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: px((box.w * crop.l) / 100),
          top: px((box.h * crop.t) / 100),
          width: px((box.w * crop.w) / 100),
          height: px((box.h * crop.h) / 100),
        }}
      />
    </View>
  );
}

/** Text placed on Figma coordinates; `cx` centres it on that x instead. */
export function Label({
  x,
  cx,
  y,
  size,
  lineHeight,
  weight = 'semiBold',
  color = colors.white,
  width,
  align,
  lines = 1,
  opacity,
  children,
}: {
  x?: number;
  cx?: number;
  y: number;
  size: number;
  lineHeight: number;
  weight?: keyof typeof typography.fontFamily;
  color?: string;
  width?: number;
  align?: TextStyle['textAlign'];
  lines?: number;
  opacity?: number;
  children: ReactNode;
}) {
  const { px } = useDesignScale();
  // Centred labels get a generous box so a longer name than Figma's still fits.
  const w = width ?? (cx != null ? 240 : 200);
  const left = cx != null ? cx - w / 2 : (x ?? 0);
  return (
    <Text
      numberOfLines={lines}
      style={{
        position: 'absolute',
        left: px(left),
        top: px(y),
        width: px(w),
        fontFamily: typography.fontFamily[weight],
        fontSize: px(size),
        lineHeight: px(lineHeight),
        color,
        opacity,
        textAlign: align ?? (cx != null ? 'center' : 'left'),
      }}
    >
      {children}
    </Text>
  );
}

/** Frame 9014 — four white cells; the label column widths differ. */
const COUNTDOWN = {
  columns: [49, 49, 60, 65],
  gap: 22,
  cell: { w: 49, h: 46 },
  labelGap: 4,
};

/**
 * The Days / Hours / Minutes / Seconds cells both event screens share. `x`/`y`
 * are the left edge and top of Frame 9014; the backdrop bitmap is the caller's.
 */
export function CountdownCells({ x, y, seconds }: { x: number; y: number; seconds: number }) {
  const { px } = useDesignScale();
  const values = [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ];
  const names = ['Days', 'Hours', 'Minutes', 'Seconds'];
  let left = x;

  return (
    <>
      {COUNTDOWN.columns.map((colW, i) => {
        const col = left;
        left += colW + COUNTDOWN.gap;
        return (
          <View key={names[i]}>
            <View
              style={{
                position: 'absolute',
                left: px(col + (colW - COUNTDOWN.cell.w) / 2),
                top: px(y),
                width: px(COUNTDOWN.cell.w),
                height: px(COUNTDOWN.cell.h),
                borderRadius: px(5),
                backgroundColor: colors.white,
                overflow: 'hidden',
                justifyContent: 'center',
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  width: px(COUNTDOWN.cell.w),
                  fontFamily: typography.fontFamily.bold, // Figma's Mona Sans Bold isn't bundled
                  fontSize: px(18),
                  lineHeight: px(25),
                  color: '#FF4D00',
                  textAlign: 'center',
                }}
              >
                {values[i]}
              </Text>
            </View>
            {/* Only "Days" is centred in Figma; the others hang off the column's left. */}
            <Label
              x={i === 0 ? undefined : col}
              cx={i === 0 ? col + colW / 2 : undefined}
              y={y + COUNTDOWN.cell.h + COUNTDOWN.labelGap}
              size={15}
              lineHeight={23}
              weight="medium"
              width={Math.max(colW, 64)}
            >
              {names[i]}
            </Label>
          </View>
        );
      })}
    </>
  );
}
