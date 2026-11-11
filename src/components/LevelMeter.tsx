import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useDesignScale } from '../theme/layout';
import { colors } from '../theme/tokens';

/**
 * The little level meter beside a listener / viewer count (Party's room rows, the Live tab's cards and
 * hero). Each bar bounces on its own period and floor, so together they read as a live level.
 * `heights` are the bars' full height in design px; `align` is where they sit: Party's rest on a common
 * floor, the Live tab's waveform is centred.
 */

const MOTION = [
  { duration: 420, min: 0.35 },
  { duration: 560, min: 0.3 },
  { duration: 340, min: 0.4 },
  { duration: 480, min: 0.25 },
  { duration: 520, min: 0.35 },
];

function Bar({ height, width, color, duration, min, delay, align, rounded }: { height: number; width: number; color: string; duration: number; min: number; delay: number; align: 'bottom' | 'center'; rounded: boolean }) {
  const level = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(level, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(level, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [level, duration, delay]);

  // scaleY pivots on the bar's centre; a floor-aligned bar slides down by the same amount to keep its base fixed.
  const scaleY = level.interpolate({ inputRange: [0, 1], outputRange: [min, 1] });
  const translateY = level.interpolate({ inputRange: [0, 1], outputRange: [(height * (1 - min)) / 2, 0] });
  const transform = align === 'bottom' ? [{ translateY }, { scaleY }] : [{ scaleY }];

  return <Animated.View style={{ width, height, borderRadius: rounded ? width / 2 : 0, backgroundColor: color, transform }} />;
}

export default function LevelMeter({
  heights,
  width,
  gap,
  color = colors.black,
  align = 'center',
  rounded = true,
}: {
  heights: number[];
  width: number;
  gap: number;
  color?: string;
  align?: 'bottom' | 'center';
  rounded?: boolean;
}) {
  const { px } = useDesignScale();
  const tallest = Math.max(...heights);
  return (
    <View style={{ flexDirection: 'row', alignItems: align === 'bottom' ? 'flex-end' : 'center', gap: px(gap), height: px(tallest) }}>
      {heights.map((h, i) => (
        <Bar
          key={i}
          height={px(h)}
          width={px(width)}
          color={color}
          align={align}
          rounded={rounded}
          duration={MOTION[i % MOTION.length].duration}
          min={MOTION[i % MOTION.length].min}
          delay={i * 90}
        />
      ))}
    </View>
  );
}
