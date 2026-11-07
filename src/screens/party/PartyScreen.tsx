import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { LevelBadges, READABLE_BADGE_HEIGHT } from '../level/LevelBadge';
import { BOTTOM_NAV_HEIGHT } from '../home/BottomNav';
import type { AvatarFrame } from '../../components/UserAvatar';

/**
 * The Party tab — section 498:2839 in file MXdYSY2CZgSk8VexVjyw1B (the "GUFTAGU (Copy)" file).
 * Three frames carry the layouts; the others repeat them with another tab selected:
 *
 *   Related → Recently  493:2290 (498:2667 is the same with Following selected)
 *   Related → Following 498:2643 (empty state; 498:2588 is Recently, empty)
 *   Explore             498:2459 (498:2748 is the same list, longer)
 *
 * Every number is a design pixel on the 402x874 frame, placed absolutely the way the
 * other tab screens are, and scaled with `px()`.
 */

const D = {
  search: { x: 333, y: 76, width: 53, height: 34, icon: { x: 15, y: 6, size: 20 } }, // 493:2291
  tabs: {
    related: {
      related: { x: 16, y: 84, size: 24 },
      explore: { x: 126, y: 84, size: 20 },
    },
    explore: {
      related: { x: 17, y: 89, size: 20 },
      explore: { x: 107, y: 84, size: 24 },
    },
  },
  // 757:14058 — two cards, 11 apart
  create: { x: 16, y: 141, width: 370, height: 73, radius: 12, gap: 11 },
  sub: {
    y: 353, // 494:2411
    emptyY: { recently: 363, following: 372 }, // 498:2591 / 498:2646, pushed down by the empty state
    recently: { center: 107.5, underline: 75 },
    following: { center: 291.5, underline: 263 },
    divider: { x: 198, height: 19 },
    underline: { dy: 23, width: 60, height: 3 }, // 376 under the labels at 353
  },
  list: {
    related: { y: 416 }, // 498:2442
    explore: { y: 350 }, // 498:2721 — 71 under the pills
    gap: 24,
  },
  row: { width: 370, height: 76, photo: { width: 78, radius: 9 }, gap: 11, text: 92, chevron: 27 },
  // 498:2741 — one wide Family card; the crown 498:2746 stands on it and pokes out of the top.
  family: {
    x: 21,
    y: 144,
    width: 345,
    height: 94,
    radius: 18,
    background: '#70a9ff',
    label: { x: 22, y: 36, size: 18 },
    podium: { x: 161, y: -10, width: 207, height: 156 },
    crown: { x: 217, y: 116, width: 137, height: 102 },
  },
  pills: { y: 279, height: 37, gap: 10, radius: 25 }, // 498:2722
  empty: { x: 110, size: 183, y: { recently: 508, following: 517 } }, // 498:2642 / 498:2656
};

const BLUE = '#005de9';

/** Explore's Family card is gone (nothing on the server backs it), so the pills and list move up by its height. */
const SHIFT = 135;

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
type Section = 'Related' | 'Explore';
type Sub = 'Recently' | 'Following';
type Pill = 'Recommended' | 'New';

type Person = { uuid: string; display_name: string | null; avatar_url: string | null; frame?: AvatarFrame | null; wealth_level?: number; charm_level?: number };
type LiveRoom = {
  uuid: string;
  name: string | null;
  cover_url: string | null;
  listener_count: number;
  owner: Person | null;
  /** Up to five people inside right now. */
  members: Person[];
};

/** The four equaliser bars beside the listener count (494:2416); each is 13px at full level, as Figma's tallest. */
// Each bar bounces on its own period and floor, so together they read as a live level meter.
const BAR_MOTION = [
  { duration: 420, min: 0.35 },
  { duration: 560, min: 0.3 },
  { duration: 340, min: 0.4 },
  { duration: 480, min: 0.25 },
];

function Bar({ height, duration, min, delay }: { height: number; duration: number; min: number; delay: number }) {
  const { px } = useDesignScale();
  const level = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(level, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(level, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [level, duration, delay]);

  // scaleY pivots on the bar's centre, so slide it down by the same amount to keep the base fixed.
  const h = px(height);
  return (
    <Animated.View
      style={{
        width: px(3),
        height: h,
        backgroundColor: colors.black,
        transform: [
          { translateY: level.interpolate({ inputRange: [0, 1], outputRange: [(h * (1 - min)) / 2, 0] }) },
          { scaleY: level.interpolate({ inputRange: [0, 1], outputRange: [min, 1] }) },
        ],
      }}
    />
  );
}

function Bars() {
  const { px } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: px(1), height: px(13) }}>
      {BAR_MOTION.map((motion, i) => (
        <Bar key={i} height={13} {...motion} delay={i * 90} />
      ))}
    </View>
  );
}

/** Frame 1597881487 — a room: photo, name, listeners, level badges, chevron. */
function RoomRow({ room, onPress }: { room: LiveRoom; onPress: () => void }) {
  const { px } = useDesignScale();
  const { row } = D;
  const face = px(16);
  const photo = room.cover_url ?? room.owner?.avatar_url;

  return (
    <Pressable onPress={onPress} style={{ width: px(row.width), height: px(row.height), flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: px(row.gap) }}>
        <Image
          source={photo ? { uri: photo } : require('../../assets/party/room-avatar.png')}
          resizeMode="cover"
          style={{ width: px(row.photo.width), height: px(row.height), borderRadius: px(row.photo.radius) }}
        />
        {/* Three 20px lines 4 apart, so the medals' line fits the 76px row (493:2290). */}
        <View style={{ flex: 1, gap: px(4), marginRight: px(8) }}>
          <Text numberOfLines={1} style={[styles.rowName, { fontSize: px(16), lineHeight: px(20) }]}>
            {room.name ?? 'Guftagu room'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), height: px(20) }}>
            <Bars />
            <Text style={[styles.rowName, { fontSize: px(16), lineHeight: px(20) }]}>{room.listener_count}</Text>
          </View>
          {/* Figma's third line: the host's wealth / charm medals; then up to five
              faces of the host and people inside right now. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), height: px(READABLE_BADGE_HEIGHT) }}>
            <LevelBadges user={room.owner} height={READABLE_BADGE_HEIGHT} />
            <View style={{ flexDirection: 'row' }}>
              {[room.owner, ...room.members.filter((m) => m.uuid !== room.owner?.uuid)]
                .filter((p): p is Person => !!p)
                .slice(0, 5)
                .map((p, i) => (
                  <Image
                    key={p.uuid}
                    source={p.avatar_url ? { uri: p.avatar_url } : require('../../assets/avatar-placeholder.png')}
                    style={{
                      width: face,
                      height: face,
                      borderRadius: face / 2,
                      marginLeft: i === 0 ? 0 : -px(5),
                      borderWidth: 1,
                      borderColor: colors.white,
                    }}
                  />
                ))}
            </View>
          </View>
        </View>
      </View>
      <ChevronRight size={px(row.chevron)} color={colors.black} strokeWidth={2.4} />
    </Pressable>
  );
}

export default function PartyScreen({ initialSection = 'Related' }: { initialSection?: Section }) {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [openingRoom, setOpeningRoom] = useState(false);

  /**
   * A user keeps one room. With one already made, Create My Room joins it straight away;
   * only the first time does it open the create screen. If the check itself fails the
   * create screen still opens — a second create is refused there and joins instead.
   */
  const openMyRoom = async () => {
    setOpeningRoom(true);
    try {
      const { room } = await api<{ room: { uuid: string } | null }>('/rooms/mine', { token });
      if (room) navigation.navigate('Room', { uuid: room.uuid });
      else navigation.navigate('CreateRoom');
    } catch {
      navigation.navigate('CreateRoom');
    } finally {
      setOpeningRoom(false);
    }
  };
  const [section, setSection] = useState<Section>(initialSection);
  const [sub, setSub] = useState<Sub>('Recently');
  const [pill, setPill] = useState<Pill>('Recommended');
  const [rooms, setRooms] = useState<LiveRoom[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // White screen under the status bar, like every screen that is not the dark home.
  useEffect(() => {
    setStatusBarStyle('dark');
  }, []);

  // Related › Recently / Following and Explore › Recommended / New are each a view of /rooms/live.
  const query =
    section === 'Explore'
      ? `sort=${pill === 'New' ? 'new' : 'recommended'}`
      : `scope=${sub === 'Following' ? 'following' : 'recent'}`;

  const load = useCallback(async () => {
    try {
      setRooms(await api<LiveRoom[]>(`/rooms/live?limit=30&${query}`, { token }));
    } catch {
      setRooms((r) => r ?? []);
    }
  }, [token, query]);

  useEffect(() => {
    setRooms(null);
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = (room: LiveRoom) => navigation.navigate('Room', { uuid: room.uuid });

  const explore = section === 'Explore';
  const t = explore ? D.tabs.explore : D.tabs.related;
  // Figma's empty state shows once the tab's list has loaded and is empty; it sits the sub tabs
  // lower over the picture.
  const loadedEmpty = !explore && rooms !== null && rooms.length === 0;
  const followingEmpty = loadedEmpty && sub === 'Following';
  const recentlyEmpty = loadedEmpty && sub === 'Recently';
  const showEmpty = followingEmpty || recentlyEmpty;
  const subY = followingEmpty ? D.sub.emptyY.following : recentlyEmpty ? D.sub.emptyY.recently : D.sub.y;
  const listTop = explore ? D.list.explore.y - SHIFT : D.list.related.y;
  const shown = showEmpty ? [] : rooms;

  return (
    <View style={styles.screen}>
      {/* 493:2365 — Related / Explore */}
      <Pressable onPress={() => setSection('Related')} style={{ position: 'absolute', left: px(t.related.x), top: px(t.related.y) }} hitSlop={px(6)}>
        <Text
          style={{
            fontFamily: typography.fontFamily.semiBold,
            fontSize: px(t.related.size),
            lineHeight: px(27),
            color: colors.black,
            opacity: explore ? 0.4 : 1,
            textDecorationLine: explore ? 'none' : 'underline',
          }}
        >
          Related
        </Text>
      </Pressable>
      <Pressable onPress={() => setSection('Explore')} style={{ position: 'absolute', left: px(t.explore.x), top: px(t.explore.y) }} hitSlop={px(6)}>
        <Text
          style={{
            fontFamily: typography.fontFamily.medium,
            fontSize: px(t.explore.size),
            lineHeight: px(explore ? 27 : 24),
            color: colors.black,
            opacity: explore ? 1 : 0.5,
            textDecorationLine: explore ? 'underline' : 'none',
          }}
        >
          Explore
        </Text>
      </Pressable>

      {/* 493:2291 — search pill */}
      <Pressable
        onPress={() => navigation.navigate('Search')}
        style={{
          position: 'absolute',
          left: px(D.search.x),
          top: px(D.search.y),
          width: px(D.search.width),
          height: px(D.search.height),
          borderRadius: px(32),
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.18)',
        }}
      >
        <SvgXml xml={icons.search} width={px(D.search.icon.size)} height={px(D.search.icon.size)} style={{ position: 'absolute', left: px(D.search.icon.x), top: px(D.search.icon.y) }} />
      </Pressable>

      {explore ? (
        <>
          {/* 498:2722 — Recommended / New */}
          <View style={{ position: 'absolute', left: px(16), top: px(D.pills.y - SHIFT), flexDirection: 'row', gap: px(D.pills.gap) }}>
            {([['Recommended', 156], ['New', 96]] as const).map(([name, width]) => {
              const on = pill === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => setPill(name)}
                  style={{
                    width: px(width),
                    height: px(D.pills.height),
                    borderRadius: px(D.pills.radius),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? BLUE : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(16), color: on ? colors.white : colors.black }}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          {/* 757:14059 — Create My Room: the create screen once, your own room after that. */}
          <Pressable
            onPress={openMyRoom}
            disabled={openingRoom}
            style={[
              styles.create,
              { left: px(D.create.x), top: px(D.create.y), width: px(D.create.width), height: px(D.create.height), borderRadius: px(D.create.radius) },
            ]}
          >
            <Text style={{ position: 'absolute', left: px(91), top: px(26), fontFamily: typography.fontFamily.semiBold, fontSize: px(16), color: BLUE }}>Create My Room</Text>
            <Image source={require('../../assets/party/house.png')} resizeMode="cover" style={{ position: 'absolute', left: px(8), top: px(3), width: px(71), height: px(65) }} />
            <Image source={require('../../assets/party/mic.png')} resizeMode="cover" style={{ position: 'absolute', left: px(271), top: px(-20), width: px(132), height: px(132), opacity: 0.18 }} />
          </Pressable>

          {/* 757:14064 — Blind Date Room. There is no blind-date flow on the server yet: it opens the create screen (2015:8837) and the room locally. */}
          <Pressable
            onPress={() => navigation.navigate('BlindDateCreate')}
            style={[
              styles.create,
              {
                left: px(D.create.x),
                top: px(D.create.y + D.create.height + D.create.gap),
                width: px(D.create.width),
                height: px(D.create.height),
                borderRadius: px(D.create.radius),
              },
            ]}
          >
            <Text style={{ position: 'absolute', left: px(91), top: px(26), fontFamily: typography.fontFamily.semiBold, fontSize: px(16), color: '#eb11aa' }}>Blind Date Room</Text>
            <Image source={require('../../assets/party/blind-heart.png')} resizeMode="cover" style={{ position: 'absolute', left: px(11), top: px(7), width: px(62), height: px(57) }} />
            <Image source={require('../../assets/party/blind-outline.png')} resizeMode="cover" style={{ position: 'absolute', left: px(267), top: px(4), width: px(98), height: px(98) }} />
          </Pressable>

          {/* 494:2411 — Recently | Following */}
          {(['Recently', 'Following'] as const).map((name) => {
            const key = name === 'Recently' ? 'recently' : 'following';
            const on = sub === name;
            return (
              <Pressable
                key={name}
                onPress={() => setSub(name)}
                style={{ position: 'absolute', left: px(D.sub[key].center - 60), top: px(subY), width: px(120), alignItems: 'center' }}
              >
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(16), lineHeight: px(19), color: colors.black, opacity: on ? 1 : name === 'Recently' ? 0.5 : 0.4 }}>{name}</Text>
              </Pressable>
            );
          })}
          <View style={{ position: 'absolute', left: px(D.sub.divider.x), top: px(subY), width: 1, height: px(D.sub.divider.height), backgroundColor: colors.black }} />
          <View
            style={{
              position: 'absolute',
              left: px(D.sub[sub === 'Recently' ? 'recently' : 'following'].underline),
              top: px(subY + D.sub.underline.dy),
              width: px(D.sub.underline.width),
              height: px(D.sub.underline.height),
              borderRadius: px(9),
              backgroundColor: BLUE,
            }}
          />
        </>
      )}

      {/* 498:2656 — Figma's empty state */}
      {showEmpty ? (
        <View style={{ position: 'absolute', left: px(D.empty.x), top: px(followingEmpty ? D.empty.y.following : D.empty.y.recently), width: px(D.empty.size), alignItems: 'center' }}>
          <Image source={require('../../assets/party/no-data.png')} resizeMode="cover" style={{ width: px(D.empty.size), height: px(D.empty.size) }} />
          <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(20), lineHeight: px(25), color: colors.black, opacity: 0.3 }}>No Data</Text>
        </View>
      ) : (
        <ScrollView
          style={{ position: 'absolute', left: px(16), right: px(16), top: px(listTop), bottom: 0 }}
          contentContainerStyle={{ gap: px(D.list.gap), paddingBottom: px(BOTTOM_NAV_HEIGHT + 24) }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {shown === null ? <ActivityIndicator color={colors.black} style={{ marginTop: px(24) }} /> : null}
          {shown?.map((room) => (
            <RoomRow key={room.uuid} room={room} onPress={() => open(room)} />
          ))}
          {shown && shown.length === 0 ? <Text style={[styles.rowName, { opacity: 0.3, fontSize: px(20), textAlign: 'center', marginTop: px(40) }]}>No Data</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  create: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.13)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10.6,
    elevation: 3,
  },
  rowName: { fontFamily: typography.fontFamily.medium, color: colors.black },
  bannerLabel: { position: 'absolute', fontFamily: typography.fontFamily.medium },
});
