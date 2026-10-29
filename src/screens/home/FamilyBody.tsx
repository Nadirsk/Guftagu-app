import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { badgeStrip } from '../moment/parts';
import { FAMILY } from './geometry';

/**
 * The Family tab — node 479:2363. There is no family API yet, so this is the
 * frame as drawn: the not-in-a-family message and Figma's one sample
 * suggestion. `top` is where the tab body starts on the frame; every y in
 * `FAMILY` is absolute on the frame.
 */
export default function FamilyBody({ top }: { top: number }) {
  const { px } = useDesignScale();
  const { empty, suggestTitle, row } = FAMILY;
  const y = (frameY: number) => px(frameY - top);

  return (
    <View style={{ height: px(FAMILY.canvas - top) }}>
      <Text
        style={[
          styles.centred,
          styles.empty,
          { top: y(empty.y), fontSize: px(empty.size), lineHeight: px(empty.height) },
        ]}
      >
        You have no join the family
      </Text>
      <Text
        style={[
          styles.centred,
          styles.suggest,
          { top: y(suggestTitle.y), fontSize: px(suggestTitle.size), lineHeight: px(suggestTitle.height) },
        ]}
      >
        - Some families recommend for you -
      </Text>

      {/* Frame 1597881467 — cover, then name/badges and members/Join, spread apart. */}
      <View style={[styles.row, { left: px(row.x), top: y(row.y), width: px(row.width) }]}>
        <View
          style={{
            width: px(row.cover.width),
            height: px(row.cover.height),
            borderRadius: px(row.cover.radius),
            backgroundColor: colors.white,
          }}
        />
        <View style={[styles.info, { width: px(row.info.width), height: px(row.info.height) }]}>
          <View style={{ width: px(row.name.width), gap: px(row.name.gap) }}>
            <Text
              numberOfLines={1}
              style={[styles.name, { fontSize: px(row.name.size), lineHeight: px(row.name.height) }]}
            >
              GP FAMILY
            </Text>
            <View style={{ width: px(row.badges.width), height: px(row.badges.height), overflow: 'hidden' }}>
              <Image
                source={badgeStrip}
                style={{
                  position: 'absolute',
                  left: px(row.badges.imageX),
                  width: px(row.badges.imageWidth),
                  height: px(row.badges.height),
                }}
              />
            </View>
          </View>

          <View style={{ width: px(row.members.width), alignItems: 'flex-end', gap: px(row.members.stackGap) }}>
            <View
              style={[
                styles.members,
                { width: px(row.members.width), gap: px(row.members.gap), opacity: row.members.opacity },
              ]}
            >
              <SvgXml xml={icons.usersRound} width={px(row.members.icon)} height={px(row.members.icon)} />
              <Text style={[styles.label, { fontSize: px(row.members.size), lineHeight: px(row.members.height) }]}>
                33/22
              </Text>
            </View>
            <Pressable
              style={[
                styles.join,
                { width: px(row.join.width), height: px(row.join.height), borderRadius: px(row.join.radius) },
              ]}
            >
              <Text style={[styles.label, { fontSize: px(row.join.size), lineHeight: px(row.members.height) }]}>
                Join
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.white,
  },
  empty: {
    fontFamily: typography.fontFamily.regular,
    opacity: 0.4,
  },
  suggest: {
    fontFamily: typography.fontFamily.semiBold,
  },
  row: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  members: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  join: {
    backgroundColor: colors.homeJoin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
