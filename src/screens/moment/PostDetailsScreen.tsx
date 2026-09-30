import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, EllipsisVertical, Send, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import {
  AUTHOR,
  AuthorRow,
  BODY,
  avatarSource,
  BadgeStrip,
  badgeStrip,
  type FeedItem,
  FollowChip,
  MEDIA,
  MediaBlock,
  mediaBlockHeight,
  type PostAuthor,
  PostBody,
} from './parts';
import { usePostLike, usePostState } from './PostStateContext';

/**
 * Post Details — Figma nodes 77:799 and 86:919. One screen: the two frames are
 * the same layout with a different tab selected, Comment and Like. "Gift" is
 * the third tab and Figma draws only its label.
 *
 * It has no bottom bar and gets none — it is pushed over the tab shell.
 *
 * Every number is a design pixel on the 402x874 frame.
 */

/** What `GET /posts/{uuid}/comments` is asked for in one go. */
const COMMENT_PAGE = 10;

export const DETAIL_TABS = ['Comment', 'Like', 'Gift'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

const D = {
  // Node 77:889 — `flex gap-[9px] items-end` at (16, 83). The title's own x=33
  // is the arrow's 24 plus that gap, so a row reproduces it without an
  // absolutely positioned label that could wrap.
  header: { x: 16, y: 83, back: 24, gap: 9, titleSize: 18, titleHeight: 23 },
  author: { x: 17, y: 146 }, // node 77:805
  media: { x: 92, y: 216 }, // node 77:817
  /**
   * Figma draws no action row on this frame, only in the feed (node 73:736).
   * A post you have opened is the one you are most likely to like, so the
   * feed's own row sits between the date and the tabs, right-aligned to the
   * screen's margin and using the same 24px glyphs and 17/5 gaps.
   */
  actions: { y: 440, icon: 24, gap: 17, countGap: 5, size: 13, height: 24 },
  // Node 77:894 — `flex gap-[10px] items-end` at (16, 472). Figma sets the
  // selected label at 19 and the others at 17/34%; frame 86:919 leaves its
  // unselected "Comment" at 19, which the other three unselected labels and
  // 77:799 both contradict, so 17 is what a deselected tab uses here.
  tabs: { x: 16, y: 472, gap: 10, active: { size: 19, height: 24 }, idle: { size: 17, height: 22 } },
  // Node 82:903 — avatar 62, then a 92-wide column 9 past it.
    comments: {
      x: 16,
      y: 532,
      gap: 19,
      avatar: 62,
      columnX: 71,
      name: { size: 18, height: 23 }, // matches AUTHOR.name (18/23)
      badgeTop: 25,
      bodyTop: 49,
      body: { size: 17, height: 22 }, // node 77:897
      metaTop: 75, // below name + badge + body
      ago: { size: 15, height: 19 }, // node 77:898
      reply: { x: 57, size: 14, height: 18 }, // node 82:900
      height: 95,
    },
  /** A reply is the comment row, pushed in far enough to read as beneath it. */
  replyIndent: 40,
  /** The "Replying to X" line that appears above the composer. */
  replyBanner: { y: 748, size: 13, height: 18, close: 16, gap: 6 },
  /**
   * Node 93:973 — `flex-col gap-[19px]` at (16, 527). Figma's two rows are not
   * the same shape (62/95 then 66/92); a list of the same thing should be, so
   * every row uses the app's standard author row.
   */
  likes: { x: 16, y: 527, gap: 19 },
  /**
   * Node 82:913 sits at (16, 774) and is 273 wide, which left the like control
   * beside it ending at 346 and 56px of dead space after that against a 16px
   * margin on the left. The row now spans the screen's own 16px margins: the
   * send button is flush right and the field takes everything up to Figma's own
   * 16px gap before it, so `width` is derived rather than fixed.
   */
  margin: 16,
  field: { y: 774, height: 51, radius: 24, textX: 25, textY: 15, size: 17, lineHeight: 22 },
  /**
   * Figma puts a like control beside the comment box (node 82:915). The comment
   * box had no way to send what you typed, so that slot holds a send button
   * instead — a 41px disc, the same shape and colour as the Moment header's "+"
   * and the compose screen's Post pill, centred on the field.
   */
  send: { size: 41, icon: 21, gap: 16 },
  /**
   * The composer is a bar pinned to the bottom of the screen, not a thing at
   * y=774 — the comment list is as long as the post is popular and has to scroll
   * under it. `bottom` is the space the frame leaves below the field
   * (874 - 774 - 51); `top` is the breathing room above it.
   */
  composer: { top: 12, bottom: 49 },
  /** The 402x874 frame's own width, which the composer row is measured off. */
  width: 402,
  canvas: 874,
} as const;

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

/** Node 77:898 renders "1hr ago" from the comment's timestamp. */
function timeAgo(iso: string | null) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}hr ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const commenterAvatar = require('../../assets/home/moment-commenter.png');

function CommentRow({
  comment,
  top,
  indent,
  onReply,
}: {
  comment: Comment;
  top: number;
  indent: number;
  onReply: () => void;
}) {
  const { px } = useDesignScale();
  const c = D.comments;

  return (
    <View
      style={{
        position: 'absolute',
        left: px(c.x + indent),
        top: px(top),
        right: px(c.x),
        height: px(c.height),
      }}
    >
      <Image
        source={
          comment.author?.avatar_url ? { uri: comment.author.avatar_url } : commenterAvatar
        }
        style={{
          position: 'absolute',
          width: px(c.avatar),
          height: px(c.avatar),
          borderRadius: px(c.avatar / 2),
        }}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.commentName,
          {
            left: px(c.columnX),
            top: 0,
            fontSize: px(c.name.size),
            lineHeight: px(c.name.height),
          },
        ]}
      >
        {comment.author?.display_name ?? 'Guftagu user'}
      </Text>
      <BadgeStrip left={c.columnX} top={c.badgeTop} />
      <Text
        style={[
          styles.commentBody,
          {
            left: px(c.columnX),
            top: px(c.bodyTop),
            fontSize: px(c.body.size),
            lineHeight: px(c.body.height),
          },
        ]}
      >
        {comment.is_deleted ? 'Comment removed' : comment.body}
      </Text>
      <View
        style={{
          position: 'absolute',
          left: px(c.columnX),
          top: px(c.metaTop),
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text
          style={[styles.commentAgo, { fontSize: px(c.ago.size), lineHeight: px(c.ago.height) }]}
        >
          {timeAgo(comment.created_at)}
        </Text>
        {/* Figma sets "Reply" at x=57 inside the column; the gap that works out
            to survives the wider substitute font, the offset would not. */}
        <Pressable onPress={onReply} hitSlop={8} style={{ marginLeft: px(9) }}>
          <Text
            style={[
              styles.commentReply,
              { fontSize: px(c.reply.size), lineHeight: px(c.reply.height) },
            ]}
          >
            Reply
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type Liker = { author: PostAuthor };

/** Node 93:972 / 86:963 — one liker, as the app's standard author row. */
function LikeRow({ liker, top }: { liker: Liker; top: number }) {
  const { px } = useDesignScale();
  const { avatar, name } = AUTHOR;

  return (
    <View
      style={{
        position: 'absolute',
        left: px(D.likes.x),
        top: px(top),
        right: px(D.likes.x),
        height: px(AUTHOR.height),
      }}
    >
      <Image
        source={avatarSource(liker)}
        style={{
          position: 'absolute',
          width: px(avatar.size),
          height: px(avatar.size),
          borderRadius: px(avatar.size / 2),
        }}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.likeName,
          {
            left: px(name.x),
            top: px(name.y),
            right: 0,
            fontSize: px(name.size),
            lineHeight: px(name.height),
          },
        ]}
      >
        {liker.author.display_name ?? 'Guftagu user'}
      </Text>
      <BadgeStrip left={name.x} top={name.y + name.height + name.gap} />
    </View>
  );
}

type Gifter = { author: PostAuthor };

/** One gifter, matching the author row layout with badges below name. */
function GiftRow({ gifter, top }: { gifter: Gifter; top: number }) {
  const { px } = useDesignScale();
  const { avatar, name } = AUTHOR;

  return (
    <View
      style={{
        position: 'absolute',
        left: px(D.likes.x),
        top: px(top),
        right: px(D.likes.x),
        height: px(AUTHOR.height),
      }}
    >
      <Image
        source={avatarSource(gifter)}
        style={{
          position: 'absolute',
          width: px(avatar.size),
          height: px(avatar.size),
          borderRadius: px(avatar.size / 2),
        }}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.likeName,
          {
            left: px(name.x),
            top: px(name.y),
            right: 0,
            fontSize: px(name.size),
            lineHeight: px(name.height),
          },
        ]}
      >
        {gifter.author.display_name ?? 'Guftagu user'}
      </Text>
      <BadgeStrip left={name.x} top={name.y + name.height + name.gap} />
    </View>
  );
}

type DetailsNavigation = NativeStackNavigationProp<RootStackParamList, 'PostDetails'>;
type DetailsRoute = RouteProp<RootStackParamList, 'PostDetails'>;

export default function PostDetailsScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<DetailsNavigation>();
  const route = useRoute<DetailsRoute>();
  const { token } = useAuth();
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
  /**
   * Figma's y offsets are drawn around one 180-tall thumbnail. A post carrying
   * a grid of them shifts everything below it by the difference.
   */
  const grew = mediaBlockHeight(post, D.media.x) - MEDIA.height;
  /**
   * The words the post was written with, above the thumbnails. Unclamped here —
   * this is the screen you open to read the whole of it — so how tall it is has
   * to be measured before anything under it can be placed.
   */
  const body = post.body?.trim();
  const [bodyHeight, setBodyHeight] = useState(body ? BODY.lineHeight : 0);
  const bodyBlock = body ? bodyHeight + BODY.gap : 0;
  /** Everything below the thumbnails moves by both together. */
  const shift = grew + bodyBlock;

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);
  const headerY = topInset + 8;
  const topShift = D.header.y - headerY;

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
  const [gifters, setGifters] = useState<Gifter[]>([]);
  const [giftersLoaded, setGiftersLoaded] = useState(true);
  const [giftersNextCursor, setGiftersNextCursor] = useState<string | null>(null);
  const [hasMoreGifters, setHasMoreGifters] = useState(false);
  const [loadingMoreGifters, setLoadingMoreGifters] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [following, setFollowing] = useState(route.params.following ?? false);
  const [followBusy, setFollowBusy] = useState(false);
  // The same counts the feed row shows — see PostStateContext.
  const { liked, likeCount, commentCount, toggle: toggleLike } = usePostLike(post);
  const { setCommentCount, setLiked, setLikeCount } = usePostState();
  const [replyTo, setReplyTo] = useState<{ parentUuid: string; name: string } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<TextInput>(null);
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
          setComments(validComments);
          setCommentsNextCursor(commentsRes.meta?.next_cursor ?? null);
          setHasMoreComments(Boolean(commentsRes.meta?.has_more));
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
        }
      } catch {
        /* quiet fail */
      } finally {
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
    refreshDetails(true);
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
        /* same: nothing to show is what a failure leaves */
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
   * Comments arrive flat, oldest first, each carrying `parent_uuid`. This puts
   * every reply under the comment it answers; a reply whose parent is on a
   * later page still shows, indented, rather than vanishing.
   */
  const thread = useMemo(() => {
    const repliesOf = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parent_uuid) continue;
      repliesOf.set(c.parent_uuid, [...(repliesOf.get(c.parent_uuid) ?? []), c]);
    }

    const topComments = comments.filter((c) => !c.parent_uuid);
    // Sort latest first (descending by created_at)
    topComments.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    const rows: { comment: Comment; indent: number }[] = [];
    for (const top of topComments) {
      rows.push({ comment: top, indent: 0 });
      const replies = repliesOf.get(top.uuid) ?? [];
      replies.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
      for (const reply of replies) {
        rows.push({ comment: reply, indent: D.replyIndent });
      }
    }

    const placed = new Set(rows.map((r) => r.comment.uuid));
    const orphaned = comments.filter((c) => !placed.has(c.uuid));
    orphaned.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
    for (const c of orphaned) {
      rows.push({ comment: c, indent: D.replyIndent });
    }
    return rows;
  }, [comments]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;

    // Immediately clear input, dismiss keyboard, and reply banner like Facebook / Instagram
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
          body: currentReplyTo ? { body, parent_uuid: currentReplyTo.parentUuid } : { body },
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
      api<Comment[]>(`/posts/${post.uuid}/comments?limit=${COMMENT_PAGE}`, {
        token,
      })
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
    setFollowBusy(true);
    setFollowing(next);
    try {
      await api(`/users/${author.uuid}/follow`, { method: next ? 'POST' : 'DELETE', token });
    } catch {
      setFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  }, [following, post.author, token]);

  /**
   * The scroll canvas is whichever is taller: the base screen height minus composer,
   * or the list plus comfortable bottom spacing so the last item is clearly visible.
   */
  const baseCanvas = D.canvas - (D.composer.top + D.field.height + D.composer.bottom);
  const listBottom =
    tab === 'Comment'
      ? D.comments.y + shift + thread.length * (D.comments.height + D.comments.gap) + (loadingMoreComments ? 40 : 0)
      : tab === 'Like'
        ? D.likes.y + shift + likers.length * (AUTHOR.height + D.likes.gap) + (loadingMoreLikers ? 40 : 0)
        : D.likes.y + shift + gifters.length * (AUTHOR.height + D.likes.gap);
  const canvas = Math.max(baseCanvas, listBottom + D.comments.gap);

  return (
    // Android resizes the window (softwareKeyboardLayoutMode: "resize"),
    // while iOS lifts the composer off the keyboard with KeyboardAvoidingView.
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 100;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            if (tab === 'Comment' && hasMoreComments && !loadingMoreComments) {
              loadMoreComments();
            } else if (tab === 'Like' && hasMoreLikers && !loadingMoreLikers) {
              loadMoreLikers();
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
          />
        }
        contentContainerStyle={{ height: px(canvas - topShift) }}
      >
        <View style={{ position: 'relative', top: -px(topShift), height: px(canvas) }}>
          {/* Node 77:889 */}
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[styles.header, { left: px(D.header.x), top: px(D.header.y), gap: px(D.header.gap) }]}
          >
          <ArrowLeft size={px(D.header.back)} color={colors.black} />
          <Text
            numberOfLines={1}
            style={[
              styles.headerTitle,
              { fontSize: px(D.header.titleSize), lineHeight: px(D.header.titleHeight) },
            ]}
          >
            Post Details
          </Text>
        </Pressable>

        <AuthorRow
          post={post}
          left={D.author.x}
          top={D.author.y}
          trailing={
            fromFollowing ? (
              // Node 96:1238 — the overflow dots, exactly as the Following feed
              // draws them in the chip's place.
              <EllipsisVertical size={px(D.actions.icon)} color={colors.black} />
            ) : (
              <FollowChip following={following} busy={followBusy} onPress={toggleFollow} />
            )
          }
        />

        {body ? (
          <PostBody text={body} left={D.media.x} top={D.media.y} onHeight={setBodyHeight} />
        ) : null}

        <MediaBlock
          post={post}
          left={D.media.x}
          top={D.media.y + bodyBlock}
          onPress={(index) => {
            const urls = post.media_urls ?? [];
            if (urls.length > 0) {
              navigation.navigate('MediaViewer', { urls, index });
            }
          }}
        />

        {/* The feed's own action row (node 73:736), brought onto this frame so
            an opened post can be liked. Right-aligned to the screen margin. */}
        <View
          style={[
            styles.postActions,
            {
              left: px(D.margin),
              right: px(D.margin),
              top: px(D.actions.y + shift),
              gap: px(D.actions.gap),
            },
          ]}
        >
          <SvgXml
            xml={icons.momentRedo}
            width={px(D.actions.icon)}
            height={px(D.actions.icon)}
          />
          <View style={[styles.actionItem, { gap: px(D.actions.countGap) }]}>
            <SvgXml
              xml={icons.momentChatDots}
              width={px(D.actions.icon)}
              height={px(D.actions.icon)}
            />
            <Text
              style={[
                styles.actionCount,
                { fontSize: px(D.actions.size), lineHeight: px(D.actions.height) },
              ]}
            >
              {commentCount}
            </Text>
          </View>
          <Pressable
            onPress={toggleLike}
            hitSlop={8}
            style={[styles.actionItem, { gap: px(D.actions.countGap) }]}
          >
            <SvgXml
              xml={icons.momentThumbsUp}
              color={liked ? colors.postButton : colors.momentCount}
              width={px(D.actions.icon)}
              height={px(D.actions.icon)}
            />
            <Text
              style={[
                styles.actionCount,
                {
                  color: liked ? colors.postButton : colors.momentCount,
                  fontSize: px(D.actions.size),
                  lineHeight: px(D.actions.height),
                },
              ]}
            >
              {likeCount}
            </Text>
          </Pressable>
        </View>

        {/* Node 77:894 */}
        <View
          style={[
            styles.tabs,
            { left: px(D.tabs.x), top: px(D.tabs.y + shift), gap: px(D.tabs.gap) },
          ]}
        >
          {DETAIL_TABS.map((name) => {
            const active = name === tab;
            return (
              <Pressable key={name} onPress={() => setTab(name)}>
                <Text
                  style={[
                    styles.tab,
                    {
                      opacity: active ? 1 : 0.34,
                      fontSize: px(active ? D.tabs.active.size : D.tabs.idle.size),
                      lineHeight: px(active ? D.tabs.active.height : D.tabs.idle.height),
                    },
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'Comment'
          ? thread.map(({ comment, indent }, index) => (
              <CommentRow
                key={comment.uuid}
                comment={comment}
                indent={indent}
                top={D.comments.y + shift + index * (D.comments.height + D.comments.gap)}
                onReply={() => {
                  setReplyTo({
                    parentUuid: comment.parent_uuid ?? comment.uuid,
                    name: comment.author?.display_name ?? 'Guftagu user',
                  });
                  inputRef.current?.focus();
                }}
              />
            ))
          : null}

        {tab === 'Comment' && loadingMoreComments ? (
          <ActivityIndicator
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: px(D.comments.y + shift + thread.length * (D.comments.height + D.comments.gap) + 8),
            }}
            color={colors.postButton}
          />
        ) : null}

        {tab === 'Like'
          ? likers.map((liker, index) => (
              <LikeRow
                key={liker.author.uuid}
                liker={liker}
                top={D.likes.y + shift + index * (AUTHOR.height + D.likes.gap)}
              />
            ))
          : null}

        {tab === 'Like' && loadingMoreLikers ? (
          <ActivityIndicator
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: px(D.likes.y + shift + likers.length * (AUTHOR.height + D.likes.gap) + 8),
            }}
            color={colors.postButton}
          />
        ) : null}

        {tab === 'Gift'
          ? gifters.map((gifter, index) => (
              <GiftRow
                key={gifter.author.uuid ?? index}
                gifter={gifter}
                top={D.likes.y + shift + index * (AUTHOR.height + D.likes.gap)}
              />
            ))
          : null}

        {/* Neither list has anything of its own to fall back on, so say which
            it is: still asking, or asked and there is nothing. */}
        {tab !== 'Gift' && !(tab === 'Comment' ? commentsLoaded : likersLoaded) ? (
          <ActivityIndicator
            style={{ position: 'absolute', left: 0, right: 0, top: px(D.comments.y + shift) }}
            color={colors.black}
          />
        ) : null}

        {tab === 'Comment' && commentsLoaded && thread.length === 0 ? (
          <Text style={[styles.empty, {
              left: px(D.margin),
              right: px(D.margin),
              fontSize: px(BODY.size),
              lineHeight: px(BODY.lineHeight),
              top: px(D.comments.y + shift),
            }]}>
            No comments yet.
          </Text>
        ) : null}

        {tab === 'Like' && likersLoaded && likers.length === 0 ? (
          <Text style={[styles.empty, {
              left: px(D.margin),
              right: px(D.margin),
              fontSize: px(BODY.size),
              lineHeight: px(BODY.lineHeight),
              top: px(D.likes.y + shift),
            }]}>
            No likes yet.
          </Text>
        ) : null}

        {tab === 'Gift' && giftersLoaded && gifters.length === 0 ? (
          <Text style={[styles.empty, {
              left: px(D.margin),
              right: px(D.margin),
              fontSize: px(BODY.size),
              lineHeight: px(BODY.lineHeight),
              top: px(D.likes.y + shift),
            }]}>
            No gifts yet.
          </Text>
        ) : null}

        </View>
      </ScrollView>

      {/* The composer sits outside the scroll view in flow: the ScrollView
          takes all available space above it, so comments never get cut off
          or hidden behind the input bar. */}
      <View
        style={[
          styles.composer,
          {
            paddingHorizontal: px(D.margin),
            paddingTop: px(D.composer.top),
            paddingBottom: px(keyboardVisible ? D.composer.top : D.composer.bottom),
            gap: px(D.composer.top),
          },
        ]}
      >
        {replyTo ? (
          <View style={[styles.replyBanner, { gap: px(D.replyBanner.gap) }]}>
            <Text
              numberOfLines={1}
              style={[
                styles.replyBannerLabel,
                { fontSize: px(D.replyBanner.size), lineHeight: px(D.replyBanner.height) },
              ]}
            >
              Replying to {replyTo.name}
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
              <X size={px(D.replyBanner.close)} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.composerRow, { gap: px(D.send.gap) }]}>
          {/* Node 82:913 */}
          <View
            style={[
              styles.field,
              { height: px(D.field.height), borderRadius: px(D.field.radius) },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={(text) => {
                if (isSubmittingRef.current) return;
                setDraft(text);
              }}
              onSubmitEditing={send}
              returnKeyType="send"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
              placeholder={replyTo ? `Reply to ${replyTo.name}` : 'Comment'}
              placeholderTextColor={colors.postPlaceholder}
              style={[
                styles.fieldInput,
                {
                  left: px(D.field.textX),
                  right: px(D.field.textX),
                  top: px(D.field.textY),
                  fontSize: px(D.field.size),
                  lineHeight: px(D.field.lineHeight),
                },
              ]}
            />
          </View>

          {/* Sends what is in the box; see `D.send`. */}
          <Pressable
            onPress={send}
            disabled={sending || draft.trim().length === 0}
            style={[
              styles.sendButton,
              {
                width: px(D.send.size),
                height: px(D.send.size),
                borderRadius: px(D.send.size / 2),
                opacity: sending || draft.trim().length === 0 ? 0.45 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Send size={px(D.send.icon)} color={colors.white} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  tabs: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  commentName: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  commentBody: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  commentAgo: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    opacity: 0.4,
  },
  commentReply: {
    fontFamily: typography.fontFamily.regular,
    color: colors.commentReply,
  },
  likeName: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  postActions: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    flexShrink: 0,
    fontFamily: typography.fontFamily.regular,
    color: colors.momentCount,
  },
  empty: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    color: colors.momentCount,
  },
  scrollView: {
    flex: 1,
  },
  composer: {
    backgroundColor: colors.white,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBannerLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  field: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.postFieldBorder,
  },
  fieldInput: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    padding: 0,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.postButton,
  },
});
