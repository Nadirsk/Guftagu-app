import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf } from './sheets';
import { type Arrival, type Entrance, entryText } from './useRoom';

const SLIDE_IN = 320;
const HOLD = 2500;
const SLIDE_OUT = 320;
/** A vehicle with no length of its own drives across in this long. */
const VEHICLE_MS = 4000;

/** Banner colours by what the arrival is — VIP tiers and plain entry banners each read differently. */
function theme(arrival: Arrival): [string, string] {
  const level = arrival.vip?.level ?? 0;
  if (level >= 5) return ['#FF7A18', '#C21500'];
  if (level === 4) return ['#3DDC84', '#0B8A4B'];
  if (level > 0) return ['#B06CFF', '#5B2BD6'];
  if (arrival.effect) return ['#35C7C0', '#0E6F77'];
  return ['#8A8FA8', '#444A66'];
}

/**
 * One arrival on the banner: slides in from the right, holds, the line scrolls if it does
 * not fit, then leaves to the left. An equipped vehicle drives across underneath. Remount
 * per arrival (`key`) — each one owns its own timings and calls `onDone` when finished.
 */
export function EntranceBanner({ entrance, onDone }: { entrance: Entrance; onDone: () => void }) {
  const { px } = useDesignScale();
  const { width } = useWindowDimensions();
  const { arrival, user } = entrance;

  const x = useRef(new Animated.Value(width)).current;
  const car = useRef(new Animated.Value(0)).current;
  const scroll = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [boxWidth, setBoxWidth] = useState(0);

  const bannerW = width - px(24);
  const vehicleMs = arrival.effect?.duration_ms ?? VEHICLE_MS;
  const text = `${user?.display_name ?? 'Guftagu user'} ${entryText(arrival)}`;
  const overflow = textWidth > boxWidth && boxWidth > 0 ? textWidth - boxWidth : 0;

  useEffect(() => {
    const total = SLIDE_IN + HOLD + SLIDE_OUT;
    const banner = Animated.sequence([
      Animated.timing(x, { toValue: 0, duration: SLIDE_IN, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(HOLD),
      Animated.timing(x, { toValue: -width, duration: SLIDE_OUT, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    const vehicle = arrival.effect?.image_url
      ? Animated.timing(car, { toValue: 1, duration: vehicleMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      : null;

    banner.start();
    vehicle?.start();
    const done = setTimeout(onDone, Math.max(total, vehicle ? vehicleMs : 0) + 80);
    return () => {
      clearTimeout(done);
      banner.stop();
      vehicle?.stop();
    };
    // Runs once per mounted arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The name scrolls inside its box during the hold, only when it is too long to fit.
  useEffect(() => {
    if (!overflow) return;
    const run = Animated.sequence([
      Animated.delay(SLIDE_IN + 200),
      Animated.timing(scroll, { toValue: -overflow, duration: HOLD - 400, easing: Easing.linear, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [overflow, scroll]);

  const [from, to] = theme(arrival);
  const carX = car.interpolate({ inputRange: [0, 1], outputRange: [-px(180), width + px(20)] });
  const carScale = car.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1, 1.15] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={{ position: 'absolute', left: px(12), top: px(330), width: bannerW, transform: [{ translateX: x }] }}>
        <LinearGradient
          colors={[from, to]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ height: px(44), borderRadius: px(22), flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(8), gap: px(8), borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
        >
          {arrival.vip ? (
            <View style={{ paddingHorizontal: px(7), height: px(18), borderRadius: px(9), backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center' }}>
              <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(10), color: colors.white }}>VIP{arrival.vip.level}</Text>
            </View>
          ) : null}
          <Image source={avatarOf(user)} style={{ width: px(32), height: px(32), borderRadius: px(16), borderWidth: 1, borderColor: colors.white }} />
          <View style={{ flex: 1, height: px(20), overflow: 'hidden' }} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
            <Animated.View style={{ position: 'absolute', left: 0, transform: [{ translateX: scroll }] }}>
              <Text
                numberOfLines={1}
                onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                style={{ fontFamily: typography.fontFamily.medium, fontSize: px(13), lineHeight: px(20), color: colors.white }}
              >
                {text}
              </Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>

      {arrival.effect?.image_url ? (
        <Animated.Image
          source={{ uri: arrival.effect.image_url }}
          resizeMode="contain"
          onError={(e) => __DEV__ && console.log('[entrance] vehicle image failed', arrival.effect?.image_url, JSON.stringify(e.nativeEvent))}
          style={{ position: 'absolute', left: 0, top: px(380), width: px(180), height: px(110), transform: [{ translateX: carX }, { scale: carScale }] }}
        />
      ) : null}
    </View>
  );
}

/**
 * Card tap → dim screen with a spinner HUD until the room's state lands, then it fades.
 */
export function EnteringOverlay({ visible }: { visible: boolean }) {
  const { px } = useDesignScale();
  const opacity = useRef(new Animated.Value(1)).current;
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setMounted(false));
  }, [opacity, visible]);

  if (!mounted) return null;
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { opacity, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }]}
    >
      <View style={{ alignItems: 'center', gap: px(10), paddingHorizontal: px(22), paddingVertical: px(18), borderRadius: px(16), backgroundColor: 'rgba(20,8,18,0.85)' }}>
        <ActivityIndicator color={colors.white} />
        <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(13), color: colors.white }}>Entering Room</Text>
      </View>
    </Animated.View>
  );
}
