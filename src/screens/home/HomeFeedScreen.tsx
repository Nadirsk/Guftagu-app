import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '../../api/client';
import { storage, useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { BOTTOM_NAV_HEIGHT } from './BottomNav';
import DailyRewards from './DailyRewards';
import FamilyBody from './FamilyBody';
import { FeedPlaceholder, PostCard, useFeed, useFollow } from './feed';
import { LIVE_CARD, POST } from './geometry';
import { HomeHeader, TabRow, type TabName } from './header';
import HeroCard from './HeroCard';

/**
 * The dark home — section 483:3248. One screen, four tabs: they share the header
 * and the tab row, and only the body under the tab row changes. `geometry.ts`
 * holds every dimension and says which frame each tab comes from.
 *
 * The header is laid out on the frame's own coordinates from the very top, the
 * status bar included, because Figma draws the space backdrop under it.
 */

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;

const REWARDS_KEY = 'guftagu.dailyRewards.lastShown';

/** Local calendar day, so "once a day" turns over at the user's midnight. */
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export default function HomeFeedScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabName>('For You');
  const [refreshing, setRefreshing] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  const forYou = useFeed('discover');
  const following = useFeed('following');
  const feed = tab === 'For You' ? forYou : tab === 'Following' ? following : null;

  const refreshFeeds = useCallback(() => {
    forYou.refresh();
    following.refresh();
  }, [forYou.refresh, following.refresh]);
  const follow = useFollow(refreshFeeds);

  // The Live card is a still from Figma; tapping it walks into the busiest room live now.
  const openLiveRoom = useCallback(async () => {
    try {
      const [room] = await api<{ uuid: string }[]>('/rooms/live?limit=1', { token });
      if (room) navigation.navigate('Room', { uuid: room.uuid });
      else Alert.alert('Live', 'No room is live right now.');
    } catch {
      Alert.alert('Live', 'Could not load live rooms.');
    }
  }, [navigation, token]);

  // The rest of the app is white with a dark status bar; this screen is not.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  // On first show, on switching tabs, and on coming back from Post Details,
  // where counts or follows may have changed.
  const refreshVisible = feed?.refresh;
  useFocusEffect(
    useCallback(() => {
      refreshVisible?.();
    }, [refreshVisible]),
  );

  const rewardsKey = `${REWARDS_KEY}.${user?.uuid ?? 'guest'}`;
  useEffect(() => {
    let cancelled = false;
    storage
      .getItemAsync(rewardsKey)
      .then((last) => {
        if (!cancelled && last !== today()) setShowRewards(true);
      })
      .catch(() => {
        if (!cancelled) setShowRewards(true);
      });
    return () => {
      cancelled = true;
    };
  }, [rewardsKey]);

  const collect = useCallback(() => {
    setShowRewards(false);
    storage.setItemAsync(rewardsKey, today()).catch(() => undefined);
  }, [rewardsKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await feed?.refresh();
    setRefreshing(false);
  }, [feed]);

  let body: React.ReactNode;
  if (tab === 'Family') {
    body = <FamilyBody top={POST.y} />;
  } else if (tab === 'Live') {
    body = (
      <View style={{ height: px(LIVE_CARD.y - POST.y + LIVE_CARD.height) }}>
        <HeroCard originY={POST.y} onPress={openLiveRoom} />
      </View>
    );
  } else if (feed && feed.posts.length > 0) {
    const isForYou = tab === 'For You';
    body = (
      <View style={{ marginLeft: px(POST.x), gap: px(POST.gap) }}>
        {feed.posts.map((post) => {
          const author = post.author;
          return (
            <PostCard
              key={post.uuid}
              post={post}
              // Everyone in Following is followed already — that is the difference.
              showFollow={isForYou}
              following={author ? follow.followed[author.uuid] ?? false : false}
              followBusy={author ? follow.busy[author.uuid] ?? false : false}
              onToggleFollow={() => {
                if (author) follow.toggle(author);
              }}
              onOpen={() => navigation.navigate('PostDetails', { post, following: !isForYou })}
              onOpenMedia={(index) =>
                navigation.navigate('MediaViewer', { urls: post.media_urls ?? [], index })
              }
            />
          );
        })}
        {feed.loadingMore ? <ActivityIndicator color={colors.white} /> : null}
      </View>
    );
  } else {
    body = (
      <FeedPlaceholder
        loaded={feed?.loaded ?? false}
        empty={
          tab === 'For You'
            ? 'No new moments to discover right now.'
            : 'Moments from the people you follow will show up here.'
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 120) {
            feed?.loadMore();
          }
        }}
        refreshControl={
          feed ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.white}
              colors={[colors.homeAccent]}
            />
          ) : undefined
        }
        // TabShell's bar floats over the feed, so the content ends above it.
        contentContainerStyle={{ paddingBottom: px(BOTTOM_NAV_HEIGHT + 24) }}
      >
        {/* The header block; its backdrop runs on underneath the tab body. */}
        <View style={{ height: px(POST.y), zIndex: 0 }}>
          <HomeHeader />
          <TabRow tab={tab} onSelect={setTab} />
        </View>
        {body}
      </ScrollView>

      {showRewards ? <DailyRewards onCollect={collect} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
