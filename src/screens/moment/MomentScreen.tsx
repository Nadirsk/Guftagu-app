import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EllipsisVertical } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { api, apiWithMeta } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BOTTOM_NAV_HEIGHT } from '../home/BottomNav';
import {
  AuthorRow,
  BODY,
  type FeedItem,
  FollowChip,
  MEDIA,
  MediaBlock,
  mediaBlockHeight,
  type PostAuthor,
  PostBody,
} from './parts';
import type { NotificationItem } from './MomentNotificationsScreen';
import { usePostLike } from './PostStateContext';

/**
 * The Moment feed — Figma nodes 25:451 ("Moment") and 96:1072 ("Following").
 *
 * One screen, two filters. Following swaps the Follow chip for the overflow
 * dots — everyone in that feed is already followed — and sets its tab row a few
 * pixels differently; `TAB_LAYOUT` holds that, everything else is shared.
 *
 * The two map onto `GET /feed`'s own `scope`. Following is the people you
 * follow; Moment is `discover`, which is the people you do not — so following
 * somebody moves their moments from one tab to the other, and the Follow chip
 * only ever appears where it can still do something.
 *
 * The bottom bar is not here: it belongs to `src/navigation/TabShell.tsx`, and
 * this screen only keeps `BOTTOM_NAV_HEIGHT` of scroll clear beneath itself.
 *
 * Every number is a design pixel on the 402x874 frame. Where Poppins (standing
 * in for the unavailable Delight) is wider than the design's own metrics, a
 * Figma offset is re-expressed as the gap it was — noted at each spot.
 */

export const MOMENT_TABS = ['Following', 'Moment'] as const;
export type MomentTab = (typeof MOMENT_TABS)[number];

/** Node 77:797 / 96:1081 — `flex gap-[11px] items-center` at (293, 85). */
const ACTIONS = {
  x: 293,
  y: 85,
  gap: 11,
  circle: 41,
  bell: { x: 10, y: 10, size: 21 },
} as const;

/**
 * What the two frames disagree about. The tab row's y and gap, and the idle
 * label's opacity, are hand-nudged per frame rather than one shared component —
 * these are each frame's own numbers.
 */
const TAB_LAYOUT = {
  Moment: {
    scope: 'discover',
    tabs: { y: 88, gap: 13, ruleGap: 8, idleOpacity: 0.51 }, // node 73:689
  },
  Following: {
    scope: 'following',
    // Figma's gap is 33, but measured from a 68-wide column whose own label
    // overflows it to 91 — so the gap between the *words* is 10, and 10 is
    // what survives here, where the column is as wide as its label.
    tabs: { y: 93, gap: 10, ruleGap: 7, idleOpacity: 0.4 }, // node 96:1073
  },
} as const satisfies Record<MomentTab, unknown>;

/**
 * Node 96:1072 also draws a Moment / Topic row under the tabs and starts its
 * post at 210 to clear it. That row is gone, so the post comes back to the
 * Moment tab's own 165 — leaving it at 210 would open a 45px hole and make the
 * content jump when you switch tabs.
 */
const HEADER_HEIGHT = 140;
const FIRST_POST_Y = 165; // node 77:747

const TAB_TYPE = {
  x: 17,
  active: { size: 21, height: 23, ruleHeight: 2 },
  idle: { size: 18, height: 22 },
} as const;

/**
 * One post below its own top-left (17, FIRST_POST_Y). Figma draws posts at fixed
 * y; a feed has any number, so the frames' positions are re-expressed as one
 * repeating block plus a gap.
 */
const POST = {
  x: 17,
  height: 319,
  gap: 35,
  media: { x: 79, y: 72 }, // node 77:744 / 96:1105
  // Node 73:736 — `flex gap-[17px] items-center`, each icon `gap-[5px]` from
  // its count. Absolute Figma x 259/300/329/351/380 fall out of those gaps.
  actions: { x: 242, y: 295, icon: 24, gap: 17, countGap: 5, size: 13, height: 24 },
} as const;

/**
 * Roughly 36 characters fit on a line of 15px Poppins across the 290 the body
 * has. This is only the first guess, so the post is about the right height
 * before `PostBody` has measured itself and said what it really is.
 */
const guessBodyHeight = (text: string) =>
  Math.min(2, Math.max(1, Math.ceil(text.length / 36))) * BODY.lineHeight;

/** What the body occupies above the thumbnails, gap included — 0 when there is none. */
const bodyBlockOf = (post: FeedItem, measured: Record<string, number>) => {
  const text = post.body?.trim();
  if (!text) return 0;
  return (measured[post.uuid] ?? guessBodyHeight(text)) + BODY.gap;
};

/** What each tab says when the fetch came back with nothing. */
const EMPTY: Record<MomentTab, string> = {
  Moment: 'No moments from anyone new right now.',
  Following: 'Moments from the people you follow will show up here.',
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;

function MomentPost({
  post,
  top,
  showFollow,
  following,
  busy,
  onToggleFollow,
  onOpen,
  onOpenMedia,
  bodyBlock,
  onBodyHeight,
}: {
  post: FeedItem;
  top: number;
  showFollow: boolean;
  following: boolean;
  busy: boolean;
  onToggleFollow: () => void;
  onOpen: () => void;
  onOpenMedia: (index: number) => void;
  bodyBlock: number;
  onBodyHeight: (height: number) => void;
}) {
  const { px } = useDesignScale();
  const { actions } = POST;
  // Figma's 319 is drawn around one 180-tall thumbnail. A post carrying a grid
  // instead is however much taller or shorter that grid is, and the date and
  // the action row follow it down or up.
  const grew = mediaBlockHeight(post, POST.x + POST.media.x) - MEDIA.height;
  // The same counts Post Details shows, so liking here and opening the post do
  // not disagree about how many likes it has.
  const { liked, likeCount, commentCount, toggle } = usePostLike(post);

  const count = (value: number, tint?: string) => (
    <Text
      style={[
        styles.count,
        { fontSize: px(actions.size), lineHeight: px(actions.height) },
        tint ? { color: tint } : null,
      ]}
    >
      {value}
    </Text>
  );

  return (
    <>
      <AuthorRow
        post={post}
        left={POST.x}
        top={top}
        onPressName={onOpen}
        trailing={
          showFollow ? (
            <FollowChip following={following} busy={busy} onPress={onToggleFollow} />
          ) : (
            // Node 96:1238 — Following swaps the chip for the overflow dots,
            // since everyone in that feed is already followed.
            <EllipsisVertical size={px(actions.icon)} color={colors.black} />
          )
        }
      />

      {post.body?.trim() ? (
        <PostBody
          text={post.body.trim()}
          left={POST.x + POST.media.x}
          top={top + POST.media.y}
          // Two in the feed, as the reference shows it; the whole of it is on
          // Post Details.
          lines={2}
          onHeight={onBodyHeight}
          onPress={onOpen}
        />
      ) : null}

      {/* Tapping a thumbnail opens the media itself; the comment icon below is
          what opens the post. */}
      <MediaBlock
        post={post}
        left={POST.x + POST.media.x}
        top={top + POST.media.y + bodyBlock}
        onPress={onOpenMedia}
      />

      {/* Node 73:736 — share, comment, like. Only the last two carry a count. */}
      <View
        style={{
          position: 'absolute',
          left: px(POST.x + actions.x),
          top: px(top + actions.y + grew + bodyBlock),
          flexDirection: 'row',
          alignItems: 'center',
          gap: px(actions.gap),
        }}
      >
        <SvgXml xml={icons.momentRedo} width={px(actions.icon)} height={px(actions.icon)} />
        <Pressable onPress={onOpen} style={[styles.action, { gap: px(actions.countGap) }]}>
          <SvgXml xml={icons.momentChatDots} width={px(actions.icon)} height={px(actions.icon)} />
          {count(commentCount)}
        </Pressable>
        <Pressable onPress={toggle} hitSlop={8} style={[styles.action, { gap: px(actions.countGap) }]}>
          <SvgXml
            xml={icons.momentThumbsUp}
            color={liked ? colors.postButton : colors.momentCount}
            width={px(actions.icon)}
            height={px(actions.icon)}
          />
          {count(likeCount, liked ? colors.postButton : undefined)}
        </Pressable>
      </View>
    </>
  );
}

export default function MomentScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  // Position tabs and actions comfortably below status bar / safe area
  const topInset = Math.max(insets.top, 16);
  const tabsY = topInset + 8;
  const actionsY = topInset + 4;
  const headerHeight = tabsY + 33 + 12;
  const shift = 88 - tabsY + 14;

  const [tab, setTab] = useState<MomentTab>('Moment');
  const [feeds, setFeeds] = useState<Record<MomentTab, FeedItem[]>>({
    Moment: [],
    Following: [],
  });
  /** Which tabs have had an answer, so an empty one reads as empty and not as pending. */
  const [loaded, setLoaded] = useState<Record<MomentTab, boolean>>({
    Moment: false,
    Following: false,
  });
  const [reload, setReload] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  /** What each post's body actually measured, once it has been laid out. */
  const [bodyHeights, setBodyHeights] = useState<Record<string, number>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState<Record<string, boolean>>({});

  const [feedCursors, setFeedCursors] = useState<Record<MomentTab, string | null>>({
    Moment: null,
    Following: null,
  });
  const [feedHasMore, setFeedHasMore] = useState<Record<MomentTab, boolean>>({
    Moment: false,
    Following: false,
  });
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);

  const layout = TAB_LAYOUT[tab];
  const posts = feeds[tab] ?? [];

  const fetchFeed = useCallback(
    async (quiet = false) => {
      try {
        const [feedRes, unreadRes] = await Promise.all([
          apiWithMeta<FeedItem[]>(`/feed?scope=${layout.scope}&limit=20`, { token }).catch(() => null),
          api<{ unread_count: number }>('/notifications/unread-count', { token }).catch(() => null),
        ]);
        if (feedRes) {
          const list = Array.isArray(feedRes.data) ? feedRes.data : [];
          setFeeds((f) => ({ ...f, [tab]: list }));
          setFeedCursors((c) => ({ ...c, [tab]: feedRes.meta?.next_cursor ?? null }));
          setFeedHasMore((h) => ({ ...h, [tab]: Boolean(feedRes.meta?.has_more) }));
        }
        setLoaded((l) => ({ ...l, [tab]: true }));
        if (unreadRes && typeof unreadRes.unread_count === 'number') {
          setUnreadCount(unreadRes.unread_count);
        }
      } catch {
        if (!quiet) setLoaded((l) => ({ ...l, [tab]: true }));
      } finally {
        setRefreshing(false);
      }
    },
    [layout.scope, tab, token],
  );

  const loadMoreFeed = useCallback(async () => {
    const cursor = feedCursors[tab];
    const hasMore = feedHasMore[tab];
    if (!hasMore || !cursor || loadingMoreFeed) return;
    setLoadingMoreFeed(true);
    try {
      const res = await apiWithMeta<FeedItem[]>(
        `/feed?scope=${layout.scope}&limit=20&cursor=${encodeURIComponent(cursor)}`,
        { token },
      );
      if (res?.data && Array.isArray(res.data)) {
        setFeeds((f) => {
          const prev = f[tab] ?? [];
          const map = new Map<string, FeedItem>();
          for (const p of prev) map.set(p.uuid, p);
          for (const p of res.data) map.set(p.uuid, p);
          return { ...f, [tab]: Array.from(map.values()) };
        });
        setFeedCursors((c) => ({ ...c, [tab]: res.meta?.next_cursor ?? null }));
        setFeedHasMore((h) => ({ ...h, [tab]: Boolean(res.meta?.has_more) }));
      }
    } catch {
      // Keep existing feed on error
    } finally {
      setLoadingMoreFeed(false);
    }
  }, [feedCursors, feedHasMore, layout.scope, loadingMoreFeed, tab, token]);

  // Focus effect: whenever MomentScreen comes into focus, refresh feed & unread count
  useFocusEffect(
    useCallback(() => {
      fetchFeed(true);
    }, [fetchFeed]),
  );

  // Initial load or tab change or reload trigger
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed, reload]);

  // Real-time polling every 4s while on screen
  useEffect(() => {
    const timer = setInterval(() => {
      fetchFeed(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed(true);
  }, [fetchFeed]);

  const toggleFollow = useCallback(
    async (author: PostAuthor) => {
      const next = !followed[author.uuid];
      setFollowBusy((b) => ({ ...b, [author.uuid]: true }));
      setFollowed((f) => ({ ...f, [author.uuid]: next }));
      try {
        await api(`/users/${author.uuid}/follow`, { method: next ? 'POST' : 'DELETE', token });
        // Both tabs are now wrong: this author's moments have moved from one to
        // the other. The visible one refetches here, the other when it is next
        // opened — `tab` is in the effect's deps.
        setReload((n) => n + 1);
      } catch {
        // Put the chip back rather than leaving it claiming something untrue.
        setFollowed((f) => ({ ...f, [author.uuid]: !next }));
      } finally {
        setFollowBusy((b) => ({ ...b, [author.uuid]: false }));
      }
    },
    [followed, token],
  );

  /**
   * Posts are no longer all one height, so each one's top is the sum of what
   * is above it rather than `index * (height + gap)`.
   */
  const heights = posts.map(
    (post) =>
      POST.height +
      mediaBlockHeight(post, POST.x + POST.media.x) -
      MEDIA.height +
      bodyBlockOf(post, bodyHeights),
  );
  const tops = heights.reduce<number[]>((acc, height, index) => {
    acc.push(index === 0 ? FIRST_POST_Y : acc[index - 1] + heights[index - 1] + POST.gap);
    return acc;
  }, []);
  const canvas =
    posts.length > 0
      ? tops[posts.length - 1] + heights[posts.length - 1] + (loadingMoreFeed ? 50 : 0)
      : FIRST_POST_Y + 80;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 120;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            if (feedHasMore[tab] && !loadingMoreFeed) {
              loadMoreFeed();
            }
          }
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.postButton}
            colors={[colors.postButton]}
            progressViewOffset={px(headerHeight)}
          />
        }
        contentContainerStyle={[
          posts.length > 0
            ? { height: px(canvas - shift) + px(24) + px(BOTTOM_NAV_HEIGHT) }
            : {
                flexGrow: 1,
                minHeight: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: px(headerHeight),
                paddingBottom: px(BOTTOM_NAV_HEIGHT + 24),
              },
        ]}
      >
        {posts.length > 0 ? (
          <View style={{ position: 'relative', top: -px(shift), height: px(canvas) }}>
            {posts.map((post, index) => (
              <MomentPost
                key={post.uuid}
                post={post}
                top={tops[index]}
                bodyBlock={bodyBlockOf(post, bodyHeights)}
                onBodyHeight={(height) =>
                  setBodyHeights((h) =>
                    Math.abs((h[post.uuid] ?? 0) - height) < 0.5 ? h : { ...h, [post.uuid]: height },
                  )
                }
                // Everyone in the Following feed is already followed, so the chip
                // would have nothing to say — that is the difference between them.
                showFollow={tab === 'Moment'}
                following={post.author ? followed[post.author.uuid] ?? false : false}
                busy={post.author ? followBusy[post.author.uuid] ?? false : false}
                onToggleFollow={() => {
                  if (post.author) toggleFollow(post.author);
                }}
                onOpen={() =>
                  navigation.navigate('PostDetails', { post, following: tab === 'Following' })
                }
                onOpenMedia={(index) => {
                  const urls = post.media_urls ?? [];
                  if (urls.length > 0) {
                    navigation.navigate('MediaViewer', { urls, index });
                  } else {
                    navigation.navigate('PostDetails', { post, following: tab === 'Following' });
                  }
                }}
              />
            ))}
            {loadingMoreFeed ? (
              <ActivityIndicator
                color={colors.postButton}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: px(tops[posts.length - 1] + heights[posts.length - 1] + 16),
                }}
              />
            ) : null}
          </View>
        ) : !loaded[tab] ? (
          <ActivityIndicator color={colors.black} />
        ) : (
          <Text style={[styles.empty, { fontSize: px(15), lineHeight: px(21) }]}>
            {EMPTY[tab]}
          </Text>
        )}
      </ScrollView>

      {/* An opaque band the feed scrolls under. */}
      <View style={[styles.header, { height: px(headerHeight) }]} pointerEvents="box-none">
        <View
          style={[
            styles.tabs,
            { left: px(TAB_TYPE.x), top: px(tabsY), gap: px(layout.tabs.gap) },
          ]}
        >
          {MOMENT_TABS.map((name) => {
            const active = name === tab;
            return (
              <Pressable key={name} onPress={() => setTab(name)}>
                <Text
                  style={[
                    active ? styles.tabActive : styles.tabIdle,
                    {
                      opacity: active ? 1 : layout.tabs.idleOpacity,
                      fontSize: px(active ? TAB_TYPE.active.size : TAB_TYPE.idle.size),
                      lineHeight: px(active ? TAB_TYPE.active.height : TAB_TYPE.idle.height),
                    },
                  ]}
                >
                  {name}
                </Text>
                {/* Line 83 is as wide as the word in Delight — 82 under
                    "Moment", 68 under "Following". Poppins sets both wider, so
                    the rule stretches to the label rather than stopping short. */}
                {active ? (
                  <View
                    style={{
                      marginTop: px(layout.tabs.ruleGap),
                      height: px(TAB_TYPE.active.ruleHeight),
                      backgroundColor: colors.momentRule,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.headerActions,
            { left: px(ACTIONS.x), top: px(actionsY), gap: px(ACTIONS.gap) },
          ]}
        >
          {/* Node 77:795 is the whole disc, its plus included. It opens the
              compose screen, node 99:1340. */}
          <Pressable onPress={() => navigation.navigate('PostMoment')}>
            <SvgXml
              xml={icons.momentAddCircle}
              width={px(ACTIONS.circle)}
              height={px(ACTIONS.circle)}
            />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('MomentNotifications')}
            hitSlop={8}
            style={{ width: px(ACTIONS.circle), height: px(ACTIONS.circle) }}
          >
            <SvgXml
              xml={icons.momentBellCircle}
              width={px(ACTIONS.circle)}
              height={px(ACTIONS.circle)}
            />
            <SvgXml
              xml={icons.momentBell}
              width={px(ACTIONS.bell.size)}
              height={px(ACTIONS.bell.size)}
              style={{ position: 'absolute', left: px(ACTIONS.bell.x), top: px(ACTIONS.bell.y) }}
            />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: px(2),
                  right: px(2),
                  minWidth: px(16),
                  height: px(16),
                  borderRadius: px(8),
                  backgroundColor: colors.postButton,
                  borderWidth: 1.5,
                  borderColor: colors.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: px(3),
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: px(9),
                    fontWeight: '700',
                    lineHeight: px(11),
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    color: colors.momentCount,
    paddingHorizontal: 24,
  },
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
  tabs: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabActive: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  tabIdle: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    flexShrink: 0,
    fontFamily: typography.fontFamily.regular,
    color: colors.momentCount,
  },
});
