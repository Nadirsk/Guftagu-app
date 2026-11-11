import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/liveVideo/icons';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { closeDark, plusIcon, TEAL, useUi } from './parts';

/**
 * Create a live video: Video (Figma 2015:7863) and Video Party (2015:8311, the seat grid and the
 * 4 / 6 / 9 choice). The Party frame is drawn 423 wide, 21 more than the phone frames, so its
 * numbers are scaled by 402 / 423 to fit. Start opens the host's live room; nothing is created on the
 * server — there is no video-room backend yet.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = 'video' | 'party';

const PARTY_SCALE = 402 / 423;

export default function CreateVideoScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<Mode>('video');
  const [seats, setSeats] = useState<4 | 6 | 9>(4);
  const [title, setTitle] = useState('');
  const [notice, setNotice] = useState('');
  const [cover, setCover] = useState<string | null>(null);

  const party = mode === 'party';
  const k = party ? PARTY_SCALE : 1;
  const pos = (x: number, y: number) => at(x * k, y * k);
  const u = (v: number) => px(v * k);
  const font = (size: number, weight: 'regular' | 'medium' | 'semiBold' = 'regular', color: string = colors.black) => text(size * k, weight, color);

  const pickCover = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!picked.canceled && picked.assets[0]) setCover(picked.assets[0].uri);
  };

  const start = () => {
    if (!title.trim()) return Alert.alert('Live', 'Enter a title for your live.');
    navigation.replace('LiveVideoRoom', { title: title.trim(), notice: notice.trim(), cover, seats: party ? seats : 0 });
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

  return (
    <View style={styles.screen}>
      {party &&
        gridCells().map((c) => (
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

      {/* Frame 1597881126 — Video / Video Party. The chosen one is underlined (Video is 24 and bold when chosen). */}
      {party ? (
        <View style={[pos(103, 105), { flexDirection: 'row', gap: u(3) }]}>
          <Pressable onPress={() => setMode('video')} style={{ width: u(97) }}>
            <Text style={[font(24, 'medium'), { opacity: 0.3 }]}>Video</Text>
          </Pressable>
          <Pressable style={{ width: u(140) }}>
            <Text numberOfLines={1} style={[font(20, 'medium'), { textDecorationLine: 'underline' }]}>Video Party</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[pos(16, 84), { flexDirection: 'row', gap: u(3) }]}>
          <Pressable style={{ width: u(107) }}>
            <Text style={[font(24, 'semiBold'), { textDecorationLine: 'underline' }]}>Video</Text>
          </Pressable>
          <Pressable onPress={() => setMode('party')} style={{ width: u(140) }}>
            <Text numberOfLines={1} style={[font(20, 'medium'), { opacity: 0.5 }]}>Video Party</Text>
          </Pressable>
        </View>
      )}

      {/* Frame 1597881127 — close. */}
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityLabel="Close"
        style={[pos(party ? 344 : 333, party ? 115 : 76), { width: u(53), height: u(34), borderRadius: u(32), borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' }]}
      >
        <SvgXml xml={closeDark} width={u(24)} height={u(24)} />
      </Pressable>

      {/* Frame 1597881846 — cover, title, announcement. */}
      <View style={[pos(party ? 25 : 15, party ? 172 : 142), { width: u(373), height: u(164), borderRadius: u(14), backgroundColor: 'rgba(0,0,0,0.07)', overflow: 'hidden' }]}>
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
        <View style={[pos(131, 798), { flexDirection: 'row', gap: u(20) }]}>
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

      <SvgXml xml={icons.switchCam} width={u(36)} height={u(36)} style={pos(party ? 18 : 183, party ? 860 : 712)} />

      <Pressable onPress={start} style={[pos(party ? 73 : 23, party ? 853 : 783), { width: u(party ? 310 : 357), height: u(51), borderRadius: u(10), backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={font(20, 'medium', colors.white)}>Start</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
