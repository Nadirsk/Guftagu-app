import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { BOTTOM_NAV_HEIGHT } from '../home/BottomNav';

/**
 * The Party tab — section 498:2839 in file ODEXeeT7yuiT9r7AG4Q3Gh. Three frames carry the
 * layouts; the others repeat them with another tab selected:
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
  create: { x: 16, y: 141, width: 370, height: 73, radius: 12 }, // 494:2423
  sub: {
    y: 245, // 494:2411
    recently: { center: 107.5, underline: 75 },
    following: { center: 291.5, underline: 263 },
    divider: { x: 198, height: 19 },
    underline: { y: 268, width: 60, height: 3 },
  },
  list: {
    related: { y: 308 }, // 498:2442
    explore: { y: 372 }, // 498:2721 under the pills
    gap: 24,
  },
  row: { width: 370, height: 76, photo: { width: 78, radius: 9 }, gap: 11, text: 92, chevron: 27 },
  banners: {
    ranking: { x: 17, y: 167, background: '#ff8b25', label: '#f67300', labelX: 71 },
    family: { x: 201, y: 167, background: '#70a9ff', label: '#0c61e0', labelX: 264 },
    width: 165,
    height: 71,
    radius: 18,
    labelY: 245,
    podium: { x: -19, y: -33, width: 207, height: 156 },
    crownRanking: { x: 69, y: 131, width: 71, height: 61 }, // 498:2739, a crop of the 735x600 bitmap
    crownFamily: { x: 217, y: 116, width: 137, height: 102 }, // 498:2746
  },
  pills: { y: 301, height: 37, gap: 10, radius: 25 }, // 498:2722
  empty: { x: 110, y: 390, size: 183, labelTop: 183 }, // 498:2656
};

const BLUE = '#005de9';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
type Section = 'Related' | 'Explore';
type Sub = 'Recently' | 'Following';
type Pill = 'Recommended' | 'New';

type LiveRoom = {
  uuid: string;
  name: string | null;
  cover_url: string | null;
  listener_count: number;
};

/** The four equaliser bars beside the listener count (494:2416). */
function Bars() {
  const { px } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: px(1) }}>
      {[13, 9, 12, 5].map((h, i) => (
        <View key={i} style={{ width: px(3), height: px(h), backgroundColor: colors.black }} />
      ))}
    </View>
  );
}

/** Frame 1597881487 — a room: photo, name, listeners, level badges, chevron. */
function RoomRow({ room, onPress }: { room: LiveRoom; onPress: () => void }) {
  const { px } = useDesignScale();
  const { row } = D;
  // The badges bitmap is 1092x254 and Figma shows it at 94.23% wide, 0.65% in, inside a 73:16 frame.
  const badgesWidth = px(row.text);
  const badgesHeight = (badgesWidth * 16) / 73;

  return (
    <Pressable onPress={onPress} style={{ width: px(row.width), height: px(row.height), flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: px(row.gap) }}>
        <Image
          source={room.cover_url ? { uri: room.cover_url } : require('../../assets/party/room-avatar.png')}
          resizeMode="cover"
          style={{ width: px(row.photo.width), height: px(row.height), borderRadius: px(row.photo.radius) }}
        />
        <View style={{ flex: 1, gap: px(8), marginRight: px(8) }}>
          <Text numberOfLines={1} style={[styles.rowName, { fontSize: px(16) }]}>
            {room.name ?? 'Guftagu room'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
            <Bars />
            <Text style={[styles.rowName, { fontSize: px(16) }]}>{room.listener_count}</Text>
          </View>
          <View style={{ width: badgesWidth, height: badgesHeight, overflow: 'hidden' }}>
            <Image
              source={require('../../assets/party/badges.png')}
              resizeMode="stretch"
              style={{ position: 'absolute', left: badgesWidth * 0.0065, top: 0, width: badgesWidth * 0.9423, height: badgesHeight }}
            />
          </View>
        </View>
      </View>
      <ChevronRight size={px(row.chevron)} color={colors.black} strokeWidth={2.4} />
    </Pressable>
  );
}

export default function PartyScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [section, setSection] = useState<Section>('Related');
  const [sub, setSub] = useState<Sub>('Recently');
  const [pill, setPill] = useState<Pill>('Recommended');
  const [rooms, setRooms] = useState<LiveRoom[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // White screen under the status bar, like every screen that is not the dark home.
  useEffect(() => {
    setStatusBarStyle('dark');
  }, []);

  const load = useCallback(async () => {
    try {
      setRooms(await api<LiveRoom[]>('/rooms/live?limit=30', { token }));
    } catch {
      setRooms((r) => r ?? []);
    }
  }, [token]);

  useEffect(() => {
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
  // The server has one public list (`/rooms/live`); "Following" has no feed of its own yet, so it
  // shows Figma's empty state rather than a list that is not the people you follow.
  const showEmpty = !explore && sub === 'Following';
  const listTop = explore ? D.list.explore.y : D.list.related.y;
  const shown = explore ? (pill === 'New' ? [...(rooms ?? [])].reverse() : rooms) : showEmpty ? [] : rooms;

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
          {/* 498:2724 / 498:2741 — the two ranking cards, with the crowns standing over them */}
          {(['ranking', 'family'] as const).map((k) => (
            <View
              key={k}
              style={{
                position: 'absolute',
                left: px(D.banners[k].x),
                top: px(D.banners.ranking.y),
                width: px(D.banners.width),
                height: px(D.banners.height),
                borderRadius: px(D.banners.radius),
                backgroundColor: D.banners[k].background,
                overflow: 'hidden',
              }}
            >
              <Image
                source={require('../../assets/party/podium.png')}
                resizeMode="cover"
                style={{ position: 'absolute', left: px(D.banners.podium.x), top: px(D.banners.podium.y), width: px(D.banners.podium.width), height: px(D.banners.podium.height) }}
              />
            </View>
          ))}
          <View style={{ position: 'absolute', left: px(D.banners.crownRanking.x), top: px(D.banners.crownRanking.y), width: px(D.banners.crownRanking.width), height: px(D.banners.crownRanking.height), overflow: 'hidden' }}>
            <Image
              source={require('../../assets/party/crown-ranking.png')}
              resizeMode="cover"
              style={{
                position: 'absolute',
                left: px(D.banners.crownRanking.width * -0.3239),
                top: px(D.banners.crownRanking.height * -0.2501),
                width: px(D.banners.crownRanking.width * 1.6479),
                height: px(D.banners.crownRanking.height * 1.5657),
              }}
            />
          </View>
          <Image
            source={require('../../assets/party/crown-family.png')}
            resizeMode="cover"
            style={{ position: 'absolute', left: px(D.banners.crownFamily.x), top: px(D.banners.crownFamily.y), width: px(D.banners.crownFamily.width), height: px(D.banners.crownFamily.height) }}
          />
          <Text style={[styles.bannerLabel, { left: px(D.banners.ranking.labelX), top: px(D.banners.labelY), fontSize: px(16), color: D.banners.ranking.label }]}>Ranking</Text>
          <Text style={[styles.bannerLabel, { left: px(D.banners.family.labelX), top: px(D.banners.labelY), fontSize: px(16), color: D.banners.family.label }]}>Family</Text>
          {/* One hit area over the Ranking card and the crown standing on it. */}
          <Pressable
            onPress={() => navigation.navigate('Ranking')}
            style={{
              position: 'absolute',
              left: px(D.banners.ranking.x),
              top: px(D.banners.crownRanking.y),
              width: px(D.banners.width),
              height: px(D.banners.ranking.y + D.banners.height - D.banners.crownRanking.y),
            }}
          />

          {/* 498:2722 — Recommended / New */}
          <View style={{ position: 'absolute', left: px(16), top: px(D.pills.y), flexDirection: 'row', gap: px(D.pills.gap) }}>
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
          {/* 494:2423 — Create My Room */}
          <Pressable
            onPress={() => navigation.navigate('CreateRoom')}
            style={[
              styles.create,
              { left: px(D.create.x), top: px(D.create.y), width: px(D.create.width), height: px(D.create.height), borderRadius: px(D.create.radius) },
            ]}
          >
            <Text style={{ position: 'absolute', left: px(91), top: px(26), fontFamily: typography.fontFamily.semiBold, fontSize: px(16), color: BLUE }}>Create My Room</Text>
            <Image source={require('../../assets/party/house.png')} resizeMode="cover" style={{ position: 'absolute', left: px(8), top: px(3), width: px(71), height: px(65) }} />
            <Image source={require('../../assets/party/mic.png')} resizeMode="cover" style={{ position: 'absolute', left: px(271), top: px(-20), width: px(132), height: px(132), opacity: 0.18 }} />
          </Pressable>

          {/* 494:2411 — Recently | Following */}
          {(['Recently', 'Following'] as const).map((name) => {
            const key = name === 'Recently' ? 'recently' : 'following';
            const on = sub === name;
            return (
              <Pressable
                key={name}
                onPress={() => setSub(name)}
                style={{ position: 'absolute', left: px(D.sub[key].center - 60), top: px(D.sub.y), width: px(120), alignItems: 'center' }}
              >
                <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(16), lineHeight: px(19), color: colors.black, opacity: on ? 1 : name === 'Recently' ? 0.5 : 0.4 }}>{name}</Text>
              </Pressable>
            );
          })}
          <View style={{ position: 'absolute', left: px(D.sub.divider.x), top: px(D.sub.y), width: 1, height: px(D.sub.divider.height), backgroundColor: colors.black }} />
          <View
            style={{
              position: 'absolute',
              left: px(D.sub[sub === 'Recently' ? 'recently' : 'following'].underline),
              top: px(D.sub.underline.y),
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
        <View style={{ position: 'absolute', left: px(D.empty.x), top: px(D.empty.y), width: px(D.empty.size), alignItems: 'center' }}>
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
