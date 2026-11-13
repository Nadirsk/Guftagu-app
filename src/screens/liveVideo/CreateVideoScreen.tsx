import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { api, ApiError, uploadFile } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/liveVideo/icons';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { closeDark, plusIcon, TEAL, useUi } from './parts';

/**
 * Create a live video: Video (Figma 2015:7863) and Video Party (2015:8311, the seat grid and the
 * 4 / 6 / 9 choice). The Party frame is drawn 423 wide, 21 more than the phone frames, so its
 * numbers are scaled by 402 / 423 to fit. Start creates the room on the server (`POST /rooms` with
 * `kind` video or video_party) and opens it; the host is on camera from the first frame.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = 'video' | 'party';

const PARTY_SCALE = 402 / 423;

export default function CreateVideoScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('video');
  const [seats, setSeats] = useState<4 | 6 | 9>(4);
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [cover, setCover] = useState<string | null>(null);

  const party = mode === 'party';
  const k = 1; // one frame for both tabs; only the seat grid is drawn in a wider (423) frame and is squeezed to fit
  const pos = (x: number, y: number) => at(x * k, y * k);
  const u = (v: number) => px(v * k);
  const font = (size: number, weight: 'regular' | 'medium' | 'semiBold' = 'regular', color: string = colors.black) => text(size * k, weight, color);

  const pickCover = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!picked.canceled && picked.assets[0]) setCover(picked.assets[0].uri);
  };

  const start = async () => {
    if (!title.trim()) return Alert.alert('Live', 'Enter a title for your live.');
    if (busy) return;
    setBusy(true);
    try {
      const coverUrl = cover ? (await uploadFile<{ url: string }>('/media', { uri: cover, mime: 'image/jpeg' }, token)).url : null;
      const body = {
        kind: party ? 'video_party' : 'video',
        name: title.trim(),
        announcement: notice.trim() || null,
        cover_url: coverUrl,
        ...(party ? { seat_count: seats } : null),
      };
      const make = () => api<{ uuid: string }>('/rooms', { method: 'POST', token, body });
      let room: { uuid: string };
      try {
        room = await make();
      } catch (e) {
        // A live that was never ended (the app was killed mid-broadcast): it is dead, so end it and start the new one.
        const stale = e instanceof ApiError && e.code === 'ROOM_EXISTS' ? (e.details as { uuid?: string } | undefined)?.uuid : undefined;
        if (!stale) throw e;
        await api(`/rooms/${stale}/end`, { method: 'POST', token });
        room = await make();
      }
      navigation.replace('LiveVideoRoom', { uuid: room.uuid, cover: coverUrl });
    } catch (e) {
      Alert.alert('Live', e instanceof ApiError ? e.displayMessage : 'Could not start the live.');
    } finally {
      setBusy(false);
    }
  };

  // Seat grid under the card: one big seat and three beside it, as drawn for 4; 6 and 9 are an even grid.
  const gridTop = 355 * k;
  const gridHeight = 399 * k;
  const gridCells = () => {
    if (seats === 4) {
      return [
        { x: 0, y: 355, w: 270, h: 399, n: 0 },
        { x: 270, y: 355, w: 153, h: 134, n: 2 },
        { x: 270, y: 489, w: 153, h: 131, n: 3 },
        { x: 270, y: 620, w: 153, h: 134, n: 4 },
      ];
    }
    const cols = seats === 6 ? 2 : 3;
    const rows = seats / cols;
    const w = 423 / cols;
    const h = 399 / rows;
    return Array.from({ length: seats }, (_, i) => ({ x: (i % cols) * w, y: 355 + Math.floor(i / cols) * h, w, h, n: i === 0 ? 0 : i + 1 }));
  };
  // The grid sits between the cover card and the flip button, so every other control stays where Video has it.
  const G = 350 / 399;
  const fit = (c: { x: number; y: number; w: number; h: number; n: number }) => ({ ...c, x: c.x * PARTY_SCALE, w: c.w * PARTY_SCALE, y: 355 + (c.y - 355) * G, h: c.h * G });

  return (
    <View style={styles.screen}>
      {party &&
        gridCells().map(fit).map((c) => (
          <View key={c.n} style={[pos(c.x, c.y), { width: u(c.w), height: u(c.h), backgroundColor: '#D9D9D9', borderWidth: c.x === 0 && seats === 4 ? 0 : 1, borderColor: 'rgba(0,0,0,0.14)' }]}>
            {c.n > 0 && (
              <>
                <Text style={[at(12 * k, 11 * k), font(17, 'medium')]}>{c.n}</Text>
                {/* Ellipse 2045 and the add icon: in the 4-seat frame they sit 58 and 50 into the cell; otherwise centred. */}
                <View style={[at((seats === 4 ? 58 : c.w / 2 - 17) * k, (seats === 4 ? 50 : c.h / 2 - 17) * k), { width: u(34), height: u(34), borderRadius: u(17), backgroundColor: '#C9C5C5', alignItems: 'center', justifyContent: 'center' }]}>
                  <SvgXml xml={plusIcon(colors.black)} width={u(24)} height={u(24)} />
                </View>
              </>
            )}
          </View>
        ))}

      {/* Video / Video Party: one header for both; the chosen one is underlined. */}
      <View style={[pos(16, 84), { flexDirection: 'row', gap: u(3) }]}>
        <Pressable onPress={() => setMode('video')} style={{ width: u(107) }}>
          <Text style={[font(party ? 20 : 24, party ? 'medium' : 'semiBold'), party ? { opacity: 0.5 } : { textDecorationLine: 'underline' }]}>Video</Text>
        </Pressable>
        <Pressable onPress={() => setMode('party')} style={{ width: u(170) }}>
          <Text numberOfLines={1} style={[font(party ? 24 : 20, party ? 'semiBold' : 'medium'), party ? { textDecorationLine: 'underline' } : { opacity: 0.5 }]}>Video Party</Text>
        </Pressable>
      </View>

      {/* Frame 1597881127 — close. */}
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityLabel="Close"
        style={[pos(333, 76), { width: u(53), height: u(34), borderRadius: u(32), borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' }]}
      >
        <SvgXml xml={closeDark} width={u(24)} height={u(24)} />
      </Pressable>

      {/* Frame 1597881846 — cover, title, announcement. */}
      <View style={[pos(15, 142), { width: u(373), height: u(164), borderRadius: u(14), backgroundColor: 'rgba(0,0,0,0.07)', overflow: 'hidden' }]}>
        <Pressable onPress={pickCover} style={[at(10 * k, 11 * k), { width: u(76), height: u(73), borderRadius: u(11), backgroundColor: colors.white, overflow: 'hidden' }]}>
          {cover ? <Image source={{ uri: cover }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
          <Text style={[at(10 * k, 52 * k), font(12, 'regular'), cover ? { color: colors.white } : null]}>Edit Cover</Text>
        </Pressable>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="rgba(0,0,0,0.4)"
          maxLength={40}
          underlineColorAndroid="transparent"
          style={[at(100 * k, 18 * k), { width: u(260), height: u(24), padding: 0, includeFontPadding: false }, font(17, 'regular')]}
        />
        <TextInput
          value={notice}
          onChangeText={setNotice}
          placeholder="Room Announcement : please enter the room Announcement"
          placeholderTextColor="rgba(0,0,0,0.4)"
          multiline
          underlineColorAndroid="transparent"
          style={[at(16 * k, 114 * k), { width: u(345), height: u(40), padding: 0, textAlignVertical: 'top', includeFontPadding: false }, font(13, 'regular')]}
        />
      </View>

      {/* Video Party — 4 / 6 / 9 seats. */}
      {party && (
        <View style={[pos(131, 318), { flexDirection: 'row', gap: u(20) }]}>
          {([4, 6, 9] as const).map((n) => (
            <Pressable
              key={n}
              onPress={() => setSeats(n)}
              style={{ width: u(n === 9 ? 44 : 39), height: u(24), borderRadius: u(18), backgroundColor: seats === n ? colors.black : 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={font(17, 'medium', seats === n ? colors.white : colors.black)}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SvgXml xml={icons.switchCam} width={u(36)} height={u(36)} style={pos(183, 712)} />

      <Pressable onPress={start} disabled={busy} style={[pos(23, 783), { width: u(357), height: u(51), borderRadius: u(10), backgroundColor: TEAL, opacity: busy ? 0.6 : 1, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={font(20, 'medium', colors.white)}>{busy ? 'Starting...' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
