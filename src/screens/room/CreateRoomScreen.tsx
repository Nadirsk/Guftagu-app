import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Rect, SvgXml } from 'react-native-svg';

import { api, ApiError, uploadFile } from '../../api/client';
import * as icons from '../../assets/room/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors, typography } from '../../theme/tokens';

/**
 * Create Room — Figma 397:2803 (files 5tXLIf98AkO8fPRVOQRDc0 / ODEXeeT7yuiT9r7AG4Q3Gh).
 *
 * The frame is 392 wide, not the 402 the rest of the app is drawn on, so this
 * screen scales by its own width. Every number below is that frame's. Figma sets
 * the labels in Mona Sans / Delight; Poppins stands in a size smaller, as it
 * runs wider. Figma marks nothing as selected; a chosen tag, Mic Mode or
 * background takes the Start button's #DE4200.
 */
const W = 392;
const ACCENT = '#DE4200';
/** Frame 1597881214 and the Mic Mode cards. */
const FIELD_BORDER = 'rgba(0,0,0,0.29)';
/** The Room Tag pills. */
const TAG_BORDER = 'rgba(0,0,0,0.2)';
const PLACEHOLDER = 'rgba(0,0,0,0.34)';

/** Room Tag — "All" files the room under no tag; the rest are category keys. */
const TAGS: { label: string; key: string | null; x: number; w: number; row: number }[] = [
  { label: 'All', key: null, x: 0, w: 62, row: 0 },
  { label: 'Chat', key: 'chat', x: 73, w: 77, row: 0 },
  { label: 'Birthday', key: 'birthday', x: 161, w: 110, row: 0 },
  { label: 'Party', key: 'party', x: 282, w: 86, row: 0 },
  { label: 'Singing', key: 'singing', x: 0, w: 93, row: 1 },
  { label: 'Game', key: 'game', x: 98, w: 81, row: 1 },
  { label: 'Friend', key: 'friend', x: 184, w: 93, row: 1 },
  { label: 'Emotion', key: 'emotion', x: 282, w: 96, row: 1 },
  { label: 'Football', key: 'football', x: 0, w: 100, row: 2 },
  { label: 'DJ', key: 'dj', x: 105, w: 59, row: 2 },
];

/**
 * The four Mic Mode cards. `rows` is each preview row's seat count, `seat` the
 * preview seat's size and `step` the distance between neighbours, all from
 * Frames 1597881427 / 28 / 32 / 33.
 */
const MIC_MODES = [
  { seats: 2, x: 16, y: 870, w: 165, h: 129, label: { y: 12 }, grid: { x: 38, y: 52 }, rows: [2], seat: 41, step: 47, rowStep: 0 },
  { seats: 12, x: 188, y: 870, w: 180, h: 129, label: { y: 15 }, grid: { x: 23, y: 47 }, rows: [4, 4], seat: 29, step: 35, rowStep: 38 },
  { seats: 20, x: 16, y: 1007, w: 165, h: 201, label: { y: 15 }, grid: { x: 15, y: 43 }, rows: [4, 4, 4, 3], seat: 29, step: 35, rowStep: 36 },
  { seats: 40, x: 188, y: 1007, w: 180, h: 201, label: { y: 18 }, grid: { x: 22, y: 51 }, rows: [6, 6, 6, 6, 6], seat: 20, step: 23, rowStep: 24 },
] as const;

type Theme = { id: number; name: string; background_url: string | null; preview_url: string | null; is_premium: boolean };
type Category = { id: number; key: string };
type Picked = { uri: string; mime: string };

export default function CreateRoomScreen() {
  const { width } = useWindowDimensions();
  const s = (v: number) => (v * width) / W;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token } = useAuth();

  const [cover, setCover] = useState<Picked | null>(null);
  const [title, setTitle] = useState('');
  const [announcement, setAnnouncement] = useState('');
  /** Nothing is picked until tapped, as Figma draws it; `null` is the "All" pill. */
  const [tag, setTag] = useState<string | null | undefined>(undefined);
  const [seats, setSeats] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  /** A theme id, or 'own' for the picture picked from the "+" tile. */
  const [background, setBackground] = useState<number | 'own' | null>(null);
  const [ownBackground, setOwnBackground] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Theme[]>('/room-themes', { token }).then(setThemes).catch(() => undefined);
    api<Category[]>('/room-categories', { token }).then(setCategories).catch(() => undefined);
  }, [token]);

  const pick = async (): Promise<Picked | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return null;
    const a = result.assets[0];
    // "Upload images up to 10 mb" — the server says so too, but this is sooner.
    if (a.fileSize && a.fileSize > 10 * 1024 * 1024) {
      setError('That picture is larger than 10 MB.');
      return null;
    }
    return { uri: a.uri, mime: a.mimeType ?? 'image/jpeg' };
  };

  const start = async () => {
    setError(null);
    if (!title.trim()) return setError('Give the room a title.');
    if (seats === null) return setError('Choose a Mic Mode.');
    if (locked && (password.length < 4 || password.length > 8)) return setError('The password needs 4 to 8 characters.');

    setBusy(true);
    try {
      const upload = async (p: Picked | null) => (p ? (await uploadFile<{ url: string }>('/media', p, token)).url : null);
      const coverUrl = await upload(cover);
      const backgroundUrl = background === 'own' ? await upload(ownBackground) : null;
      const room = await api<{ uuid: string }>('/rooms', {
        method: 'POST',
        token,
        body: {
          name: title.trim(),
          announcement: announcement.trim() || null,
          cover_url: coverUrl,
          category_id: tag ? categories.find((c) => c.key === tag)?.id ?? null : null,
          seat_count: seats,
          visibility: locked ? 'private' : 'public',
          password: locked ? password : null,
          theme_id: typeof background === 'number' ? background : null,
          background_url: backgroundUrl,
        },
      });
      navigation.replace('Room', { uuid: room.uuid });
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Could not create the room.');
    } finally {
      setBusy(false);
    }
  };

  const label = (text: string, x: number, y: number, size = 15) => (
    <Text style={[styles.medium, { position: 'absolute', left: s(x), top: s(y), fontSize: s(size), color: colors.black }]}>{text}</Text>
  );

  const field = (y: number, value: string, onChange: (t: string) => void, placeholder: string, textX: number) => (
    <View style={{ position: 'absolute', left: s(16), top: s(y), width: s(370), height: s(51), borderRadius: s(9), borderWidth: 1, borderColor: FIELD_BORDER, justifyContent: 'center' }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
        maxLength={y < 500 ? 80 : 500}
        style={[styles.regular, { marginLeft: s(textX), marginRight: s(12), fontSize: s(16), color: colors.black, padding: 0 }]}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ height: s(1626) }} showsVerticalScrollIndicator={false}>
        {/* Frame 1597881208 — back and the title. */}
        <Pressable onPress={() => navigation.goBack()} hitSlop={s(10)} style={{ position: 'absolute', left: s(16), top: s(83) }}>
          <ArrowLeft size={s(24)} color="#1D1B20" strokeWidth={2} />
        </Pressable>
        <Text style={[styles.regular, { position: 'absolute', left: s(49), top: s(83), fontSize: s(17), color: colors.black }]}>Create Room</Text>

        {/* Frame 1597881230 — Start. */}
        <Pressable
          onPress={start}
          disabled={busy}
          style={[styles.center, { position: 'absolute', left: s(274), top: s(78), width: s(107), height: s(40), borderRadius: s(27), backgroundColor: ACCENT }]}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.medium, { fontSize: s(16), color: colors.white }]}>Start</Text>}
        </Pressable>
        {error ? (
          <Text style={[styles.regular, { position: 'absolute', left: s(16), right: s(16), top: s(128), fontSize: s(12), color: '#D32F2F' }]}>{error}</Text>
        ) : null}

        {/* Room Cover — the dashed drop box (Frame 1597881224). */}
        {label('Room Cover', 16, 174)}
        <Pressable
          onPress={async () => setCover((await pick()) ?? cover)}
          style={{ position: 'absolute', left: s(16), top: s(218), width: s(370), height: s(166), borderRadius: s(8), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Long dashes, as Figma draws them — a dashed borderStyle renders dots on some platforms. */}
          <Svg width={s(370)} height={s(166)} style={StyleSheet.absoluteFill}>
            <Rect x={0.5} y={0.5} width={s(370) - 1} height={s(166) - 1} rx={s(8)} fill="none" stroke="#009DFF" strokeWidth={1} strokeDasharray={`${s(12)} ${s(12)}`} />
          </Svg>
          {cover ? (
            <Image source={{ uri: cover.uri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <>
              <SvgXml xml={icons.camera} width={s(46)} height={s(46)} />
              <Text style={[styles.medium, { marginTop: s(8), fontSize: s(13), color: 'rgba(0,0,0,0.3)' }]}>Upload images  up to 10 mb</Text>
            </>
          )}
        </Pressable>

        {label('Room Title', 16, 416)}
        {field(445, title, setTitle, 'Enter Title', 18)}
        {label('Room Announcement', 16, 521)}
        {field(550, announcement, setAnnouncement, 'Enter announcement', 13)}

        {/* Room Tag — Frame 1597881340, three rows 54 apart. */}
        {label('Room Tag', 16, 625)}
        {TAGS.map((t) => {
          const on = tag === t.key;
          return (
            <Pressable
              key={t.label}
              onPress={() => setTag(t.key)}
              style={{ position: 'absolute', left: s(16 + t.x), top: s(661 + t.row * 54), width: s(t.w), height: s(42), borderRadius: s(26), borderWidth: 1, borderColor: on ? ACCENT : TAG_BORDER, backgroundColor: on ? ACCENT : 'transparent', justifyContent: 'center', paddingLeft: s(19) }}
            >
              <Text numberOfLines={1} style={[styles.medium, { fontSize: s(15), color: on ? colors.white : colors.black }]}>{t.label}</Text>
            </Pressable>
          );
        })}

        {/* Mic Mode — how many seats the room opens with. */}
        {label('Mic Mode', 16, 840)}
        {MIC_MODES.map((m) => {
          const on = seats === m.seats;
          const glyph = m.seat * 0.643;
          return (
            <Pressable
              key={m.seats}
              onPress={() => setSeats(m.seats)}
              style={{ position: 'absolute', left: s(m.x), top: s(m.y), width: s(m.w), height: s(m.h), borderRadius: s(7), borderWidth: on ? 2 : 1, borderColor: on ? ACCENT : FIELD_BORDER }}
            >
              <Text style={[styles.medium, { position: 'absolute', left: 0, right: 0, top: s(m.label.y), textAlign: 'center', fontSize: s(14), color: colors.black }]}>{`${m.seats} Mic`}</Text>
              {m.rows.map((count, r) =>
                Array.from({ length: count }, (_, i) => (
                  <View
                    key={`${r}-${i}`}
                    style={[styles.center, { position: 'absolute', left: s(m.grid.x + i * m.step), top: s(m.grid.y + r * m.rowStep), width: s(m.seat), height: s(m.seat), borderRadius: s(m.seat / 2), backgroundColor: '#4D2242' }]}
                  >
                    <SvgXml xml={icons.seat} color="#FFC3DD" width={s(glyph * 0.9)} height={s(glyph)} />
                  </View>
                )),
              )}
            </Pressable>
          );
        })}

        {/* Room Password — Frame 1597881426 and its 3D Switch. */}
        {label('Room Password', 12, 1242)}
        <Pressable
          onPress={() => setLocked((v) => !v)}
          hitSlop={s(8)}
          style={{ position: 'absolute', left: s(329), top: s(1239), width: s(49), height: s(27), borderRadius: s(13.5), backgroundColor: locked ? '#08ACFF' : '#E0E0E0' }}
        >
          <View style={{ position: 'absolute', left: s(locked ? 25 : 3), top: s(3), width: s(21), height: s(21), borderRadius: s(10.5), backgroundColor: '#F4F5F5', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: s(3), shadowOffset: { width: s(1), height: s(1) }, elevation: 2 }} />
        </Pressable>
        <View style={{ position: 'absolute', left: s(12), top: s(1275), width: s(369), height: s(47), borderRadius: s(10), borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', flexDirection: 'row', alignItems: 'center', paddingLeft: s(17), paddingRight: s(16), opacity: locked ? 1 : 0.5 }}>
          <TextInput
            value={password}
            onChangeText={(t) => setPassword(t.slice(0, 8))}
            editable={locked}
            secureTextEntry
            maxLength={8}
            placeholder="Enter your room password"
            placeholderTextColor="rgba(0,0,0,0.5)"
            style={[styles.regular, { flex: 1, fontSize: s(13), color: colors.black, padding: 0 }]}
          />
          <Text style={[styles.regular, { fontSize: s(13), color: 'rgba(0,0,0,0.35)' }]}>{`${password.length}/8`}</Text>
        </View>

        {/* Room Background — the "+" upload, then the themes the backend offers. */}
        {label('Room Background', 17, 1353, 16)}
        <Text style={[styles.regular, { position: 'absolute', left: s(17), top: s(1381), fontSize: s(10), color: 'rgba(0,0,0,0.4)' }]}>
          Room Background VIP5/VIP6/VIP7/VIP 8 Room background for free
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ position: 'absolute', left: 0, right: 0, top: s(1409), height: s(183) }}
          contentContainerStyle={{ paddingLeft: s(17), paddingRight: s(17), gap: s(6), alignItems: 'flex-end' }}
        >
          <Pressable
            onPress={async () => {
              const p = await pick();
              if (p) {
                setOwnBackground(p);
                setBackground('own');
              }
            }}
            style={[styles.center, { width: s(87), height: s(183), borderRadius: s(10), borderWidth: background === 'own' ? 2 : 1, borderColor: background === 'own' ? ACCENT : 'rgba(0,0,0,0.18)', overflow: 'hidden' }]}
          >
            {ownBackground ? <Image source={{ uri: ownBackground.uri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
            {ownBackground ? null : <SvgXml xml={icons.plus} width={s(31)} height={s(31)} />}
          </Pressable>
          {themes
            .filter((t) => t.preview_url ?? t.background_url)
            // `/room-themes` sorts by name; Figma's row is the free six in their own
            // order (seeded in that order), then anything premium.
            .sort((a, b) => Number(a.is_premium) - Number(b.is_premium) || a.id - b.id)
            .map((t) => {
              const on = background === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setBackground(on ? null : t.id)}
                  style={{ width: s(85), height: s(183), borderRadius: s(11), overflow: 'hidden', borderWidth: on ? 2 : 0, borderColor: ACCENT }}
                >
                  <Image source={{ uri: (t.preview_url ?? t.background_url) as string }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                </Pressable>
              );
            })}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', justifyContent: 'center' },
  regular: { fontFamily: typography.fontFamily.regular },
  medium: { fontFamily: typography.fontFamily.medium },
});
