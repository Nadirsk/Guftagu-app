import { Plus } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { COUNTRIES, FONT_SIZE, GRID, SCREEN_PADDING, STORIES } from './geometry';

/* --------------------------------------------------------------------- flags */

export function Flag({ xml, width, height }: { xml: string; width: number; height: number }) {
  const { px } = useDesignScale();
  return <SvgXml xml={xml} width={px(width)} height={px(height)} />;
}

/* ----------------------------------------------------------------- countries */

type CountryChip = {
  label: string;
  flag: ReactNode;
  width: number;
  height: number;
  radius: number;
  /** Figma left-aligns some chips' contents and centres others. */
  paddingLeft?: number;
  gap: number;
  labelOpacity: number;
};

function AfghanistanFlag() {
  const { px } = useDesignScale();
  return (
    <Image
      source={require('../../assets/home/flag-af.jpg')}
      style={{
        width: px(19),
        height: px(13),
        borderRadius: px(19),
        borderWidth: 0.5,
        borderColor: colors.white,
      }}
      resizeMode="cover"
    />
  );
}

// Nodes 19:117 / 19:125 / 19:151 / 19:120 / 19:129. The widths and the per-chip
// label opacities are literal Figma values, not derived from the content.
const COUNTRY_CHIPS: CountryChip[] = [
  {
    label: 'India',
    flag: <Flag xml={icons.flagIN} width={19} height={12} />,
    width: 90,
    height: 32,
    radius: 23,
    gap: 6,
    labelOpacity: 0.6,
  },
  {
    label: 'Bangladesh ',
    flag: <Flag xml={icons.flagBD} width={19} height={13} />,
    width: 123,
    height: 32,
    radius: 24,
    paddingLeft: 9,
    gap: 6,
    labelOpacity: 0.4,
  },
  {
    label: 'Nepal',
    flag: <Flag xml={icons.flagIN} width={19} height={12} />,
    width: 90,
    height: 32,
    radius: 23,
    gap: 6,
    labelOpacity: 0.6,
  },
  {
    label: 'Afghanistan',
    flag: <AfghanistanFlag />,
    width: 120,
    height: 34,
    radius: 35,
    paddingLeft: 9,
    gap: 8,
    labelOpacity: 0.5,
  },
  {
    label: 'Pakistan',
    flag: <Flag xml={icons.flagPK} width={19} height={13} />,
    width: 116,
    height: 33,
    radius: 45,
    paddingLeft: 13,
    gap: 14,
    labelOpacity: 0.5,
  },
];

export function CountriesSection({ left, top }: { left: number; top: number }) {
  const { px } = useDesignScale();
  const [selected, setSelected] = useState('All');

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: px(top) }}>
      <View
        style={[
          styles.sectionHeader,
          {
            marginLeft: px(left),
            // node 19:339 — the header row is a fixed 370 wide, not edge-to-edge.
            width: px(COUNTRIES.headerWidth),
            height: px(COUNTRIES.headerHeight),
          },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { fontSize: px(FONT_SIZE.sectionTitle), lineHeight: px(COUNTRIES.headerHeight) },
          ]}
        >
          Countries
        </Text>
        <Text
          style={[styles.sectionAction, { fontSize: px(FONT_SIZE.sectionAction), lineHeight: px(17) }]}
        >
          More
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: px(COUNTRIES.gap) }}
        contentContainerStyle={{
          alignItems: 'center',
          height: px(COUNTRIES.rowHeight),
          gap: px(COUNTRIES.chipGap),
          paddingLeft: px(left),
          paddingRight: px(SCREEN_PADDING),
        }}
      >
        <Pressable
          onPress={() => setSelected('All')}
          style={[
            styles.filterAll,
            {
              width: px(COUNTRIES.all.width),
              height: px(COUNTRIES.all.height),
              borderRadius: px(COUNTRIES.all.radius),
            },
            selected !== 'All' && styles.filterAllIdle,
          ]}
        >
          <Text
            style={[
              styles.filterAllLabel,
              { fontSize: px(FONT_SIZE.filter) },
              selected !== 'All' && styles.filterAllLabelIdle,
            ]}
          >
            All
          </Text>
        </Pressable>

        {COUNTRY_CHIPS.map((chip) => (
          <Pressable
            key={chip.label}
            onPress={() => setSelected(chip.label)}
            style={[
              styles.chip,
              {
                width: px(chip.width),
                height: px(chip.height),
                borderRadius: px(chip.radius),
                gap: px(chip.gap),
                justifyContent: chip.paddingLeft === undefined ? 'center' : 'flex-start',
                paddingLeft: chip.paddingLeft === undefined ? 0 : px(chip.paddingLeft),
              },
              selected === chip.label && styles.chipSelected,
            ]}
          >
            {chip.flag}
            <Text
              style={[
                styles.chipLabel,
                { fontSize: px(FONT_SIZE.chip), lineHeight: px(15), opacity: chip.labelOpacity },
                selected === chip.label && styles.chipLabelSelected,
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------- stories */

const STORY_AVATARS: ImageSourcePropType[] = [
  require('../../assets/home/story-1.png'),
  require('../../assets/home/story-2.png'),
  require('../../assets/home/story-3.png'),
  require('../../assets/home/story-4.png'),
  require('../../assets/home/story-5.png'),
  require('../../assets/home/story-6.png'),
];

export function StoriesRow({ left, top }: { left: number; top: number }) {
  const { px } = useDesignScale();
  const { circle } = STORIES;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ position: 'absolute', left: 0, right: 0, top: px(top) }}
      contentContainerStyle={{
        gap: px(STORIES.gap),
        paddingLeft: px(left),
        paddingRight: px(SCREEN_PADDING),
      }}
    >
      {/* Node 19:350 — the cell is narrower than its ring, so the ring overhangs. */}
      <Pressable style={{ width: px(STORIES.createWidth), alignItems: 'center' }}>
        <View style={{ width: px(circle.width), height: px(circle.height) }}>
          <SvgXml xml={icons.createRing} width={px(circle.width)} height={px(circle.height)} />
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Plus size={px(STORIES.plus)} color={colors.black} strokeWidth={2} />
          </View>
        </View>
        <Text
          style={[
            styles.storyLabel,
            { fontSize: px(FONT_SIZE.storyLabel), lineHeight: px(18), marginTop: px(STORIES.labelGap) },
          ]}
        >
          Create
        </Text>
      </Pressable>

      {STORY_AVATARS.map((source, index) => (
        <Pressable key={index} style={{ width: px(circle.width), alignItems: 'center' }}>
          <Image
            source={source}
            style={{ width: px(circle.width), height: px(circle.height) }}
            resizeMode="stretch"
          />
          <Text
            style={[
              styles.storyLabel,
              {
                fontSize: px(FONT_SIZE.storyLabel),
                lineHeight: px(18),
                marginTop: px(STORIES.labelGap),
                opacity: 0.45,
              },
            ]}
          >
            Name
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ----------------------------------------------------------------- live grid */

const VIEWER_AVATARS: ImageSourcePropType[] = [
  require('../../assets/home/viewer-1.png'),
  require('../../assets/home/viewer-2.png'),
  require('../../assets/home/viewer-3.png'),
  require('../../assets/home/viewer-4.png'),
  require('../../assets/home/viewer-5.png'),
];

export type LiveCard = {
  cover: ImageSourcePropType;
  title: string;
  viewers: number;
  /** Figma sets the second row's titles in Regular and the first row's in Semi Bold. */
  emphasised: boolean;
};

/** The translucent viewer-count tab (node 19:231). */
function ViewerBadge({ count }: { count: number }) {
  const { px } = useDesignScale();
  const { badge, badgeWave, badgeCount } = GRID;

  return (
    <View style={{ position: 'absolute', left: px(badge.x), top: px(badge.y) }}>
      <SvgXml xml={icons.viewerBadge} width={px(badge.width)} height={px(badge.height)} />
      <View style={{ position: 'absolute', left: px(badgeWave.x), top: px(badgeWave.y) }}>
        <SvgXml xml={icons.wave} width={px(badgeWave.size)} height={px(badgeWave.size)} />
      </View>
      <Text
        style={[
          styles.viewerCount,
          {
            left: px(badgeCount.x),
            top: px(badgeCount.y),
            width: px(badgeCount.width),
            fontSize: px(FONT_SIZE.viewers),
            lineHeight: px(badgeCount.height),
          },
        ]}
      >
        {count}
      </Text>
    </View>
  );
}

function LiveCardView({ card }: { card: LiveCard }) {
  const { px } = useDesignScale();
  const { card: size, info, titleRow, avatars } = GRID;

  return (
    <Pressable style={{ width: px(size.width), height: px(size.height) }}>
      {/* An explicit size, not StyleSheet.absoluteFill: a stretched <Image> with
          only inset styles falls back to the bitmap's intrinsic size on RN web. */}
      <Image
        source={card.cover}
        style={{ position: 'absolute', width: px(size.width), height: px(size.height) }}
        resizeMode="stretch"
      />

      <View
        style={{
          position: 'absolute',
          left: px(info.x),
          top: px(info.y),
          width: px(info.width),
          gap: px(info.gap),
        }}
      >
        <View style={{ height: px(titleRow.height) }}>
          <View style={{ position: 'absolute', left: 0, top: px(titleRow.flagTop) }}>
            <Flag xml={icons.flagIN} width={19} height={12} />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.cardTitle,
              {
                left: px(titleRow.titleX),
                top: px(titleRow.titleTop),
                fontSize: px(FONT_SIZE.cardTitle),
                lineHeight: px(15),
                fontFamily: card.emphasised
                  ? typography.fontFamily.semiBold
                  : typography.fontFamily.regular,
              },
            ]}
          >
            {card.title}
          </Text>
        </View>

        <View style={{ height: px(avatars.size) }}>
          {VIEWER_AVATARS.map((source, index) => (
            <Image
              key={index}
              source={source}
              style={{
                position: 'absolute',
                left: px(index * avatars.step),
                top: 0,
                width: px(avatars.size),
                height: px(avatars.size),
              }}
            />
          ))}
        </View>
      </View>

      <ViewerBadge count={card.viewers} />
    </Pressable>
  );
}

export function LiveGrid({
  left,
  top,
  columnGap,
  rowGap,
  cards,
}: {
  left: number;
  top: number;
  columnGap: number;
  rowGap: number;
  cards: LiveCard[];
}) {
  const { px } = useDesignScale();
  const { card } = GRID;

  return (
    <View
      style={{
        position: 'absolute',
        left: px(left),
        top: px(top),
        width: px(card.width * 2 + columnGap),
        flexDirection: 'row',
        flexWrap: 'wrap',
        columnGap: px(columnGap),
        rowGap: px(rowGap),
      }}
    >
      {cards.map((item, index) => (
        <LiveCardView key={index} card={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  sectionAction: {
    fontFamily: typography.fontFamily.medium,
    color: colors.sectionAction,
  },

  filterAll: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  filterAllIdle: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.countryPillBorder,
  },
  filterAllLabel: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
    textAlign: 'center',
  },
  filterAllLabelIdle: {
    color: colors.black,
    opacity: 0.6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.countryPillBorder,
  },
  chipSelected: {
    borderColor: colors.black,
  },
  chipLabel: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    textAlign: 'center',
  },
  chipLabelSelected: {
    opacity: 1,
  },

  storyLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    textAlign: 'center',
  },

  cardTitle: {
    position: 'absolute',
    color: colors.white,
  },
  viewerCount: {
    position: 'absolute',
    fontFamily: typography.fontFamily.semiBold,
    color: colors.black,
    textAlign: 'center',
  },
});
