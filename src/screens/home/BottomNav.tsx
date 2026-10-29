import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BOTTOM_NAV } from './geometry';

/**
 * The app's bottom bar — node 687:6679. Mounted once by `TabShell`; screens only
 * keep `BOTTOM_NAV_HEIGHT` of their scroll content clear beneath it.
 *
 * Every item is white; the selected one is solid and the rest sit at 50%, which
 * is the whole of Figma's selected state.
 */

const GLYPHS: Record<NavKey, string> = {
  Home: icons.tabHome,
  Party: icons.tabParty,
  Chats: icons.tabChats,
  Mine: icons.tabMine,
};

export type NavKey = (typeof BOTTOM_NAV.items)[number]['key'];

/**
 * Each item is laid out in a cell this wide, centred where Figma's 39px item is:
 * Figma sizes the items for Delight, and Poppins is wider, so "Chats" would clip.
 */
const LABEL_WIDTH = 80;

/** Height the screens have to keep clear beneath themselves, in design pixels. */
export const BOTTOM_NAV_HEIGHT = BOTTOM_NAV.height;

export default function BottomNav({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect?: (key: NavKey) => void;
}) {
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();
  const { item } = BOTTOM_NAV;

  // Figma's 92px already includes the space under the labels that the home
  // indicator uses, so a device inset only adds height when it is larger.
  const below = BOTTOM_NAV.height - BOTTOM_NAV.itemsTop - item.height;

  return (
    <View
      style={[
        styles.bar,
        {
          left: px(BOTTOM_NAV.x),
          width: px(BOTTOM_NAV.width),
          height: px(BOTTOM_NAV.itemsTop + item.height) + Math.max(px(below), insets.bottom),
          borderTopLeftRadius: px(BOTTOM_NAV.radius),
          borderTopRightRadius: px(BOTTOM_NAV.radius),
        },
      ]}
    >
      {BOTTOM_NAV.items.map(({ key, x }) => (
        <Pressable
          key={key}
          onPress={onSelect ? () => onSelect(key) : undefined}
          style={{
            position: 'absolute',
            // The bar's 1px border moves its content box; Figma's x is from the outer
            // edge. The cell is widened round the item's centre — see LABEL_WIDTH.
            left: px(x - (LABEL_WIDTH - item.width) / 2) - 1,
            top: px(BOTTOM_NAV.itemsTop) - 1,
            width: px(LABEL_WIDTH),
            height: px(item.height),
            alignItems: 'center',
            opacity: key === active ? 1 : BOTTOM_NAV.idleOpacity,
          }}
        >
          <SvgXml xml={GLYPHS[key]} width={px(item.icon)} height={px(item.icon)} />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                marginTop: px(item.labelTop - item.icon),
                fontSize: px(item.labelSize),
                lineHeight: px(item.labelHeight),
              },
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
