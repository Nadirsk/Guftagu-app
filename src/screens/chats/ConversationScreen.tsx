import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Keyboard, Pressable, ScrollView, type ScrollViewInstance, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError, uploadFile } from '../../api/client';
import { getEcho } from '../../api/realtime';
import * as icons from '../../assets/chats/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { THREAD } from './geometry';
import { avatarOf, type ChatMessage, nameOf, styles } from './parts';

/**
 * A DM thread — node 511:2459. Messages come from
 * `GET /conversations/{uuid}/messages` (newest first, so they are reversed here)
 * and arrive live as `message.new` on `conversation.{uuid}`; without Reverb the
 * thread polls instead.
 *
 * Mic and gift have no server side for DMs yet (gifts are room-only), so they
 * say so. The canned replies are Figma's own three.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'Conversation'>;

const QUICK = ['Hey there!', 'Hello JI', 'Hello Sab theek ?'];
const POLL_MS = 5000;
/** A new time stamp when the thread goes quiet for this long. */
const STAMP_GAP_MS = 60 * 60 * 1000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon 2.29 AM", as Figma prints it. */
function stamp(iso: string) {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${DAYS[d.getDay()]} ${h}.${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export default function ConversationScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { uuid, peer } = useRoute<RouteProp<RootStackParamList, 'Conversation'>>().params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [kb, setKb] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const T = THREAD;

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.uuid, m]));
      for (const m of incoming) byId.set(m.uuid, m);
      return [...byId.values()].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const page = await api<ChatMessage[]>(`/conversations/${uuid}/messages?limit=50`, { token });
      merge(page);
      api(`/conversations/${uuid}/read`, { method: 'POST', token }).catch(() => undefined);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
  }, [merge, token, uuid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Live when Reverb is reachable; otherwise a gentle poll.
  useEffect(() => {
    const echo = token ? getEcho(token) : null;
    if (echo) {
      const channel = echo.private(`conversation.${uuid}`);
      channel.listen('.message.new', (e: { message: ChatMessage }) => {
        merge([e.message]);
        api(`/conversations/${uuid}/read`, { method: 'POST', token }).catch(() => undefined);
      });
      return () => echo.leave(`conversation.${uuid}`);
    }
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load, merge, token, uuid]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const send = async (body: { type: 'text'; body: string } | { type: 'image'; media_url: string }) => {
    try {
      const { message } = await api<{ message: ChatMessage }>(`/conversations/${uuid}/messages`, { method: 'POST', body, token });
      merge([message]);
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not send that message.');
    }
  };

  const sendText = (text = draft) => {
    const body = text.trim();
    if (!body) return;
    if (text === draft) setDraft('');
    send({ type: 'text', body });
  };

  const sendPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    try {
      const { url } = await uploadFile<{ url: string }>('/media', { uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' }, token);
      send({ type: 'image', media_url: url });
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not upload that photo.');
    }
  };

  const followPeer = async () => {
    try {
      await api(`/users/${peer.uuid}/follow`, { method: 'POST', token });
      Alert.alert('Follow', `You are following ${nameOf(peer)}.`);
    } catch (e) {
      Alert.alert('Follow', e instanceof ApiError ? e.displayMessage : 'Could not follow right now.');
    }
  };

  const B = T.bubble;
  const panelBottom = kb;
  let lastAt = 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        ref={scroll}
        style={{ position: 'absolute', left: 0, right: 0, top: px(T.list.top), bottom: panelBottom + px(T.quick.bottom + T.quick.height + 8) }}
        contentContainerStyle={{ paddingTop: px(T.list.stampTop), paddingBottom: px(12), gap: px(B.rowGap) }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m) => {
          const at = m.created_at ? new Date(m.created_at).getTime() : 0;
          const showStamp = at - lastAt > STAMP_GAP_MS;
          lastAt = at || lastAt;
          const mine = m.sender?.uuid === user?.uuid;
          const content =
            m.type === 'image' && m.media_url && !m.is_deleted ? (
              <Pressable onPress={() => navigation.navigate('MediaViewer', { urls: [m.media_url as string] })}>
                <Image source={{ uri: m.media_url }} resizeMode="cover" style={{ width: px(180), height: px(180), borderRadius: px(B.radius) }} />
              </Pressable>
            ) : (
              <View
                style={{
                  maxWidth: px(260),
                  padding: px(B.padding),
                  backgroundColor: mine ? B.mine : B.theirs,
                  borderTopLeftRadius: px(B.radius),
                  borderTopRightRadius: px(B.radius),
                  borderBottomLeftRadius: mine ? px(B.radius) : 0,
                  borderBottomRightRadius: mine ? 0 : px(B.radius),
                }}
              >
                <Text style={[styles.regular, { fontSize: px(B.size), lineHeight: px(B.size * 1.2), color: mine ? colors.white : colors.black }]}>
                  {m.is_deleted ? 'Message deleted' : m.body ?? ''}
                </Text>
              </View>
            );
          return (
            <View key={m.uuid} style={{ gap: px(B.rowGap) }}>
              {showStamp && m.created_at ? (
                <Text style={[styles.regular, { textAlign: 'center', fontSize: px(T.stamp.size), lineHeight: px(22), opacity: T.stamp.opacity, marginBottom: px(31 - B.rowGap) }]}>
                  {stamp(m.created_at)}
                </Text>
              ) : null}
              {mine ? (
                <View style={{ alignSelf: 'flex-end', marginRight: px(B.side) }}>{content}</View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginLeft: px(B.side), gap: px(B.avatarGap) }}>
                  <Image source={avatarOf(m.sender ?? peer)} style={{ width: px(B.avatar), height: px(B.avatar), borderRadius: px(B.avatar / 2) }} />
                  {content}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Frame 1597881509 + 1597881511 */}
      <View style={[{ position: 'absolute', left: px(T.header.x), top: px(T.header.y), width: px(T.header.width), height: px(T.header.back), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={px(12)}>
          <ArrowLeft size={px(T.header.back)} color={colors.black} strokeWidth={2} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.regular, { maxWidth: px(150), fontSize: px(T.header.size), lineHeight: px(23) }]}>
          {nameOf(peer)}
        </Text>
      </View>
      {[
        { xml: icons.userRoundPlus, onPress: followPeer },
        { xml: icons.ellipsis, onPress: () => navigation.navigate('ChatSettings', { uuid, peer }) },
      ].map((a, i) => (
        <Pressable
          key={i}
          onPress={a.onPress}
          style={{
            position: 'absolute',
            left: px(T.actions.x + i * (T.actions.width + T.actions.gap)),
            top: px(T.actions.y),
            width: px(T.actions.width),
            height: px(T.actions.height),
            borderRadius: px(T.actions.radius),
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.18)',
          }}
        >
          <SvgXml xml={a.xml} width={px(T.actions.icon)} height={px(T.actions.icon)} style={{ position: 'absolute', left: px(T.actions.iconX), top: px(T.actions.iconY) }} />
        </Pressable>
      ))}

      {/* Frame 1597881527 — canned replies. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ position: 'absolute', left: 0, right: 0, bottom: panelBottom + px(T.quick.bottom), height: px(T.quick.height) }}
        contentContainerStyle={{ paddingHorizontal: px(T.quick.x), gap: px(T.quick.gap) }}
      >
        {QUICK.map((q) => (
          <Pressable
            key={q}
            onPress={() => sendText(q)}
            style={{ height: px(T.quick.height), paddingHorizontal: px(T.quick.padding + 13), borderRadius: px(T.quick.radius), borderWidth: 1, borderColor: T.quick.border, justifyContent: 'center' }}
          >
            <Text style={[styles.regular, { fontSize: px(T.quick.size), lineHeight: px(22) }]}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Frame 1597881530 — field, send and the three tools. */}
      <View style={{ position: 'absolute', left: px(-1), width: px(405), bottom: panelBottom, height: px(T.panel.height), backgroundColor: T.panel.color }}>
        <View
          style={{
            position: 'absolute',
            left: px(T.field.x + 1),
            top: px(T.field.y),
            width: px(T.field.width),
            height: px(T.field.height),
            borderRadius: px(T.field.radius),
            borderWidth: 1,
            borderColor: T.field.border,
            backgroundColor: colors.white,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type message"
            placeholderTextColor="rgba(0,0,0,0.3)"
            onSubmitEditing={() => sendText()}
            returnKeyType="send"
            style={[styles.regular, { position: 'absolute', left: px(T.field.textX), right: px(T.field.width - T.field.smile.x + 6), top: 0, bottom: 0, padding: 0, fontSize: px(T.field.size) }]}
          />
          <Pressable onPress={() => setDraft((d) => `${d}😊`)} hitSlop={px(6)} style={{ position: 'absolute', left: px(T.field.smile.x), top: px(T.field.smile.y) }}>
            <SvgXml xml={icons.smile} width={px(T.field.smile.size)} height={px(T.field.smile.size)} />
          </Pressable>
        </View>
        <Pressable onPress={() => sendText()} style={{ position: 'absolute', left: px(T.send.x + 1), top: px(T.send.y) }}>
          <SvgXml xml={icons.send} width={px(T.send.size)} height={px(T.send.size)} />
        </Pressable>
        {[
          { xml: icons.mic, icon: 29, onPress: () => Alert.alert('Voice', 'Coming soon') },
          { xml: icons.imageUp, icon: 24, onPress: sendPhoto },
          { xml: icons.gift, icon: 24, onPress: () => Alert.alert('Gift', 'Coming soon') },
        ].map((t, i) => (
          <Pressable
            key={i}
            onPress={t.onPress}
            style={{
              position: 'absolute',
              left: px(T.tools.x + 1 + i * T.tools.step),
              top: px(T.tools.y),
              width: px(T.tools.size),
              height: px(T.tools.size),
              borderRadius: px(T.tools.size / 2),
              backgroundColor: T.tools.color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SvgXml xml={t.xml} width={px(t.icon)} height={px(t.icon)} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
