import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/chats/icons';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { LIST } from './geometry';
import type { AvatarFrame } from '../../components/UserAvatar';

const avatarPlaceholder = require('../../assets/avatar-placeholder.png');
export const emptyArt = require('../../assets/chats/empty.png');

/** `SocialPresenter::user()`. */
export type ChatUser = {
  uuid: string;
  guftagu_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** The frame they wear from the Item Bag; null when none. */
  frame?: AvatarFrame | null;
  /** Wealth / charm levels — the contacts lists show their medals. */
  wealth_level?: number;
  charm_level?: number;
};

/** `SocialPresenter::message()`. */
export type ChatMessage = {
  uuid: string;
  conversation_uuid: string | null;
  sender: ChatUser | null;
  type: 'text' | 'image' | 'audio' | 'video' | 'gift' | 'system';
  body: string | null;
  media_url: string | null;
  /** A gift card's `{ name, thumbnail_url, quantity, coin_value }`. */
  media_meta?: { name?: string; thumbnail_url?: string | null; quantity?: number; coin_value?: number; duration_ms?: number } | null;
  is_deleted: boolean;
  status: 'sent' | 'delivered' | 'read' | null;
  created_at: string | null;
};

/** `SocialPresenter::conversation()`. */
export type Conversation = {
  uuid: string;
  type: 'direct' | 'group';
  title: string | null;
  avatar_url: string | null;
  /** The frame they wear from the Item Bag; null when none. */
  frame?: AvatarFrame | null;
  participants: ChatUser[];
  last_message: ChatMessage | null;
  last_message_at: string | null;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  alias: string | null;
};

export const nameOf = (u: { display_name: string | null } | null | undefined) => u?.display_name ?? 'Guftagu user';
export const avatarOf = (u: { avatar_url: string | null } | null | undefined) =>
  u?.avatar_url ? { uri: u.avatar_url } : avatarPlaceholder;

/** The other person in a direct thread; a group falls back to its own title and cover. */
export function peerOf(c: Conversation): ChatUser {
  return (
    c.participants[0] ?? { uuid: '', guftagu_id: null, display_name: c.title, avatar_url: c.avatar_url }
  );
}

/** What a list row says about the last message. */
export function preview(m: ChatMessage | null) {
  if (!m) return '';
  if (m.is_deleted) return 'Message deleted';
  if (m.type === 'image') return '[Photo]';
  if (m.type === 'audio') return '[Voice]';
  if (m.type === 'gift') return '[Gift]';
  return m.body ?? '';
}

/** "5 : 01 AM", spaced as Figma sets it. */
export function clock(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours() % 12 || 12;
  return `${h} : ${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Opens (or reopens) the direct thread with someone — find-or-create on the server. */
/**
 * The last page of messages seen for each thread. A thread opens on this and the network
 * only refreshes it, so the chat is not blank while the request is in flight. The list
 * fills it ahead of the tap with `prefetchMessages`.
 */
export const messageCache = new Map<string, ChatMessage[]>();

export function prefetchMessages(token: string | null, uuid: string) {
  return api<ChatMessage[]>(`/conversations/${uuid}/messages?limit=50`, { token })
    .then((page) => {
      // Never overwrite what an open thread already holds: it may be newer than this page.
      if (!messageCache.has(uuid)) messageCache.set(uuid, [...page].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')));
    })
    .catch(() => undefined);
}

export async function openThread(token: string | null, user: ChatUser) {
  const { conversation } = await api<{ conversation: Conversation }>('/conversations', {
    method: 'POST',
    body: { user_uuid: user.uuid },
    token,
  });
  return conversation;
}

/** A page of people from `/friends` or `/users/{me}/followers|following`. */
export function usePeople(path: string | null) {
  const { token } = useAuth();
  const [people, setPeople] = useState<(ChatUser & { is_following?: boolean })[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!path) return;
    try {
      setPeople(await api<(ChatUser & { is_following?: boolean })[]>(path, { token }));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    } finally {
      setLoaded(true);
    }
  }, [path, token]);

  useEffect(() => {
    setLoaded(false);
    setPeople([]);
    load();
  }, [load]);

  return { people, setPeople, loaded, reload: load };
}

/** Follow or unfollow, with the row's busy flag. */
export function useFollowToggle() {
  const { token } = useAuth();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const inFlight = useRef(new Set<string>());

  const toggle = useCallback(
    async (uuid: string, following: boolean) => {
      if (inFlight.current.has(uuid)) return following;
      inFlight.current.add(uuid);
      setBusy((b) => ({ ...b, [uuid]: true }));
      try {
        const res = await api<{ is_following: boolean }>(`/users/${uuid}/follow`, {
          method: following ? 'DELETE' : 'POST',
          token,
        });
        return res.is_following;
      } catch {
        return following;
      } finally {
        inFlight.current.delete(uuid);
        setBusy((b) => ({ ...b, [uuid]: false }));
      }
    },
    [token],
  );

  return { busy, toggle };
}

/** Frame 1597881509 — back arrow on the left, the title flush right at x 216. */
export function ListHeader({ title, onBack, box = LIST.header }: { title: string; onBack: () => void; box?: { x: number; y: number; width: number; back: number; size: number } }) {
  const { px } = useDesignScale();
  return (
    <View style={[styles.header, { left: px(box.x), top: px(box.y), width: px(box.width), height: px(box.back) }]}>
      <Pressable onPress={onBack} hitSlop={px(12)}>
        <ArrowLeft size={px(box.back)} color={colors.black} strokeWidth={2} />
      </Pressable>
      <Text numberOfLines={1} style={[styles.regular, { fontSize: px(box.size), lineHeight: px(box.size * 1.3) }]}>
        {title}
      </Text>
    </View>
  );
}

/** Frame 1597881540 — image 205681 over a grey caption. */
export function EmptyState({ x, y, size, label, labelSize }: { x: number; y: number; size: number; label: string; labelSize: number }) {
  const { px } = useDesignScale();
  return (
    <View style={{ position: 'absolute', left: px(x), top: px(y), width: px(size), alignItems: 'center' }}>
      <Image source={emptyArt} resizeMode="cover" style={{ width: px(size), height: px(size) }} />
      <Text style={[styles.medium, { fontSize: px(labelSize), lineHeight: px(labelSize * 1.3), opacity: 0.4, textAlign: 'center' }]}>
        {label}
      </Text>
    </View>
  );
}

/** Frame 1597881516 — the grey switch; on, it turns the thread's blue. */
/** Narrower than Figma's 69×33 pill, which read as oversized beside the 20px row labels. */
const TOGGLE = { width: 50, height: 30 };

export function Toggle({ on, onPress, disabled }: { on: boolean; onPress: () => void; disabled?: boolean }) {
  const { px } = useDesignScale();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={px(8)}
      style={{
        width: px(TOGGLE.width),
        height: px(TOGGLE.height),
        borderRadius: px(TOGGLE.height / 2),
        padding: px(3),
        justifyContent: 'center',
        alignItems: on ? 'flex-end' : 'flex-start',
        backgroundColor: on ? '#005DE9' : 'rgba(0,0,0,0.14)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ width: px(TOGGLE.height - 6), height: px(TOGGLE.height - 6), borderRadius: px(TOGGLE.height), backgroundColor: colors.white }} />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  header: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regular: { fontFamily: typography.fontFamily.regular, color: colors.black },
  medium: { fontFamily: typography.fontFamily.medium, color: colors.black },
  semiBold: { fontFamily: typography.fontFamily.semiBold, color: colors.black },
});
