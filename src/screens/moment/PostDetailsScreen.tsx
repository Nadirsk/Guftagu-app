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
import {
  avatarSource,
  badgeStrip,
  type FeedItem,
  formatStamp,
  isVideoUrl,
  type PostAuthor,
} from './parts';
import { usePostLike, usePostState } from './PostStateContext';

/**
 * Post Details — one screen, two tabs (Comments, Likes).
 *
 * Figma draws it as a fixed 402x874 frame with absolutely placed rows, which
 * cannot hold a long post or a comment that wraps. This is a flowing list: the
 * post is the list's header, comments and likes are its rows, and the composer
 * is pinned underneath. Comments nest Instagram-style — a top-level comment,
 * its replies tucked behind "View N replies".
 *
 * Every number is a design pixel on the 402-wide frame, scaled by `px`.
 */

/** What `GET /posts/{uuid}/comments` is asked for in one go. */
const COMMENT_PAGE = 10;

export const DETAIL_TABS = ['Comment', 'Like'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

const TAB_LABEL: Record<DetailTab, string> = { Comment: 'Comments', Like: 'Likes' };

const INK = '#141417';
const SUBTLE = '#767680';
const HAIRLINE = 'rgba(20,20,23,0.08)';
const WASH = '#F5F5F7';
const ACCENT_WASH = 'rgba(222,66,0,0.08)';

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
    <Image
      source={avatarSource({ author })}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: WASH }}
    />
  );
}

/** The level pill and heart, drawn as the app's one flattened bitmap (73:16). */
function Badges({ width }: { width: number }) {
  return (
    <Image
      source={badgeStrip}
      resizeMode="contain"
      style={{ width, height: (width * 16) / 73, alignSelf: 'flex-start' }}
    />
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
    <View style={[styles.commentRow, { gap: px(11), marginTop: px(reply ? 14 : 18) }]}>
      <Avatar author={comment.author} size={avatar} />
      <View style={{ flex: 1 }}>
        {comment.is_deleted ? (
          <Text style={[styles.removed, { fontSize: px(14), lineHeight: px(20) }]}>
            This comment was removed
          </Text>
        ) : (
          <Text style={[styles.commentText, { fontSize: px(14.5), lineHeight: px(21) }]}>
            <Text style={styles.commentName}>{name}</Text>
            {'  '}
            {comment.body}
          </Text>
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

  return (
    <View style={{ paddingHorizontal: px(18) }}>
      <CommentItem comment={thread.comment} onReply={() => onReply(thread.comment)} />

      {count > 0 ? (
        <View style={{ marginLeft: px(38 + 11) }}>
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

          {open
            ? thread.replies.map((r) => (
                <CommentItem key={r.uuid} comment={r} reply onReply={() => onReply(r)} />
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

function LikerItem({ liker }: { liker: Liker }) {
  const { px } = useDesignScale();

  return (
    <View style={[styles.likerRow, { paddingHorizontal: px(18), paddingVertical: px(9), gap: px(12) }]}>
      <Avatar author={liker.author} size={px(46)} />
      <View style={{ flex: 1, gap: px(3) }}>
        <Text numberOfLines={1} style={[styles.commentName, { fontSize: px(15) }]}>
          {liker.author.display_name ?? 'Guftagu user'}
        </Text>
        <Badges width={px(70)} />
      </View>
      <Heart size={px(18)} color={colors.postButton} fill={colors.postButton} />
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
   * Which feed this was opened from. The Following tab hides the Follow pill
   * because everyone there is already followed, so the detail must not offer it.
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
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
          // Merge, so a poll does not throw away pages already scrolled in.
          setComments((prev) => {
            const map = new Map<string, Comment>();
            for (const c of prev) map.set(c.uuid, c);
            for (const c of validComments) map.set(c.uuid, c);
            return quiet ? Array.from(map.values()) : validComments;
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

  const gutter = px(18);
  const urls = post.media_urls ?? [];
  const mediaWidth = windowWidth - gutter * 2;
  const gridGap = px(4);
  const columns = urls.length === 2 || urls.length === 4 ? 2 : 3;
  const tile = (mediaWidth - gridGap * (columns - 1)) / columns;
  const stamp = formatStamp(post.created_at, post.author?.country ?? null);
  const isMine = post.author?.uuid === me?.uuid;
  const showFollow = !isMine && following !== null && !fromFollowing;

  const mediaThumb = (url: string, index: number, width: number, height: number) => (
    <Pressable
      key={`${url}-${index}`}
      onPress={() => navigation.navigate('MediaViewer', { urls, index })}
      style={[styles.thumb, { width, height, borderRadius: px(urls.length === 1 ? 16 : 10) }]}
    >
      <Image source={{ uri: url }} style={{ width, height }} />
      {isVideoUrl(url) || post.type === 'audio' ? (
        <View style={styles.playWrap}>
          <View style={[styles.playDisc, { width: px(46), height: px(46), borderRadius: px(23) }]}>
            <Play size={px(20)} color={colors.white} fill={colors.white} strokeWidth={0} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );

  const header = (
    <View>
      <View style={[styles.authorRow, { paddingHorizontal: gutter, paddingTop: px(14), gap: px(12) }]}>
        <Avatar author={post.author} size={px(50)} />
        <View style={{ flex: 1, gap: px(3) }}>
          <Text numberOfLines={1} style={[styles.authorName, { fontSize: px(16.5) }]}>
            {post.author?.display_name ?? 'Guftagu user'}
          </Text>
          <Badges width={px(76)} />
        </View>
        {showFollow ? (
          <Pressable
            onPress={toggleFollow}
            disabled={followBusy}
            style={[
              styles.followPill,
              following ? styles.followPillOn : styles.followPillOff,
              { paddingHorizontal: px(18), height: px(34), opacity: followBusy ? 0.6 : 1 },
            ]}
          >
            <Text
              style={[styles.followLabel, { fontSize: px(13.5) }, following ? { color: INK } : null]}
            >
              {following ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {body ? (
        <Text
          selectable
          style={[styles.body, { marginHorizontal: gutter, marginTop: px(14), fontSize: px(16.5), lineHeight: px(25) }]}
        >
          {body}
        </Text>
      ) : null}

      {urls.length === 1 ? (
        <View style={{ marginHorizontal: gutter, marginTop: px(14) }}>
          {mediaThumb(urls[0], 0, mediaWidth, mediaWidth * 0.78)}
        </View>
      ) : urls.length > 1 ? (
        <View style={[styles.grid, { marginHorizontal: gutter, marginTop: px(14), gap: gridGap }]}>
          {urls.map((u, i) => mediaThumb(u, i, tile, tile))}
        </View>
      ) : null}

      <Text style={[styles.stamp, { marginHorizontal: gutter, marginTop: px(12), fontSize: px(12.5) }]}>
        {stamp.date} {stamp.time}
      </Text>

      <View style={[styles.actions, { marginHorizontal: gutter, marginTop: px(14), gap: px(10) }]}>
        <Pressable
          onPress={toggleLike}
          hitSlop={6}
          style={[
            styles.actionPill,
            liked ? styles.actionPillLiked : null,
            { height: px(40), paddingHorizontal: px(16), gap: px(7) },
          ]}
        >
          <Heart
            size={px(19)}
            color={liked ? colors.postButton : INK}
            fill={liked ? colors.postButton : 'transparent'}
          />
          <Text style={[styles.actionLabel, { fontSize: px(14), color: liked ? colors.postButton : INK }]}>
            {likeCount}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setTab('Comment');
            inputRef.current?.focus();
          }}
          hitSlop={6}
          style={[styles.actionPill, { height: px(40), paddingHorizontal: px(16), gap: px(7) }]}
        >
          <MessageCircle size={px(19)} color={INK} />
          <Text style={[styles.actionLabel, { fontSize: px(14), color: INK }]}>{commentCount}</Text>
        </Pressable>
      </View>

      <View style={[styles.tabBar, { marginTop: px(18), paddingHorizontal: gutter }]}>
        {DETAIL_TABS.map((name) => {
          const active = name === tab;
          return (
            <Pressable key={name} onPress={() => setTab(name)} style={styles.tabCell}>
              <Text
                style={[
                  styles.tabLabel,
                  { fontSize: px(15), paddingVertical: px(12), color: active ? INK : SUBTLE },
                ]}
              >
                {TAB_LABEL[name]} {name === 'Comment' ? commentCount : likeCount}
              </Text>
              <View
                style={[styles.tabRule, { backgroundColor: active ? colors.postButton : 'transparent' }]}
              />
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
    <ActivityIndicator style={{ marginTop: px(40) }} color={colors.postButton} />
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
  ) : null;

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
      <ActivityIndicator style={{ marginVertical: px(16) }} color={colors.postButton} />
    ) : null,
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.postButton}
        colors={[colors.postButton]}
      />
    ),
  };

  const canSend = !sending && draft.trim().length > 0;

  return (
    // Android resizes the window (softwareKeyboardLayoutMode: "resize"),
    // while iOS lifts the composer off the keyboard with KeyboardAvoidingView.
    <KeyboardAvoidingView
      style={styles.screen}
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
          style={[styles.backButton, { width: px(40), height: px(40) }]}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={px(24)} color={INK} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: px(18) }]}>Post</Text>
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
            >
              <X size={px(16)} color={SUBTLE} />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.composerRow, { gap: px(10) }]}>
          <Avatar author={me ? { uuid: '', guftagu_id: null, display_name: me.display_name, avatar_url: me.avatar_url, country: null } : null} size={px(36)} />
          <View style={[styles.field, { minHeight: px(44), borderRadius: px(22), paddingLeft: px(16), paddingRight: px(6) }]}>
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
                { fontSize: px(15), maxHeight: px(110), paddingVertical: px(11) },
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
                  backgroundColor: canSend || sending ? colors.postButton : ACCENT_WASH,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <SendHorizontal size={px(17)} color={canSend ? colors.white : colors.postButton} />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  backButton: { alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: typography.fontFamily.semiBold, color: INK, marginLeft: 4 },

  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontFamily: typography.fontFamily.semiBold, color: INK },
  followPill: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  followPillOff: { backgroundColor: colors.postButton },
  followPillOn: { backgroundColor: WASH },
  followLabel: { fontFamily: typography.fontFamily.medium, color: colors.white },

  body: { fontFamily: typography.fontFamily.regular, color: INK },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  thumb: { overflow: 'hidden', backgroundColor: WASH },
  playWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingLeft: 3,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HAIRLINE,
  },
  tabCell: { marginRight: 24 },
  tabLabel: { fontFamily: typography.fontFamily.medium },
  tabRule: { height: 2.5, borderRadius: 2 },

  commentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  commentName: { fontFamily: typography.fontFamily.semiBold, color: INK },
  commentText: { fontFamily: typography.fontFamily.regular, color: INK },
  removed: { fontFamily: typography.fontFamily.regular, color: SUBTLE, fontStyle: 'italic' },
  commentMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontFamily: typography.fontFamily.regular, color: SUBTLE },
  metaAction: { fontFamily: typography.fontFamily.medium },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleRule: { height: StyleSheet.hairlineWidth, backgroundColor: SUBTLE },

  likerRow: { flexDirection: 'row', alignItems: 'center' },

  emptyWrap: { alignItems: 'center' },
  emptyTitle: { fontFamily: typography.fontFamily.semiBold, color: INK },
  emptyHint: { fontFamily: typography.fontFamily.regular, color: SUBTLE, textAlign: 'center' },

  composer: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    padding: 0,
  },
  sendButton: { alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
});
