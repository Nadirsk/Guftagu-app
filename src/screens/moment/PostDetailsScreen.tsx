import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Play,
  SendHorizontal,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, apiWithMeta } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { LevelBadges, READABLE_BADGE_HEIGHT } from '../level/LevelBadge';
import {
  AUTHOR,
  AuthorRow,
  avatarSource,
  type FeedItem,
  FollowChip,
  formatStamp,
  isVideoUrl,
  type PostAuthor,
} from './parts';
import { usePostLike, usePostState } from './PostStateContext';
import { UserAvatar } from '../../components/UserAvatar';

/**
 * Post Details. The author row — avatar, name, badges and the Follow chip — is
 * the app's own and is drawn exactly as the Moment feed draws it. Everything
 * under it is a flowing list: the post is the list's header, comments and
 * likes are its rows, and the composer is pinned underneath, so a long post or
 * a comment that wraps simply grows.
 *
 * Comments nest Instagram-style: a top-level comment, its replies tucked
 * behind "View N replies" and joined to it by a thin curved line.
 *
 * Every number is a design pixel on the 402-wide frame, scaled by `px`.
 */

/** What `GET /posts/{uuid}/comments` is asked for in one go. */
const COMMENT_PAGE = 10;

export const DETAIL_TABS = ['Comment', 'Like'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

const TAB_LABEL: Record<DetailTab, string> = { Comment: 'Comments', Like: 'Likes' };

const INK = '#17171A';
const SUBTLE = '#6B6B73';
const HAIRLINE = '#EEECE8';
const THREAD_LINE = '#E4E2DE';
const WASH = '#F4F3F1';
const ACCENT = '#D13D00';
const ACCENT_TEXT = '#B83500';
const ACCENT_WASH = '#FDEEE6';

/** `SocialPresenter::comment()` — verified against app/Support/SocialPresenter.php. */
type Comment = {
  uuid: string;
  post_uuid: string | null;
  author: PostAuthor | null;
  parent_uuid: string | null;
  body: string | null;
  is_deleted: boolean;
  created_at: string | null;
};

type Liker = { author: PostAuthor };

/** A top-level comment and the replies that hang off it. */
type Thread = { comment: Comment; replies: Comment[] };

/** "now", "5m", "2h", "3d", "6w" — the short form comments are read in. */
function timeAgo(iso: string | null) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

const byTime = (a: Comment, b: Comment) =>
  (a.created_at ? new Date(a.created_at).getTime() : 0) -
  (b.created_at ? new Date(b.created_at).getTime() : 0);

function Avatar({ author, size }: { author: PostAuthor | null; size: number }) {
  return (
    <UserAvatar source={avatarSource({ author })} frame={author?.frame} size={size} imageStyle={{ backgroundColor: WASH }} />
  );
}

/** The person's wealth and charm grade medals — the slot the static 73:16 strip had (92 wide, 20 tall). */
function Badges({ author }: { author: PostAuthor | null }) {
  return (
    <View style={{ alignSelf: 'flex-start' }}>
      <LevelBadges user={author} height={READABLE_BADGE_HEIGHT} />
    </View>
  );
}

function CommentItem({
  comment,
  reply,
  onReply,
}: {
  comment: Comment;
  /** A reply is drawn smaller, under its parent. */
  reply?: boolean;
  onReply: () => void;
}) {
  const { px } = useDesignScale();
  const avatar = px(reply ? 28 : 38);
  const name = comment.author?.display_name ?? 'Guftagu user';

  return (
    <View style={[styles.commentRow, { gap: px(reply ? 10 : 12) }]}>
      <Avatar author={comment.author} size={avatar} />
      <View style={{ flex: 1 }}>
        {comment.is_deleted ? (
          <Text style={[styles.removed, { fontSize: px(14), lineHeight: px(21) }]}>
            This comment was removed
          </Text>
        ) : (
          <>
            {/* Same profile block as the Likes tab: name, then the level and heart badges. */}
            <Text numberOfLines={1} style={[styles.commentName, { fontSize: px(15), lineHeight: px(21) }]}>
              {name}
            </Text>
            <View style={{ marginTop: px(2) }}>
              <Badges author={comment.author} />
            </View>
            <Text style={[styles.commentText, { marginTop: px(6), fontSize: px(14.5), lineHeight: px(21) }]}>
              {comment.body}
            </Text>
          </>
        )}
        <View style={[styles.commentMeta, { gap: px(16), marginTop: px(5) }]}>
          <Text style={[styles.metaText, { fontSize: px(12.5) }]}>{timeAgo(comment.created_at)}</Text>
          {comment.is_deleted ? null : (
            <Pressable onPress={onReply} hitSlop={10}>
              <Text style={[styles.metaText, styles.metaAction, { fontSize: px(12.5) }]}>Reply</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function ThreadItem({
  thread,
  open,
  onToggle,
  onReply,
}: {
  thread: Thread;
  open: boolean;
  onToggle: () => void;
  onReply: (comment: Comment) => void;
}) {
  const { px } = useDesignScale();
  const count = thread.replies.length;
  const column = px(38 + 12);

  return (
    <View style={{ paddingHorizontal: px(16), paddingTop: px(18) }}>
      {/* The spine runs from under the parent's avatar down through the replies. */}
      {open && count > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.spine, { left: px(16 + 19), top: px(18 + 38 + 6) }]}
        />
      ) : null}

      <CommentItem comment={thread.comment} onReply={() => onReply(thread.comment)} />

      {count > 0 ? (
        <View style={{ marginLeft: column }}>
          {open
            ? thread.replies.map((r) => (
                <View key={r.uuid} style={{ paddingTop: px(14) }}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.elbow,
                      { left: -px(31), top: 0, width: px(27), height: px(28), borderBottomLeftRadius: px(12) },
                    ]}
                  />
                  <CommentItem comment={r} reply onReply={() => onReply(r)} />
                </View>
              ))
            : null}
          <Pressable
            onPress={onToggle}
            hitSlop={8}
            style={[styles.toggleRow, { gap: px(8), marginTop: px(12) }]}
          >
            <View style={[styles.toggleRule, { width: px(26) }]} />
            <Text style={[styles.metaText, styles.metaAction, { fontSize: px(12.5) }]}>
              {open ? 'Hide replies' : `View ${count} ${count === 1 ? 'reply' : 'replies'}`}
            </Text>
            {open ? (
              <ChevronUp size={px(14)} color={SUBTLE} />
            ) : (
              <ChevronDown size={px(14)} color={SUBTLE} />
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function LikerItem({ liker }: { liker: Liker }) {
  const { px } = useDesignScale();

  return (
    <View style={[styles.likerRow, { paddingHorizontal: px(16), paddingVertical: px(10), gap: px(12) }]}>
      <Avatar author={liker.author} size={px(46)} />
      <View style={{ flex: 1, gap: px(3) }}>
        <Text numberOfLines={1} style={[styles.commentName, { fontSize: px(15) }]}>
          {liker.author.display_name ?? 'Guftagu user'}
        </Text>
        <Badges author={liker.author} />
      </View>
      <Heart size={px(18)} color={ACCENT} fill={ACCENT} />
    </View>
  );
}

type DetailsNavigation = NativeStackNavigationProp<RootStackParamList, 'PostDetails'>;
type DetailsRoute = RouteProp<RootStackParamList, 'PostDetails'>;

export default function PostDetailsScreen() {
  const { px } = useDesignScale();
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<DetailsNavigation>();
  const route = useRoute<DetailsRoute>();
  const { token, user: me } = useAuth();
  const rawPost = route.params.post as unknown;
  const post: FeedItem =
    rawPost && typeof rawPost === 'object' && 'post' in rawPost && (rawPost as { post: FeedItem }).post
      ? (rawPost as { post: FeedItem }).post
      : (rawPost as FeedItem);
  /**
   * Which feed this was opened from. The Following tab hides the chip for the
   * same reason it hides it on the post itself — everyone there is already
   * followed — so the detail of one of those posts must not offer it either.
   */
  const fromFollowing = route.params.following ?? false;
  const body = post.body?.trim();

  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<DetailTab>('Comment');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsNextCursor, setCommentsNextCursor] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  /** `GET /posts/{uuid}/likes` — who actually liked it. */
  const [likers, setLikers] = useState<Liker[]>([]);
  const [likersLoaded, setLikersLoaded] = useState(false);
  const [likersNextCursor, setLikersNextCursor] = useState<string | null>(null);
  const [hasMoreLikers, setHasMoreLikers] = useState(false);
  const [loadingMoreLikers, setLoadingMoreLikers] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // null until the server says, so Follow never flashes for someone already followed.
  const [following, setFollowing] = useState<boolean | null>(route.params.following ? true : null);
  const [followBusy, setFollowBusy] = useState(false);
  const followBusyRef = useRef(false);
  // The same counts the feed row shows — see PostStateContext.
  const { liked, likeCount, commentCount, toggle: toggleLike } = usePostLike(post);
  const { setCommentCount, setLiked, setLikeCount } = usePostState();
  const [replyTo, setReplyTo] = useState<{ parentUuid: string; name: string } | null>(null);
  /** Top-level comments whose replies are showing. */
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardVisible = keyboardHeight > 0;
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const refreshDetails = useCallback(
    async (quiet = false) => {
      try {
        const [commentsRes, postRes] = await Promise.all([
          apiWithMeta<Comment[]>(`/posts/${post.uuid}/comments?limit=${COMMENT_PAGE}`, { token }).catch(
            () => null,
          ),
          api<{ post: FeedItem } | FeedItem>(`/posts/${post.uuid}`, { token }).catch(() => null),
        ]);
        if (commentsRes) {
          const validComments = Array.isArray(commentsRes.data) ? commentsRes.data : [];
          // A quiet poll merges, so it does not throw away pages already scrolled in.
          setComments((prev) => {
            if (!quiet) return validComments;
            const map = new Map<string, Comment>();
            for (const c of prev) map.set(c.uuid, c);
            for (const c of validComments) map.set(c.uuid, c);
            return Array.from(map.values());
          });
          if (!quiet) {
            setCommentsNextCursor(commentsRes.meta?.next_cursor ?? null);
            setHasMoreComments(Boolean(commentsRes.meta?.has_more));
          }
          if (validComments.length < COMMENT_PAGE) {
            setCommentCount(post.uuid, validComments.length);
          }
        }
        const postData = postRes && 'post' in postRes ? postRes.post : postRes;
        if (postData) {
          if (typeof postData.liked_by_me === 'boolean') {
            setLiked(post.uuid, postData.liked_by_me);
          }
          if (typeof postData.like_count === 'number' && Number.isFinite(postData.like_count)) {
            setLikeCount(post.uuid, postData.like_count);
          }
          if (typeof postData.author_is_following === 'boolean') {
            setFollowing((f) => (followBusyRef.current ? f : postData.author_is_following ?? false));
          }
        }
      } catch {
        /* quiet fail */
      } finally {
        setFollowing((f) => f ?? false);
        if (!quiet) setCommentsLoaded(true);
        setRefreshing(false);
      }
    },
    [post.uuid, setCommentCount, setLiked, setLikeCount, token],
  );

  const loadMoreComments = useCallback(async () => {
    if (!hasMoreComments || !commentsNextCursor || loadingMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const res = await apiWithMeta<Comment[]>(
        `/posts/${post.uuid}/comments?limit=${COMMENT_PAGE}&cursor=${encodeURIComponent(commentsNextCursor)}`,
        { token },
      );
      if (res?.data && Array.isArray(res.data)) {
        setComments((prev) => {
          const map = new Map<string, Comment>();
          for (const c of prev) map.set(c.uuid, c);
          for (const c of res.data) map.set(c.uuid, c);
          return Array.from(map.values());
        });
        setCommentsNextCursor(res.meta?.next_cursor ?? null);
        setHasMoreComments(Boolean(res.meta?.has_more));
      }
    } catch {
      // Keep existing comments on error
    } finally {
      setLoadingMoreComments(false);
    }
  }, [commentsNextCursor, hasMoreComments, loadingMoreComments, post.uuid, token]);

  // Initial load
  useEffect(() => {
    refreshDetails(false);
  }, [refreshDetails]);

  // Real-time polling every 5s while on PostDetails
  useEffect(() => {
    const timer = setInterval(() => {
      refreshDetails(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshDetails(false);
  }, [refreshDetails]);

  /**
   * The likers, fetched only when that tab is opened — most visits never look.
   * `likeCount` is in the deps so liking the post here refreshes the list.
   */
  useEffect(() => {
    if (tab !== 'Like') return;
    let cancelled = false;
    apiWithMeta<PostAuthor[]>(`/posts/${post.uuid}/likes?limit=${COMMENT_PAGE}`, { token })
      .then((res) => {
        if (!cancelled && res?.data) {
          setLikers(res.data.map((author) => ({ author })));
          setLikersNextCursor(res.meta?.next_cursor ?? null);
          setHasMoreLikers(Boolean(res.meta?.has_more));
        }
      })
      .catch(() => {
        /* nothing to show is what a failure leaves */
      })
      .finally(() => {
        if (!cancelled) setLikersLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [likeCount, post.uuid, tab, token]);

  const loadMoreLikers = useCallback(async () => {
    if (!hasMoreLikers || !likersNextCursor || loadingMoreLikers) return;
    setLoadingMoreLikers(true);
    try {
      const res = await apiWithMeta<PostAuthor[]>(
        `/posts/${post.uuid}/likes?limit=${COMMENT_PAGE}&cursor=${encodeURIComponent(likersNextCursor)}`,
        { token },
      );
      if (res?.data && Array.isArray(res.data)) {
        setLikers((prev) => {
          const map = new Map<string, Liker>();
          for (const l of prev) map.set(l.author.uuid, l);
          for (const a of res.data) map.set(a.uuid, { author: a });
          return Array.from(map.values());
        });
        setLikersNextCursor(res.meta?.next_cursor ?? null);
        setHasMoreLikers(Boolean(res.meta?.has_more));
      }
    } catch {
      // Keep existing likers on error
    } finally {
      setLoadingMoreLikers(false);
    }
  }, [hasMoreLikers, likersNextCursor, loadingMoreLikers, post.uuid, token]);

  /**
   * Comments arrive flat, each carrying `parent_uuid`. Newest top-level comment
   * first; replies oldest first so a conversation reads top to bottom. A reply
   * whose parent is on a page not loaded yet becomes a thread of its own rather
   * than vanishing.
   */
  const threads = useMemo<Thread[]>(() => {
    const known = new Set(comments.map((c) => c.uuid));
    const repliesOf = new Map<string, Comment[]>();
    const roots: Comment[] = [];
    for (const c of comments) {
      if (c.parent_uuid && known.has(c.parent_uuid)) {
        repliesOf.set(c.parent_uuid, [...(repliesOf.get(c.parent_uuid) ?? []), c]);
      } else {
        roots.push(c);
      }
    }
    return roots
      .sort((a, b) => byTime(b, a))
      .map((comment) => ({ comment, replies: (repliesOf.get(comment.uuid) ?? []).sort(byTime) }));
  }, [comments]);

  const startReply = useCallback((comment: Comment) => {
    const name = comment.author?.display_name ?? 'Guftagu user';
    // Replies stay two levels deep, as on Instagram: answering a reply answers its parent.
    const parentUuid = comment.parent_uuid ?? comment.uuid;
    setReplyTo({ parentUuid, name });
    setOpenThreads((prev) => new Set(prev).add(parentUuid));
    setDraft((d) => (d.trim() ? d : `@${name} `));
    inputRef.current?.focus();
  }, []);

  const toggleThread = useCallback((uuid: string) => {
    setOpenThreads((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;

    isSubmittingRef.current = true;
    setDraft('');
    inputRef.current?.clear();
    Keyboard.dismiss();
    const currentReplyTo = replyTo;
    setReplyTo(null);
    setSending(true);

    try {
      const res = await api<{ comment: Comment; comment_count: number }>(
        `/posts/${post.uuid}/comments`,
        {
          method: 'POST',
          body: currentReplyTo ? { body: text, parent_uuid: currentReplyTo.parentUuid } : { body: text },
          token,
        },
      );

      if (res?.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.uuid === res.comment.uuid)) return prev;
          return [res.comment, ...prev];
        });
        if (typeof res.comment_count === 'number') {
          setCommentCount(post.uuid, res.comment_count);
        }
      }

      // Background refresh to ensure full thread synchronization
      api<Comment[]>(`/posts/${post.uuid}/comments?limit=${COMMENT_PAGE}`, { token })
        .then((data) => {
          const validData = Array.isArray(data) ? data : [];
          setComments((prev) => {
            const map = new Map<string, Comment>();
            for (const c of prev) map.set(c.uuid, c);
            for (const c of validData) map.set(c.uuid, c);
            return Array.from(map.values());
          });
          if (typeof res?.comment_count === 'number') {
            setCommentCount(post.uuid, res.comment_count);
          }
        })
        .catch(() => {});
    } catch {
      // Keep input cleared so it does not reappear or autofill
    } finally {
      setSending(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 500);
    }
  }, [draft, post.uuid, replyTo, sending, setCommentCount, token]);

  const toggleFollow = useCallback(async () => {
    const author = post.author;
    if (!author) return;
    const next = !following;
    followBusyRef.current = true;
    setFollowBusy(true);
    setFollowing(next);
    try {
      await api(`/users/${author.uuid}/follow`, { method: next ? 'POST' : 'DELETE', token });
    } catch {
      setFollowing(!next);
    } finally {
      followBusyRef.current = false;
      setFollowBusy(false);
    }
  }, [following, post.author, token]);

  const onEndReached = () => {
    if (tab === 'Comment') loadMoreComments();
    else loadMoreLikers();
  };

  // ---- the post, as the list's header --------------------------------------

  const gutter = px(16);
  const urls = post.media_urls ?? [];
  const mediaWidth = windowWidth - gutter * 2;
  // Same rule as the feed card: one photo is full width and 210 tall, two or
  // more are three-across squares wrapping onto as many rows as needed.
  const gridGap = px(6);
  const columns = 3;
  const tile = (mediaWidth - gridGap * (columns - 1)) / columns;
  const mediaRows: string[][] = [];
  for (let i = 0; i < urls.length; i += columns) mediaRows.push(urls.slice(i, i + columns));
  const stamp = formatStamp(post.created_at, post.author?.country ?? null);

  const mediaThumb = (url: string, index: number, width: number, height: number) => (
    <Pressable
      key={`${url}-${index}`}
      onPress={() => navigation.navigate('MediaViewer', { urls, index })}
      style={[styles.thumb, { width, height, borderRadius: px(urls.length === 1 ? 16 : 12) }]}
    >
      {isVideoUrl(url) ? null : (
        <Image source={{ uri: url }} resizeMode="cover" style={{ width, height }} />
      )}
      {isVideoUrl(url) || post.type === 'audio' ? (
        <View style={styles.playWrap}>
          <Play
            size={px(urls.length === 1 ? 33 : 26)}
            color={colors.white}
            fill={colors.white}
            strokeWidth={0}
          />
        </View>
      ) : null}
    </Pressable>
  );

  const header = (
    <View>
      {/* The author row is the app's own, left exactly as the feed draws it. */}
      <View style={{ height: px(AUTHOR.height), marginTop: px(16) }}>
        <AuthorRow
          post={post}
          left={17}
          top={0}
          trailing={
            post.author?.uuid === me?.uuid || following === null || fromFollowing ? null : (
              <FollowChip following={following === true} busy={followBusy} onPress={toggleFollow} />
            )
          }
        />
      </View>

      {body ? (
        <Text
          selectable
          style={[styles.body, { marginHorizontal: gutter, marginTop: px(14), fontSize: px(16), lineHeight: px(25) }]}
        >
          {body}
        </Text>
      ) : null}

      {urls.length === 1 ? (
        <View style={{ marginHorizontal: gutter, marginTop: px(14) }}>
          {mediaThumb(urls[0], 0, mediaWidth, px(210))}
        </View>
      ) : urls.length > 1 ? (
        <View style={{ marginHorizontal: gutter, marginTop: px(14), gap: gridGap }}>
          {mediaRows.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: gridGap }}>
              {row.map((u, c) => mediaThumb(u, r * columns + c, tile, tile))}
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.stamp, { marginHorizontal: gutter, marginTop: px(12), fontSize: px(12.5) }]}>
        {stamp.date} {stamp.time}
      </Text>

      <View style={[styles.actions, { marginHorizontal: gutter, marginTop: px(14), gap: px(10) }]}>
        <Pressable
          onPress={toggleLike}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          style={[
            styles.actionPill,
            liked ? styles.actionPillLiked : null,
            { height: px(42), paddingHorizontal: px(18), gap: px(8) },
          ]}
        >
          <Heart size={px(20)} color={liked ? ACCENT : INK} fill={liked ? ACCENT : 'transparent'} />
          <Text style={[styles.actionLabel, { fontSize: px(14), color: liked ? ACCENT_TEXT : INK }]}>
            {likeCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setTab('Comment');
            inputRef.current?.focus();
          }}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add a comment"
          style={[styles.actionPill, { height: px(42), paddingHorizontal: px(18), gap: px(8) }]}
        >
          <MessageCircle size={px(20)} color={INK} />
          <Text style={[styles.actionLabel, { fontSize: px(14), color: INK }]}>{commentCount}</Text>
        </Pressable>
      </View>

      <View style={[styles.tabBar, { marginTop: px(16), marginHorizontal: gutter }]}>
        {DETAIL_TABS.map((name) => {
          const active = name === tab;
          return (
            <Pressable
              key={name}
              onPress={() => setTab(name)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tabCell, { marginRight: px(28) }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    fontSize: px(15),
                    paddingTop: px(12),
                    paddingBottom: px(10),
                    color: active ? INK : SUBTLE,
                  },
                ]}
              >
                {TAB_LABEL[name]} {name === 'Comment' ? commentCount : likeCount}
              </Text>
              <View style={[styles.tabRule, { backgroundColor: active ? ACCENT : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // ---- list ----------------------------------------------------------------

  const loaded = tab === 'Comment' ? commentsLoaded : likersLoaded;
  const loadingMore = tab === 'Comment' ? loadingMoreComments : loadingMoreLikers;
  const empty = loaded && (tab === 'Comment' ? threads.length === 0 : likers.length === 0);

  const emptyView = !loaded ? (
    <ActivityIndicator style={{ marginTop: px(40) }} color={ACCENT} />
  ) : empty ? (
    <View style={[styles.emptyWrap, { paddingTop: px(44), paddingHorizontal: px(40), gap: px(6) }]}>
      {tab === 'Comment' ? (
        <MessageCircle size={px(34)} color={SUBTLE} strokeWidth={1.5} />
      ) : (
        <Heart size={px(34)} color={SUBTLE} strokeWidth={1.5} />
      )}
      <Text style={[styles.emptyTitle, { fontSize: px(16) }]}>
        {tab === 'Comment' ? 'No comments yet' : 'No likes yet'}
      </Text>
      <Text style={[styles.emptyHint, { fontSize: px(13.5), lineHeight: px(20) }]}>
        {tab === 'Comment' ? 'Start the conversation.' : 'Be the first to like this moment.'}
      </Text>
    </View>
  ) : undefined;

  const listProps = {
    style: styles.list,
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    onEndReached,
    onEndReachedThreshold: 0.4,
    contentContainerStyle: { paddingBottom: px(24) },
    ListHeaderComponent: header,
    ListEmptyComponent: emptyView,
    ListFooterComponent: loadingMore ? (
      <ActivityIndicator style={{ marginVertical: px(16) }} color={ACCENT} />
    ) : undefined,
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={ACCENT}
        colors={[ACCENT]}
      />
    ),
  };

  const canSend = !sending && draft.trim().length > 0;
  const meAuthor: PostAuthor | null = me
    ? { uuid: me.uuid, guftagu_id: null, display_name: me.display_name, avatar_url: me.avatar_url, country: null }
    : null;

  return (
    // iOS lifts the composer off the keyboard with KeyboardAvoidingView. Android
    // is edge-to-edge, so the window does not resize and the keyboard would sit
    // on top of the composer: pad the bottom by its height instead, as the chat
    // screen does.
    <KeyboardAvoidingView
      style={[styles.screen, Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 16) + px(6), paddingHorizontal: px(8), paddingBottom: px(8) },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={[styles.backButton, { width: px(44), height: px(44) }]}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={px(24)} color={INK} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: px(18) }]}>Post Details</Text>
      </View>

      {tab === 'Comment' ? (
        <FlatList
          {...listProps}
          data={threads}
          keyExtractor={(t) => t.comment.uuid}
          renderItem={({ item }) => (
            <ThreadItem
              thread={item}
              open={openThreads.has(item.comment.uuid)}
              onToggle={() => toggleThread(item.comment.uuid)}
              onReply={startReply}
            />
          )}
        />
      ) : (
        <FlatList
          {...listProps}
          data={likers}
          keyExtractor={(l) => l.author.uuid}
          renderItem={({ item }) => <LikerItem liker={item} />}
        />
      )}

      <View
        style={[
          styles.composer,
          {
            paddingHorizontal: px(14),
            paddingTop: px(10),
            paddingBottom: keyboardVisible ? px(10) : Math.max(insets.bottom, px(10)) + px(4),
          },
        ]}
      >
        {replyTo ? (
          <View style={[styles.replyBanner, { paddingHorizontal: px(6), paddingBottom: px(8), gap: px(6) }]}>
            <Text numberOfLines={1} style={[styles.replyBannerLabel, { fontSize: px(13) }]}>
              Replying to <Text style={styles.commentName}>{replyTo.name}</Text>
            </Text>
            <Pressable
              onPress={() => {
                setReplyTo(null);
                setDraft('');
              }}
              hitSlop={10}
              accessibilityLabel="Cancel reply"
            >
              <X size={px(16)} color={SUBTLE} />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.composerRow, { gap: px(10) }]}>
          <View style={{ marginBottom: px(4) }}>
            <Avatar author={meAuthor} size={px(36)} />
          </View>
          <View
            style={[
              styles.field,
              { minHeight: px(44), borderRadius: px(22), paddingLeft: px(16), paddingRight: px(5), paddingBottom: px(5) },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={(text) => {
                if (isSubmittingRef.current) return;
                setDraft(text);
              }}
              multiline
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Add a comment…'}
              placeholderTextColor={SUBTLE}
              style={[
                styles.fieldInput,
                { fontSize: px(14.5), maxHeight: px(110), paddingTop: px(11), paddingBottom: px(6) },
              ]}
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              hitSlop={8}
              accessibilityLabel="Post comment"
              style={[
                styles.sendButton,
                {
                  width: px(34),
                  height: px(34),
                  borderRadius: px(17),
                  backgroundColor: canSend || sending ? ACCENT : '#FBE3D6',
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <SendHorizontal size={px(17)} color={canSend ? colors.white : ACCENT_TEXT} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  list: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  backButton: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: typography.fontFamily.semiBold, color: INK, marginLeft: 4 },

  body: { fontFamily: typography.fontFamily.regular, color: INK },
  thumb: { overflow: 'hidden', backgroundColor: colors.black },
  playWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: { fontFamily: typography.fontFamily.regular, color: SUBTLE },

  actions: { flexDirection: 'row', alignItems: 'center' },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: WASH,
  },
  actionPillLiked: { backgroundColor: ACCENT_WASH },
  actionLabel: { fontFamily: typography.fontFamily.medium },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  tabCell: { marginBottom: -1 },
  tabLabel: { fontFamily: typography.fontFamily.semiBold },
  tabRule: { height: 3, borderRadius: 2 },

  commentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  commentName: { fontFamily: typography.fontFamily.semiBold, color: INK },
  commentText: { fontFamily: typography.fontFamily.regular, color: INK },
  removed: { fontFamily: typography.fontFamily.regular, color: SUBTLE, fontStyle: 'italic' },
  commentMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontFamily: typography.fontFamily.regular, color: SUBTLE },
  metaAction: { fontFamily: typography.fontFamily.medium },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleRule: { height: 1.5, backgroundColor: '#B9B6B0' },
  spine: { position: 'absolute', bottom: 0, width: 1.5, backgroundColor: THREAD_LINE },
  elbow: {
    position: 'absolute',
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: THREAD_LINE,
  },

  likerRow: { flexDirection: 'row', alignItems: 'center' },

  emptyWrap: { alignItems: 'center' },
  emptyTitle: { fontFamily: typography.fontFamily.semiBold, color: INK },
  emptyHint: { fontFamily: typography.fontFamily.regular, color: SUBTLE, textAlign: 'center' },

  composer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
  },
  replyBanner: { flexDirection: 'row', alignItems: 'center' },
  replyBannerLabel: { flex: 1, fontFamily: typography.fontFamily.regular, color: SUBTLE },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: WASH,
  },
  fieldInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    color: INK,
    paddingHorizontal: 0,
  },
  sendButton: { alignItems: 'center', justifyContent: 'center' },
});
