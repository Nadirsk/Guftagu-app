import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
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
  // Figma points the top and lower-left portraits at the same bitmap.
  avatars: [
    require('../../assets/home/header-avatar-2.png'),
    require('../../assets/home/header-avatar-1.png'),
    require('../../assets/home/header-avatar-2.png'),
  ],
};

const SAMPLE = { unread: 2, online: 2344, matching: 6, avatarName: 'aSIF' };

export function HomeHeader() {
  const { px } = useDesignScale();
  const { background, title, avatar, bell, activeNow } = HEADER;

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
        <View
          key={index}
          style={{ position: 'absolute', left: px(at.x), top: px(at.y), width: px(avatar.size) }}
        >
          <Image
            source={art.avatars[index]}
            style={{ width: px(avatar.size), height: px(avatar.size) }}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.avatarName,
              {
                marginTop: px(avatar.labelTop - avatar.size),
                fontSize: px(avatar.labelSize),
                lineHeight: px(avatar.labelHeight),
              },
            ]}
          >
            {SAMPLE.avatarName}
          </Text>
        </View>
      ))}

      <MatchingPill />

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
        <View
          style={{
            width: px(bell.image.width),
            height: px(bell.image.height),
            overflow: 'hidden',
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
        </View>
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
        <Text
          style={[
            styles.activeNowLabel,
            { color: colors.homeOnline, fontSize: px(activeNow.size), lineHeight: px(activeNow.height) },
          ]}
        >
          {SAMPLE.online}
        </Text>
        <Text
          style={[
            styles.activeNowLabel,
            { fontSize: px(activeNow.size), lineHeight: px(activeNow.height) },
          ]}
        >
          Active Now
        </Text>
      </View>

      <TrioBanner spec={BANNER_LEFT} />
      <TrioBanner spec={BANNER_RIGHT} />
      <TrioBanner spec={BANNER_WIDE} />
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
  avatarName: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    textAlign: 'center',
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
