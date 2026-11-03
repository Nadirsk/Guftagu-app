import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera, Gift as GiftIcon, Image as ImageIcon, Keyboard as KeyboardIcon, Mic, Plus, Smile, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError, uploadFile } from '../../api/client';
import { getEcho } from '../../api/realtime';
import * as icons from '../../assets/chats/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { GiftSheet } from '../room/sheets';
import { THREAD } from './geometry';
import type { VoiceClip } from './voice';
import { avatarOf, type ChatMessage, type ChatUser, nameOf, styles } from './parts';

/**
 * A DM thread. Messages come from `GET /conversations/{uuid}/messages` (newest first) and
 * arrive live as `message.new` on `conversation.{uuid}`; without Reverb the thread polls.
 * Ticks, "typing…", photos with a full-screen preview, gifts and the emoji panel follow the
 * chat redesign. The "+" sheet holds Photos, Camera, Voice and Gift, so the field itself
 * carries only the emoji key, the text and send / mic.
 *
 * Voice has no server side for DMs yet (no audio upload, no recorder in the build), so it
 * says so instead of pretending.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'Conversation'>;

/**
 * Voice lives in its own file because it needs the expo-audio native module, which an older
 * dev client does not have. Loading it here, guarded, keeps the rest of the chat working there.
 */
type VoiceModule = typeof import('./voice');
let Voice: VoiceModule | null = null;
try {
  Voice = require('./voice') as VoiceModule;
} catch {
  Voice = null;
}
const useRecorder: VoiceModule['useVoiceRecorder'] | (() => null) = Voice ? Voice.useVoiceRecorder : () => null;

/** Slide the held mic this far left to throw the recording away. */
const CANCEL_DRAG = 80;
/** A recording shorter than this is a stray tap, not a message. */
const MIN_VOICE_MS = 800;

const QUICK = ['Hey there!', 'Hello JI', 'Hello Sab theek ?'];
const POLL_MS = 5000;
/** With the socket up, the thread still re-checks this often in case it dropped. */
const SAFETY_POLL_MS = 20000;
/** How often "typing…" is re-sent while the user keeps typing, and how long it lingers unrefreshed. */
const TYPING_RESEND_MS = 2500;
const TYPING_LINGER_MS = 4000;

const BLUE = '#005DE9';
const BLUE_LIGHT = '#2D7BFF';
const MUTED = '#6B7280';
const PAGE = '#F4F6FC';

const EMOJI: { icon: string; label: string; list: string[] }[] = [
  { icon: '😀', label: 'Smileys', list: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😎','🤩','🥳','😏','😢','😭','😡','🤔','😴','🤗','🙄','😬','😱','🥺','😌','😜'] },
  { icon: '👋', label: 'Gestures', list: ['👋','🤚','✋','🖐️','👌','🤌','✌️','🤞','🤟','🤘','👍','👎','👊','✊','👏','🙌','🙏','🤝','💪','👀','🫶','🤲','☝️','👆','👇','👈','👉','🫰','🤙','🖖','✍️','🤳'] },
  { icon: '❤️', label: 'Hearts', list: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','😻','🫀','💋','🌹','🥀','🌸','🌷','💐','🌺','✨','⭐','🌟'] },
  { icon: '🎉', label: 'Party', list: ['🎉','🎊','🎈','🎁','🎂','🍰','🥂','🍾','🎵','🎶','🎤','🎧','🎸','🥁','🎷','🎺','🕺','💃','🪩','🎯','🎮','🏆','🥇','👑','🔥','💯','🎆','🎇','🧨','🪅','📸','🎬'] },
  { icon: '🍕', label: 'Food', list: ['🍕','🍔','🍟','🌭','🌮','🌯','🥗','🍜','🍝','🍣','🍱','🍛','🍚','🥘','🍿','🍩','🍪','🍫','🍦','🍧','🍎','🍌','🍉','🍇','🍓','🥭','☕','🍵','🥤','🧃','🍺','🍷'] },
];


/** "2:13 PM". */
function hm(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** Minutes and seconds, like 0:07. */
function voiceClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayKey(iso: string | null) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '';
}

/** Today / Yesterday / "Mon, 3 Nov". */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
  const y = new Date(now.getTime() - 86400000);
  if (dayKey(iso) === dayKey(y.toISOString())) return 'Yesterday';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function ConversationScreen() {
  const { px } = useDesignScale();
  const navigation = useNavigation<Nav>();
  const { uuid, peer } = useRoute<RouteProp<RootStackParamList, 'Conversation'>>().params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [kb, setKb] = useState(0);
  const [peerTyping, setPeerTyping] = useState(false);
  // The private nickname set in Chat Settings; refetched on focus so coming back from there shows it.
  const [alias, setAlias] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      api<{ conversation: { alias: string | null } }>(`/conversations/${uuid}`, { token })
        .then(({ conversation }) => live && setAlias(conversation.alias))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, [token, uuid]),
  );
  const [sheet, setSheet] = useState<'attach' | 'gift' | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // A picked photo waits here, full screen, until the user sends it or backs out.
  const [pending, setPending] = useState<{ uri: string; mime: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const rec = useRecorder();
  const [recording, setRecording] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  // null until the server answers, so the follow button never flashes for someone already followed.
  const [following, setFollowing] = useState<boolean | null>(null);

  // Re-checked on focus: Chat Settings can follow/unfollow and then return here.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let live = true;
      api<ChatUser[]>(`/users/${user.uuid}/following?per_page=100`, { token })
        .then((list) => live && setFollowing(list.some((u) => u.uuid === peer.uuid)))
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }, [peer.uuid, token, user]),
  );
  const holding = useRef(false); // the finger is down
  const live = useRef(false); // the recorder is actually running
  const cancelRef = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

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
        setPeerTyping(false);
        api(`/conversations/${uuid}/read`, { method: 'POST', token }).catch(() => undefined);
      });
      // Ticks: the frame carries the thread-wide watermarks, so applying it is two comparisons.
      const applyMarks = (e: { delivered_up_to: string | null; read_up_to: string | null }) =>
        setMessages((prev) => {
          const at = (id: string | null) => (id ? prev.findIndex((m) => m.uuid === id) : -1);
          const delivered = at(e.delivered_up_to);
          const read = at(e.read_up_to);
          return prev.map((m, i) => {
            if (m.sender?.uuid !== user?.uuid) return m;
            if (i <= read) return m.status === 'read' ? m : { ...m, status: 'read' };
            if (i <= delivered && m.status !== 'read') return m.status === 'delivered' ? m : { ...m, status: 'delivered' };
            return m;
          });
        });
      channel.listen('.conversation.delivered', applyMarks);
      channel.listen('.conversation.read', applyMarks);
      channel.listen('.typing', (e: { user: { uuid: string } | null; typing: boolean }) => {
        if (!e.user || e.user.uuid === user?.uuid) return;
        setPeerTyping(e.typing);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        // A lost "stopped typing" frame must not leave the indicator up for ever.
        if (e.typing) typingTimer.current = setTimeout(() => setPeerTyping(false), TYPING_LINGER_MS);
      });
      // The socket can drop without telling anyone, so a slow poll runs behind it.
      const safety = setInterval(load, SAFETY_POLL_MS);
      return () => {
        clearInterval(safety);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        echo.leave(`conversation.${uuid}`);
      };
    }
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load, merge, token, user?.uuid, uuid]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKb(e.endCoordinates.height);
      setEmojiOpen(false);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /** Tells the other side we are (still) typing; at most once per TYPING_RESEND_MS. */
  const notifyTyping = (typing: boolean) => {
    const now = Date.now();
    if (typing && now - lastTypingSent.current < TYPING_RESEND_MS) return;
    lastTypingSent.current = typing ? now : 0;
    api(`/conversations/${uuid}/typing`, { method: 'POST', body: { typing }, token }).catch(() => undefined);
  };

  const send = async (
    body:
      | { type: 'text'; body: string }
      | { type: 'image'; media_url: string; body?: string }
      | { type: 'audio'; media_url: string; media_meta: { duration_ms: number } },
  ) => {
    try {
      const { message } = await api<{ message: ChatMessage }>(`/conversations/${uuid}/messages`, { method: 'POST', body, token });
      merge([message]);
      return true;
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not send that message.');
      return false;
    }
  };

  const sendText = (text = draft) => {
    const body = text.trim();
    if (!body) return;
    if (text === draft) setDraft('');
    notifyTyping(false);
    send({ type: 'text', body });
  };

  const changeDraft = (t: string) => {
    setDraft(t);
    notifyTyping(t.length > 0);
  };

  const toggleEmoji = () => {
    if (emojiOpen) {
      setEmojiOpen(false);
      input.current?.focus();
    } else {
      Keyboard.dismiss();
      setEmojiOpen(true);
    }
  };

  const toggleAttach = () => {
    Keyboard.dismiss();
    setEmojiOpen(false);
    setSheet('attach');
  };

  const openPicked = (asset: ImagePicker.ImagePickerAsset | null) => {
    if (!asset) return;
    setCaption('');
    setPending({ uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' });
  };

  const pickPhoto = async () => {
    setSheet(null);
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    openPicked(picked.canceled ? null : picked.assets[0]);
  };

  const takePhoto = async () => {
    setSheet(null);
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return;
    const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    openPicked(shot.canceled ? null : shot.assets[0]);
  };

  const voiceHint = () => {
    setSheet(null);
    Alert.alert('Voice message', 'Press and hold the mic button, speak, then let go to send. Slide left to cancel.');
  };

  const flashHint = (text: string) => {
    setHint(text);
    setTimeout(() => setHint(null), 1800);
  };

  const beginRec = async () => {
    if (!rec) {
      Alert.alert('Voice message', 'Voice messages need the updated app build. Rebuild the app once and they will work.');
      return;
    }
    holding.current = true;
    cancelRef.current = false;
    setCancelling(false);
    Keyboard.dismiss();
    setEmojiOpen(false);
    let ok = false;
    try {
      ok = await rec.start();
    } catch {
      ok = false;
    }
    if (!ok) {
      holding.current = false;
      Alert.alert('Voice message', 'Allow the microphone to record voice messages.');
      return;
    }
    live.current = true;
    // Let go while the permission or the recorder was still starting.
    if (!holding.current) {
      finishRec();
      return;
    }
    setRecording(true);
  };

  const finishRec = async () => {
    holding.current = false;
    if (!rec || !live.current) return;
    live.current = false;
    setRecording(false);
    const cancelled = cancelRef.current;
    setCancelling(false);
    const clip: VoiceClip | null = await rec.stop();
    if (!clip || cancelled) return;
    if (clip.durationMs < MIN_VOICE_MS) {
      flashHint('Hold the mic to record');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadFile<{ url: string }>('/media', { uri: clip.uri, mime: 'audio/mp4' }, token);
      await send({ type: 'audio', media_url: url, media_meta: { duration_ms: clip.durationMs } });
    } catch (e) {
      Alert.alert('Voice message', e instanceof ApiError ? e.displayMessage : 'Could not send that voice message.');
    } finally {
      setUploading(false);
    }
  };

  // The responder is built once, so it reaches the current handlers through a ref.
  const latest = useRef({ beginRec, finishRec });
  latest.current = { beginRec, finishRec };
  const micResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => latest.current.beginRec(),
      onPanResponderMove: (_e, g) => {
        const c = g.dx < -CANCEL_DRAG;
        if (c !== cancelRef.current) {
          cancelRef.current = c;
          setCancelling(c);
        }
      },
      onPanResponderRelease: () => latest.current.finishRec(),
      onPanResponderTerminate: () => latest.current.finishRec(),
    }),
  ).current;

  const sendPending = async () => {
    if (!pending || uploading) return;
    setUploading(true);
    try {
      const { url } = await uploadFile<{ url: string }>('/media', pending, token);
      const text = caption.trim();
      // `send` reports its own failure, so the preview stays up for a retry.
      if (await send({ type: 'image', media_url: url, ...(text ? { body: text } : {}) })) setPending(null);
    } catch (e) {
      Alert.alert('Chat', e instanceof ApiError ? e.displayMessage : 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  };

  const sendGift = async (gift: { id: number }, quantity: number) => {
    try {
      const res = await api<{ message: ChatMessage }>(`/conversations/${uuid}/gifts`, {
        method: 'POST',
        body: { gift_id: gift.id, quantity },
        token,
      });
      merge([res.message]);
      setSheet(null);
    } catch (e) {
      Alert.alert('Gift', e instanceof ApiError ? e.displayMessage : 'Could not send that gift.');
    }
  };

  const followPeer = async () => {
    try {
      await api(`/users/${peer.uuid}/follow`, { method: 'POST', token });
      setFollowing(true);
      Alert.alert('Follow', `You are following ${nameOf(peer)}.`);
    } catch (e) {
      Alert.alert('Follow', e instanceof ApiError ? e.displayMessage : 'Could not follow right now.');
    }
  };

  // Newest first for the inverted list; a day chip sits above the first message of each day.
  const rows = useMemo(() => {
    const list = [...messages].reverse();
    return list.map((m, i) => {
      const older = list[i + 1];
      const mine = m.sender?.uuid === user?.uuid;
      return {
        m,
        mine,
        chip: m.created_at && (!older || dayKey(older.created_at) !== dayKey(m.created_at)) ? dayLabel(m.created_at) : null,
      };
    });
  }, [messages, user?.uuid]);

  const hasDraft = draft.trim().length > 0;
  const A = THREAD.actions;

  return (
    <View style={{ flex: 1, backgroundColor: PAGE, paddingBottom: kb }}>
      {/* Header — back, portrait, name and status, then follow and more. */}
      <View
        style={{
          paddingTop: StatusBar.currentHeight ?? px(30),
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: '#E9ECF4',
        }}
      >
        <View style={{ height: px(66), flexDirection: 'row', alignItems: 'center', paddingLeft: px(6), paddingRight: px(14) }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={px(8)} style={{ width: px(40), height: px(44), alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={px(24)} color={colors.black} strokeWidth={2} />
          </Pressable>
          <Image source={avatarOf(peer)} style={{ width: px(42), height: px(42), borderRadius: px(21), marginLeft: px(2) }} />
          <View style={{ flex: 1, marginLeft: px(10), marginRight: px(8) }}>
            <Text numberOfLines={1} style={[styles.semiBold, { fontSize: px(16), lineHeight: px(22) }]}>
              {alias ?? nameOf(peer)}
            </Text>
            {peerTyping ? <Text style={[styles.medium, { fontSize: px(12), lineHeight: px(16), color: '#0050C8' }]}>typing…</Text> : null}
          </View>
          {[
            ...(following === false ? [{ xml: icons.userRoundPlus, onPress: followPeer }] : []),
            { xml: icons.ellipsis, onPress: () => navigation.navigate('ChatSettings', { uuid, peer }) },
          ].map((a, i) => (
            <Pressable
              key={i}
              onPress={a.onPress}
              style={{
                width: px(A.width),
                height: px(A.height),
                marginLeft: i === 0 ? 0 : px(A.gap),
                borderRadius: px(A.radius),
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SvgXml xml={a.xml} width={px(A.icon)} height={px(A.icon)} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
      <FlatList
        style={{ flex: 1 }}
        inverted
        data={rows}
        keyExtractor={(r) => r.m.uuid}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: px(14), paddingVertical: px(10) }}
        ListHeaderComponent={peerTyping ? <TypingRow peer={peer} /> : undefined}
        renderItem={({ item }) => (
          <Row
            m={item.m}
            mine={item.mine}
            chip={item.chip}
            peer={peer}
            meName={user?.display_name}
            onOpenImage={(url) => navigation.navigate('MediaViewer', { urls: [url] })}
          />
        )}
      />
      {sheet === 'attach' ? (
        <Pressable onPress={() => setSheet(null)} accessibilityLabel="Close attach menu" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(10,16,32,0.52)' }} />
      ) : null}
      </View>

      {/* Canned replies, only while there is nothing typed. */}
      {!hasDraft && !emojiOpen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: px(14), paddingVertical: px(6), gap: px(8) }}
        >
          {QUICK.map((q) => (
            <Pressable
              key={q}
              onPress={() => sendText(q)}
              style={{ height: px(40), paddingHorizontal: px(16), borderRadius: px(20), borderWidth: 1, borderColor: '#CFE0FF', backgroundColor: '#EAF2FF', justifyContent: 'center' }}
            >
              <Text style={[styles.medium, { fontSize: px(13.5), color: '#0050C8' }]}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Composer — "+" opens the sheet; the field has only emoji, text and send / mic. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: px(8),
          paddingHorizontal: px(12),
          paddingTop: px(8),
          paddingBottom: emojiOpen ? px(8) : px(16),
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: '#E9ECF4',
        }}
      >
        <Pressable
          onPress={sheet === 'attach' ? () => setSheet(null) : toggleAttach}
          accessibilityLabel={sheet === 'attach' ? 'Close attach menu' : 'Attach'}
          style={{ width: px(44), height: px(44), borderRadius: px(22), backgroundColor: sheet === 'attach' ? BLUE : '#EEF1F8', alignItems: 'center', justifyContent: 'center' }}
        >
          {sheet === 'attach' ? <X size={px(22)} color={colors.white} strokeWidth={2.4} /> : <Plus size={px(22)} color={BLUE} strokeWidth={2.4} />}
        </Pressable>
        {recording ? (
          <View style={{ flex: 1, minHeight: px(44), flexDirection: 'row', alignItems: 'center', gap: px(10), paddingHorizontal: px(16), borderRadius: px(22), backgroundColor: cancelling ? '#FEE9EC' : '#EEF1F8' }}>
            <View style={{ width: px(10), height: px(10), borderRadius: px(5), backgroundColor: '#E03131' }} />
            <Text style={[styles.semiBold, { fontSize: px(14), minWidth: px(38) }]}>{voiceClock(rec?.durationMs ?? 0)}</Text>
            <Text numberOfLines={1} style={[styles.medium, { flex: 1, fontSize: px(13), color: cancelling ? '#D6243C' : '#5B6475' }]}>
              {cancelling ? 'Release to cancel' : '‹  Slide to cancel'}
            </Text>
          </View>
        ) : hint ? (
          <View style={{ flex: 1, minHeight: px(44), justifyContent: 'center', paddingHorizontal: px(16), borderRadius: px(22), backgroundColor: '#EEF1F8' }}>
            <Text style={[styles.medium, { fontSize: px(13.5), color: '#5B6475' }]}>{hint}</Text>
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              minHeight: px(44),
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: px(6),
              borderRadius: px(22),
              backgroundColor: '#EEF1F8',
              borderWidth: 1.5,
              borderColor: emojiOpen ? '#BBD3FF' : 'transparent',
            }}
          >
            <Pressable onPress={toggleEmoji} hitSlop={px(6)} accessibilityLabel={emojiOpen ? 'Show keyboard' : 'Open emoji picker'} style={{ width: px(36), height: px(40), alignItems: 'center', justifyContent: 'center' }}>
              {emojiOpen ? <KeyboardIcon size={px(23)} color={BLUE} strokeWidth={1.9} /> : <Smile size={px(23)} color="#5B6475" strokeWidth={1.9} />}
            </Pressable>
            <TextInput
              ref={input}
              value={draft}
              onChangeText={changeDraft}
              onFocus={() => setEmojiOpen(false)}
              onBlur={() => notifyTyping(false)}
              onSubmitEditing={() => sendText()}
              placeholder="Message"
              placeholderTextColor="rgba(0,0,0,0.35)"
              multiline
              style={[styles.regular, { flex: 1, maxHeight: px(110), paddingHorizontal: px(6), paddingVertical: px(10), fontSize: px(14.5) }]}
            />
          </View>
        )}
        {hasDraft ? (
          <Pressable onPress={() => sendText()} accessibilityLabel="Send">
            <SvgXml xml={icons.send} width={px(48)} height={px(48)} />
          </Pressable>
        ) : (
          <View
            {...micResponder.panHandlers}
            accessibilityLabel="Hold to record a voice message"
            style={{
              width: px(48),
              height: px(48),
              borderRadius: px(24),
              backgroundColor: cancelling ? '#E03131' : BLUE,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: recording ? 1.35 : 1 }],
            }}
          >
            {uploading ? <ActivityIndicator color={colors.white} /> : <Mic size={px(22)} color={colors.white} strokeWidth={2} />}
          </View>
        )}
      </View>

      {/* Emoji panel — takes the keyboard's place. */}
      {emojiOpen ? (
        <EmojiPanel
          onPick={(ch) => changeDraft(draft + ch)}
          onBackspace={() => changeDraft(Array.from(draft).slice(0, -1).join(''))}
        />
      ) : null}

      {sheet === 'attach' ? (
      <AttachPanel
        items={[
          { label: 'Photos', bg: '#E8F0FF', fg: BLUE, Icon: ImageIcon, onPress: pickPhoto },
          { label: 'Camera', bg: '#E6F7F1', fg: '#0E8F6A', Icon: Camera, onPress: takePhoto },
          { label: 'Voice', bg: '#FFEFE5', fg: '#E8590C', Icon: Mic, onPress: voiceHint },
          { label: 'Gift', bg: '#FFE8F1', fg: '#D6336C', Icon: GiftIcon, onPress: () => setSheet('gift') },
        ]}
      />
      ) : null}

      {/* The same gift sheet as the room, with the person in this thread as the only receiver. */}
      <Modal visible={sheet === 'gift'} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSheet(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <GiftSheet
            dm
            receiver={peer}
            onMic={[{ seat: 0, user: peer }]}
            onClose={() => setSheet(null)}
            onSend={sendGift}
          />
        </View>
      </Modal>

      {/* WhatsApp-style preview: the photo full screen, with a caption and send, before anything leaves. */}
      <Modal visible={!!pending} animationType="fade" statusBarTranslucent onRequestClose={() => { if (!uploading) setPending(null); }}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {pending ? <Image source={{ uri: pending.uri }} resizeMode="contain" style={{ flex: 1 }} /> : null}
          <Pressable
            onPress={() => setPending(null)}
            disabled={uploading}
            hitSlop={px(12)}
            style={{ position: 'absolute', left: px(16), top: px(48), width: px(40), height: px(40), borderRadius: px(20), backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={px(22)} color={colors.white} strokeWidth={2.2} />
          </Pressable>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: px(14), paddingTop: px(12), paddingBottom: px(24) + kb, backgroundColor: 'rgba(0,0,0,0.6)', gap: px(12) }}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={[styles.regular, { minHeight: px(46), borderRadius: px(23), backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: px(16), fontSize: px(14.5), color: colors.white }]}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(8), height: px(44), paddingLeft: px(6), paddingRight: px(16), borderRadius: px(22), backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Image source={avatarOf(peer)} style={{ width: px(32), height: px(32), borderRadius: px(16) }} />
                <Text numberOfLines={1} style={[styles.medium, { fontSize: px(13.5), color: colors.white, maxWidth: px(180) }]}>
                  {nameOf(peer)}
                </Text>
              </View>
              <Pressable onPress={sendPending} disabled={uploading} style={{ width: px(56), height: px(56), alignItems: 'center', justifyContent: 'center' }}>
                {uploading ? <ActivityIndicator color={colors.white} /> : <SvgXml xml={icons.send} width={px(56)} height={px(56)} />}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------- the thread

function Avatar({ user }: { user: ChatUser | null | undefined }) {
  const { px } = useDesignScale();
  return <Image source={avatarOf(user)} style={{ width: px(32), height: px(32), borderRadius: px(16) }} />;
}

function TypingRow({ peer }: { peer: ChatUser }) {
  const { px } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: px(8), marginTop: px(6) }}>
      <Avatar user={peer} />
      <View style={{ height: px(40), paddingHorizontal: px(16), flexDirection: 'row', alignItems: 'center', gap: px(5), backgroundColor: colors.white, borderWidth: 1, borderColor: '#E6EAF4', borderTopLeftRadius: px(20), borderTopRightRadius: px(20), borderBottomRightRadius: px(20), borderBottomLeftRadius: px(6) }}>
        {[0.45, 0.7, 1].map((o, i) => (
          <View key={i} style={{ width: px(7), height: px(7), borderRadius: px(4), backgroundColor: '#5B6475', opacity: o }} />
        ))}
      </View>
    </View>
  );
}

function Row({
  m,
  mine,
  chip,
  peer,
  meName,
  onOpenImage,
}: {
  m: ChatMessage;
  mine: boolean;
  chip: string | null;
  peer: ChatUser;
  /** Our own display name, for "To …" on a gift they sent us. */
  meName: string | null | undefined;
  onOpenImage: (url: string) => void;
}) {
  const { px } = useDesignScale();
  const r = px(20);
  const radius = mine
    ? { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: r, borderBottomRightRadius: px(6) }
    : { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: px(6), borderBottomRightRadius: r };

  let content: React.ReactNode;
  const textColor = mine ? colors.white : colors.black;

  if (m.is_deleted) {
    content = <BubbleText mine={mine} radius={radius} italic>Message deleted</BubbleText>;
  } else if (m.type === 'image' && m.media_url) {
    content = (
      <View style={[{ padding: px(4), overflow: 'hidden' }, radius, mine ? { backgroundColor: BLUE } : { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E6EAF4' }]}>
        <Pressable onPress={() => onOpenImage(m.media_url as string)}>
          <Image source={{ uri: m.media_url }} resizeMode="cover" style={{ width: px(224), height: px(224), borderRadius: px(17) }} />
        </Pressable>
        {m.body ? <Text style={[styles.regular, { fontSize: px(14), lineHeight: px(20), color: textColor, paddingHorizontal: px(8), paddingTop: px(8), paddingBottom: px(6), maxWidth: px(224) }]}>{m.body}</Text> : null}
      </View>
    );
  } else if (m.type === 'audio' && m.media_url && Voice) {
    const clip = <Voice.VoicePlayer url={m.media_url} durationMs={m.media_meta?.duration_ms ?? 0} mine={mine} />;
    content = mine ? (
      <LinearGradient colors={[BLUE_LIGHT, BLUE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={radius}>
        {clip}
      </LinearGradient>
    ) : (
      <View style={[radius, { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E6EAF4' }]}>{clip}</View>
    );
  } else if (m.type === 'gift') {
    // Mazag's card: dark amber, "To <receiver>" / gift name / × N on the left, the gift itself big on the right.
    const meta = m.media_meta ?? {};
    const qty = meta.quantity ?? 1;
    const receiver = mine ? nameOf(peer) : (meName ?? 'you');
    content = (
      <LinearGradient
        colors={['#3A2A12', '#8A5F1C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ width: px(230), minHeight: px(112), flexDirection: 'row', alignItems: 'center', paddingLeft: px(16), paddingRight: px(8), paddingVertical: px(10), borderWidth: 1, borderColor: 'rgba(240,160,62,0.55)' }, radius]}
      >
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.medium, { fontSize: px(15), lineHeight: px(22), color: '#F0A03E', fontStyle: 'italic' }]}>
            To {receiver}
          </Text>
          <Text numberOfLines={2} style={[styles.medium, { fontSize: px(16), lineHeight: px(22), color: colors.white, marginTop: px(2) }]}>
            {meta.name ?? 'Gift'}
          </Text>
          <Text style={[styles.semiBold, { fontSize: px(16), lineHeight: px(24), color: '#F0A03E', fontStyle: 'italic', marginTop: px(2) }]}>× {qty}</Text>
        </View>
        {meta.thumbnail_url ? (
          <Image source={{ uri: meta.thumbnail_url }} resizeMode="contain" style={{ width: px(84), height: px(84) }} />
        ) : (
          <GiftIcon size={px(44)} color="#F0A03E" strokeWidth={1.6} />
        )}
      </LinearGradient>
    );
  } else {
    const label = m.type === 'audio' ? '[Voice message]' : m.type === 'video' ? '[Video]' : (m.body ?? '');
    content = <BubbleText mine={mine} radius={radius}>{label}</BubbleText>;
  }

  return (
    <View style={{ marginVertical: px(3) }}>
      {chip ? (
        <View style={{ alignSelf: 'center', paddingHorizontal: px(12), paddingVertical: px(4), borderRadius: px(12), backgroundColor: '#E6EAF4', marginVertical: px(10) }}>
          <Text style={[styles.medium, { fontSize: px(11), lineHeight: px(16), color: '#4B5468' }]}>{chip}</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: px(8), justifyContent: mine ? 'flex-end' : 'flex-start' }}>
        {/* Both sides carry their portrait on every message, as Mazag does. */}
        {!mine ? <Avatar user={m.sender ?? peer} /> : null}
        <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
          {content}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(4), paddingHorizontal: px(4), marginTop: px(3) }}>
            <Text style={[styles.regular, { fontSize: px(11), lineHeight: px(14), color: MUTED }]}>{hm(m.created_at)}</Text>
          </View>
        </View>
        {mine ? <Avatar user={m.sender} /> : null}
      </View>
    </View>
  );
}

function BubbleText({
  mine,
  radius,
  italic,
  children,
}: {
  mine: boolean;
  radius: object;
  italic?: boolean;
  children: React.ReactNode;
}) {
  const { px } = useDesignScale();
  const text = (
    <Text style={[styles.regular, { fontSize: px(14.5), lineHeight: px(21), color: mine ? colors.white : colors.black, fontStyle: italic ? 'italic' : 'normal' }]}>
      {children}
    </Text>
  );
  const pad = { paddingHorizontal: px(14), paddingVertical: px(10) };
  return mine ? (
    <LinearGradient colors={[BLUE_LIGHT, BLUE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[pad, radius]}>
      {text}
    </LinearGradient>
  ) : (
    <View style={[pad, radius, { backgroundColor: colors.white, borderWidth: 1, borderColor: '#E6EAF4' }]}>{text}</View>
  );
}

// ---------------------------------------------------------------- composer panels

function EmojiPanel({ onPick, onBackspace }: { onPick: (ch: string) => void; onBackspace: () => void }) {
  const { px } = useDesignScale();
  const [cat, setCat] = useState(0);
  return (
    <View style={{ height: px(292), backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#E9ECF4' }}>
      <View style={{ flexDirection: 'row', gap: px(4), paddingHorizontal: px(10), paddingVertical: px(6), borderBottomWidth: 1, borderBottomColor: '#EEF0F6' }}>
        {EMOJI.map((c, i) => (
          <Pressable
            key={c.label}
            onPress={() => setCat(i)}
            accessibilityLabel={c.label}
            style={{ width: px(44), height: px(40), borderRadius: px(12), alignItems: 'center', justifyContent: 'center', backgroundColor: i === cat ? '#E8F0FF' : 'transparent' }}
          >
            <Text style={{ fontSize: px(22) }}>{c.icon}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: px(8), paddingBottom: px(64) }}>
        {EMOJI[cat].list.map((ch) => (
          <Pressable key={ch} onPress={() => onPick(ch)} style={{ width: '12.5%', height: px(44), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: px(26) }}>{ch}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        onPress={onBackspace}
        accessibilityLabel="Delete last character"
        style={{ position: 'absolute', right: px(14), bottom: px(12), width: px(48), height: px(44), borderRadius: px(22), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', elevation: 4 }}
      >
        <X size={px(20)} color={colors.black} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

/** The "+" options, in the keyboard's place right under the composer. */
function AttachPanel({ items }: { items: { label: string; bg: string; fg: string; Icon: typeof ImageIcon; onPress: () => void }[] }) {
  const { px } = useDesignScale();
  return (
    <View style={{ backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#E9ECF4', paddingHorizontal: px(20), paddingTop: px(14), paddingBottom: px(30), flexDirection: 'row', justifyContent: 'space-between' }}>
      {items.map(({ label, bg, fg, Icon, onPress }) => (
        <Pressable key={label} onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: px(8) }}>
          <View style={{ width: px(64), height: px(64), borderRadius: px(22), backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={px(28)} color={fg} strokeWidth={1.9} />
          </View>
          <Text style={[styles.medium, { fontSize: px(12.5), lineHeight: px(16) }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
