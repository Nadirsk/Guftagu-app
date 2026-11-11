import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/liveVideo/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { chevronLeft, closeWhite, GOLD, TEAL, useUi } from './parts';

/**
 * The host's live video room (Figma 2015:7951 and the sheets drawn over it: Private call, Applying
 * 2015:8155 / On a call 2015:7951, and Price settings 2015:8034). There is no video-room backend or
 * camera yet, so the stage is a dark backdrop, the audience and earnings are 0, and the chat is the
 * host's own messages; the controls and the two sheets work. The design draws everything on white (the
 * video is meant to sit behind it), so the chat tabs are white here to read on the dark backdrop.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Message = { id: number; kind: 'enter' | 'chat'; name: string; avatar: string | null; text: string };
type Sheet = null | 'calls' | 'price';

const avatarPlaceholder = require('../../assets/avatar-placeholder.png');

export default function LiveVideoRoomScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'LiveVideoRoom'>>();
  const { user } = useAuth();
  const name = user?.display_name ?? 'Guftagu';
  const id = user?.guftagu_id ?? '';
  const avatar = user?.avatar_url ?? null;
  const face = avatar ? { uri: avatar } : avatarPlaceholder;

  const [tab, setTab] = useState<'all' | 'message' | 'gift'>('all');
  const [messages, setMessages] = useState<Message[]>([{ id: 1, kind: 'enter', name, avatar, text: 'entered the room' }]);
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [callTab, setCallTab] = useState<'applying' | 'ongoing'>('applying');
  const [prices, setPrices] = useState({ voice: '', video: '' });
  const [draftPrices, setDraftPrices] = useState(prices);
  const [sound, setSound] = useState(false);
  const nextId = useRef(2);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [...m, { id: nextId.current++, kind: 'chat', name, avatar, text: body }]);
    setDraft('');
  };

  const end = () =>
    Alert.alert('End live', 'Do you want to end your live?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => navigation.replace('LiveVideoEnded', { cover: params.cover ?? avatar, audience: 0 }) },
    ]);

  // The two chat slots (30,633) and (30,698): the last two messages the tab shows.
  const shown = tab === 'gift' ? [] : messages.filter((m) => tab === 'all' || m.kind === 'chat').slice(-2);

  const openPrice = () => {
    setDraftPrices(prices);
    setSheet('price');
  };
  const confirmPrice = () => {
    setPrices(draftPrices);
    setSheet('calls');
  };

  const disc = (xml: string, size: number, left: number, top: number, onPress?: () => void, label?: string) => (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[at(left, top), { width: px(size), height: px(size) }]}>
      <SvgXml xml={xml} width={px(size)} height={px(size)} />
    </Pressable>
  );

  const priceBox = (top: number, label: string, key: 'voice' | 'video', coinLeft: number) => (
    <>
      <Text style={[at(21, top), text(15, 'medium')]}>{label}</Text>
      <View style={[at(21, top + 35), { width: px(360), height: px(48), borderRadius: px(7), borderWidth: 1, borderColor: 'rgba(0,0,0,0.13)', overflow: 'hidden' }]}>
        <TextInput
          value={draftPrices[key]}
          onChangeText={(v) => setDraftPrices({ ...draftPrices, [key]: v.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="rgba(0,0,0,0.4)"
          underlineColorAndroid="transparent"
          style={[{ position: 'absolute', left: px(13), top: px(13), width: px(200), height: px(20), padding: 0, includeFontPadding: false }, text(15, 'medium')]}
        />
        <Image source={require('../../assets/liveVideo/call-coin.png')} resizeMode="stretch" style={{ position: 'absolute', left: px(coinLeft), top: px(10), width: px(34), height: px(24) }} />
        <Text style={[at(coinLeft + 39, 13), text(15, 'regular')]}>/times</Text>
      </View>
    </>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* Group 8871 — the host pill: avatar, name, ID, follow. */}
      <View style={[at(16, 64), { width: px(201), height: px(56), borderRadius: px(50), borderWidth: 0.4, borderColor: 'rgba(255,248,168,0.5)', backgroundColor: 'rgba(54,27,44,0.5)' }]} />
      <Image source={face} style={[at(27, 73), { width: px(41), height: px(41), borderRadius: px(20.5) }]} />
      <Text numberOfLines={1} style={[at(74, 77), { width: px(80) }, text(12, 'medium', GOLD)]}>
        {name}
      </Text>
      <Text numberOfLines={1} style={[at(74, 93), { width: px(80) }, text(11, 'medium', colors.white)]}>
        ID:{id}
      </Text>
      <SvgXml xml={icons.follow} width={px(41.5)} height={px(36.6)} style={at(162, 74)} />

      {/* Frame 1597881169 — share and end. */}
      <SvgXml xml={icons.shareOut} width={px(20)} height={px(19)} style={at(317, 83)} />
      <Pressable onPress={end} accessibilityLabel="End live" hitSlop={px(8)} style={[at(348, 78), { width: px(29), height: px(29) }]}>
        <SvgXml xml={icons.power} width={px(29)} height={px(29)} />
      </Pressable>

      {/* 3D Switch + 50k, and the audience. */}
      <View style={[at(21, 138), { width: px(68), height: px(33), borderRadius: px(50), borderWidth: 0.4, borderColor: 'rgba(255,248,168,0.5)', backgroundColor: 'rgba(54,27,44,0.6)' }]} />
      <Image source={require('../../assets/liveVideo/award.png')} resizeMode="contain" style={[at(30, 146), { width: px(16), height: px(18) }]} />
      <Text style={[at(51, 146), text(14, 'medium', GOLD)]}>50k</Text>
      <View style={[at(308, 139), { width: px(70), height: px(32), borderRadius: px(18), backgroundColor: 'rgba(0,0,0,0.18)', overflow: 'hidden' }]}>
        <Image source={face} style={[at(9, 5), { width: px(21), height: px(21), borderRadius: px(10.5) }]} />
        <Text style={[at(35, 7), { width: px(18), textAlign: 'center' }, text(14, 'medium', colors.white)]}>0</Text>
      </View>

      {/* Frame 1597881173 — All / Message / Gift. */}
      <View style={[at(30, 593), { flexDirection: 'row', gap: px(14) }]}>
        {(['all', 'message', 'gift'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} hitSlop={px(6)}>
            <Text style={[text(16, 'regular', colors.white), { opacity: tab === t ? 1 : 0.5 }]}>{t === 'all' ? 'All' : t === 'message' ? 'Message' : 'Gift'}</Text>
          </Pressable>
        ))}
      </View>

      {/* Group 8867 / 1597881063 — two chat slots, 53 high, 12 apart. */}
      {shown.map((m, i) => (
        <View key={m.id} style={[at(30, 633 + i * 65), { width: px(236), height: px(53), borderRadius: px(10), borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)', backgroundColor: 'rgba(20,8,18,0.22)', overflow: 'hidden' }]}>
          <Image source={m.avatar ? { uri: m.avatar } : avatarPlaceholder} style={[at(7, 10), { width: px(32), height: px(32), borderRadius: px(16) }]} />
          <Text numberOfLines={1} style={[at(44, 10), { width: px(73) }, text(12, 'medium', GOLD)]}>
            {m.name}
          </Text>
          {m.kind === 'enter' ? (
            <>
              <Image source={require('../../assets/liveVideo/badge.png')} resizeMode="cover" style={[at(44, 26), { width: px(73), height: px(16) }]} />
              <Text style={[at(120, 10), text(11, 'regular', colors.white)]}>{m.text}</Text>
            </>
          ) : (
            <Text numberOfLines={2} style={[at(44, 26), { width: px(184) }, text(11, 'regular', colors.white)]}>
              {m.text}
            </Text>
          )}
        </View>
      ))}

      {/* Rectangle 61 — Say Something. */}
      <View style={[at(23, 789), { width: px(168), height: px(45), borderRadius: px(50), borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)', backgroundColor: 'rgba(0,0,0,0.22)' }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          returnKeyType="send"
          placeholder="Say Something..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          underlineColorAndroid="transparent"
          style={[{ position: 'absolute', left: px(16), top: px(12), right: px(12), height: px(18), padding: 0, includeFontPadding: false }, text(13, 'regular', colors.white)]}
        />
      </View>

      {/* Volume, mic, emoji and menu discs (each export carries its glow, so it overhangs the 34-41 box by 6 / 2). */}
      <SvgXml xml={icons.volumeDisc} width={px(46)} height={px(46)} style={at(193, 793)} />
      <SvgXml xml={icons.volume} width={px(15.9)} height={px(12.4)} style={at(206.7, 805.2)} />
      {disc(icons.mic, 51, 235, 790, undefined, 'Mic')}
      {disc(icons.emojiDisc, 51, 281, 791, undefined, 'Emoji')}
      <SvgXml xml={icons.smile} width={px(20)} height={px(20)} style={at(295, 803)} />
      {disc(icons.menu, 53, 331, 789, undefined, 'Menu')}

      {/* Group 1597881116 + unlink-2 — Private call. */}
      <Pressable onPress={() => setSheet('calls')} accessibilityLabel="Private call" style={[at(333, 739), { width: px(56), height: px(56) }]}>
        <SvgXml xml={icons.linkDisc} width={px(56)} height={px(56)} />
        <SvgXml xml={icons.link} width={px(23.3)} height={px(23.3)} style={{ position: 'absolute', left: px(14.8), top: px(12.8) }} />
      </Pressable>

      {/* Rectangle 161124141 + Frame 1597881872 — the Private call sheet. */}
      {sheet !== null && (
        <>
          <Pressable onPress={() => setSheet(null)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
          <View style={[at(0, 210), { right: 0, bottom: 0, backgroundColor: colors.white, overflow: 'hidden' }]}>
            <View style={{ height: px(74), backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={text(20, 'medium', colors.white)}>Private call</Text>
              <Pressable onPress={openPrice} accessibilityLabel="Price settings" hitSlop={px(8)} style={[at(17, 28), { width: px(24), height: px(24) }]}>
                <SvgXml xml={icons.settings} width={px(24)} height={px(24)} />
              </Pressable>
              <Pressable onPress={() => setSheet(null)} accessibilityLabel="Close" hitSlop={px(8)} style={[at(355, 28), { width: px(24), height: px(24) }]}>
                <SvgXml xml={closeWhite} width={px(24)} height={px(24)} />
              </Pressable>
            </View>
            <View style={[at(64, 132), { width: px(275), height: px(23), flexDirection: 'row', justifyContent: 'space-between' }]}>
              <Pressable onPress={() => setCallTab('applying')}>
                <Text style={[text(18, 'medium'), { opacity: callTab === 'applying' ? 1 : 0.3 }]}>Applying</Text>
              </Pressable>
              <Pressable onPress={() => setCallTab('ongoing')}>
                <Text style={[text(18, 'medium'), { opacity: callTab === 'ongoing' ? 1 : 0.3 }]}>On a call</Text>
              </Pressable>
            </View>
            {/* Frame 1597881540 — nothing yet, as no one has called. */}
            <View style={[at(117, 279), { width: px(183) }]}>
              <Image source={require('../../assets/liveVideo/no-content.png')} resizeMode="cover" style={{ width: px(183), height: px(183) }} />
              <Text style={[text(15, 'medium'), { textAlign: 'center', opacity: 0.4 }]}>No Content here</Text>
            </View>
          </View>
        </>
      )}

      {/* Rectangle 161124143 + Frame 1597881874 — Price settings, over the sheet. */}
      {sheet === 'price' && (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
          <View style={[at(0, 332), { right: 0, bottom: 0, backgroundColor: colors.white, overflow: 'hidden' }]}>
            {/* The fields sit at the design's own y inside the sheet (the title bar is its first 74). */}
            {priceBox(134, 'Set voice call price', 'voice', 258)}
            {priceBox(255, 'Set Video call price', 'video', 261)}
            <Text style={[at(22, 368), text(15, 'medium')]}>Sound</Text>
            <Text style={[at(22, 401), { width: px(302), opacity: 0.3 }, text(15, 'regular')]}>
              After turning on the sound , the audience in the live broadcast room can hear the conversation content
            </Text>
            {/* Frame 1597881878 — the switch: 55 x 24, a 13% black track, a white 20px knob. */}
            <Pressable
              onPress={() => setSound((s) => !s)}
              accessibilityLabel="Sound"
              style={[at(331, 401), { width: px(55), height: px(24), borderRadius: px(12), backgroundColor: sound ? TEAL : 'rgba(0,0,0,0.13)' }]}
            >
              <View style={{ position: 'absolute', top: px(2), left: px(sound ? 33 : 3), width: px(20), height: px(20), borderRadius: px(10), backgroundColor: colors.white }} />
            </Pressable>
            <View style={{ height: px(74), backgroundColor: TEAL, position: 'absolute', left: 0, right: 0, top: 0 }}>
              <Pressable onPress={() => setSheet('calls')} accessibilityLabel="Back" hitSlop={px(8)} style={[at(17, 25), { width: px(24), height: px(24) }]}>
                <SvgXml xml={chevronLeft('#FFFFFF')} width={px(24)} height={px(24)} />
              </Pressable>
              <Text style={[at(144, 27), text(15, 'medium', colors.white)]}>Price settings</Text>
              <Pressable onPress={confirmPrice} hitSlop={px(8)} style={at(323, 28)}>
                <Text style={text(15, 'medium', colors.white)}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1B1B1B' },
});

