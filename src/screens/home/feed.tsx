import { Play } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, apiWithMeta } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { usePostLike } from '../moment/PostStateContext';
import { avatarSource, type FeedItem, isVideoUrl, type PostAuthor } from '../moment/parts';
import { POST } from './geometry';

/**
 * For You and Following are `GET /feed`'s two scopes: `discover` is the people
 * you do not follow (so every card offers Follow), `following` the people you
 * do. One hook per scope keeps each tab's list, cursor and loading state apart.
 */
export type FeedScope = 'discover' | 'following';

export function useFeed(scope: FeedScope) {
  const { token } = useAuth();
  const [posts, setPosts] = useState<FeedItem[]>([]);
  /** Whether the first answer has come back, so empty reads as empty, not pending. */
  const [loaded, setLoaded] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await apiWithMeta<FeedItem[]>(`/feed?scope=${scope}&limit=20`, { token });
      setPosts(Array.isArray(res.data) ? res.data : []);
      setCursor(res.meta?.next_cursor ?? null);
      setHasMore(Boolean(res.meta?.has_more));
    } catch {
      // Keep whatever is already on screen.
    } finally {
      setLoaded(true);
    }
  }, [scope, token]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await apiWithMeta<FeedItem[]>(
        `/feed?scope=${scope}&limit=20&cursor=${encodeURIComponent(cursor)}`,
        { token },
      );
      if (Array.isArray(res.data)) {
        setPosts((prev) => {
          const byId = new Map(prev.map((p) => [p.uuid, p]));
          for (const p of res.data) byId.set(p.uuid, p);
          return Array.from(byId.values());
        });
      }
      setCursor(res.meta?.next_cursor ?? null);
      setHasMore(Boolean(res.meta?.has_more));
    } catch {
      // Leave the list as it is; the next scroll to the end tries again.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore, scope, token]);

  return { posts, loaded, loadingMore, refresh, loadMore };
}

/** Follow state per author, which `SocialPresenter::user()` does not report. */
export function useFollow(onChanged: () => void) {
  const { token } = useAuth();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    async (author: PostAuthor) => {
      const next = !followed[author.uuid];
      setBusy((b) => ({ ...b, [author.uuid]: true }));
      setFollowed((f) => ({ ...f, [author.uuid]: next }));
      try {
        await api(`/users/${author.uuid}/follow`, { method: next ? 'POST' : 'DELETE', token });
        // The author's posts have moved between the two scopes.
        onChanged();
      } catch {
        setFollowed((f) => ({ ...f, [author.uuid]: !next }));
      } finally {
        setBusy((b) => ({ ...b, [author.uuid]: false }));
      }
    },
    [followed, onChanged, token],
  );

  return { followed, busy, toggle };
}

/** Figma writes the date as 9/2/2026. */
function formatDate(iso: string | null) {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  return `${at.getDate()}/${at.getMonth() + 1}/${at.getFullYear()}`;
}

/**
 * Every attachment the post carries, as the old Moment feed showed them: one
 * keeps Figma's single 247x213 frame, two or more become a three-across grid
 * of squares spanning the footer's width, wrapping onto as many rows as needed.
 */
function PostMedia({ post, onOpenMedia }: { post: FeedItem; onOpenMedia: (index: number) => void }) {
  const { px } = useDesignScale();
  const { media, footer } = POST;
  const urls = post.media_urls ?? [];
  if (urls.length === 0) return null;

  const single = urls.length === 1;
  const tile = (footer.width - media.gridGap * (media.columns - 1)) / media.columns;
  const width = single ? media.width : tile;
  const height = single ? media.height : tile;

  return (
    <View
      style={{
        marginLeft: px(media.x),
        marginTop: px(media.gap),
        width: px(single ? media.width : footer.width),
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: px(media.gridGap),
      }}
    >
      {urls.map((url, index) => (
        <Pressable
          key={`${url}-${index}`}
          onPress={() => onOpenMedia(index)}
          style={{
            width: px(width),
            height: px(height),
            borderRadius: px(single ? media.radius : media.tileRadius),
            backgroundColor: colors.black,
            overflow: 'hidden',
          }}
        >
          {isVideoUrl(url) ? null : (
            <Image source={{ uri: url }} resizeMode="cover" style={{ width: px(width), height: px(height) }} />
          )}
          {isVideoUrl(url) || post.type === 'audio' ? (
            <View style={styles.play}>
              <Play
                size={px(single ? 33 : 26)}
                color={colors.white}
                fill={colors.white}
                strokeWidth={0}
              />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Frame 1597881455 — one post on the dark feed. Figma's sample is a photo post
 * with no caption; a caption, when there is one, sits where the photo starts and
 * pushes it down, and a text-only post is just the caption.
 */
export function PostCard({
  post,
  showFollow,
  following,
  followBusy,
  onToggleFollow,
  onOpen,
  onOpenMedia,
}: {
  post: FeedItem;
  showFollow: boolean;
  following: boolean;
  followBusy: boolean;
  onToggleFollow: () => void;
  onOpen: () => void;
  /** Which tile was tapped, so the viewer opens on that one. */
  onOpenMedia: (index: number) => void;
}) {
  const { px } = useDesignScale();
  const { liked, likeCount, commentCount, toggle } = usePostLike(post);
  const { author, follow, chat, body, footer, actions } = POST;

  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.card,
        {
          width: px(POST.width),
          borderRadius: px(POST.radius),
          paddingTop: px(POST.paddingTop),
          paddingBottom: px(POST.paddingBottom),
        },
      ]}
    >
      <View style={[styles.row, { marginLeft: px(author.x), height: px(author.avatar) }]}>
        <Image
          source={avatarSource(post)}
          style={{
            width: px(author.avatar),
            height: px(author.avatar),
            borderRadius: px(author.avatar / 2),
          }}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            {
              marginLeft: px(author.gap),
              fontSize: px(author.nameSize),
              lineHeight: px(author.nameHeight),
              // Leaves room for Follow and for Chat on the right.
              maxWidth: px(showFollow ? 150 : 210),
            },
          ]}
        >
          {post.author?.display_name ?? 'Guftagu user'}
        </Text>
        {showFollow && post.author ? (
          <Pressable
            disabled={followBusy}
            onPress={onToggleFollow}
            hitSlop={px(8)}
            style={[styles.row, { marginLeft: px(follow.gap), gap: px(follow.dotGap) }]}
          >
            <View
              style={{
                width: px(follow.dot),
                height: px(follow.dot),
                borderRadius: px(follow.dot / 2),
                backgroundColor: colors.homeAccent,
              }}
            />
            <Text style={[styles.link, { fontSize: px(follow.size), lineHeight: px(follow.height) }]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Frame 1597881457 — there is no chat screen yet, so it does nothing. */}
      <Pressable
        hitSlop={px(8)}
        style={[styles.row, { position: 'absolute', right: px(chat.right), top: px(chat.top), gap: px(chat.gap) }]}
      >
        <SvgXml xml={icons.messageCircle} width={px(chat.icon)} height={px(chat.icon)} />
        <Text style={[styles.link, { fontSize: px(chat.size), lineHeight: px(chat.height) }]}>Chat</Text>
      </Pressable>

      {post.body ? (
        <Text
          style={[
            styles.body,
            {
              marginLeft: px(body.x),
              marginTop: px(body.gap),
              width: px(footer.width),
              fontSize: px(body.size),
              lineHeight: px(body.height),
            },
          ]}
        >
          {post.body}
        </Text>
      ) : null}

      <PostMedia post={post} onOpenMedia={onOpenMedia} />

      <View
        style={[
          styles.row,
          styles.footer,
          { marginLeft: px(footer.x), marginTop: px(footer.gap), width: px(footer.width), height: px(footer.height) },
        ]}
      >
        <Text style={[styles.date, { fontSize: px(footer.dateSize), lineHeight: px(footer.dateHeight) }]}>
          {formatDate(post.created_at)}
        </Text>
        <View style={[styles.row, { gap: px(actions.gap) }]}>
          <Pressable onPress={onOpen} hitSlop={px(6)} style={[styles.row, { gap: px(actions.countGap) }]}>
            <SvgXml xml={icons.chatCircleDots} width={px(actions.icon)} height={px(actions.icon)} />
            <Text style={[styles.count, { fontSize: px(actions.countSize), lineHeight: px(actions.countHeight) }]}>
              {commentCount}
            </Text>
          </Pressable>
          <Pressable onPress={toggle} hitSlop={px(6)} style={[styles.row, { gap: px(actions.countGap) }]}>
            <SvgXml
              xml={icons.momentThumbsUp}
              width={px(actions.icon)}
              height={px(actions.icon)}
              color={liked ? colors.postButton : colors.momentCount}
            />
            <Text style={[styles.count, { fontSize: px(actions.countSize), lineHeight: px(actions.countHeight) }]}>
              {likeCount}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/** What a feed tab shows before its first answer, and when it has none. */
export function FeedPlaceholder({ loaded, empty }: { loaded: boolean; empty: string }) {
  const { px } = useDesignScale();
  return (
    <View style={{ paddingTop: px(80), alignItems: 'center' }}>
      {loaded ? (
        <Text style={[styles.placeholder, { fontSize: px(15), lineHeight: px(21) }]}>{empty}</Text>
      ) : (
        <ActivityIndicator color={colors.white} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.homeCard,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  play: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
  link: {
    fontFamily: typography.fontFamily.medium,
    color: colors.homeAccent,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
  },
  date: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    opacity: 0.3,
  },
  count: {
    fontFamily: typography.fontFamily.regular,
    color: colors.momentCount,
  },
  placeholder: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
    opacity: 0.4,
    textAlign: 'center',
  },
});
