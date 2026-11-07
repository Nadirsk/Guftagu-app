import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useFullAccess } from '../../auth/access';
import { storage, useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { openThread } from '../chats/parts';
import type { PostAuthor } from '../moment/parts';
import { BOTTOM_NAV_HEIGHT, useBottomNavHeight } from './BottomNav';
import DailyRewards, { type CheckinDay } from './DailyRewards';
import FamilyBody from './FamilyBody';
import { useHomeBoards } from './boards';
import { FeedPlaceholder, PostCard, useFeed, useFollow } from './feed';
import { ADD_FAB, LIVE_CARD, POST } from './geometry';
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

/** `onOpenExplore` — the Live card sends you to Party › Explore, where the rooms are listed. */
export default function HomeFeedScreen({ onOpenExplore }: { onOpenExplore?: () => void }) {
  const { px } = useDesignScale();
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  // View-only accounts see Home but nothing on it opens another screen.
  const fullAccess = useFullAccess();
  const navHeight = useBottomNavHeight();
  const [tab, setTab] = useState<TabName>('For You');
  const chatting = useRef(false);

  /** Opens (or creates) the one-to-one thread with a post's author. */
  const openChat = useCallback(
    async (author: PostAuthor) => {
      if (chatting.current) return;
      chatting.current = true;
      try {
        const conversation = await openThread(token, author);
        navigation.navigate('Conversation', { uuid: conversation.uuid, peer: author, alias: conversation.alias });
      } catch (e) {
        Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not open the chat.');
      } finally {
        chatting.current = false;
      }
    },
    [navigation, token],
  );
  const [refreshing, setRefreshing] = useState(false);
  const [week, setWeek] = useState<CheckinDay[] | null>(null);

  const forYou = useFeed('discover');
  const following = useFeed('following');
  const feed = tab === 'For You' ? forYou : tab === 'Following' ? following : null;

  const refreshFeeds = useCallback(() => {
    forYou.refresh();
    following.refresh();
  }, [forYou.refresh, following.refresh]);
  const follow = useFollow(refreshFeeds);

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

  // The popup is the server's streak calendar, shown only while today's reward is unclaimed.
  useEffect(() => {
    if (!fullAccess) return;
    let cancelled = false;
    api<{ claimed_today: boolean; week: CheckinDay[] }>('/checkin', { token })
      .then((s) => {
        if (!cancelled && !s.claimed_today) setWeek(s.week);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token, fullAccess]);

  // "Active Now" — people who made a request in the last few minutes. Refreshed
  // while the screen is focused.
  const [online, setOnline] = useState(0);
  const boards = useHomeBoards(token);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = () =>
        api<{ online: number }>('/presence/online-count', { token })
          .then((r) => {
            if (!cancelled) setOnline(r.online);
          })
          .catch(() => undefined);
      load();
      const timer = setInterval(load, 30000);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [token]),
  );

  const claim = useCallback(async () => {
    try {
      return await api<NonNullable<Awaited<ReturnType<React.ComponentProps<typeof DailyRewards>['onClaim']>>>>('/checkin', { method: 'POST', token });
    } catch {
      return null;
    }
  }, [token]);

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
        <HeroCard originY={POST.y} onPress={fullAccess ? onOpenExplore : undefined} />
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
                if (fullAccess && author) follow.toggle(author);
              }}
              onChat={() => {
                if (fullAccess && author) openChat(author);
              }}
              onOpen={() => {
                if (fullAccess) navigation.navigate('PostDetails', { post, following: !isForYou });
              }}
              onOpenMedia={(index) => {
                if (fullAccess) navigation.navigate('MediaViewer', { urls: post.media_urls ?? [], index });
              }}
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
          <HomeHeader interactive={fullAccess} online={online} rankingFaces={boards.ranking} weeklyStarFaces={boards.weeklyStar} />
          <TabRow tab={tab} onSelect={setTab} />
        </View>
        {body}
      </ScrollView>

      {/* For You only. Floats over the feed, a fixed 56px above the bar; under the rewards popup. */}
      {tab === 'For You' && fullAccess ? (
        <Pressable
          onPress={() => navigation.navigate('PostMoment')}
          hitSlop={px(6)}
          style={{
            position: 'absolute',
            left: px(ADD_FAB.x),
            bottom: navHeight + px(ADD_FAB.aboveNav),
            width: px(ADD_FAB.size),
            height: px(ADD_FAB.size),
          }}
        >
          <SvgXml xml={icons.homeAddFab} width={px(ADD_FAB.size)} height={px(ADD_FAB.size)} />
        </Pressable>
      ) : null}

      {week ? <DailyRewards week={week} onClaim={claim} onClose={() => setWeek(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
