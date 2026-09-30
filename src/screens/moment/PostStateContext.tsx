import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { FeedItem } from './parts';

/**
 * The like and comment counts a post is showing right now.
 *
 * The feed and Post Details draw the same post from two different copies of it:
 * the feed's row comes from `GET /feed`, and Details gets that row handed to it
 * as a route param and then fetches its own comments. Liking in one left the
 * other still showing the old number, because neither knew about the other.
 *
 * So the counts live here instead, keyed by post, above both screens. A post's
 * own fields are the starting point; anything that happens to it afterwards is
 * recorded over the top, and every screen reads the same answer.
 */
type PostState = { liked: boolean; likeCount: number; commentCount: number };

type Store = {
  state: (post: FeedItem) => PostState;
  setLiked: (uuid: string, liked: boolean) => void;
  setLikeCount: (uuid: string, count: number) => void;
  setCommentCount: (uuid: string, count: number) => void;
  bumpCommentCount: (uuid: string, by: number) => void;
};

const PostStateContext = createContext<Store | null>(null);

export function PostStateProvider({ children }: { children: ReactNode }) {
  const [edits, setEdits] = useState<Record<string, Partial<PostState>>>({});

  const state = useCallback(
    (post: FeedItem): PostState => {
      const edit = edits[post.uuid];
      const liked = edit?.liked ?? post.liked_by_me ?? false;
      const likedChanged = edit?.liked !== undefined && edit.liked !== (post.liked_by_me ?? false);

      const rawPostLike = Number(post.like_count);
      const postLikeCount = Number.isFinite(rawPostLike) ? rawPostLike : 0;
      const rawEditLike = edit?.likeCount !== undefined ? Number(edit.likeCount) : undefined;
      const editLikeCount =
        rawEditLike !== undefined && Number.isFinite(rawEditLike) ? rawEditLike : undefined;

      const baseCount = editLikeCount !== undefined ? editLikeCount : postLikeCount;
      const computedLike =
        editLikeCount !== undefined
          ? editLikeCount
          : baseCount + (likedChanged ? (liked ? 1 : -1) : 0);

      const rawPostComment = Number(post.comment_count);
      const postCommentCount = Number.isFinite(rawPostComment) ? rawPostComment : 0;
      const rawEditComment =
        edit?.commentCount !== undefined ? Number(edit.commentCount) : undefined;
      const editCommentCount =
        rawEditComment !== undefined && Number.isFinite(rawEditComment)
          ? rawEditComment
          : undefined;

      const computedComment =
        editCommentCount !== undefined ? editCommentCount : postCommentCount;

      return {
        liked,
        likeCount: Math.max(0, Number.isFinite(computedLike) ? computedLike : 0),
        commentCount: Math.max(0, Number.isFinite(computedComment) ? computedComment : 0),
      };
    },
    [edits],
  );

  const setLiked = useCallback((uuid: string, liked: boolean) => {
    setEdits((e) => ({ ...e, [uuid]: { ...e[uuid], liked } }));
  }, []);

  const setLikeCount = useCallback((uuid: string, count: number) => {
    const num = Number(count);
    if (!Number.isFinite(num)) return;
    setEdits((e) => ({ ...e, [uuid]: { ...e[uuid], likeCount: Math.max(0, num) } }));
  }, []);

  const setCommentCount = useCallback((uuid: string, count: number) => {
    const num = Number(count);
    if (!Number.isFinite(num)) return;
    setEdits((e) => ({ ...e, [uuid]: { ...e[uuid], commentCount: Math.max(0, num) } }));
  }, []);

  const bumpCommentCount = useCallback((uuid: string, by: number) => {
    const numBy = Number(by);
    if (!Number.isFinite(numBy)) return;
    setEdits((e) => ({
      ...e,
      [uuid]: {
        ...e[uuid],
        commentCount: Math.max(0, (e[uuid]?.commentCount ?? 0) + numBy),
      },
    }));
  }, []);

  const value = useMemo(
    () => ({ state, setLiked, setLikeCount, setCommentCount, bumpCommentCount }),
    [state, setLiked, setLikeCount, setCommentCount, bumpCommentCount],
  );

  return <PostStateContext.Provider value={value}>{children}</PostStateContext.Provider>;
}

export function usePostState(): Store {
  const store = useContext(PostStateContext);
  if (!store) throw new Error('usePostState must be used inside <PostStateProvider>');
  return store;
}

/**
 * One post's counts plus the one way to change them, so the feed's thumbs-up
 * and the details screen's thumbs-up are the same button in two places.
 */
export function usePostLike(post: FeedItem) {
  const { state, setLiked, setLikeCount } = usePostState();
  const { token } = useAuth();
  const { liked, likeCount, commentCount } = state(post);

  const toggle = useCallback(async () => {
    const next = !liked;
    setLiked(post.uuid, next);
    try {
      const res = await api<{ post: FeedItem }>(`/posts/${post.uuid}/like`, {
        method: next ? 'POST' : 'DELETE',
        token,
      });
      const data = res?.post ?? (res as any as FeedItem | undefined);
      if (data) {
        if (typeof data.liked_by_me === 'boolean') setLiked(post.uuid, data.liked_by_me);
        if (typeof data.like_count === 'number' && Number.isFinite(data.like_count)) {
          setLikeCount(post.uuid, data.like_count);
        }
      }
    } catch {
      // Put it back rather than leave the count claiming something untrue.
      setLiked(post.uuid, !next);
    }
  }, [liked, post.uuid, setLiked, setLikeCount, token]);

  return { liked, likeCount, commentCount, toggle };
}
