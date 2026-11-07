import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import * as lightIcons from '../../assets/party/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BOTTOM_NAV } from './geometry';

/**
 * The app's bottom bar — node 687:6679. Mounted once by `TabShell`; screens only
 * keep `BOTTOM_NAV_HEIGHT` of their scroll content clear beneath it.
 *
 * Every item is white; the selected one is solid and the rest sit at 50%, which
 * is the whole of Figma's selected state. The Party frames draw the same bar the
 * other way round — white, black glyphs, 38% black outline (687:6916) — so `tone`
 * picks between the two.
 */

const GLYPHS: Record<NavKey, string> = {
  Home: icons.tabHome,
  Party: icons.tabParty,
  Chats: icons.tabChats,
  Mine: icons.tabMine,
};

const LIGHT_GLYPHS: Record<NavKey, string> = {
  Home: lightIcons.tabHome,
  Party: lightIcons.tabParty,
  Chats: lightIcons.tabChats,
  Mine: lightIcons.tabMine,
};

const LIGHT = { background: colors.white, border: 'rgba(0,0,0,0.38)', label: colors.black } as const;

export type NavKey = (typeof BOTTOM_NAV.items)[number]['key'];

/**
 * Each item is laid out in a cell this wide, centred where Figma's 39px item is:
 * Figma sizes the items for Delight, and Poppins is wider, so "Chats" would clip.
 */
const LABEL_WIDTH = 80;

/** Space kept under the labels, in design pixels. */
const BELOW_LABELS = 3;

/** How much of the device's bottom inset the bar keeps clear under the labels. */
const INSET_SHARE = 0.2;

/** Screen pixels the bar's background extends beneath the bottom edge. */
const EDGE_BLEED = 4;

/** Extra bar height over Figma's, in design pixels; the items sit half of it lower. */
const EXTRA_HEIGHT = 12;

/** Height the screens have to keep clear beneath themselves, in design pixels. */
export const BOTTOM_NAV_HEIGHT = BOTTOM_NAV.height + EXTRA_HEIGHT;

/** The bar's real height in screen pixels, device inset included. */
export function useBottomNavHeight() {
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();
  const { itemsTop, item } = BOTTOM_NAV;
  // Figma leaves 25px under the labels, which on a tall phone reads as an empty strip at the
  // bottom of the bar. Keep a small margin instead, or the home indicator's inset if that is bigger.
  // The gesture pill is a thin line near the very edge, so only part of the inset is kept clear.
  return px(itemsTop + item.height + EXTRA_HEIGHT) + Math.max(px(BELOW_LABELS), insets.bottom * INSET_SHARE);
}

export default function BottomNav({
  active,
  onSelect,
  tone = 'dark',
  disabled = [],
}: {
  active: NavKey;
  onSelect?: (key: NavKey) => void;
  tone?: 'dark' | 'light';
  /** Tabs that are drawn dimmed and ignore taps. */
  disabled?: NavKey[];
}) {
  const { px } = useDesignScale();
  const light = tone === 'light';
  const height = useBottomNavHeight();
  const { item } = BOTTOM_NAV;

  return (
    <View
      style={[
        styles.bar,
        {
          left: px(BOTTOM_NAV.x),
          width: px(BOTTOM_NAV.width),
          // Runs past the screen's bottom edge: stopping exactly on it leaves the last pixel row
          // uncovered (rounding), and the feed behind the bar shows through as a thin line.
          bottom: -EDGE_BLEED,
          height: height + EDGE_BLEED,
          borderTopLeftRadius: px(BOTTOM_NAV.radius),
          borderTopRightRadius: px(BOTTOM_NAV.radius),
        },
        light && { backgroundColor: LIGHT.background, borderColor: LIGHT.border },
      ]}
    >
      {BOTTOM_NAV.items.map(({ key, x }) => (
        <Pressable
          key={key}
          disabled={disabled.includes(key)}
          onPress={onSelect ? () => onSelect(key) : undefined}
          style={{
            position: 'absolute',
            // The bar's 1px border moves its content box; Figma's x is from the outer
            // edge. The cell is widened round the item's centre — see LABEL_WIDTH.
            left: px(x - (LABEL_WIDTH - item.width) / 2) - 1,
            top: px(BOTTOM_NAV.itemsTop + EXTRA_HEIGHT / 2) - 1,
            width: px(LABEL_WIDTH),
            height: px(item.height),
            alignItems: 'center',
            opacity: disabled.includes(key) ? 0.25 : key === active ? 1 : BOTTOM_NAV.idleOpacity,
          }}
        >
          <SvgXml xml={(light ? LIGHT_GLYPHS : GLYPHS)[key]} width={px(item.icon)} height={px(item.icon)} />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                marginTop: px(item.labelTop - item.icon),
                fontSize: px(item.labelSize),
                lineHeight: px(item.labelHeight),
              },
              light && { color: LIGHT.label },
            ]}
          >
            {key}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.navBorder,
    overflow: 'hidden',
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    textAlign: 'center',
  },
});
