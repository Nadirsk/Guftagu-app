import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BANNER_LEFT, BANNER_RIGHT, BANNER_WIDE, TrioBanner } from './banners';
import { HEADER, TABS } from './geometry';

/**
 * Everything above the tab row, which every tab draws identically: the space
 * backdrop, the title, the floating portraits, the bell, the "Matching with you"
 * pill, the online count and the three ranking banners.
 *
 * The portraits, the counts and the banners' faces are Figma's sample content —
 * nothing in the API reports them yet.
 */

const art = {
  background: require('../../assets/home/home-bg.png'),
  bell: require('../../assets/home/bell.png'),
  matchPill: require('../../assets/home/match-pill.png'),
  matchAvatar: require('../../assets/home/match-avatar.png'),
  // The floating portraits are always the default avatars, never photos.
  avatars: [
    require('../../assets/avatar-female.png'),
    require('../../assets/avatar-male.png'),
    require('../../assets/avatar-female.png'),
  ],
};

const SAMPLE = { unread: 2, matching: 6 };

const SHOW_MATCHING_PILL = false;

/** Loops a 0→1→0 sine-eased value, starting after `delay`. Returns a cleanup. */
function startSway(value: Animated.Value, duration: number, delay = 0) {
  const loop = Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 0,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]),
  );
  const timer = setTimeout(() => loop.start(), delay);
  return () => {
    clearTimeout(timer);
    loop.stop();
  };
}

/**
 * A portrait that springs in with a little spin, then drifts on a lazy
 * figure-eight (x and y run on different periods), tilts with the drift and
 * sends out a soft ripple ring like a "live" beacon. Every index has its own
 * timing so the three never move in lockstep.
 */
function FloatingAvatar({
  index,
  left,
  top,
  width,
  children,
}: {
  index: number;
  left: number;
  top: number;
  width: number;
  children: ReactNode;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entry = Animated.spring(enter, {
      toValue: 1,
      delay: 150 + index * 180,
      friction: 5,
      tension: 70,
      useNativeDriver: true,
    });
    entry.start();

    const rippleLoop = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const rippleTimer = setTimeout(() => rippleLoop.start(), 600 + index * 800);

    const stopX = startSway(driftX, 3200 + index * 550, index * 350);
    const stopY = startSway(driftY, 2300 + index * 400, index * 200);
    return () => {
      entry.stop();
      clearTimeout(rippleTimer);
      rippleLoop.stop();
      stopX();
      stopY();
    };
  }, [enter, driftX, driftY, ripple, index]);

  const dir = index % 2 === 0 ? 1 : -1;
  const translateX = driftX.interpolate({ inputRange: [0, 1], outputRange: [-4 * dir, 4 * dir] });
  const translateY = driftY.interpolate({ inputRange: [0, 1], outputRange: [3, -7] });
  const tilt = driftX.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });
  const spin = enter.interpolate({ inputRange: [0, 1], outputRange: [`${-25 * dir}deg`, '0deg'] });
  const popScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const breathe = driftY.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  const ringScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = ripple.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        opacity: enter,
        transform: [
          { translateX },
          { translateY },
          { rotate: tilt },
          { rotate: spin },
          { scale: Animated.multiply(popScale, breathe) },
        ],
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height: width,
          borderRadius: width / 2,
          borderWidth: 2,
          borderColor: colors.homeOnline,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      {children}
    </Animated.View>
  );
}

/** Counts up from zero to `value` on mount. */
function CountUp({ value, style }: { value: number; style: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  // Each new value counts on from wherever the last one stopped, so a refresh
  // from the server nudges the number instead of replaying the whole count-up.
  useEffect(() => {
    const start = from.current;
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value: v }) => {
      const next = Math.round(start + (value - start) * v);
      from.current = next;
      setShown(next);
    });
    Animated.timing(progress, {
      toValue: 1,
      duration: start === 0 ? 1600 : 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(id);
  }, [value]);

  return <Text style={style}>{shown}</Text>;
}

/** A green dot with an expanding halo — "people are online right now". */
function PulseDot({ size }: { size: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.homeOnline,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.homeOnline,
        }}
      />
    </View>
  );
}

/** Rocks the bell every few seconds, like a notification just arrived. */
function useBellRing() {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shake = Animated.sequence([
      Animated.delay(1200),
      ...[1, -0.8, 0.6, -0.4, 0].map((toValue) =>
        Animated.timing(ring, { toValue, duration: 110, useNativeDriver: true }),
      ),
      Animated.delay(3500),
    ]);
    const loop = Animated.loop(shake);
    loop.start();
    return () => loop.stop();
  }, [ring]);

  return ring.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });
}

export function HomeHeader({
  online = 0,
  rankingFaces,
  weeklyStarFaces,
  interactive = true,
}: {
  /** False for view-only accounts: the banners still show, but tapping them goes nowhere. */
  interactive?: boolean;
  online?: number;
  rankingFaces?: (string | undefined)[];
  weeklyStarFaces?: (string | undefined)[];
}) {
  const { px } = useDesignScale();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { background, title, avatar, bell, activeNow } = HEADER;
  const bellRotate = useBellRing();

  return (
    <>
      {/* image 205674 — stretched, not cropped, as Figma draws it. */}
      <Image
        source={art.background}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: px(background.width),
          height: px(background.height),
        }}
      />

      <Text
        style={[
          styles.title,
          { left: px(title.x), top: px(title.y), fontSize: px(title.size), lineHeight: px(27) },
        ]}
      >
        Guftagu
      </Text>

      {HEADER.avatars.map((at, index) => (
        <FloatingAvatar key={index} index={index} left={px(at.x)} top={px(at.y)} width={px(avatar.size)}>
          <Image
            source={art.avatars[index]}
            style={{ width: px(avatar.size), height: px(avatar.size) }}
          />
        </FloatingAvatar>
      ))}

      {/* "Matching with you" pill is hidden until it's asked for. */}
      {SHOW_MATCHING_PILL ? <MatchingPill /> : null}

      {/* Ellipse 1990 — a blurred white disc behind the bell. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: px(bell.glow.x), top: px(bell.glow.y) }}
      >
        <SvgXml xml={icons.bellGlow} width={px(bell.glow.size)} height={px(bell.glow.size)} />
      </View>
      <Pressable
        style={{
          position: 'absolute',
          left: px(bell.box.x),
          top: px(bell.box.y),
          width: px(bell.badge.x + bell.badge.size),
          height: px(bell.image.height),
        }}
      >
        <Animated.View
          style={{
            width: px(bell.image.width),
            height: px(bell.image.height),
            overflow: 'hidden',
            transform: [{ rotate: bellRotate }],
          }}
        >
          <Image
            source={art.bell}
            style={{
              position: 'absolute',
              left: px(bell.image.x),
              top: px(bell.image.y),
              width: px(bell.image.scaledWidth),
              height: px(bell.image.scaledHeight),
            }}
          />
        </Animated.View>
        <View
          style={[
            styles.badge,
            {
              left: px(bell.badge.x),
              top: px(bell.badge.y),
              width: px(bell.badge.size),
              height: px(bell.badge.size),
              borderRadius: px(bell.badge.size / 2),
            },
          ]}
        >
          <Text style={[styles.badgeLabel, { fontSize: px(bell.badge.fontSize), lineHeight: px(15) }]}>
            {SAMPLE.unread}
          </Text>
        </View>
      </Pressable>

      <View style={[styles.activeNow, { top: px(activeNow.y), gap: px(activeNow.gap) }]}>
        <PulseDot size={px(7)} />
        <CountUp
          value={online}
          style={[
            styles.activeNowLabel,
            { color: colors.homeOnline, fontSize: px(activeNow.size), lineHeight: px(activeNow.height) },
          ]}
        />
        <Text
          style={[
            styles.activeNowLabel,
            { fontSize: px(activeNow.size), lineHeight: px(activeNow.height) },
          ]}
        >
          Active Now
        </Text>
      </View>

      <TrioBanner spec={BANNER_LEFT} faces={rankingFaces} onPress={interactive ? () => navigation.navigate('Ranking') : undefined} />
      <TrioBanner spec={BANNER_RIGHT} faces={weeklyStarFaces} onPress={interactive ? () => navigation.navigate('WeeklyStar') : undefined} />
      <TrioBanner spec={BANNER_WIDE} onPress={interactive ? () => navigation.navigate('CpRanking') : undefined} />
    </>
  );
}

/** Frame 1597881448 — hangs off the left edge, so part of it is always cut off. */
function MatchingPill() {
  const { px } = useDesignScale();
  const m = HEADER.match;

  return (
    <Pressable
      style={{
        position: 'absolute',
        left: px(m.x),
        top: px(m.y),
        width: px(m.width),
        height: px(m.height),
        borderRadius: px(m.radius),
        overflow: 'hidden',
      }}
    >
      <Image
        source={art.matchPill}
        resizeMode="cover"
        style={{ position: 'absolute', width: px(m.width), height: px(m.height) }}
      />
      <Image
        source={art.matchAvatar}
        style={{
          position: 'absolute',
          left: px(m.avatar.x),
          top: px(m.avatar.y),
          width: px(m.avatar.size),
          height: px(m.avatar.size),
        }}
      />

      {/* Four bottom-aligned bars — a little level meter. */}
      <View
        style={{
          position: 'absolute',
          left: px(m.bars.x),
          top: px(m.bars.y),
          height: px(Math.max(...m.bars.heights)),
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: px(m.bars.gap),
        }}
      >
        {m.bars.heights.map((height, index) => (
          <View
            key={index}
            style={{ width: px(m.bars.width), height: px(height), backgroundColor: colors.white }}
          />
        ))}
      </View>
      <Text
        style={[
          styles.matchCount,
          {
            left: px(m.count.x),
            top: px(m.count.y),
            fontSize: px(m.count.size),
            lineHeight: px(m.count.height),
          },
        ]}
      >
        {SAMPLE.matching}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.matchCaption,
          {
            left: px(m.caption.x),
            top: px(m.caption.y),
            fontSize: px(m.caption.size),
            lineHeight: px(m.caption.height),
            letterSpacing: px(m.caption.tracking),
          },
        ]}
      >
        Matching with you
      </Text>
      <View
        style={{
          position: 'absolute',
          left: px(m.chevron.x + m.chevron.glyph.x),
          top: px(m.chevron.y + m.chevron.glyph.y),
        }}
      >
        <SvgXml
          xml={icons.chevronForward}
          width={px(m.chevron.glyph.width)}
          height={px(m.chevron.glyph.height)}
        />
      </View>
    </Pressable>
  );
}

export const TAB_NAMES = ['For You', 'Following', 'Family', 'Live'] as const;
export type TabName = (typeof TAB_NAMES)[number];

/**
 * Frame 1597881478. The selected label is 2px larger and fully opaque; the rest
 * sit at 80%. Labels are bottom-aligned, and the underline starts under the
 * selected label's left edge.
 */
export function TabRow({ tab, onSelect }: { tab: TabName; onSelect: (tab: TabName) => void }) {
  const { px } = useDesignScale();

  return (
    <View
      style={[
        styles.tabs,
        { left: px(TABS.x), top: px(TABS.y), height: px(TABS.active.height), gap: px(TABS.gap) },
      ]}
    >
      {TAB_NAMES.map((name) => {
        const selected = name === tab;
        const type = selected ? TABS.active : TABS.idle;
        return (
          <Pressable key={name} onPress={() => onSelect(name)} hitSlop={px(8)}>
            <Text
              style={[
                styles.tab,
                {
                  fontSize: px(type.size),
                  lineHeight: px(type.height),
                  opacity: selected ? 1 : TABS.idle.opacity,
                },
              ]}
            >
              {name}
            </Text>
            {selected ? (
              <View
                style={[
                  styles.underline,
                  {
                    top: px(TABS.underline.y),
                    width: px(TABS.underline.width),
                    height: px(TABS.underline.height),
                    borderRadius: px(TABS.underline.radius),
                  },
                ]}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  badge: {
    position: 'absolute',
    backgroundColor: colors.homeBadge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  activeNow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeNowLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  matchCount: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  matchCaption: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    opacity: 0.4,
  },
  tabs: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  underline: {
    position: 'absolute',
    left: 0,
    backgroundColor: colors.homeAccent,
  },
});
