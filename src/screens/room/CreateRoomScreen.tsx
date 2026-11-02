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
 * runs wider. Figma marks nothing as selected; a chosen Mic Mode or
 * background takes the Start button's #DE4200.
 */
const W = 392;
const ACCENT = '#DE4200';
/** Frame 1597881214 and the Mic Mode cards. */
const FIELD_BORDER = 'rgba(0,0,0,0.29)';
const PLACEHOLDER = 'rgba(0,0,0,0.34)';

/** Room Tag was Figma's 625–811 block; Mic Mode (840) now sits where its label was (625). */
const TAG_BLOCK = 215;
/** The password field (1275) up to Room Background (1353): the room it frees while the switch is off. */
const PASSWORD_BLOCK = 78;

/**
 * Mic Mode — one card per seat template the admin panel defines (`/room-seat-templates`),
 * two to a row at Figma's card positions (Frames 1597881427 / 28 / 32 / 33: x 16 and 188, 8 apart,
 * first row at 870). Figma draws four fixed cards; the number of seats in each preview and its
 * size follow the same steps, picked by how many seats the template has.
 */
const MIC_TOP = 870;
const MIC_GAP = 8;
const MIC_COLUMNS = [{ x: 16, w: 165 }, { x: 188, w: 180 }] as const;
/** Where Figma's last card ends (1007 + 201): everything below the Mic Mode block hangs off it. */
const MIC_FIGMA_END = 1208;
const MIC_EMPTY_HEIGHT = 30;

/** The preview grid for a template: columns, seat size, spacing, and the card height that fits it. */
function micPreview(total: number) {
  const [cols, seat, step, rowStep, gridY] = total <= 4 ? [total, 41, 47, 47, 52] : total <= 12 ? [4, 29, 35, 38, 47] : total <= 20 ? [4, 29, 35, 36, 43] : [6, 20, 23, 24, 51];
  const rows = Math.ceil(total / cols);
  const height = Math.max(129, gridY + (rows - 1) * rowStep + seat + 24);
  return { cols, seat, step, rowStep, gridY, rows, height };
}

type Template = { id: number; name: string; total_seats: number; vip_positions: number[] };
type Theme = { id: number; name: string; background_url: string | null; preview_url: string | null; is_premium: boolean };
type Picked = { uri: string; mime: string };

export default function CreateRoomScreen() {
  const { width } = useWindowDimensions();
  const s = (v: number) => (v * width) / W;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token } = useAuth();

  const [cover, setCover] = useState<Picked | null>(null);
  const [title, setTitle] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [themes, setThemes] = useState<Theme[]>([]);
  /** A theme id, or 'own' for the picture picked from the "+" tile. */
  const [background, setBackground] = useState<number | 'own' | null>(null);
  const [ownBackground, setOwnBackground] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Theme[]>('/room-themes', { token }).then(setThemes).catch(() => undefined);
    api<Template[]>('/room-seat-templates', { token }).then(setTemplates).catch(() => setTemplates([]));
  }, [token]);

  // Two cards to a row; a row is as tall as its taller card.
  const micRows = (() => {
    const rows: { y: number; height: number; cards: { t: Template; col: number; p: ReturnType<typeof micPreview> }[] }[] = [];
    let y = MIC_TOP;
    for (let i = 0; i < (templates?.length ?? 0); i += 2) {
      const cards = (templates ?? []).slice(i, i + 2).map((t, col) => ({ t, col, p: micPreview(t.total_seats) }));
      const height = Math.max(...cards.map((c) => c.p.height));
      rows.push({ y, height, cards });
      y += height + MIC_GAP;
    }
    return rows;
  })();
  const micEnd = micRows.length ? micRows[micRows.length - 1].y + micRows[micRows.length - 1].height : MIC_TOP + MIC_EMPTY_HEIGHT;
  /** How far the Password and Background blocks move from Figma's spot, since the Mic Mode block is as tall as the admin's templates need. */
  const micDelta = micEnd - MIC_FIGMA_END;

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
    // With no templates to pick from, the server opens the room with its default seats.
    if (templateId === null && templates?.length) return setError('Choose a Mic Mode.');
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
          seat_template_id: templateId,
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ height: s(1626 - TAG_BLOCK - (locked ? 0 : PASSWORD_BLOCK) + micDelta) }} showsVerticalScrollIndicator={false}>
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

        {/* Everything below the announcement keeps Figma's coordinates, lifted by the Room Tag block that is no longer here. */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: -s(TAG_BLOCK), width, height: s(1626) }}>
        {/* Mic Mode — how many seats the room opens with. */}
        {label('Mic Mode', 16, 840)}
        {templates === null ? (
          <ActivityIndicator color={colors.black} style={{ position: 'absolute', left: s(16), top: s(MIC_TOP) }} />
        ) : templates.length === 0 ? (
          <Text style={[styles.regular, { position: 'absolute', left: s(16), top: s(MIC_TOP), fontSize: s(13), color: 'rgba(0,0,0,0.4)' }]}>No mic modes are set up yet.</Text>
        ) : null}
        {micRows.flatMap((row) =>
          row.cards.map(({ t, col, p }) => {
            const on = templateId === t.id;
            const glyph = p.seat * 0.643;
            const column = MIC_COLUMNS[col];
            const gridX = (column.w - ((Math.min(p.cols, t.total_seats) - 1) * p.step + p.seat)) / 2;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTemplateId(t.id)}
                style={{ position: 'absolute', left: s(column.x), top: s(row.y), width: s(column.w), height: s(row.height), borderRadius: s(7), borderWidth: on ? 2 : 1, borderColor: on ? ACCENT : FIELD_BORDER }}
              >
                <Text style={[styles.medium, { position: 'absolute', left: 0, right: 0, top: s(12), textAlign: 'center', fontSize: s(14), color: colors.black }]}>{`${t.total_seats} Mic`}</Text>
                {t.vip_positions.length ? (
                  <Text style={[styles.regular, { position: 'absolute', left: 0, right: 0, top: s(29), textAlign: 'center', fontSize: s(10), color: 'rgba(0,0,0,0.4)' }]}>{`${t.vip_positions.length} VIP`}</Text>
                ) : null}
                {Array.from({ length: t.total_seats }, (_, n) => {
                  const spot = { position: 'absolute', left: s(gridX + (n % p.cols) * p.step), top: s(p.gridY + Math.floor(n / p.cols) * p.rowStep), width: s(p.seat), height: s(p.seat) } as const;
                  // The same gold glass disc and ring the room draws on an empty VIP seat; `vip_positions` are 1-based seat numbers.
                  if (t.vip_positions.includes(n + 1)) {
                    return (
                      <View key={n} style={[styles.center, spot]}>
                        <Image source={require('../../assets/room/mz/seat-empty.png')} style={{ position: 'absolute', width: s(p.seat), height: s(p.seat), tintColor: '#F2C14E' }} />
                        <Image source={require('../../assets/room/mz/vip-ring-10.png')} style={{ position: 'absolute', width: s(p.seat * 1.04), height: s(p.seat * 1.04) }} />
                      </View>
                    );
                  }
                  return (
                    <View key={n} style={[styles.center, spot, { borderRadius: s(p.seat / 2), backgroundColor: '#4D2242' }]}>
                      <SvgXml xml={icons.seat} color="#FFC3DD" width={s(glyph * 0.9)} height={s(glyph)} />
                    </View>
                  );
                })}
              </Pressable>
            );
          }),
        )}

        {/* Password and Background keep Figma's coordinates, moved by however tall the Mic Mode block came out. */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: s(micDelta), width, height: s(1626) }}>
        {/* Room Password — Frame 1597881426 and its 3D Switch. */}
        {label('Room Password', 12, 1242)}
        <Pressable
          onPress={() => setLocked((v) => !v)}
          hitSlop={s(8)}
          style={{ position: 'absolute', left: s(329), top: s(1239), width: s(49), height: s(27), borderRadius: s(13.5), backgroundColor: locked ? '#08ACFF' : '#E0E0E0' }}
        >
          <View style={{ position: 'absolute', left: s(locked ? 25 : 3), top: s(3), width: s(21), height: s(21), borderRadius: s(10.5), backgroundColor: '#F4F5F5', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: s(3), shadowOffset: { width: s(1), height: s(1) }, elevation: 2 }} />
        </Pressable>
        {/* The field only exists while the switch is on. */}
        {locked ? (
        <View style={{ position: 'absolute', left: s(12), top: s(1275), width: s(369), height: s(47), borderRadius: s(10), borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', flexDirection: 'row', alignItems: 'center', paddingLeft: s(17), paddingRight: s(16) }}>
          <TextInput
            value={password}
            onChangeText={(t) => setPassword(t.slice(0, 8))}
            autoFocus
            secureTextEntry
            maxLength={8}
            placeholder="Enter your room password"
            placeholderTextColor="rgba(0,0,0,0.5)"
            style={[styles.regular, { flex: 1, fontSize: s(13), color: colors.black, padding: 0 }]}
          />
          <Text style={[styles.regular, { fontSize: s(13), color: 'rgba(0,0,0,0.35)' }]}>{`${password.length}/8`}</Text>
        </View>
        ) : null}

        {/* Room Background — the "+" upload, then the themes the backend offers. Rides up into the space the field leaves. */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: locked ? 0 : -s(PASSWORD_BLOCK), width, height: s(1626) }}>
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
        </View>
        </View>
        </View>
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
