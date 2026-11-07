import { Heart, MessageCircle, MessageSquare, Play } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { api, apiWithMeta } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { LevelBadges, READABLE_BADGE_HEIGHT } from '../level/LevelBadge';
import { usePostLike } from '../moment/PostStateContext';
import { avatarSource, type FeedItem, FollowChip, isVideoUrl, type PostAuthor } from '../moment/parts';
import { POST } from './geometry';
import { UserAvatar } from '../../components/UserAvatar';

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

/** "2h ago" — the card's meta line; anything older than a week falls back to the date. */
function timeAgo(iso: string | null) {
  if (!iso) return '';
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - at) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/** "public" -> "Public". */
function visibilityLabel(value: string | undefined) {
  if (!value) return 'Public';
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

/**
 * Every attachment the post carries: one is a full-width 210-tall photo, two or
 * more become a three-across grid of squares wrapping onto as many rows as needed.
 */
function PostMedia({ post, onOpenMedia }: { post: FeedItem; onOpenMedia: (index: number) => void }) {
  const { px } = useDesignScale();
  const { media, pad } = POST;
  const urls = post.media_urls ?? [];
  if (urls.length === 0) return null;

  const single = urls.length === 1;
  const inner = POST.width - pad * 2 - 2; // the card's 1px border is inside its width
  const tile = (inner - media.gridGap * (media.columns - 1)) / media.columns;
  const width = single ? inner : tile;
  const height = single ? media.height : tile;

  const renderTile = (url: string, index: number) => (
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
          <Play size={px(single ? 33 : 26)} color={colors.white} fill={colors.white} strokeWidth={0} />
        </View>
      ) : null}
    </Pressable>
  );

  if (single) return <View style={{ marginTop: px(media.gap) }}>{renderTile(urls[0], 0)}</View>;

  // Explicit rows of three: a flex-wrap row can push the third tile down when the
  // scaled widths round a hair over the row's width.
  const rows: string[][] = [];
  for (let i = 0; i < urls.length; i += media.columns) rows.push(urls.slice(i, i + media.columns));

  return (
    <View style={{ marginTop: px(media.gap), gap: px(media.gridGap) }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: px(media.gridGap) }}>
          {row.map((url, c) => renderTile(url, r * media.columns + c))}
        </View>
      ))}
    </View>
  );
}

/**
 * One post on the dark feed — the "Home Feed Redesign" card: avatar with a soft
 * blue ring, name over "2h ago · Public", a Follow pill (or the overflow dots on
 * Following, where everyone is followed already), caption, media, then Like,
 * Comment and a Chat pill under a hairline.
 */
export function PostCard({
  post,
  showFollow,
  following,
  followBusy,
  onToggleFollow,
  onChat,
  onOpen,
  onOpenMedia,
}: {
  post: FeedItem;
  showFollow: boolean;
  following: boolean;
  followBusy: boolean;
  onToggleFollow: () => void;
  /** Opens the conversation with the author. */
  onChat: () => void;
  onOpen: () => void;
  /** Which tile was tapped, so the viewer opens on that one. */
  onOpenMedia: (index: number) => void;
}) {
  const { px } = useDesignScale();
  const { liked, likeCount, commentCount, toggle } = usePostLike(post);
  const { author, pill, body, actions } = POST;

  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.card,
        {
          width: px(POST.width),
          borderRadius: px(POST.radius),
          paddingTop: px(POST.pad),
          paddingHorizontal: px(POST.pad),
          paddingBottom: px(POST.padBottom),
        },
      ]}
    >
      <View style={[styles.row, { gap: px(author.gap) }]}>
        <View style={{ width: px(author.avatar), height: px(author.avatar) }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: px(-author.ring),
              left: px(-author.ring),
              right: px(-author.ring),
              bottom: px(-author.ring),
              borderRadius: px(author.avatar / 2 + author.ring),
              borderWidth: px(1.5),
              borderColor: colors.feedRing,
            }}
          />
          <UserAvatar source={avatarSource(post)} frame={post.author?.frame} size={px(author.avatar)} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={[styles.name, { fontSize: px(author.nameSize), lineHeight: px(author.nameHeight) }]}
          >
            {post.author?.display_name ?? 'Guftagu user'}
          </Text>
          <View style={{ marginVertical: px(2) }}>
            <LevelBadges user={post.author} height={READABLE_BADGE_HEIGHT} />
          </View>
          <Text style={[styles.meta, { fontSize: px(author.metaSize), lineHeight: px(author.metaHeight) }]}>
            {timeAgo(post.created_at)} · {visibilityLabel(post.visibility)}
          </Text>
        </View>
        {showFollow && post.author ? (
          <FollowChip following={following} busy={followBusy} onPress={onToggleFollow} />
        ) : null}
      </View>

      {post.body ? (
        <Text
          style={[
            styles.body,
            { marginTop: px(body.gap), fontSize: px(body.size), lineHeight: px(body.height) },
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
          { marginTop: px(actions.gap), minHeight: px(actions.height) },
        ]}
      >
        <Pressable
          onPress={toggle}
          accessibilityLabel="Like"
          style={[styles.row, { minHeight: px(actions.height), gap: px(actions.countGap), paddingRight: px(actions.padX) }]}
        >
          <Heart
            size={px(actions.likeIcon)}
            color={liked ? colors.feedLike : colors.feedAction}
            fill={liked ? colors.feedLike : 'none'}
            strokeWidth={1.9}
          />
          <Text style={[styles.count, { fontSize: px(actions.countSize) }]}>{likeCount}</Text>
        </Pressable>
        <Pressable
          onPress={onOpen}
          accessibilityLabel="Comments"
          style={[styles.row, { minHeight: px(actions.height), gap: px(actions.countGap), paddingHorizontal: px(actions.padX) }]}
        >
          <MessageCircle size={px(actions.commentIcon)} color={colors.feedAction} strokeWidth={1.9} />
          <Text style={[styles.count, { fontSize: px(actions.countSize) }]}>{commentCount}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onChat}
          accessibilityLabel="Chat with author"
          hitSlop={{ top: px(8), bottom: px(8) }}
          style={[
            styles.row,
            styles.pill,
            styles.chatPill,
            { height: px(pill.height), paddingHorizontal: px(13), borderRadius: px(pill.height / 2), gap: px(6) },
          ]}
        >
          <MessageSquare size={px(15)} color={colors.feedAccentText} strokeWidth={2} />
          <Text style={[styles.pillLabel, { fontSize: px(pill.size), color: colors.feedAccentText }]}>Chat</Text>
        </Pressable>
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
    backgroundColor: colors.feedCard,
    borderWidth: 1,
    borderColor: colors.feedBorder,
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
    borderTopWidth: 1,
    borderTopColor: colors.feedDivider,
  },
  name: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.white,
  },
  meta: {
    fontFamily: typography.fontFamily.regular,
    color: colors.feedMuted,
  },
  pill: {
    borderWidth: 1,
  },
  pillLabel: {
    fontFamily: typography.fontFamily.semiBold,
  },
  chatPill: {
    borderColor: colors.feedChatBorder,
    backgroundColor: colors.feedChatFill,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    color: colors.feedText,
  },
  count: {
    fontFamily: typography.fontFamily.medium,
    color: colors.feedAction,
  },
  placeholder: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
    opacity: 0.4,
    textAlign: 'center',
  },
});
