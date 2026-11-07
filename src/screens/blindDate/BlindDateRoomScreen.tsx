import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as blindIcons from '../../assets/blind/icons';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { typography } from '../../theme/tokens';

/**
 * Blind Date Room (Figma 2015:8464 / 2015:8590 / 2015:8713, 440 x 956 frames).
 * `idle` is the empty room; tapping the heart ("Pick") brings two guests to seats 1 and 2 with an
 * orange Pick under seat 2 (8590); Pick turns it into Cancel (8713) and Cancel back. The server
 * has no blind-date flow yet, so nothing here is sent anywhere.
 */

const FRAME = 440;
const GOLD = '#FEDE0F';
const PINK_SEAT = '#FFC3DD';
const RING_FILL = 'rgba(77,34,66,0.5)';
const RING_LINE = 'rgba(255,254,219,0.47)';
const PANEL = 'rgba(20,8,18,0.5)';
const PANEL_LINE = 'rgba(246,246,246,0.18)';

const art = {
  bg: require('../../assets/blind/bg.png'),
  host: require('../../assets/blind/host.png'),
  award: require('../../assets/blind/award.png'),
  viewer: require('../../assets/blind/viewer.png'),
  chat: require('../../assets/blind/chat-avatar.png'),
  level: require('../../assets/blind/level.png'),
  gift: require('../../assets/blind/gift.png'),
  wheel: require('../../assets/blind/wheel.png'),
  game: require('../../assets/blind/game.png'),
  guest1: require('../../assets/blind/seat-photo-1.png'),
  guest2: require('../../assets/blind/seat-photo-2.png'),
};

// Seat circles (47 wide) and the numbers under them (centres, y 368.49 / 474.49).
const SEATS = [
  { n: 1, x: 36, y: 319, label: 59.03 },
  { n: 2, x: 116, y: 319, label: 139.28 },
  { n: 3, x: 292, y: 319, label: 315.28, filled: true },
  { n: 4, x: 366, y: 319, label: 389.28 },
  { n: 5, x: 36, y: 425, label: 59.03 },
  { n: 6, x: 116, y: 425, label: 139.28 },
  { n: 7, x: 289, y: 425, label: 312.28, filled: true },
  { n: 8, x: 363, y: 425, label: 386.28 },
] as const;
const HOSTS = [
  { x: 148, label: 168.28, gold: false },
  { x: 245, label: 265.28, gold: true },
] as const;

type Phase = 'idle' | 'choose' | 'picked';
// The "?" sits a few points further right in each frame (295 / 299 / 301).
const HELP_X: Record<Phase, number> = { idle: 295, choose: 299, picked: 301 };

const seatIcon = blindIcons.seat.replace('#7E5353', PINK_SEAT);
// The Host seat is gold (Figma runs #FFDE07 → #998504 → #C0AE38; react-native-svg drew the gradient black, so one mid gold).
const hostIcon = blindIcons.seatHost.replace('fill="black"', 'fill="#C9AA0A"');

export default function BlindDateRoomScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');

  const u = (v: number) => px((v * 402) / FRAME);
  const box = (left: number, top: number, w: number, h: number) => ({ position: 'absolute' as const, left: u(left), top: u(top), width: u(w), height: u(h) });
  const font = (size: number, weight: 'regular' | 'medium', color = '#FFFFFF') => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: u(size),
    lineHeight: u(Math.round(size * 1.28)),
    color,
  });
  const centred = (cx: number, top: number, width = 60) => ({ position: 'absolute' as const, left: u(cx - width / 2), top: u(top), width: u(width), textAlign: 'center' as const });

  const ring = (x: number, y: number, size: number, fill = RING_FILL) => (
    <View style={[box(x, y, size, size), { borderRadius: u(size), backgroundColor: fill, borderWidth: 1, borderColor: RING_LINE }]} />
  );

  const seat = (s: (typeof SEATS)[number]) => {
    const guest = phase !== 'idle' && s.n <= 2;
    const photo = s.n === 1 ? art.guest1 : art.guest2;
    return (
      <View key={s.n}>
        {guest ? (
          <Image source={photo} style={box(s.x - 5, s.y - 1, 57.05, 57.05)} />
        ) : (
          <>
            {ring(s.x, s.y, 47.05)}
            <View style={[box(s.x + 8.4, s.y + 8.4, 30.25, 30.25), 'filled' in s && s.filled ? { backgroundColor: RING_FILL } : null]}>
              <SvgXml xml={seatIcon} width={u(22.69)} height={u(25.21)} style={{ position: 'absolute', left: u(3.78), top: u(2.52) }} />
            </View>
          </>
        )}
        {!(phase !== 'idle' && s.n === 2) && <Text style={[centred(s.label, 368.49 + (s.y - 319), 41), font(16, 'medium', '#F0EEFF')]}>{s.n}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Image source={art.bg} resizeMode="cover" style={StyleSheet.absoluteFill} />

      {/* Rectangle 46 — the notice. */}
      <View style={[box(29, 517, 366, 79), { borderRadius: u(10), backgroundColor: 'rgba(211,205,210,0.11)', borderWidth: 1, borderColor: PANEL_LINE }]} />
      <Text style={[box(42, 531, 345, 51), font(11, 'regular', '#FFE11E')]}>
        Welcome to Guftagu, Please comply with platform user regulations, chat with others politely and wish you have a pleasant time here.
      </Text>

      {/* Group 8871 — the host chip. */}
      <View style={[box(34, 65, 201, 56), { borderRadius: u(50), backgroundColor: 'rgba(54,27,44,0.5)', borderWidth: 0.4, borderColor: 'rgba(255,248,168,0.5)' }]} />
      <Image source={art.host} style={[box(40, 69, 48, 48), { borderRadius: u(24) }]} />
      <Text numberOfLines={1} style={[box(92, 78, 80, 16), font(12, 'medium', GOLD)]}>{user?.display_name ?? ''}</Text>
      <Text numberOfLines={1} style={[box(92, 94, 80, 14), font(11, 'medium')]}>{user ? `ID:${user.guftagu_id}` : ''}</Text>
      <SvgXml xml={blindIcons.follow} width={u(41.52)} height={u(36.57)} style={box(180, 75, 41.52, 36.57)} />

      {/* Help, share, power. */}
      <SvgXml xml={blindIcons.help} width={u(24)} height={u(24)} style={box(HELP_X[phase], 82, 24, 24)} />
      <SvgXml xml={blindIcons.share} width={u(20)} height={u(19)} style={box(335, 84, 20, 19)} />
      <Pressable onPress={() => navigation.goBack()} hitSlop={u(8)} accessibilityLabel="Leave" style={box(366, 79, 29, 29)}>
        <SvgXml xml={blindIcons.power} width={u(29)} height={u(29)} />
      </Pressable>

      {/* 3D Switch + 50k, and the viewers. */}
      <View style={[box(39, 139, 68, 33), { borderRadius: u(50), backgroundColor: '#361B2C', opacity: 0.6, borderWidth: 0.4, borderColor: 'rgba(255,248,168,0.5)' }]} />
      <Image source={art.award} resizeMode="cover" style={box(48, 147, 16, 18)} />
      <Text style={[box(69, 147, 40, 18), font(14, 'medium', GOLD)]}>50k</Text>
      <View style={[box(326, 140, 70, 32), { borderRadius: u(18), backgroundColor: 'rgba(255,255,255,0.38)' }]} />
      <Image source={art.viewer} style={[box(335, 145, 21, 21), { borderRadius: u(10.5) }]} />
      <Text style={[centred(370, 147, 36), font(14, 'medium')]}>34</Text>

      {/* Hosts and the eight seats. */}
      {HOSTS.map((h, i) => (
        <View key={i}>
          {ring(h.x, 232, 47.05, h.gold ? 'rgba(255,253,243,0.23)' : RING_FILL)}
          <View style={box(h.x + 8.4, 240.4, 30.25, 30.25)}>
            <SvgXml xml={h.gold ? hostIcon : seatIcon} width={u(22.69)} height={u(25.21)} style={{ position: 'absolute', left: u(3.78), top: u(2.52) }} />
          </View>
          <Text style={[centred(h.label, 280.8, 41), font(16, 'medium', '#F0EEFF')]}>Host</Text>
        </View>
      ))}
      {SEATS.map(seat)}

      {/* heart — Pick */}
      <Pressable onPress={() => setPhase((p) => (p === 'idle' ? 'choose' : p))} style={box(175, 349, 106, 106)} accessibilityLabel="Pick">
        <SvgXml xml={blindIcons.heart} width={u(99.95)} height={u(86.76)} style={{ position: 'absolute', left: u(3.03), top: u(11.8) }} />
        <Text style={[{ position: 'absolute', left: u(37), top: u(41) }, font(16, 'regular')]}>Pick</Text>
      </Pressable>

      {/* Frame 1597881845 — under seat 2: Pick, then Cancel. */}
      {phase === 'choose' && (
        <Pressable
          onPress={() => setPhase('picked')}
          style={[box(111, 371, 57, 28), { borderRadius: u(17), backgroundColor: '#FF4D00', alignItems: 'center', justifyContent: 'center' }]}
        >
          <Text style={font(15, 'medium')}>Pick</Text>
        </Pressable>
      )}
      {phase === 'picked' && (
        <Pressable
          onPress={() => setPhase('choose')}
          style={[box(103, 371, 72, 28), { borderRadius: u(17), backgroundColor: 'rgba(255,255,255,0.21)', alignItems: 'center', justifyContent: 'center' }]}
        >
          <Text style={font(12, 'medium')}>Cancel</Text>
        </Pressable>
      )}

      {/* All | Message | Gift, and the two entries. */}
      <View style={[box(30, 620, 147, 24), { flexDirection: 'row', gap: u(14), alignItems: 'center' }]}>
        <Text style={font(16, 'regular')}>All</Text>
        <Text style={[font(16, 'regular'), { opacity: 0.5 }]}>Message</Text>
        <Text style={[font(16, 'regular'), { opacity: 0.5 }]}>Gift</Text>
      </View>
      {[
        { x: 36, y: 671, panel: 660 },
        { x: 34, y: 736, panel: 725 },
      ].map((e) => (
        <View key={e.y}>
          <View style={[box(28, e.panel, 236, 53), { borderRadius: u(10), backgroundColor: PANEL, borderWidth: 1, borderColor: PANEL_LINE }]} />
          <Image source={art.chat} style={[box(e.x, e.y, 32, 32), { borderRadius: u(16) }]} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[box(e.x + 37, e.y, 73, 15), font(12, 'medium', GOLD)]}>Dhirem656 ...</Text>
          <Image source={art.level} resizeMode="stretch" style={box(e.x + 37, e.y + 16, 73, 16)} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[box(e.x + 114, e.y + 1, 112, 16), font(11, 'regular')]}>entered the room</Text>
        </View>
      ))}

      {/* Right rail: menu, Lucky Wheel, gift, game. */}
      <SvgXml xml={blindIcons.menu} width={u(53)} height={u(53)} style={box(369, 671, 53, 53)} />
      <Image source={art.wheel} resizeMode="cover" style={box(372, 734, 43, 43)} />
      <Text style={[centred(393, 777.49, 56), font(9, 'regular')]}>Lucky Wheel</Text>
      <SvgXml xml={blindIcons.giftGlow} width={u(47.56)} height={u(44.59)} style={box(364.64, 819.74, 47.56, 44.59)} />
      <Image source={art.gift} resizeMode="cover" style={[box(358.2, 797.2, 61.86, 61.86), { transform: [{ rotate: '-13.26deg' }] }]} />
      <Image source={art.game} resizeMode="cover" style={box(364, 876, 47, 47)} />

      {/* Bottom bar. */}
      <View style={[box(39, 880, 168, 45), { borderRadius: u(50), backgroundColor: 'rgba(20,8,18,0.63)', borderWidth: 1, borderColor: PANEL_LINE }]} />
      <Text numberOfLines={1} style={[box(56, 893, 140, 16), font(13, 'regular'), { opacity: 0.5 }]}>Say Something...</Text>
      <SvgXml xml={blindIcons.btnVolume} width={u(46)} height={u(46)} style={box(209, 884, 46, 46)} />
      <SvgXml xml={blindIcons.volume} width={u(18.15)} height={u(16.45)} style={box(222.02, 894.2, 18.15, 16.45)} />
      <SvgXml xml={blindIcons.btnMic} width={u(46)} height={u(46)} style={box(248, 884, 46, 46)} />
      <SvgXml xml={blindIcons.btnEmojiBg} width={u(46)} height={u(46)} style={box(287, 884, 46, 46)} />
      <SvgXml xml={blindIcons.emoji} width={u(20)} height={u(20)} style={box(300, 893, 20, 20)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#5A0B3A' },
});
