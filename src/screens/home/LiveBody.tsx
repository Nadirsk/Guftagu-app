import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api } from '../../api/client';
import * as icons from '../../assets/home/icons';
import { useAuth } from '../../auth/AuthContext';
import LevelMeter from '../../components/LevelMeter';
import { peek, refresh as swr } from '../../lib/swrCache';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { LIVE_CARD, LIVE_GRID, LIVE_STORIES } from './geometry';
import HeroCard from './HeroCard';

/**
 * The Live tab under the hero (Figma 463:2002): the story row — Create, then whoever is hosting a
 * room right now — and the grid of live rooms, two across. Both come from `GET /rooms/live`; tapping a
 * face or a card joins that room, Create opens (or creates) your own like Party does.
 *
 * This is the whole Live body: the hero card, then the stories and the grid. `originY` is the frame y
 * the container starts at (the geometry is absolute frame y).
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
type Person = { uuid: string; display_name: string | null; avatar_url: string | null };
type LiveRoom = { uuid: string; kind?: 'voice' | 'video' | 'video_party'; name: string | null; cover_url: string | null; listener_count: number; owner: Person | null; members: Person[] };

// The Live tab is the live videos (solo and Video Party); voice rooms are on the Party tab.
const PATH = '/rooms/live?limit=30&sort=recommended&kind=video';
const RING_GREEN = '#1A9F0B'; // the story ring, sampled from the export
// Figma dims the names to 31% white (69% at 45%), which is unreadable on the dark page; 85% keeps them quiet but legible.
const NAME_DIM = 'rgba(255,255,255,0.85)';

// Figma's tab is white at 32%, which only reads over a dark photo; at 85% the black count and meter stay legible on any cover.
const solid = (svg: string) => svg.replace('fill-opacity="0.32"', 'fill-opacity="0.85"');
// Vector 1: bars of 3.3, 1.7, 10, 15 and 3.3 long, 2px stroke with round caps.
const CARD_BARS = [5.33, 3.67, 12, 17, 5.33];
const BADGES = [icons.liveBadgeA, icons.liveBadgeB, icons.liveBadgeC].map(solid);

/** Height of the grid for `count` rooms: 192 a row, 16 between. */
export function liveGridHeight(count: number) {
  const rows = Math.ceil(count / 2);
  return rows === 0 ? 0 : rows * LIVE_GRID.card.height + (rows - 1) * LIVE_GRID.gapY;
}

export default function LiveBody({ originY, interactive = true, onOpenExplore }: { originY: number; interactive?: boolean; onOpenExplore?: () => void }) {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [rooms, setRooms] = useState<LiveRoom[]>(() => peek<LiveRoom[]>(PATH, token) ?? []);

  // Shows what was fetched last time at once, then swaps it if the answer changed.
  useEffect(() => swr<LiveRoom[]>(PATH, token, setRooms), [token]);
  // A live ends and another starts all the time: re-read while this tab is on screen, and each time it is shown again.
  useFocusEffect(
    useCallback(() => {
      let cancel = swr<LiveRoom[]>(PATH, token, setRooms);
      const timer = setInterval(() => {
        cancel();
        cancel = swr<LiveRoom[]>(PATH, token, setRooms);
      }, 8000);
      return () => {
        cancel();
        clearInterval(timer);
      };
    }, [token]),
  );

  const open = (room: LiveRoom) =>
    interactive && (room.kind === 'voice' || !room.kind ? navigation.navigate('Room', { uuid: room.uuid }) : navigation.navigate('LiveVideoRoom', { uuid: room.uuid, cover: room.cover_url }));

  // Create starts a live video (Video / Video Party); voice rooms are still made from Party.
  const create = () => {
    if (interactive) navigation.navigate('CreateVideo');
  };

  const s = LIVE_STORIES;
  const g = LIVE_GRID;
  const hosts = rooms.filter((r) => r.owner);
  const storiesBottom = s.y + s.disc.height + s.nameGap + 20;
  const bottom = Math.max(LIVE_CARD.y + LIVE_CARD.height, storiesBottom, rooms.length ? g.y + liveGridHeight(rooms.length) : 0);

  return (
    <View style={{ height: px(bottom - originY) }}>
      <HeroCard originY={originY} rooms={interactive ? rooms : []} onOpenRoom={(r) => {
          const full = rooms.find((x) => x.uuid === r.uuid);
          if (full) open(full);
        }} onEmpty={create} />

      {/* Frame 1597881444 — Create + the people hosting right now; it runs on past the right edge. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', left: 0, right: 0, top: px(s.y - originY), height: px(s.disc.height + s.nameGap + 20) }}
        contentContainerStyle={{ paddingLeft: px(s.x), paddingRight: px(16), gap: px(s.gap) }}
      >
        <Pressable onPress={create} style={{ width: px(s.create.width), alignItems: 'center' }}>
          {/* Ellipse 83 — a white disc (its 31% white stroke is invisible on white). */}
          <View style={{ width: px(s.create.disc), height: px(s.create.height), borderRadius: px(s.create.disc / 2), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
            {/* The plus: two 2px bars, 15 long, crossing at the disc's centre. */}
            <View style={{ width: px(15), height: px(2), borderRadius: px(1), backgroundColor: colors.black }} />
            <View style={{ position: 'absolute', width: px(2), height: px(15), borderRadius: px(1), backgroundColor: colors.black }} />
          </View>
          <Text style={[styles.name, { marginTop: px(s.nameGap), width: px(80), fontSize: px(s.nameSize), lineHeight: px(18), color: colors.white }]}>
            Create
          </Text>
        </Pressable>
        {hosts.map((r) => (
          <Pressable key={r.uuid} onPress={() => open(r)} style={{ width: px(s.disc.width), alignItems: 'center' }}>
            <Image
              source={r.owner?.avatar_url ? { uri: r.owner.avatar_url } : require('../../assets/avatar-placeholder.png')}
              style={{ width: px(s.disc.width), height: px(s.disc.height), borderRadius: px(s.disc.width / 2), borderWidth: px(s.disc.ring), borderColor: RING_GREEN }}
            />
            <Text numberOfLines={1} style={[styles.name, { marginTop: px(s.nameGap), width: px(s.disc.width + s.gap), fontSize: px(s.nameSize), lineHeight: px(18), color: NAME_DIM }]}>
              {r.owner?.display_name ?? 'Name'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Frame 771:16596 — two across, 192 high, 16 apart. */}
      {rooms.map((room, i) => {
        const row = Math.floor(i / 2);
        const right = i % 2 === 1;
        const x = right ? (row === 0 ? g.col2.first : g.col2.rest) : g.x;
        const variant = row === 0 ? 0 : right ? 2 : 1;
        const people = [room.owner, ...room.members.filter((m) => m.uuid !== room.owner?.uuid)].filter((p): p is Person => !!p).slice(0, 5);
        const photo = room.cover_url ?? room.owner?.avatar_url;
        const title = room.name ?? `${room.owner?.display_name ?? 'Guftagu'}’s Live`;
        return (
          <Pressable
            key={room.uuid}
            onPress={() => open(room)}
            style={{
              position: 'absolute',
              left: px(x),
              top: px(g.y - originY + row * (g.card.height + g.gapY)),
              width: px(g.card.width),
              height: px(g.card.height),
              borderRadius: px(g.card.radius),
              overflow: 'hidden',
              backgroundColor: '#1b1b1b',
            }}
          >
            <Image source={photo ? { uri: photo } : require('../../assets/party/room-avatar.png')} resizeMode="cover" style={StyleSheet.absoluteFill} />

            {/* The viewer-count tab: Union, the level meter, the count. */}
            <SvgXml xml={BADGES[variant]} width={px(g.badge.width)} height={px(g.badge.height)} style={{ position: 'absolute', left: px(g.badge.x), top: px(g.badge.y) }} />
            {/* The level meter, as Party's rows have: Figma's five-bar waveform (2px bars, 3.75 apart), centred in a 17px box. */}
            <View style={{ position: 'absolute', left: px(g.badge.wave.x - 1), top: px(g.badge.wave.y - 1), width: px(17), height: px(17), alignItems: 'center', justifyContent: 'center' }}>
              <LevelMeter heights={CARD_BARS} width={2} gap={1.75} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.count, { left: px(g.badge.count.x), top: px(g.badge.count.y), width: px(30), fontSize: px(g.badge.count.size), lineHeight: px(g.badge.count.size * 1.43) }]}
            >
              {room.listener_count}
            </Text>

            <SvgXml xml={icons.flagIN} width={px(19)} height={px(12)} style={{ position: 'absolute', left: px(g.flag.x), top: px(g.flag.y) }} />
            <Text
              numberOfLines={1}
              style={{
                position: 'absolute',
                left: px(g.name.x),
                top: px(g.name.y),
                width: px(g.card.width - g.name.x - 8),
                fontFamily: row === 0 ? typography.fontFamily.semiBold : typography.fontFamily.regular,
                fontSize: px(g.name.size),
                lineHeight: px(15),
                color: colors.white,
              }}
            >
              {title}
            </Text>

            <View style={{ position: 'absolute', left: px(g.faces.x), top: px(g.faces.y), flexDirection: 'row' }}>
              {people.map((p, k) => (
                <Image
                  key={p.uuid}
                  source={p.avatar_url ? { uri: p.avatar_url } : require('../../assets/avatar-placeholder.png')}
                  style={{
                    width: px(g.faces.size),
                    height: px(g.faces.size),
                    borderRadius: px(g.faces.size / 2),
                    borderWidth: px(g.faces.ring),
                    borderColor: colors.white,
                    marginLeft: k === 0 ? 0 : -px(g.faces.size - g.faces.step),
                  }}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
  },
  count: {
    position: 'absolute',
    textAlign: 'left',
    fontFamily: typography.fontFamily.semiBold,
    color: colors.black,
  },
});
