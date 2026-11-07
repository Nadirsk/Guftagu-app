import { type RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { api } from '../../api/client';
import * as profileIcons from '../../assets/profile/icons';
import * as icons from '../../assets/profile/visitors/icons';
import { useAuth } from '../../auth/AuthContext';
import type { ProfileListKind, RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { useFollowToggle } from '../chats/parts';
import { LevelBadges, READABLE_BADGE_HEIGHT } from '../level/LevelBadge';
import { avatarSource, FollowChip, type PostAuthor } from '../moment/parts';
import { UserAvatar } from '../../components/UserAvatar';

/**
 * Profile → Visitors, Followers and Following. Figma 2015:9671 (Visitors) and
 * 2015:9818 (Followers) are the same frame under a different title; Following
 * has no frame of its own and uses it too.
 *
 * Each is the signed-in user's own list, newest first, and each row carries the
 * moment it happened — the visit, or the follow:
 *   visitors  `GET /users/{me}/visitors`   → { user, visited_at }
 *   followers `GET /users/{me}/followers`  → user card + `followed_at`
 *   following `GET /users/{me}/following`  → user card + `followed_at`
 *
 * Every number is a design pixel, scaled by `px`.
 */


const INK = '#17171A';
const HAIRLINE = '#EEECE8';

/** `following`: whether you follow them — only the Followers and Following lists carry it. */
type Person = { user: PostAuthor | null; at: string | null; following?: boolean };

const COPY: Record<ProfileListKind, { title: string; empty: string }> = {
  visitors: { title: 'Visitors', empty: 'No visitors yet' },
  followers: { title: 'Followers', empty: 'No followers yet' },
  following: { title: 'Following', empty: 'You are not following anyone yet' },
};

/** What each endpoint's rows look like once they are a `Person`. */
type VisitorItem = { user: PostAuthor | null; visited_at: string | null };
type ConnectionItem = PostAuthor & { followed_at?: string | null; is_following?: boolean };

/** The row, from Figma's 68px avatar to the 94px that carries it down to its divider. */
const ROW = {
  avatar: 68,
  textGap: 20,
  height: 94,
  badge: { x: 43, y: 50, size: 20 },
  name: { size: 18 },
  when: { width: 82, size: 15 },
  margin: 15,
} as const;

/** "11-05-2025" and "12:22:10", as the frame writes them. */
function stamp(iso: string | null) {
  if (!iso) return { date: '', time: '' };
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return { date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${pad(at.getDate())}-${pad(at.getMonth() + 1)}-${at.getFullYear()}`,
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`,
  };
}

/** The same male / female disc the profile pins beside the name. */
function GenderBadge({ gender }: { gender?: string | null }) {
  const { px } = useDesignScale();
  const { badge } = ROW;
  if (gender !== 'male' && gender !== 'female') return null;
  return (
    <View style={{ position: 'absolute', left: px(badge.x), top: px(badge.y) }}>
      <SvgXml xml={gender === 'male' ? profileIcons.male : profileIcons.female} width={px(badge.size)} height={px(badge.size)} />
    </View>
  );
}

function PersonRow({
  person,
  width,
  chip,
  dateBelow,
}: {
  person: Person;
  width: number;
  /** Followers: Follow, only for someone you do not follow. Following: UnFollow. */
  chip?: { following: boolean; busy: boolean; onPress: () => void };
  /** Followers and Following keep the date under the badges, whether or not a row has a chip. */
  dateBelow?: boolean;
}) {
  const { px } = useDesignScale();
  const user = person.user;
  const when = stamp(person.at);

  return (
    <View style={{ height: px(ROW.height + 1), paddingHorizontal: px(ROW.margin) }}>
      <View style={styles.row}>
        <View style={{ width: px(ROW.avatar), height: px(ROW.avatar + 2) }}>
          <UserAvatar source={avatarSource({ author: user })} frame={user?.frame} size={px(ROW.avatar)} />
          <GenderBadge gender={user?.gender} />
        </View>

        <View style={{ flex: 1, marginLeft: px(ROW.textGap), gap: px(1) }}>
          <Text numberOfLines={1} style={[styles.name, { fontSize: px(ROW.name.size) }]}>
            {user?.display_name ?? 'Guftagu user'}
          </Text>
          <View style={[styles.tags, { gap: px(5) }]}>
            <LevelBadges user={user} height={READABLE_BADGE_HEIGHT} />
          </View>
          {/* With a chip on the right there is no room for the date column, so
              when they followed you (or you them) moves under the badges. */}
          {dateBelow ? (
            <Text numberOfLines={1} style={[styles.sub, { fontSize: px(12), marginTop: px(3) }]}>
              {`${when.date}  ${when.time}`}
            </Text>
          ) : null}
        </View>

        {dateBelow ? chip ? (
          <FollowChip following={chip.following} busy={chip.busy} followingLabel="UnFollow" onPress={chip.onPress} />
        ) : null : (
          // Figma's column is 82 wide; a date like 28-10-2026 is a hair wider in
          // Poppins and broke onto two lines, so 82 is a floor, not a fixed width.
          <View style={{ minWidth: px(ROW.when.width), flexShrink: 0 }}>
            <Text numberOfLines={1} style={[styles.when, { fontSize: px(ROW.when.size), textAlign: 'center' }]}>
              {when.date}
            </Text>
            <Text numberOfLines={1} style={[styles.when, { fontSize: px(ROW.when.size), textAlign: 'right' }]}>
              {when.time}
            </Text>
          </View>
        )}
      </View>
      <SvgXml xml={icons.divider} width={width} height={1} />
    </View>
  );
}

export default function ProfileListScreen() {
  const { px } = useDesignScale();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { kind } = useRoute<RouteProp<RootStackParamList, 'ProfileList'>>().params;
  const { user, token } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const copy = COPY[kind];
  const follow = useFollowToggle();

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const path = `/users/${user.uuid}/${kind}?per_page=100`;
      if (kind === 'visitors') {
        const res = await api<VisitorItem[]>(path, { token });
        setPeople((Array.isArray(res) ? res : []).map((v) => ({ user: v.user, at: v.visited_at })));
      } else {
        const res = await api<ConnectionItem[]>(path, { token });
        setPeople(
          (Array.isArray(res) ? res : []).map((u) => ({
            user: u,
            at: u.followed_at ?? null,
            // Everyone in Following is followed by definition; Followers says per row.
            following: u.is_following ?? kind === 'following',
          })),
        );
      }
    } catch {
      // Keep whatever is already on screen.
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, [kind, token, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // As in Contacts: one tap follows or unfollows. In Following the row then leaves
  // the list; in Followers it stays and its chip flips.
  const toggleFollow = async (person: Person) => {
    const target = person.user;
    if (!target) return;
    const now = await follow.toggle(target.uuid, person.following ?? false);
    setPeople((list) =>
      !now && kind === 'following'
        ? list.filter((p) => p.user?.uuid !== target.uuid)
        : list.map((p) => (p.user?.uuid === target.uuid ? { ...p, following: now } : p)),
    );
  };

  return (
    <View style={styles.screen}>
      {/* Same header as Post Details: back arrow, then the title, over a hairline. */}
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
        <Text style={[styles.title, { fontSize: px(18) }]}>{copy.title}</Text>
      </View>

      <FlatList
        data={people}
        keyExtractor={(p, i) => p.user?.uuid ?? String(i)}
        renderItem={({ item }) => (
          <PersonRow
            person={item}
            width={windowWidth - px(ROW.margin * 2)}
            dateBelow={kind !== 'visitors'}
            chip={
              // Followers you already follow back get no button; Following always has one.
              kind === 'visitors' || !item.user || (kind === 'followers' && item.following)
                ? undefined
                : {
                    following: item.following ?? false,
                    busy: follow.busy[item.user.uuid] ?? false,
                    onPress: () => toggleFollow(item),
                  }
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: px(12), paddingBottom: px(40) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          loaded ? (
            <Text style={[styles.empty, { marginTop: px(120), fontSize: px(16) }]}>{copy.empty}</Text>
          ) : (
            <ActivityIndicator style={{ marginTop: px(120) }} color={colors.black} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  backButton: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.fontFamily.semiBold, color: INK, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { fontFamily: typography.fontFamily.medium, color: colors.black },
  tags: { flexDirection: 'row', alignItems: 'center' },
  when: { fontFamily: typography.fontFamily.regular, color: colors.black },
  sub: { fontFamily: typography.fontFamily.regular, color: 'rgba(0,0,0,0.45)' },
  empty: { fontFamily: typography.fontFamily.regular, color: 'rgba(0,0,0,0.4)', textAlign: 'center' },
});
