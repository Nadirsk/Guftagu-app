import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Pin } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import { getEcho } from '../../api/realtime';
import * as icons from '../../assets/chats/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { BOTTOM_NAV_HEIGHT } from '../home/BottomNav';
import { FollowChip } from '../moment/parts';
import { CHATS, CONTACTS, LIST, TABS } from './geometry';
import {
  avatarOf,
  type ChatUser,
  clock,
  type Conversation,
  EmptyState,
  ListHeader,
  nameOf,
  openThread,
  peerOf,
  preview,
  styles,
  useFollowToggle,
  usePeople,
} from './parts';

/**
 * The Chats tab — sections 514:3077 and 519:2450. "Chats" is the DM list under
 * a row of people from live rooms; "Contacts" is four cards, each opening its
 * list in place so the bottom bar stays, as every Contacts frame draws it.
 *
 * A friend is a mutual follow (`GET /friends`). There is no family API yet, so
 * Family is its empty frame (514:3608).
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'chats' | 'contacts';
type ListKind = 'friends' | 'followers' | 'following' | 'family';

const CARDS: { kind: ListKind; label: string; icon: string }[] = [
  { kind: 'friends', label: 'Friends', icon: icons.usersRound },
  { kind: 'followers', label: 'Followers', icon: icons.followers },
  { kind: 'following', label: 'Following', icon: icons.userStar },
  { kind: 'family', label: 'Family', icon: icons.house },
];

export default function ChatsScreen() {
  const [tab, setTab] = useState<Tab>('chats');
  const [list, setList] = useState<ListKind | null>(null);

  // Android's back closes an open list before it leaves the tab.
  useEffect(() => {
    if (!list) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setList(null);
      return true;
    });
    return () => sub.remove();
  }, [list]);

  if (list) return <PeopleList kind={list} onBack={() => setList(null)} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {tab === 'chats' ? <ChatList /> : <ContactCards onOpen={setList} />}
      <TabSwitch tab={tab} onTab={setTab} />
    </View>
  );
}

/** Frame 1597881126 + the search pill. */
function TabSwitch({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const S = TABS.search;
  const label = (key: Tab, text: string, x: number, bold: boolean) => {
    const active = tab === key;
    const size = active ? TABS.activeSize : TABS.idleSize;
    return (
      <Pressable onPress={() => onTab(key)} hitSlop={px(8)} style={{ position: 'absolute', left: px(x), top: px(TABS.y) }}>
        <Text
          style={[
            bold ? styles.semiBold : styles.medium,
            { fontSize: px(size), lineHeight: px(27), opacity: active ? 1 : TABS.idleOpacity, textDecorationLine: active ? 'underline' : 'none' },
          ]}
        >
          {text}
        </Text>
      </Pressable>
    );
  };
  return (
    <>
      {label('chats', 'Chats', TABS.x, true)}
      {label('contacts', 'Contacts', TABS.contactsX[tab], false)}
      <Pressable
        onPress={() => navigation.navigate('Search')}
        style={{ position: 'absolute', left: px(S.x), top: px(S.y), width: px(S.width), height: px(S.height), borderRadius: px(S.radius), borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)' }}
      >
        <SvgXml xml={icons.search} width={px(S.icon)} height={px(S.icon)} style={{ position: 'absolute', left: px(S.iconX - 1), top: px(S.iconY - 1) }} />
      </Pressable>
    </>
  );
}

// ---------------------------------------------------------------- 507:3074

function ChatList() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token, user } = useAuth();
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState<ChatUser[]>([]);
  const C = CHATS;

  // Refreshed every time the tab comes back into view — after a thread, the counts moved —
  // and again whenever a message lands on the user's own channel (a new message, a read
  // receipt, a deleted one), so the list, preview and unread badge move without a pull.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      const load = () =>
        api<Conversation[]>('/conversations', { token })
          .then((rows) => live && setThreads(rows))
          .catch((e) => {
            if (!(e instanceof ApiError)) throw e;
          })
          .finally(() => live && setLoaded(true));
      load();

      const echo = token && user ? getEcho(token) : null;
      const channel = echo && user ? `user.${user.uuid}` : null;
      if (echo && channel) {
        echo
          .private(channel)
          .listen('.message.new', (e: { message?: { conversation_uuid?: string | null } }) => {
            // The app has the message now, even though its thread is not open: that is the second tick.
            const thread = e.message?.conversation_uuid;
            if (thread) api(`/conversations/${thread}/delivered`, { method: 'POST', token }).catch(() => undefined);
            load();
          })
          .listen('.message.deleted', load);
      }
      // The socket can drop silently, so a slow poll keeps the list honest either way.
      const timer = setInterval(load, 20000);

      return () => {
        live = false;
        clearInterval(timer);
        if (echo && channel) {
          const c = echo.private(channel);
          c.stopListening('.message.new').stopListening('.message.deleted');
        }
      };
    }, [token, user]),
  );

  // "Recommend user in the room": whoever is in a live room right now, owners first.
  useEffect(() => {
    api<{ owner: ChatUser | null; members: ChatUser[] }[]>('/rooms/live?limit=10', { token })
      .then((rooms) => {
        const seen = new Set<string>(user ? [user.uuid] : []);
        const out: ChatUser[] = [];
        for (const r of rooms) {
          for (const u of [r.owner, ...r.members]) {
            if (u && !seen.has(u.uuid)) {
              seen.add(u.uuid);
              out.push(u);
            }
          }
        }
        setPeople(out.slice(0, 12));
      })
      .catch(() => undefined);
  }, [token, user]);

  const chatWith = async (u: ChatUser) => {
    try {
      const conversation = await openThread(token, u);
      navigation.navigate('Conversation', { uuid: conversation.uuid, peer: u });
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not open the chat.');
    }
  };

  const R = C.row;
  const height = Math.max(874, R.y + threads.length * R.step + 40) + BOTTOM_NAV_HEIGHT;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ height: px(height) }}>
      <Text style={[styles.medium, { position: 'absolute', left: px(C.recommendTitle.x), top: px(C.recommendTitle.y), fontSize: px(C.recommendTitle.size), lineHeight: px(23) }]}>
        Recommend user in the room
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', left: 0, right: 0, top: px(C.recommend.y), height: px(93) }}
        contentContainerStyle={{ paddingHorizontal: px(C.recommend.x), gap: px(C.recommend.gap) }}
      >
        {people.map((u) => (
          <Pressable key={u.uuid} onPress={() => chatWith(u)} style={{ width: px(C.recommend.item), alignItems: 'center', gap: px(C.recommend.nameGap) }}>
            <Image source={avatarOf(u)} style={{ width: px(C.recommend.avatar), height: px(C.recommend.avatar), borderRadius: px(C.recommend.avatar / 2) }} />
            <Text numberOfLines={1} style={[styles.medium, { width: px(C.recommend.item + 10), textAlign: 'center', fontSize: px(C.recommend.nameSize), lineHeight: px(19) }]}>
              {nameOf(u)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.medium, { position: 'absolute', left: px(C.listTitle.x), top: px(C.listTitle.y), fontSize: px(C.listTitle.size), lineHeight: px(19) }]}>
        Chatlist
      </Text>

      {loaded && threads.length === 0 ? (
        <EmptyState x={C.empty.x} y={C.empty.y} size={C.empty.size} label="No chat list" labelSize={C.empty.labelSize} />
      ) : null}

      {threads.map((t, i) => {
        const peer = peerOf(t);
        const y = R.y + i * R.step;
        return (
          <Pressable
            key={t.uuid}
            onPress={() => navigation.navigate('Conversation', { uuid: t.uuid, peer })}
            style={{ position: 'absolute', left: px(R.x), top: px(y), width: px(R.width), height: px(R.avatar), flexDirection: 'row', alignItems: 'center' }}
          >
            <Image source={avatarOf(peer)} style={{ width: px(R.avatar), height: px(R.avatar), borderRadius: px(R.avatar / 2) }} />
            <View style={{ flex: 1, marginLeft: px(R.gap), marginRight: px(8), gap: px(R.textGap) }}>
              <Text numberOfLines={1} style={[styles.medium, { fontSize: px(R.nameSize), lineHeight: px(19) }]}>
                {nameOf(peer)}
              </Text>
              <Text numberOfLines={1} style={[styles.medium, { fontSize: px(R.previewSize), lineHeight: px(18), opacity: 0.5 }]}>
                {preview(t.last_message)}
              </Text>
            </View>
            <View style={{ width: px(C.meta.width), alignItems: 'flex-end', gap: px(C.meta.gap), alignSelf: 'flex-start', marginTop: px(7.5) }}>
              <Text numberOfLines={1} style={[styles.medium, { fontSize: px(C.meta.timeSize), lineHeight: px(15), opacity: 0.5 }]}>
                {clock(t.last_message_at)}
              </Text>
              {t.unread_count > 0 || t.is_pinned ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
                  {t.is_pinned ? <Pin size={px(17)} color={colors.black} strokeWidth={1.8} style={{ opacity: 0.5 }} /> : null}
                  {t.unread_count > 0 ? (
                <View style={{ minWidth: px(C.meta.badge), height: px(C.meta.badge), borderRadius: px(C.meta.badge / 2), paddingHorizontal: px(6), backgroundColor: C.meta.badgeColor, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[styles.medium, { fontSize: px(C.meta.badgeSize), lineHeight: px(15), color: colors.white }]}>
                    {t.unread_count > 99 ? '99+' : t.unread_count}
                  </Text>
                </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- 514:3172

function ContactCards({ onOpen }: { onOpen: (k: ListKind) => void }) {
  const { px } = useDesignScale();
  const K = CONTACTS;
  return (
    <>
      {CARDS.map((c, i) => (
        <Pressable
          key={c.kind}
          onPress={() => onOpen(c.kind)}
          style={{
            position: 'absolute',
            left: px(K.x),
            top: px(K.y + i * K.step),
            width: px(K.width),
            height: px(K.height),
            borderRadius: px(K.radius),
            borderWidth: 1,
            borderColor: K.border,
            paddingHorizontal: px(K.inset - 1),
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <SvgXml xml={c.icon} width={px(K.icon)} height={px(K.icon)} />
          <Text style={[styles.medium, { flex: 1, marginLeft: px(K.iconGap), fontSize: px(K.labelSize), lineHeight: px(19) }]}>{c.label}</Text>
          <ChevronRight size={px(K.icon)} color={colors.black} strokeWidth={2.5} />
        </Pressable>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- 514:3268 / 3393 / 3526 / 3608

const TITLES: Record<ListKind, string> = { friends: 'Friends', followers: 'Followers', following: 'Following', family: 'Family' };

function PeopleList({ kind, onBack }: { kind: ListKind; onBack: () => void }) {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { user, token } = useAuth();
  const path =
    kind === 'friends'
      ? '/friends?per_page=100'
      : kind === 'family' || !user
        ? null
        : `/users/${user.uuid}/${kind}?per_page=100`;
  const { people, setPeople, loaded } = usePeople(path);
  const follow = useFollowToggle();
  const R = LIST.rows;
  const top = kind === 'following' ? R.followingY : R.y;

  const chatWith = async (u: ChatUser) => {
    try {
      const conversation = await openThread(token, u);
      navigation.navigate('Conversation', { uuid: conversation.uuid, peer: u });
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not open the chat.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ height: px(Math.max(874, top + people.length * R.step + 40) + BOTTOM_NAV_HEIGHT) }}>
        {(kind === 'family' || loaded) && people.length === 0 ? (
          <EmptyState x={LIST.empty.x} y={kind === 'following' || kind === 'family' ? 336 : LIST.empty.y} size={LIST.empty.size} label="No Content here" labelSize={LIST.empty.labelSize} />
        ) : null}
        {people.map((p, i) => {
          // Friends follow each other by definition; the other two lists say per row.
          const following = kind === 'friends' || kind === 'following' ? p.is_following ?? true : p.is_following ?? false;
          return (
            <Pressable
              key={p.uuid}
              onPress={() => chatWith(p)}
              style={{ position: 'absolute', left: px(R.x), top: px(top + i * R.step), width: px(R.width), height: px(66), flexDirection: 'row', alignItems: 'center' }}
            >
              <Image source={avatarOf(p)} style={{ width: px(66), height: px(66), borderRadius: px(33) }} />
              <View style={{ flex: 1, marginLeft: px(11), marginRight: px(8), gap: px(3) }}>
                <Text numberOfLines={1} style={[styles.regular, { fontSize: px(18), lineHeight: px(23) }]}>
                  {nameOf(p)}
                </Text>
                {p.guftagu_id ? (
                  <Text numberOfLines={1} style={[styles.regular, { fontSize: px(15), lineHeight: px(19), opacity: 0.3 }]}>
                    ID: {p.guftagu_id}
                  </Text>
                ) : null}
              </View>
              <FollowChip
                following={following}
                busy={follow.busy[p.uuid] ?? false}
                followingLabel={kind === 'following' ? 'UnFollow' : undefined}
                onPress={async () => {
                  const now = await follow.toggle(p.uuid, following);
                  setPeople((list) =>
                    // Unfollowing from Following (or a friend) takes them off this list.
                    !now && (kind === 'following' || kind === 'friends')
                      ? list.filter((x) => x.uuid !== p.uuid)
                      : list.map((x) => (x.uuid === p.uuid ? { ...x, is_following: now } : x)),
                  );
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
      <ListHeader title={TITLES[kind]} onBack={onBack} />
    </View>
  );
}
