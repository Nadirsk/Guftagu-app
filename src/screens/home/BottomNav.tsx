import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BOTTOM_NAV } from './geometry';

/**
 * The app's bottom navigation — node 15:307.
 *
 * It lives on the home feed for now because Moment, Chat and Me have no screens
 * yet; once they exist this should become the tab bar of a navigator rather than
 * a child of one screen, and `active` should come from the navigation state.
 *
 * Figma draws the bar for a dark surface — white unselected items, a pink
 * selected one, no fill of its own. The home feed is white, so the bar follows
 * the screen's palette instead: see `colors.navActive` / `colors.navIdle`.
 */

const GLYPHS: Record<string, { icon: string; overlay?: string }> = {
  Home: { icon: icons.navHome, overlay: icons.navHomeDoor },
  Moment: { icon: icons.navMoment, overlay: icons.navMomentDot },
  Chat: { icon: icons.navChat },
  Me: { icon: icons.navMe },
};

export type NavKey = (typeof BOTTOM_NAV.items)[number]['key'];

/** Height the feed has to keep clear beneath itself, in design pixels. */
export const BOTTOM_NAV_HEIGHT =
  BOTTOM_NAV.paddingTop + BOTTOM_NAV.content.height + BOTTOM_NAV.paddingBottom;

export default function BottomNav({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect?: (key: NavKey) => void;
}) {
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();
  const { content, label, cellWidth } = BOTTOM_NAV;

  return (
    <View
      style={[
        styles.bar,
        {
          height: px(BOTTOM_NAV_HEIGHT) + insets.bottom,
          paddingTop: px(BOTTOM_NAV.paddingTop),
        },
      ]}
    >
      <View
        style={{
          marginLeft: px(content.x),
          width: px(content.width),
          height: px(content.height),
        }}
      >
        {BOTTOM_NAV.items.map((item) => {
          const selected = item.key === active;
          const tint = selected ? colors.navActive : colors.navIdle;
          const glyph = GLYPHS[item.key];
          // The cell is centred on the item's axis, so the icon's Figma x has to
          // be re-expressed relative to the cell's left edge.
          const cellLeft = item.center - cellWidth / 2;
          const overlay = 'overlay' in item ? item.overlay : undefined;

          return (
            <Pressable
              key={item.key}
              onPress={onSelect ? () => onSelect(item.key) : undefined}
              style={{
                position: 'absolute',
                left: px(cellLeft),
                top: 0,
                width: px(cellWidth),
                height: px(content.height),
              }}
            >
              <SvgXml
                xml={glyph.icon}
                color={tint}
                width={px(item.icon.width)}
                height={px(item.icon.height)}
                style={{
                  position: 'absolute',
                  left: px(item.icon.x - cellLeft),
                  top: px(item.icon.y),
                }}
              />
              {glyph.overlay && overlay ? (
                <SvgXml
                  xml={glyph.overlay}
                  color={tint}
                  width={px(overlay.width)}
                  height={px(overlay.height)}
                  style={{
                    position: 'absolute',
                    left: px(overlay.x - cellLeft),
                    top: px(overlay.y),
                  }}
                />
              ) : null}

              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    top: px(label.top),
                    fontSize: px(label.fontSize),
                    lineHeight: px(label.height),
                    color: tint,
                  },
                ]}
              >
                {item.key}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.searchBorder,
  },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
});
