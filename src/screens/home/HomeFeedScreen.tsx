import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/home/icons';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BANNER_LEFT, BANNER_RIGHT, BANNER_WIDE, TrioBanner } from './banners';
import { BOTTOM_NAV_HEIGHT } from './BottomNav';
import { HEADER, TABS } from './geometry';
import HeroCard from './HeroCard';
import { CountriesSection, LiveCard, LiveGrid, StoriesRow } from './sections';

/**
 * The home feed. One screen, three filters — Figma draws them as three frames
 * (Following 32:740, Party 15:64, Live 49:819) but they share the header, the
 * country strip, the story strip and the live-card grid, so only the body under
 * the header changes when you switch tabs. `geometry.ts` holds every dimension.
 */

export const TAB_NAMES = ['Following', 'Party', 'Live'] as const;
export type TabName = (typeof TAB_NAMES)[number];

// Node 32:745/39/40/41 — the Following tab's own four covers.
const FOLLOWING_CARDS: LiveCard[] = [
  { cover: require('../../assets/home/following-1.png'), title: 'Riya’s Live', viewers: 14, emphasised: true },
  { cover: require('../../assets/home/following-2.png'), title: 'Riya’s Live', viewers: 14, emphasised: true },
  { cover: require('../../assets/home/following-3.png'), title: 'Riya’s Live', viewers: 14, emphasised: true },
  { cover: require('../../assets/home/following-4.png'), title: 'Riya’s Live', viewers: 14, emphasised: true },
];

// Nodes 19:253/256/283/301 — reused verbatim by the Live tab's grid (49:911),
// which points at byte-identical exports.
const FEED_CARDS: LiveCard[] = [
  { cover: require('../../assets/home/live-1.png'), title: 'Riya’s Live', viewers: 14, emphasised: true },
  { cover: require('../../assets/home/live-2.png'), title: 'Riya’s Live', viewers: 14, emphasised: true },
  { cover: require('../../assets/home/live-3.png'), title: 'Riya’s Live', viewers: 14, emphasised: false },
  { cover: require('../../assets/home/live-4.png'), title: 'Riya’s Live', viewers: 14, emphasised: false },
];

function FollowingBody() {
  const g = TABS.Following.grid;
  return (
    <LiveGrid
      left={g.x}
      top={g.y}
      columnGap={g.columnGap}
      rowGap={g.rowGap}
      cards={FOLLOWING_CARDS}
    />
  );
}

function PartyBody() {
  const { countries, stories, grid } = TABS.Party;
  return (
    <>
      <TrioBanner spec={BANNER_LEFT} />
      <TrioBanner spec={BANNER_RIGHT} />
      <TrioBanner spec={BANNER_WIDE} />
      <CountriesSection left={countries.x} top={countries.y} />
      <StoriesRow left={stories.x} top={stories.y} />
      <LiveGrid
        left={grid.x}
        top={grid.y}
        columnGap={grid.columnGap}
        rowGap={grid.rowGap}
        cards={FEED_CARDS}
      />
    </>
  );
}

function LiveBody() {
  const { countries, stories, grid } = TABS.Live;
  return (
    <>
      <HeroCard />
      <CountriesSection left={countries.x} top={countries.y} />
      <StoriesRow left={stories.x} top={stories.y} />
      <LiveGrid
        left={grid.x}
        top={grid.y}
        columnGap={grid.columnGap}
        rowGap={grid.rowGap}
        cards={FEED_CARDS}
      />
    </>
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;

export default function HomeFeedScreen({ initialTab = 'Party' }: { initialTab?: TabName } = {}) {
  const { px } = useDesignScale();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabName>(initialTab);

  // Position tabs comfortably below the safe area / status bar
  const topInset = Math.max(insets.top, 16);
  const tabsY = topInset + 8;
  const searchY = tabsY + (29 - 34) / 2;
  const headerHeight = tabsY + 29 + 10;
  // Shift content up so there is no huge void between status bar, header, and content
  const shift = HEADER.tabs.y - tabsY + 14;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          // TabShell's bar floats over the feed, so the content ends above it.
          height: px(TABS[tab].canvas - shift) + px(24) + px(BOTTOM_NAV_HEIGHT),
        }}
      >
        <View style={{ position: 'relative', top: -px(shift), height: px(TABS[tab].canvas) }}>
          {tab === 'Following' ? <FollowingBody /> : tab === 'Party' ? <PartyBody /> : <LiveBody />}
        </View>
      </ScrollView>

      {/* Node 52:1269 — an opaque white band the feed scrolls under. */}
      <View style={[styles.header, { height: px(headerHeight) }]} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={[
            styles.search,
            {
              left: px(HEADER.search.x),
              top: px(searchY),
              width: px(HEADER.search.width),
              height: px(HEADER.search.height),
              borderRadius: px(HEADER.search.radius),
            },
          ]}
        >
          <SvgXml
            xml={icons.search}
            width={px(HEADER.search.icon)}
            height={px(HEADER.search.icon)}
          />
        </Pressable>

        <View
          style={[
            styles.tabs,
            { left: px(HEADER.tabs.x), top: px(tabsY), gap: px(HEADER.tabs.gap) },
          ]}
        >
          {TAB_NAMES.map((name) => {
            const active = name === tab;
            return (
              <Pressable key={name} onPress={() => setTab(name)}>
                <Text
                  style={[
                    active ? styles.tabActive : styles.tabIdle,
                    {
                      fontSize: px(active ? HEADER.tab.activeSize : HEADER.tab.inactiveSize),
                      lineHeight: px(
                        active ? HEADER.tab.activeHeight : HEADER.tab.inactiveHeight,
                      ),
                    },
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.white,
  },
  search: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.searchBorder,
  },
  tabs: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tabActive: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.black,
    textDecorationLine: 'underline',
  },
  tabIdle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    opacity: 0.5,
  },
});
