import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, CameraOff, HelpCircle, Lock, Mars, Mic, MicOff, PhoneOff, Phone, SwitchCamera, Venus, Volume2, VolumeX, XCircle } from 'lucide-react-native';
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { LevelBadges } from '../level/LevelBadge';
import { Gesture, GestureDetector, ScrollView as ChatScroll } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/liveVideo/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { GiftFx } from '../room/GiftFx';
import { useRoomRuntime, useRoomSession } from '../room/RoomSession';
import { GiftSheet } from '../room/sheets';
import type { MediaStreamLike } from '../room/voice';
import type { RoomUser, Seat } from '../room/useRoom';
import { chevronLeft, closeWhite, GOLD, plusIcon, TEAL, useUi } from './parts';

/**
 * A live video room, for the host and for everyone watching (Figma 2015:7951, with the Private call and
 * Price sheets drawn over it). It is a real room on the server (`kind` video or video_party), so it reuses
 * the voice room's whole engine through `RoomSession`: join, seats, chat, gifts, and the peer-to-peer
 * WebRTC that now carries a camera as well as a mic.
 *
 *  - Video: the host's camera fills the screen; viewers only watch and chat / send gifts.
 *  - Video Party: a grid of seat tiles, the host on the first. A viewer taps a "+" to take a seat and then
 *    sends their own camera; the host can mute or stand somebody up.
 *
 * Private call: the host sets a voice / video price (Price settings), a viewer asks from the link button, the host
 * answers from the Applying tab (the caller is charged then, and gets a guest seat so their media joins the mesh) and
 * either side hangs up from On a call.
 * Media is a mesh (everyone sending uploads one copy per person), fine for small rooms; a busy live needs
 * a media server in the middle.
 */

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Sheet = null | 'calls' | 'price' | 'request';
type CallRow = { id: number; type: 'voice' | 'video'; price: number; status: 'applying' | 'ongoing'; caller: RoomUser };
type Tab = 'all' | 'message';

const avatarPlaceholder = require('../../assets/avatar-placeholder.png');

/** The live rooms' own colours (Ziigo's): sheet header teal, answer green, hang-up red. */
const ZTEAL = '#00CDB2';
const ANSWER_GREEN = '#19C03A';
const HANGUP_RED = '#F0584F';
const LIVE = { look: 'live' as const };
const SHEET = { look: 'live-sheet' as const };

// ---- react-native-webrtc is a native module (absent from Expo Go): load its view lazily.
type RtcViewProps = { streamURL: string; objectFit?: 'cover' | 'contain'; mirror?: boolean; zOrder?: number; style?: StyleProp<ViewStyle> };
let RtcView: ComponentType<RtcViewProps> | null | undefined;
function loadRtcView() {
  if (RtcView !== undefined) return RtcView;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RtcView = (require('react-native-webrtc') as { RTCView: ComponentType<RtcViewProps> }).RTCView;
  } catch {
    RtcView = null;
  }
  return RtcView;
}

type FeedRow = { uuid: string; cover_url: string | null; owner: { uuid: string; avatar_url?: string | null } | null };
/**
 * The lives you can swipe through. One list for every room screen (each swipe opens a new screen), kept in the order
 * it was first seen: a re-sorted answer from the server only adds new lives at the end and drops ended ones, so
 * "back up" always lands on the live you came from.
 */
let FEED: FeedRow[] = [];
function mergeFeed(fresh: FeedRow[]) {
  const byId = new Map(fresh.map((r) => [r.uuid, r]));
  const kept = FEED.filter((r) => byId.has(r.uuid)).map((r) => byId.get(r.uuid) as FeedRow);
  const known = new Set(kept.map((r) => r.uuid));
  FEED = [...kept, ...fresh.filter((r) => !known.has(r.uuid))];
}

/**
 * Where you have been, like a reel feed: swiping up goes on to the live you came from (if you went back) or to
 * the next one; swiping down goes back to the one before. HI is where you are now. Past either end of the feed
 * it wraps round, so a short list can be swiped for ever.
 */
let HIST: string[] = [];
let HI = -1;

/** The Private call link, drawn as a control-row glyph (takes the same props as the lucide icons). */
function LinkGlyph({ size }: { size?: number; color?: string }) {
  return <SvgXml xml={icons.link} width={size ?? 20} height={size ?? 20} />;
}

function Picture({ stream, mirror, style }: { stream: MediaStreamLike | null | undefined; mirror?: boolean; style?: StyleProp<ViewStyle> }) {
  const View_ = loadRtcView();
  if (!View_ || !stream) return null;
  return <View_ streamURL={stream.toURL()} objectFit="cover" mirror={mirror} zOrder={0} style={style ?? StyleSheet.absoluteFill} />;
}

/** The seat tiles of a Video Party, in design pixels inside a 402 x 405 area (seat 1 first). */
function tileCells(count: number) {
  const W = 402;
  const H = 405;
  if (count === 4) {
    return [
      { x: 0, y: 0, w: 270, h: H },
      { x: 270, y: 0, w: W - 270, h: H / 3 },
      { x: 270, y: H / 3, w: W - 270, h: H / 3 },
      { x: 270, y: (2 * H) / 3, w: W - 270, h: H / 3 },
    ];
  }
  const cols = count === 6 ? 2 : 3;
  const rows = count / cols;
  const w = W / cols;
  const h = H / rows;
  return Array.from({ length: count }, (_, i) => ({ x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h }));
}
const GRID_TOP = 180;

export default function LiveVideoRoomScreen() {
  const { px, at, text } = useUi();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'LiveVideoRoom'>>();
  const { token, user } = useAuth();
  const session = useRoomSession();
  const rt = useRoomRuntime();

  // Make this the live room: the session's host (above the navigator) joins it and opens the connections.
  useEffect(() => {
    session.enter(params.uuid);
    // `enter` only needs to run when the opened room changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.uuid]);

  const mine = rt && rt.uuid === params.uuid ? rt : null;
  const room = mine?.room ?? null;
  const voice = mine?.voice ?? null;
  const snap = room?.snapshot ?? null;

  const [tab, setTab] = useState<Tab>('all');
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [gifting, setGifting] = useState(false);
  const [callTab, setCallTab] = useState<'applying' | 'ongoing'>('applying');
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [busyCall, setBusyCall] = useState(false);
  const [draftPrices, setDraftPrices] = useState({ voice: '', video: '' });
  const [sound, setSound] = useState(false);
  const [followed, setFollowed] = useState(false);
  const leaving = useRef(false);

  const kind = snap?.room.kind ?? 'video';
  const party = kind === 'video_party';
  const owner = snap?.owner ?? null;
  const meUuid = room?.me?.uuid ?? user?.uuid;
  const isHost = Boolean(snap && owner && owner.uuid === meUuid);
  const seats: Seat[] = snap?.seats ?? [];
  const mySeat = seats.find((s) => s.user?.uuid === meUuid) ?? null;
  const prices = snap?.room.call_prices ?? { voice: 0, video: 0, sound: false };
  const myCall = calls.find((c) => c.caller.uuid === meUuid) ?? null;
  const callTick = room?.callTick ?? 0;
  const streamOf = (uuid: string | undefined) => (!uuid ? null : uuid === meUuid ? voice?.localStream : voice?.remoteStreams[uuid]);

  const name = owner?.display_name ?? 'Guftagu';
  const face = owner?.avatar_url ? { uri: owner.avatar_url } : avatarPlaceholder;
  const watching = Math.max(0, (snap?.room.listener_count ?? 1) - 1);

  // ---- private calls: the list is re-read when the sheet opens and whenever the server says one changed
  const loadCalls = useCallback(async () => {
    try {
      const r = await api<{ calls: CallRow[] }>(`/rooms/${params.uuid}/calls`, { token });
      setCalls(r.calls);
    } catch {
      /* a failed refresh keeps the last list */
    }
  }, [params.uuid, token]);
  useEffect(() => {
    if (snap?.room.kind === 'video') void loadCalls();
  }, [snap?.room.kind, callTick, sheet, loadCalls]);

  const callAction = async (path: string, init: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }, failure: string) => {
    setBusyCall(true);
    try {
      await api(`/rooms/${params.uuid}${path}`, { ...init, token });
      await loadCalls();
      return true;
    } catch (e) {
      Alert.alert('Private call', e instanceof ApiError ? e.displayMessage : failure);
      return false;
    } finally {
      setBusyCall(false);
    }
  };
  const requestCall = (type: 'voice' | 'video') => {
    const price = type === 'video' ? prices.video : prices.voice;
    const go = async () => {
      if (await callAction('/calls', { method: 'POST', body: { type } }, 'Could not send your request.')) setSheet(null);
    };
    if (price > 0) {
      Alert.alert(`${price} coins are charged when the host answers.`, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void go() },
      ], LIVE);
    } else {
      void go();
    }
  };
  const answerCall = (id: number) => void callAction(`/calls/${id}/accept`, { method: 'POST' }, 'Could not start the call.');
  const declineCall = (id: number) => void callAction(`/calls/${id}/decline`, { method: 'POST' }, 'Could not close that request.');
  const hangUp = (id: number) =>
    Alert.alert('End video join or not?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void callAction(`/calls/${id}/end`, { method: 'POST' }, 'Could not end the call.') },
    ], LIVE);

  // ---- leaving / ending
  const goEnded = (audience: number, diamonds: number, durationSeconds: number) =>
    navigation.replace('LiveVideoEnded', { cover: params.cover ?? owner?.avatar_url ?? null, audience, diamonds, durationSeconds });

  const endLive = () =>
    Alert.alert(party ? 'The room will close after you leave. Leave?' : 'End the live streaming?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            const r = await api<{ audience: number; diamonds: number; duration_seconds: number }>(`/rooms/${params.uuid}/end`, { method: 'POST', token });
            leaving.current = true;
            session.end();
            goEnded(r.audience, r.diamonds, r.duration_seconds);
          } catch (e) {
            Alert.alert('Live', e instanceof ApiError ? e.displayMessage : 'Could not end the live.');
          }
        },
      },
    ], LIVE);

  const leaveLive = useCallback(async () => {
    leaving.current = true;
    await session.exit();
    navigation.goBack();
  }, [navigation, session]);

  const askLeave = () =>
    isHost
      ? endLive()
      : Alert.alert('Leave the living room ?', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => void leaveLive() },
        ], LIVE);

  // Hardware Back never drops you out of a live by accident: the host is asked, a viewer simply leaves.
  const askLeaveRef = useRef(askLeave);
  askLeaveRef.current = askLeave;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        askLeaveRef.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  // The host ended it while I was watching, or the room could not be joined / I was removed.
  useEffect(() => {
    if (!snap || leaving.current || isHost || snap.room.status === 'live') return;
    leaving.current = true;
    session.end();
    Alert.alert('Live broadcast has ended', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }], LIVE);
  }, [snap, isHost, session, navigation]);
  useEffect(() => {
    if (!room?.fatal || leaving.current) return;
    leaving.current = true;
    session.end();
    Alert.alert(room.kicked ? 'Removed from live' : 'Live', room.fatal, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }, [room?.fatal, room?.kicked, session, navigation]);

  // ---- chat
  const send = () => {
    const body = draft.trim();
    if (!body || !room) return;
    setDraft('');
    room.sendMessage(body);
  };
  const lines = !room ? [] : room.messages.filter((m) => tab === 'all' || !m.entry);

  // ---- seats and controls
  const toggleMic = () => mySeat && room?.setMic(!mySeat.muted).catch(() => undefined);
  const toggleCamera = () => mySeat && room?.setCamera(!mySeat.camera_on).catch(() => undefined);
  const seatMenu = (seat: Seat) => {
    if (!room || !seat.user) return;
    if (seat.user.uuid === meUuid) {
      if (isHost) return;
      // Sitting on a seat: mic, camera, flip and leave, in one list.
      return Alert.alert('', undefined, [
        { text: seat.muted ? 'Microphone on' : 'Turn off the mic', onPress: () => void room.setMic(!seat.muted).catch(() => undefined) },
        { text: seat.camera_on ? 'Close video' : 'Open video', onPress: () => void room.setCamera(!seat.camera_on).catch(() => undefined) },
        ...(seat.camera_on ? [{ text: 'Flip camera', onPress: () => voice?.switchCamera() }] : []),
        { text: 'Disconnect the mic', onPress: () => void room.leaveSeat().catch(() => undefined) },
        { text: 'Cancel', style: 'cancel' as const },
      ], SHEET);
    }
    if (!isHost) return;
    const guest = seat.user;
    Alert.alert('', undefined, [
      { text: seat.muted ? 'Unmute' : 'Mute', onPress: () => void room.muteSeat(seat.seat_number, !seat.muted).catch(() => undefined) },
      {
        text: 'Kick Off Mic',
        onPress: () =>
          Alert.alert('Are you sure you want to remove the user from the microphone?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: () => void room.removeFromSeat(seat.seat_number).catch(() => undefined) },
          ], LIVE),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ], { ...SHEET });
    void guest;
  };
  const emptySeatMenu = (seat: Seat) => {
    if (!room) return;
    Alert.alert('', undefined, [
      { text: seat.locked ? 'Unlock' : 'Lock', onPress: () => void room.lockSeat(seat.seat_number, !seat.locked).catch(() => undefined) },
      { text: 'Invite your friends', onPress: () => void Share.share({ message: `Join ${name}'s live on Guftagu!` }).catch(() => undefined) },
      { text: 'Cancel', style: 'cancel' },
    ], SHEET);
  };
  const takeSeat = (n: number) => {
    if (!room || isHost) return;
    Alert.alert('', undefined, [
      {
        text: 'Take the mic',
        onPress: () => void room.takeSeat(n).catch((e) => Alert.alert(e instanceof ApiError ? e.displayMessage : 'Could not take that seat.', undefined, [{ text: 'OK' }], LIVE)),
      },
      { text: 'Cancel', style: 'cancel' },
    ], SHEET);
  };
  const follow = async () => {
    if (!owner) return;
    setFollowed(true);
    await api(`/users/${owner.uuid}/follow`, { method: 'POST', token }).catch(() => setFollowed(false));
  };

  const openPrice = () => {
    setDraftPrices({ voice: prices.voice ? String(prices.voice) : '', video: prices.video ? String(prices.video) : '' });
    setSound(prices.sound);
    setSheet('price');
  };
  const confirmPrice = async () => {
    const ok = await callAction('/call-settings', { method: 'PATCH', body: { voice_price: Number(draftPrices.voice || 0), video_price: Number(draftPrices.video || 0), sound } }, 'Could not save the prices.');
    if (ok) {
      void room?.refresh();
      setSheet('calls');
    }
  };

  // ---- swipe to the next / previous live, the way a reel turns (a viewer only: the host stays on their own stage)
  const { height: winH } = useWindowDimensions();
  const [, setFeedTick] = useState(0);
  // Opening a live from the hero card or a list starts a fresh run; arriving by a swipe carries on the old one.
  useState(() => {
    if (!params.from) {
      HIST = [params.uuid];
      HI = 0;
    }
    return 0;
  });
  const [edgeNote, setEdgeNote] = useState<string | null>(null);
  // The page rides the finger. A live reached by a swipe slides in from the side it was pulled from.
  const slide = useRef(new Animated.Value((params.from ?? 0) * winH)).current;
  const peekNext = useMemo(() => Animated.add(slide, winH), [slide, winH]);
  const peekPrev = useMemo(() => Animated.add(slide, -winH), [slide, winH]);
  const turning = useRef(false);
  useEffect(() => {
    if (!params.from) return;
    Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (isHost) return;
    let live = true;
    const load = () =>
      api<FeedRow[]>('/rooms/live?limit=30&sort=recommended&kind=video', { token })
        .then((rows) => {
          if (!live) return;
          mergeFeed(rows);
          setFeedTick((n) => n + 1);
        })
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 12000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [isHost, token]);
  const swipeGate = useRef({ on: false, uuid: '', me: '', winH: 0 });
  swipeGate.current = { on: Boolean(snap) && !isHost && sheet === null && !gifting, uuid: params.uuid, me: meUuid ?? '', winH };
  /**
   * The live one step further (dir 1) or back (dir -1), and where it sits in the history (`hi`, or null if it is new).
   * Lives that have ended since are skipped.
   */
  const pick = useCallback((dir: 1 | -1): { row: FeedRow; hi: number | null } | undefined => {
    const g = swipeGate.current;
    const live = (uuid: string) => FEED.find((r) => r.uuid === uuid && r.owner?.uuid !== g.me && uuid !== g.uuid);
    if (dir === 1) {
      for (let i = HI + 1; i < HIST.length; i++) {
        const r = live(HIST[i]);
        if (r) return { row: r, hi: i };
      }
    } else {
      for (let i = HI - 1; i >= 0; i--) {
        const r = live(HIST[i]);
        if (r) return { row: r, hi: i };
      }
    }
    const rows = FEED.filter((r) => r.owner?.uuid !== g.me);
    if (rows.length === 0) return undefined;
    const at = rows.findIndex((r) => r.uuid === g.uuid);
    const cand = at === -1 ? (dir === 1 ? rows[0] : rows[rows.length - 1]) : rows[(at + dir + rows.length) % rows.length];
    return cand && cand.uuid !== g.uuid ? { row: cand, hi: null } : undefined;
  }, []);
  const nextRow = pick(1)?.row;
  const prevRow = pick(-1)?.row;
  const settle = useCallback(() => {
    Animated.spring(slide, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }).start(() => {
      turning.current = false;
    });
  }, [slide]);
  const turn = useCallback(
    (dir: 1 | -1) => {
      const hit = pick(dir);
      const target = hit?.row;
      if (!hit || !target) {
        setEdgeNote(dir === 1 ? 'No more lives' : 'This is the first live');
        setTimeout(() => setEdgeNote(null), 1400);
        settle();
        return;
      }
      turning.current = true;
      Animated.timing(slide, { toValue: -dir * swipeGate.current.winH, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        // Remember the step, then open the live.
        if (hit.hi !== null) HI = hit.hi;
        else if (dir === 1) {
          HIST = [...HIST.slice(0, HI + 1), target.uuid];
          HI = HIST.length - 1;
        } else {
          HIST = [target.uuid, ...HIST];
          HI = 0;
        }
        leaving.current = true;
        navigation.replace('LiveVideoRoom', { uuid: target.uuid, cover: target.cover_url, from: dir });
      });
    },
    [navigation, pick, settle, slide],
  );
  // A clear vertical drag on the stage turns the page; taps, the chat box and the buttons are untouched.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY([-24, 24])
        .failOffsetX([-40, 40])
        .onUpdate((e) => {
          const gate = swipeGate.current;
          if (!gate.on || turning.current) return;
          // Nothing further that way: the page gives a little, then springs back.
          slide.setValue(pick(e.translationY < 0 ? 1 : -1) ? e.translationY : e.translationY * 0.3);
        })
        .onEnd((e) => {
          const gate = swipeGate.current;
          if (!gate.on || turning.current || e.absoluteY < gate.winH * 0.08) return settle();
          if (e.translationY < -gate.winH * 0.16 || e.velocityY < -900) turn(1);
          else if (e.translationY > gate.winH * 0.16 || e.velocityY > 900) turn(-1);
          else settle();
        }),
    [pick, settle, slide, turn],
  );

  // The chat list scrolls; it follows new lines only while you are at the bottom, so reading old ones is not interrupted.
  const chatRef = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);
  const chatAtEnd = useRef(true);

  // A join that never answers must not leave you on a spinner for ever.
  const [slowJoin, setSlowJoin] = useState(false);
  useEffect(() => {
    if (snap) return;
    const t = setTimeout(() => setSlowJoin(true), 15000);
    return () => clearTimeout(t);
  }, [snap]);

  // Still joining: the room's state has not arrived.
  if (!snap || !room) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: '#1B1B1B', transform: [{ translateY: slide }] }}>
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.white} />
        <Text style={[{ marginTop: px(12), paddingHorizontal: px(30), textAlign: 'center' }, text(13, 'regular', 'rgba(255,255,255,0.7)')]}>
          {room?.fatal ?? (slowJoin ? 'This is taking too long. Go back and try again.' : 'Joining the live...')}
        </Text>
        <Pressable onPress={() => void leaveLive()} hitSlop={px(10)} style={[at(22, 52), { width: px(28), height: px(28) }]} accessibilityLabel="Back">
          <SvgXml xml={chevronLeft('#FFFFFF')} width={px(28)} height={px(28)} />
        </Pressable>
      </View>
      </Animated.View>
    );
  }

  /** A round control on the bottom row, in the colour of the design's dark discs. */
  const button = (key: string, left: number, Icon: typeof Mic, onPress: () => void, label: string, off = false, size = 44) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityLabel={label}
      style={[at(left, 790), { width: px(size), height: px(size), borderRadius: px(size / 2), backgroundColor: off ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.32)', borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)', alignItems: 'center', justifyContent: 'center' }]}
    >
      <Icon size={px(size * 0.45)} color={off ? '#1B1B1B' : colors.white} />
    </Pressable>
  );

  const controls: { key: string; Icon: typeof Mic; onPress: () => void; label: string; off?: boolean }[] = [];
  // Private call (a video live only): the first button of the row, beside the chat box.
  if (!party) {
    controls.push({
      key: 'call',
      Icon: LinkGlyph as unknown as typeof Mic,
      onPress: () => {
        if (isHost) setCallTab(calls.some((c) => c.status === 'ongoing') ? 'ongoing' : 'applying');
        setSheet(isHost ? 'calls' : 'request');
      },
      label: 'Private call',
    });
  }
  if (mySeat) {
    controls.push({ key: 'mic', Icon: mySeat.muted ? MicOff : Mic, onPress: toggleMic, label: 'Mic', off: mySeat.muted });
    controls.push({ key: 'cam', Icon: mySeat.camera_on ? Camera : CameraOff, onPress: toggleCamera, label: 'Camera', off: !mySeat.camera_on });
    controls.push({ key: 'flip', Icon: SwitchCamera, onPress: () => voice?.switchCamera(), label: 'Switch camera' });
  }
  controls.push({ key: 'sound', Icon: mine!.speakerOff ? VolumeX : Volume2, onPress: () => mine!.setSpeakerOff((v) => !v), label: 'Sound', off: mine!.speakerOff });
  // Up to four round buttons share the strip right of the chat box: mic, camera, flip, sound.
  const shownControls = controls.slice(-5);
  const tight = shownControls.length > 4;

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

  const showFollow = !isHost && !followed && !snap.my.follows_owner;
  const ownerStream = streamOf(owner?.uuid);
  const hostCameraOn = seats.find((s) => s.user?.uuid === owner?.uuid)?.camera_on ?? true;

  return (
    <GestureDetector gesture={pan}>
    <View style={styles.screen}>
      {[
        { row: nextRow, y: peekNext },
        { row: prevRow, y: peekPrev },
      ].map((p, i) =>
        p.row ? (
          <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#141414', transform: [{ translateY: p.y }] }}>
            {p.row.cover_url ?? p.row.owner?.avatar_url ? <Image source={{ uri: (p.row.cover_url ?? p.row.owner?.avatar_url) as string }} blurRadius={24} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: 0.75 }]} /> : null}
          </Animated.View>
        ) : null,
      )}
      <Animated.View style={{ flex: 1, backgroundColor: '#1B1B1B', transform: [{ translateY: slide }] }}>
      <StatusBar style="light" />

      {/* ---- the stage */}
      {party ? (
        <>
          {(() => {
            const cells = tileCells(snap.room.seat_count ?? seats.length);
            return seats.map((seat, i) => {
              const c = cells[i];
              if (!c) return null;
              const who: RoomUser | null = seat.user;
              const stream = streamOf(who?.uuid);
              const pic = Boolean(who && seat.camera_on && stream);
              return (
                <Pressable
                  key={seat.seat_number}
                  onPress={() => (who ? seatMenu(seat) : isHost ? emptySeatMenu(seat) : seat.locked ? Alert.alert('This seat is locked.', undefined, [{ text: 'OK' }], LIVE) : takeSeat(seat.seat_number))}
                  style={[at(c.x, GRID_TOP + c.y), { width: px(c.w), height: px(c.h), backgroundColor: '#2A2A2E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}
                >
                  {pic ? <Picture stream={stream} mirror={who?.uuid === meUuid} /> : null}
                  {who && !pic ? <Image source={who.avatar_url ? { uri: who.avatar_url } : avatarPlaceholder} style={{ width: px(Math.min(c.w, c.h) * 0.45), height: px(Math.min(c.w, c.h) * 0.45), borderRadius: px(Math.min(c.w, c.h) * 0.225) }} /> : null}
                  {!who && seat.locked ? (
                    <View style={{ width: px(40), height: px(40), borderRadius: px(20), borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={px(20)} color="rgba(255,255,255,0.7)" />
                    </View>
                  ) : null}
                  {!who && !seat.locked ? (
                    <View style={{ width: px(34), height: px(34), borderRadius: px(17), backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                      <SvgXml xml={plusIcon('#FFFFFF')} width={px(24)} height={px(24)} />
                    </View>
                  ) : null}
                  <Text style={[at(8, 6), text(13, 'medium', colors.white)]}>{seat.seat_number === 1 ? '' : seat.seat_number}</Text>
                  {who ? (
                    <View style={{ position: 'absolute', left: px(6), bottom: px(6), right: px(6), flexDirection: 'row', alignItems: 'center', gap: px(4) }}>
                      {seat.muted ? <MicOff size={px(12)} color="#FF7A7A" /> : null}
                      <Text numberOfLines={1} style={[{ flex: 1 }, text(11, 'medium', colors.white)]}>
                        {who.display_name ?? 'Guest'}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            });
          })()}
        </>
      ) : (
        <>
          {!(ownerStream && hostCameraOn) && owner?.avatar_url ? <Image source={{ uri: owner.avatar_url }} blurRadius={24} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} /> : null}
          {ownerStream && hostCameraOn ? <Picture stream={ownerStream} mirror={isHost} /> : null}
          {!ownerStream && !isHost ? (
            <View style={[at(0, 330), { width: '100%', alignItems: 'center' }]}>
              <ActivityIndicator color={colors.white} />
              <Text style={[{ marginTop: px(8) }, text(13, 'regular', 'rgba(255,255,255,0.75)')]}>Connecting to {name}...</Text>
            </View>
          ) : null}
          {isHost && !hostCameraOn ? (
            <Text style={[at(0, 360), { width: '100%', textAlign: 'center' }, text(14, 'medium', 'rgba(255,255,255,0.8)')]}>Your camera is off</Text>
          ) : null}
        </>
      )}

      {edgeNote ? (
        <View pointerEvents="none" style={[at(0, 130), { width: '100%', alignItems: 'center' }]}>
          <Text style={[{ paddingHorizontal: px(14), paddingVertical: px(6), borderRadius: px(14), overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.55)' }, text(13, 'medium', colors.white)]}>{edgeNote}</Text>
        </View>
      ) : null}

      {/* The private call's other side: a small tile on the stage, for the host and everyone watching. */}
      {!party
        ? (() => {
            const guest = seats.find((x) => x.seat_number === 2 && x.user);
            if (!guest?.user) return null;
            const stream = streamOf(guest.user.uuid);
            const pic = Boolean(guest.camera_on && stream);
            return (
              <View style={[at(274, 140), { width: px(112), height: px(112), borderRadius: px(10), backgroundColor: '#2A2A2E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}>
                {pic ? <Picture stream={stream} mirror={guest.user.uuid === meUuid} /> : <Image source={guest.user.avatar_url ? { uri: guest.user.avatar_url } : avatarPlaceholder} style={{ width: px(52), height: px(52), borderRadius: px(26) }} />}
                <Text numberOfLines={1} style={[at(6, 90), { width: px(100) }, text(11, 'medium', colors.white)]}>{guest.user.display_name ?? 'Guest'}</Text>
              </View>
            );
          })()
        : null}

      {/* Group 8871 â€” the host pill: avatar, name, ID, follow. */}
      <View style={[at(16, 64), { width: px(201), height: px(56), borderRadius: px(50), borderWidth: 0.4, borderColor: 'rgba(255,248,168,0.5)', backgroundColor: 'rgba(54,27,44,0.5)' }]} />
      <Image source={face} style={[at(27, 73), { width: px(41), height: px(41), borderRadius: px(20.5) }]} />
      <Text numberOfLines={1} style={[at(74, 77), { width: px(80) }, text(12, 'medium', GOLD)]}>
        {name}
      </Text>
      <Text numberOfLines={1} style={[at(74, 93), { width: px(80) }, text(11, 'medium', colors.white)]}>
        ID:{owner?.guftagu_id ?? ''}
      </Text>
      {showFollow ? (
        <Pressable onPress={follow} accessibilityLabel="Follow" hitSlop={px(6)} style={[at(162, 74), { width: px(41.5), height: px(36.6) }]}>
          <SvgXml xml={icons.follow} width={px(41.5)} height={px(36.6)} />
        </Pressable>
      ) : null}

      {/* Frame 1597881169 â€” share and end / leave. */}
      <Pressable onPress={askLeave} accessibilityLabel={isHost ? 'End live' : 'Leave live'} hitSlop={px(8)} style={[at(348, 78), { width: px(29), height: px(29) }]}>
        <SvgXml xml={icons.power} width={px(29)} height={px(29)} />
      </Pressable>

      {/* What the live has earned, and who is watching. */}
      <View style={[at(21, 138), { minWidth: px(68), height: px(33), paddingRight: px(10), borderRadius: px(50), borderWidth: 0.4, borderColor: 'rgba(255,248,168,0.5)', backgroundColor: 'rgba(54,27,44,0.6)', flexDirection: 'row', alignItems: 'center' }]}>
        <Image source={require('../../assets/liveVideo/award.png')} resizeMode="contain" style={{ marginLeft: px(9), width: px(16), height: px(18) }} />
        <Text style={[{ marginLeft: px(5) }, text(14, 'medium', GOLD)]}>{formatCount(snap.room.diamonds)}</Text>
      </View>
      <View style={[at(308, 139), { minWidth: px(70), height: px(32), paddingRight: px(10), borderRadius: px(18), backgroundColor: 'rgba(0,0,0,0.18)', flexDirection: 'row', alignItems: 'center' }]}>
        <Image source={face} style={{ marginLeft: px(9), width: px(21), height: px(21), borderRadius: px(10.5) }} />
        <Text style={[{ marginLeft: px(5), minWidth: px(18), textAlign: 'center' }, text(14, 'medium', colors.white)]}>{watching}</Text>
      </View>

      {/* Frame 1597881173 â€” All / Message / Gift. */}
      <View style={[at(30, 593), { flexDirection: 'row', gap: px(14) }]}>
        {(['all', 'message'] as const).map((t) => (
          <Pressable key={t} onPress={() => { chatAtEnd.current = true; setTab(t); }} hitSlop={px(6)}>
            <Text style={[text(16, 'regular', colors.white), { opacity: tab === t ? 1 : 0.5 }]}>{t === 'all' ? 'All' : 'Message'}</Text>
          </Pressable>
        ))}
      </View>

      {/* The chat (or gifts): a scrolling list, newest at the bottom — each a 31 high card, 5 apart. */}
      <View style={[at(30, 628), { width: px(300), height: px(156) }]}>
        <ChatScroll
          ref={(r) => {
            chatRef.current = r as unknown as typeof chatRef.current;
          }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onLayout={() => chatRef.current?.scrollToEnd({ animated: false })}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const n = e.nativeEvent;
            chatAtEnd.current = n.contentOffset.y + n.layoutMeasurement.height >= n.contentSize.height - px(16);
          }}
          onContentSizeChange={() => {
            if (chatAtEnd.current) chatRef.current?.scrollToEnd({ animated: false });
          }}
          contentContainerStyle={{ gap: px(5) }}
        >
          {lines.map((m) =>
            m.entry ? (
              // "<name> entered the room": a compact pill like the voice room's, not a chat card.
              <View key={m.uuid} style={{ alignSelf: 'flex-start', maxWidth: px(300), flexDirection: 'row', alignItems: 'center', gap: px(6), paddingHorizontal: px(10), paddingVertical: px(6), borderRadius: px(18), backgroundColor: 'rgba(24,18,18,0.6)' }}>
                <LevelBadges user={m.user} height={px(14)} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={[{ flexShrink: 1 }, text(13, 'medium', GOLD)]}>
                  {m.user?.display_name ?? 'Guest'}
                </Text>
                <Text numberOfLines={1} style={[{ flexShrink: 0 }, text(13, 'regular', colors.white)]}>
                  {m.body}
                </Text>
              </View>
            ) : (
              <View key={m.uuid} style={{ width: px(300), height: px(31), borderRadius: px(10), borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)', backgroundColor: 'rgba(20,8,18,0.22)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(8) }}>
                <Text numberOfLines={1} style={[{ maxWidth: px(90) }, text(12, 'medium', GOLD)]}>
                  {m.user?.display_name ?? 'Guest'}
                </Text>
                <Text numberOfLines={1} style={[{ flex: 1, marginLeft: px(6) }, text(11, 'regular', colors.white)]}>
                  {m.body}
                </Text>
              </View>
            ),
          )}
        </ChatScroll>
      </View>

      {/* Rectangle 61 â€” Say Something. */}
      <View style={[at(23, 789), { width: px(150), height: px(45), borderRadius: px(50), borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)', backgroundColor: 'rgba(0,0,0,0.22)' }]}>
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

      {shownControls.map((c, i) => (tight ? button(c.key, 178 + i * 44, c.Icon, c.onPress, c.label, c.off, 38) : button(c.key, 183 + i * 52, c.Icon, c.onPress, c.label, c.off)))}

      <GiftFx
        feed={room.giftFeed}
        pillTop={540}
        centerY={340}
        seatPoint={(uuid) => {
          const i = seats.findIndex((x) => x.user?.uuid === uuid);
          const cell = i >= 0 && party ? tileCells(snap.room.seat_count ?? seats.length)[i] : null;
          if (cell) return { x: cell.x + cell.w / 2, y: GRID_TOP + cell.y + cell.h / 2 };
          return owner?.uuid === uuid ? { x: 35, y: 92 } : null;
        }}
      />

      {gifting ? (
        <GiftSheet
          receiver={owner}
          // Whoever is on camera can be sent a gift: the host, and in a party everybody on a seat.
          onMic={seats.flatMap((s) => (s.user ? [{ seat: s.seat_number, user: s.user }] : []))}
          onClose={() => setGifting(false)}
          onSend={(gift, quantity, targets) => {
            setGifting(false);
            const send_ = targets === 'all' ? room.sendGift(gift.id, 'all', quantity) : Promise.all(targets.map((t) => room.sendGift(gift.id, t.uuid, quantity)));
            send_.catch((e) => Alert.alert('Gift', e instanceof Error ? e.message : 'Could not send that gift.'));
          }}
        />
      ) : null}

      {/* Rectangle 161124141 + Frame 1597881872 â€” the Private call sheet. */}
      {sheet === 'request' && (
        <>
          <Pressable onPress={() => setSheet(null)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
          <View style={[at(0, 440), { right: 0, bottom: 0, backgroundColor: colors.white, overflow: 'hidden' }]}>
            <View style={{ height: px(74), backgroundColor: ZTEAL, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={text(18, 'medium', colors.white)}>Call function</Text>
              <Pressable onPress={() => setSheet(null)} accessibilityLabel="Close" hitSlop={px(8)} style={[at(355, 28), { width: px(24), height: px(24) }]}>
                <SvgXml xml={closeWhite} width={px(24)} height={px(24)} />
              </Pressable>
            </View>
            <Text style={[at(24, 96), { width: px(354), opacity: 0.55 }, text(13, 'regular')]}>
              {'1. You can start a video/voice call based on the price set by the host.\n2. The call is not limited by time and both parties can hang up at any time.\n3. The price is charged once, when the host answers.'}
            </Text>
            {myCall ? (
              <View style={[at(24, 200), { width: px(354), alignItems: 'center' }]}>
                <Text style={text(16, 'medium')}>{myCall.status === 'ongoing' ? 'You are on a call' : 'Video Join - waiting for the host'}</Text>
                <Pressable
                  disabled={busyCall}
                  onPress={() => (myCall.status === 'ongoing' ? hangUp(myCall.id) : declineCall(myCall.id))}
                  style={{ marginTop: px(16), paddingHorizontal: px(40), height: px(44), borderRadius: px(22), backgroundColor: myCall.status === 'ongoing' ? '#E5484D' : 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={text(15, 'medium', myCall.status === 'ongoing' ? colors.white : '#1B1B1B')}>{myCall.status === 'ongoing' ? 'End call' : 'Cancel'}</Text>
                </Pressable>
              </View>
            ) : (
              [
                { t: 'video' as const, label: 'Video', price: prices.video, left: 24 },
                { t: 'voice' as const, label: 'Voice', price: prices.voice, left: 208 },
              ].map((b) => (
                <View key={b.t} style={[at(b.left, 210), { width: px(170), alignItems: 'center' }]}>
                  <Pressable disabled={busyCall} onPress={() => requestCall(b.t)} style={{ width: px(170), height: px(52), borderRadius: px(26), backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: px(8) }}>
                    {b.t === 'video' ? <Camera size={px(20)} color={colors.white} /> : <Phone size={px(20)} color={colors.white} />}
                    <Text style={text(16, 'medium', colors.white)}>{b.label}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: px(10), gap: px(6) }}>
                    <Image source={require('../../assets/liveVideo/call-coin.png')} resizeMode="stretch" style={{ width: px(28), height: px(20) }} />
                    <Text style={text(15, 'medium')}>{b.price > 0 ? `${b.price} /times` : 'Free'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {(sheet === 'calls' || sheet === 'price') && (() => {
        const onCall = calls.find((c) => c.status === 'ongoing') ?? null;
        // With a call going the sheet is just "On a call"; otherwise "Private call" with the two tabs.
        const showOnCall = callTab === 'ongoing' && Boolean(onCall);
        const rows = calls.filter((c) => (callTab === 'ongoing' ? c.status === 'ongoing' : c.status === 'applying'));
        return (
          <>
            <Pressable onPress={() => setSheet(null)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            <View style={[at(0, 330), { right: 0, bottom: 0, backgroundColor: '#F7F7F7', borderTopLeftRadius: px(14), borderTopRightRadius: px(14), overflow: 'hidden' }]}>
              <View style={{ height: px(56), backgroundColor: ZTEAL, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(5) }}>
                  <Text style={text(17, 'medium', colors.white)}>{showOnCall ? 'On a call' : 'Private call'}</Text>
                  {showOnCall ? null : <HelpCircle size={px(16)} color={colors.white} />}
                </View>
                {showOnCall ? null : (
                  <Pressable onPress={openPrice} accessibilityLabel="Price settings" hitSlop={px(8)} style={[at(17, 16), { width: px(24), height: px(24) }]}>
                    <SvgXml xml={icons.settings} width={px(24)} height={px(24)} />
                  </Pressable>
                )}
                <Pressable onPress={() => setSheet(null)} accessibilityLabel="Close" hitSlop={px(8)} style={[at(355, 16), { width: px(26), height: px(26) }]}>
                  <XCircle size={px(26)} color={colors.white} />
                </Pressable>
              </View>
              {showOnCall ? null : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: px(16), paddingHorizontal: px(40) }}>
                  {(['applying', 'ongoing'] as const).map((k) => (
                    <Pressable key={k} onPress={() => setCallTab(k)} style={{ alignItems: 'center' }}>
                      <Text style={text(16, k === callTab ? 'medium' : 'regular', k === callTab ? '#1B1B1B' : '#9A9A9F')}>{k === 'applying' ? 'Applying' : 'On a call'}</Text>
                      <View style={{ width: px(14), height: px(3), borderRadius: px(2), marginTop: px(5), backgroundColor: k === callTab ? '#1B1B1B' : 'transparent' }} />
                    </Pressable>
                  ))}
                </View>
              )}
              {rows.length === 0 ? (
                // Frame 1597881540 - nothing here.
                <View style={{ alignSelf: 'center', width: px(183), marginTop: px(48) }}>
                  <Image source={require('../../assets/liveVideo/no-content.png')} resizeMode="cover" style={{ width: px(183), height: px(183) }} />
                  <Text style={[text(15, 'medium'), { textAlign: 'center', opacity: 0.4 }]}>No Content here</Text>
                </View>
              ) : (
                <ScrollView style={{ marginTop: px(8) }} contentContainerStyle={{ paddingHorizontal: px(18) }}>
                  {rows.map((c) => (
                    <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', height: px(84), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C9C9CE' }}>
                      <Image source={c.caller.avatar_url ? { uri: c.caller.avatar_url } : avatarPlaceholder} style={{ width: px(48), height: px(48), borderRadius: px(24) }} />
                      <View style={{ flex: 1, marginLeft: px(12) }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
                          <Text numberOfLines={1} style={[{ flexShrink: 1, fontStyle: 'italic' }, text(16, 'medium', '#1B1B1B')]}>{c.caller.display_name ?? 'Guest'}</Text>
                          {c.caller.gender ? (
                            <View style={{ width: px(16), height: px(16), borderRadius: px(8), backgroundColor: c.caller.gender === 'female' ? '#FF8FA3' : '#5AA9FF', alignItems: 'center', justifyContent: 'center' }}>
                              {c.caller.gender === 'female' ? <Venus size={px(10)} color={colors.white} /> : <Mars size={px(10)} color={colors.white} />}
                            </View>
                          ) : null}
                        </View>
                        <Text style={[{ marginTop: px(2) }, text(12, 'regular', '#9A9A9F')]}>
                          ID: {c.caller.guftagu_id ?? ''} · {c.type === 'video' ? 'Video' : 'Voice'} · {c.price > 0 ? `${c.price} coins` : 'Free'}
                        </Text>
                      </View>
                      {c.status === 'applying' ? (
                        <>
                          <Pressable disabled={busyCall} onPress={() => declineCall(c.id)} accessibilityLabel="Decline" hitSlop={px(6)} style={{ width: px(34), height: px(34), borderRadius: px(17), backgroundColor: '#E4E4E8', alignItems: 'center', justifyContent: 'center', marginRight: px(10) }}>
                            <SvgXml xml={closeWhite.replace('#FFFFFF', '#6A6A70')} width={px(18)} height={px(18)} />
                          </Pressable>
                          <Pressable disabled={busyCall} onPress={() => answerCall(c.id)} accessibilityLabel="Answer" style={{ width: px(36), height: px(36), borderRadius: px(18), backgroundColor: ANSWER_GREEN, alignItems: 'center', justifyContent: 'center' }}>
                            <Phone size={px(18)} color={colors.white} />
                          </Pressable>
                        </>
                      ) : (
                        <Pressable disabled={busyCall} onPress={() => hangUp(c.id)} accessibilityLabel="Hang up" style={{ width: px(36), height: px(36), borderRadius: px(18), backgroundColor: HANGUP_RED, alignItems: 'center', justifyContent: 'center' }}>
                          <PhoneOff size={px(18)} color={colors.white} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </>
        );
      })()}

      {/* Rectangle 161124143 + Frame 1597881874 â€” Price settings, over the sheet. */}
      {sheet === 'price' && (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
          <View style={[at(0, 332), { right: 0, bottom: 0, backgroundColor: colors.white, overflow: 'hidden' }]}>
            {priceBox(134, 'Set voice call price', 'voice', 258)}
            {priceBox(255, 'Set Video call price', 'video', 261)}
            <Text style={[at(22, 368), text(15, 'medium')]}>Sound</Text>
            <Text style={[at(22, 401), { width: px(302), opacity: 0.3 }, text(15, 'regular')]}>
              After turning on the sound , the audience in the live broadcast room can hear the conversation content
            </Text>
            <Pressable
              onPress={() => setSound((s) => !s)}
              accessibilityLabel="Sound"
              style={[at(331, 401), { width: px(55), height: px(24), borderRadius: px(12), backgroundColor: sound ? TEAL : 'rgba(0,0,0,0.13)' }]}
            >
              <View style={{ position: 'absolute', top: px(2), left: px(sound ? 33 : 3), width: px(20), height: px(20), borderRadius: px(10), backgroundColor: colors.white }} />
            </Pressable>
            <View style={{ height: px(74), backgroundColor: ZTEAL, position: 'absolute', left: 0, right: 0, top: 0 }}>
              <Pressable onPress={() => setSheet('calls')} accessibilityLabel="Back" hitSlop={px(8)} style={[at(17, 25), { width: px(24), height: px(24) }]}>
                <SvgXml xml={chevronLeft('#FFFFFF')} width={px(24)} height={px(24)} />
              </Pressable>
              <Text style={[at(144, 27), text(15, 'medium', colors.white)]}>Price settings</Text>
              <Pressable onPress={() => void confirmPrice()} hitSlop={px(8)} style={at(323, 28)}>
                <Text style={text(15, 'medium', colors.white)}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
      </Animated.View>
    </View>
    </GestureDetector>
  );
}

const formatCount = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1B1B1B' },
});
