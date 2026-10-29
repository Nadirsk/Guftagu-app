import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  Dimensions,
  useWindowDimensions,
  View,
} from 'react-native';
import { Crown } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/room/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { EnteringOverlay, EntranceBanner } from './EntryEffects';
import { ActionPill, AnnouncementDialog, BottomBar, ChatBar, ClearDialog, type ChatTab, HostMenu, type HostMenuKey, LockGlyph, PowerOverlay, TopRoomPill, ViewersPill } from './RoomChrome';
import { SeatMenu } from './SeatMenu';
import { CasualBubble, Composer, EmojiSheet } from './EmojiSheet';
import { useVoice } from './voice';
import {
  BACKDROP,
  CHAT,
  CHAT_TABS,
  CONTROLS,
  FRAME,
  LAST_ROW_Y,
  NOTICE,
  OWNER,
  SEAT,
  type SeatSpot,
  seatSpots,
  SIDE,
  TROPHY,
} from './geometry';
import {
  avatarOf,
  GamesSheet,
  GiftSheet,
  KickoutSheet,
  LeaveDialog,
  MusicSheet,
  RoomDrawer,
  ShareSheet,
  type ToolKey,
  ToolsSheet,
} from './sheets';
import { type ChatMessage, type GiftEvent, type RoomUser, type Seat, useRoom } from './useRoom';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const YELLOW = '#FEDE0F';
const SEAT_PINK = '#FFC3DD';
const SEAT_LIFT = -82;
const DEFAULT_NOTICE =
  'Welcome to Guftagu, Please comply with platform user regulations, chat with others politely and wish you have a pleasant time here.';

type Overlay =
  | { kind: 'power' }
  | { kind: 'drawer' }
  | { kind: 'clearChat' }
  | { kind: 'hostMenu' }
  | { kind: 'announcement' }
  | { kind: 'leave' }
  | { kind: 'tools' }
  | { kind: 'kickout'; user: RoomUser }
  | { kind: 'seatMenu' }
  | { kind: 'gifts'; receiver: RoomUser | null }
  | { kind: 'music' }
  | { kind: 'share' }
  | { kind: 'games' };

/** A host tool waiting for its seat: Tools → Kick-Out / Mute / Seat Lock, then tap. */
type SeatMode = 'kick' | 'mute' | 'lock' | null;


/**
 * The voice room — frame 34:2257 and its overlays (section 66:544).
 *
 * State comes from `GET /rooms/{uuid}/state` (see useRoom); every control on the
 * frame is wired to its endpoint. What is not wired is the audio itself: the
 * backend signals WebRTC between seated peers, and that needs a native module
 * Expo Go does not ship, so the mic button changes your mute state on the seat
 * but nothing is sent or played yet.
 */
export default function RoomScreen() {
  const { px, ratio } = useDesignScale();
  const { height } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Room'>>();
  const { token } = useAuth();
  const room = useRoom(params.uuid);
  const { snapshot } = room;

  /** How much taller than the 874 frame this phone is — the bottom half moves down by it. */
  const extra = Math.max(0, height / ratio - FRAME.height);

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [seatMode, setSeatMode] = useState<SeatMode>(null);
  const [chatTab, setChatTab] = useState<ChatTab>('All');
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [composer, setComposer] = useState<null | 'keys' | 'grid'>(null);
  // The room is drawn edge to edge, so the keyboard covers the bar unless we lift it ourselves.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(Math.max(e.endCoordinates.height, Dimensions.get('screen').height - e.endCoordinates.screenY)));
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKb(0);
      setComposer((m) => (m === 'keys' ? null : m));
    });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [recentEmoji, setRecentEmoji] = useState(['😍', '😊', '😃', '🤫', '😘']);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!room.fatal) return;
    Alert.alert('Room', room.fatal, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }, [navigation, room.fatal]);

  const isHost = snapshot?.my.is_host ?? false;
  const me = room.me;
  const seats = snapshot?.seats ?? [];
  const mySeat = seats.find((x) => x.user?.uuid === me?.uuid) ?? null;
  const voice = useVoice({
    roomUuid: params.uuid,
    token,
    meUuid: me?.uuid,
    seated: seats.flatMap((x) => (x.user ? [{ seat: x.seat_number, uuid: x.user.uuid }] : [])),
    // `muted` on a seat already folds in the host's mute, not only my own.
    micOpen: Boolean(mySeat && !mySeat.muted),
    speakerOff,
    iceServers: snapshot?.signaling?.ice_servers ?? [{ urls: 'stun:stun.l.google.com:19302' }],
    ready: Boolean(snapshot),
  });
  // Mazag's first seat row sits ~11 px under the "Top Room" pill, so the whole block rides up.
  const spots = useMemo(() => seatSpots(seats.length).map((s) => ({ ...s, y: s.y + SEAT_LIFT, labelY: s.labelY + SEAT_LIFT })), [seats.length]);
  // Everything from the notice down follows the last row of seats.
  // Full-size layouts with fewer rows than Figma's ten pull the notice up; the
  // shrunk 20/40 grids are fitted inside the frame's own seat block, so they don't.
  const lastRowY = spots.length && seats.length <= 12 ? spots[spots.length - 1].y : LAST_ROW_Y;
  const shift = lastRowY - LAST_ROW_Y;
  // Mazag hangs the chat tabs straight under the last row of seats, whatever the seat count.
  // Mazag hangs the tabs under the last seat row (~50 px below it with 8 seats, ~36 px with 30) and
  // lets the chat list run down to the bottom bar.
  const lastSpot = spots[spots.length - 1];
  const tabsY = lastSpot ? lastSpot.y + lastSpot.ring + 36 : CHAT_TABS.y + shift;

  /** The first open seat, where the "Go on..." hint points while you are not on one. */
  const inviteSeat = !mySeat ? seats.find((x) => !x.user && !x.locked)?.seat_number : undefined;

  const run = useCallback(
    async (work: () => Promise<unknown>, done?: string) => {
      try {
        await work();
        if (done) toast.show(done);
      } catch (e) {
        toast.show(e instanceof ApiError ? e.displayMessage : 'Something went wrong');
      }
    },
    [toast],
  );

  const giftReceiver = useCallback(
    (preferred?: RoomUser | null): RoomUser | null => {
      if (preferred && preferred.uuid !== me?.uuid) return preferred;
      if (snapshot?.owner && snapshot.owner.uuid !== me?.uuid) return snapshot.owner;
      return seats.find((s) => s.user && s.user.uuid !== me?.uuid)?.user ?? null;
    },
    [me?.uuid, seats, snapshot?.owner],
  );

  const onSeat = (seat: Seat) => {
    const mine = seat.user?.uuid === me?.uuid;

    if (seatMode) {
      const mode = seatMode;
      setSeatMode(null);
      if (mode === 'lock') {
        run(() => room.lockSeat(seat.seat_number, !seat.locked), seat.locked ? 'Seat unlocked' : 'Seat locked');
      } else if (!seat.user) {
        toast.show('That seat is empty');
      } else if (mode === 'mute') {
        run(() => room.muteSeat(seat.seat_number, !seat.muted), seat.muted ? 'Unmuted' : 'Muted');
      } else if (mine) {
        toast.show('You cannot kick yourself out');
      } else {
        setOverlay({ kind: 'kickout', user: seat.user });
      }
      return;
    }

    if (seat.locked) {
      if (isHost) run(() => room.lockSeat(seat.seat_number, false), 'Seat unlocked');
      return;
    }
    if (!seat.user) {
      if (!snapshot?.my.can_take_seat) toast.show('You cannot take a seat in this room right now');
      else run(() => room.takeSeat(seat.seat_number));
      return;
    }
    if (mine) {
      setOverlay({ kind: 'seatMenu' });
      return;
    }
    const user = seat.user;
    if (!isHost) {
      setOverlay({ kind: 'gifts', receiver: user });
      return;
    }
    Alert.alert(user.display_name ?? 'Guftagu user', undefined, [
      { text: 'Send a gift', onPress: () => setOverlay({ kind: 'gifts', receiver: user }) },
      { text: seat.muted ? 'Unmute' : 'Mute', onPress: () => run(() => room.muteSeat(seat.seat_number, !seat.muted)) },
      { text: 'Kick out', style: 'destructive', onPress: () => setOverlay({ kind: 'kickout', user }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onTool = (key: ToolKey) => {
    if (key === 'clear') {
      room.clearChat();
      setOverlay(null);
      toast.show('Chat cleared');
    } else if (key === 'music') {
      setOverlay({ kind: 'music' });
    } else if (key === 'kick' || key === 'mute' || key === 'lock') {
      if (!isHost) {
        toast.show('Only the host can do that');
        return;
      }
      setOverlay(null);
      setSeatMode(key);
      toast.show(key === 'kick' ? 'Tap a seat to kick that person out' : key === 'mute' ? 'Tap a seat to mute or unmute it' : 'Tap a seat to lock or unlock it');
    } else {
      toast.show('Coming soon');
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setEmojiOpen(false);
    Keyboard.dismiss();
    await run(() => room.sendMessage(body));
  };

  const toggleMic = () => {
    if (!snapshot?.my.seat_number) {
      toast.show('Take a seat to speak');
      return;
    }
    run(() => room.setMic(!snapshot.my.muted), snapshot.my.muted ? 'Mic on' : 'Mic off');
  };

  const follow = () =>
    snapshot?.owner &&
    run(async () => {
      await api(`/users/${snapshot.owner!.uuid}/follow`, { method: 'POST', token });
      setFollowed(true);
    }, 'Following');

  const leave = async () => {
    setLeaving(true);
    try {
      await room.leave();
    } catch {
      // Leaving is best-effort; the server times idle members out anyway.
    }
    navigation.goBack();
  };

  const rows = useMemo(() => chatRows(chatTab, room.messages, room.gifts), [chatTab, room.messages, room.gifts]);
  const chatScroll = useRef<ScrollViewInstance>(null);

  const showHeart = snapshot?.owner && snapshot.owner.uuid !== me?.uuid && !followed;
  const notice = snapshot?.room.announcement?.trim() || DEFAULT_NOTICE;
  const theme = snapshot?.room.background_url ?? snapshot?.room.theme?.background_url;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* 34:2257's fill, then the cover photo at half opacity (34:2258). */}
      <LinearGradient colors={BACKDROP.colors} locations={BACKDROP.locations} style={StyleSheet.absoluteFill} />
      <Image
        source={theme ? { uri: theme } : require('../../assets/room/background.jpg')}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: px(BACKDROP.photo.x),
          top: px(BACKDROP.photo.y),
          width: px(BACKDROP.photo.width),
          height: px(BACKDROP.photo.height + extra),
          opacity: BACKDROP.photo.opacity,
        }}
      />

      {/* ------------------------------------------------ header */}
      <View
        style={{
          position: 'absolute',
          left: px(OWNER.pill.x),
          top: px(OWNER.pill.y),
          width: px(OWNER.pill.width),
          height: px(OWNER.pill.height),
          borderRadius: px(50),
          backgroundColor: 'rgba(45,34,28,0.6)',
        }}
      />
      <Image
        source={avatarOf(snapshot?.owner)}
        style={{
          position: 'absolute',
          left: px(OWNER.avatar.x),
          top: px(OWNER.avatar.y),
          width: px(OWNER.avatar.size),
          height: px(OWNER.avatar.size),
          borderRadius: px(OWNER.avatar.size / 2),
          borderWidth: px(1.5),
          borderColor: 'rgba(255,255,255,0.85)',
        }}
      />
      <View style={{ position: 'absolute', left: px(OWNER.text.x), top: px(OWNER.text.y), width: px(OWNER.text.width), overflow: 'hidden', gap: px(OWNER.text.gap) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(3) }}>
          {snapshot?.room.visibility === 'private' ? <LockGlyph size={px(11)} color="#C9B6FF" /> : null}
          <Text numberOfLines={1} style={[styles.medium, { flexShrink: 1, fontSize: px(OWNER.name.size), lineHeight: px(OWNER.name.height + 2), color: YELLOW }]}>
            {snapshot?.room.name ?? ' '}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.medium, { fontSize: px(OWNER.id.size), lineHeight: px(OWNER.id.height + 2), color: colors.white }]}>
          {snapshot ? `ID:${snapshot.room.room_code}` : ' '}
        </Text>
      </View>
      {showHeart ? (
        <Pressable onPress={follow} hitSlop={px(6)} style={{ position: 'absolute', left: px(OWNER.heart.x), top: px(OWNER.heart.y) }}>
          <SvgXml xml={icons.followHeart} width={px(OWNER.heart.width)} height={px(OWNER.heart.height)} />
        </Pressable>
      ) : null}

      <View style={{ position: 'absolute', right: px(16), top: px(44), flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
        <ViewersPill members={snapshot?.members ?? []} count={snapshot?.room.listener_count ?? 0} onPress={() => toast.show('Coming soon')} />
        <ActionPill onShare={() => setOverlay({ kind: 'share' })} onPower={() => setOverlay({ kind: 'drawer' })} />
      </View>
      <View style={{ position: 'absolute', left: px(TROPHY.pill.x), top: px(TROPHY.pill.y) }}>
        <TopRoomPill onPress={() => toast.show('Coming soon')} />
      </View>

      {/* ------------------------------------------------ seats */}
      {seats.map((seat, i) => (
        <SeatView
          key={seat.seat_number}
          seat={seat}
          spot={spots[i]}
          mine={seat.user?.uuid === me?.uuid}
          picking={seatMode !== null}
          speaking={Boolean(seat.user && !seat.muted && voice.speaking.has(seat.user.uuid))}
          invite={!mySeat && seat.seat_number === inviteSeat}
          onPress={() => onSeat(seat)}
        />
      ))}

      {/* ------------------------------------------------ chat */}
      {chatOpen ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: px(250), bottom: 0, backgroundColor: 'rgba(8,3,8,0.7)' }} />
      ) : null}
      <View style={{ position: 'absolute', left: px(CHAT_TABS.x), top: px(chatOpen ? 256 : tabsY) }}>
        <ChatBar tab={chatTab} onTab={setChatTab} onClear={() => setOverlay({ kind: 'clearChat' })} expanded={chatOpen} onExpand={() => setChatOpen((v) => !v)} />
      </View>
      <ScrollView
        ref={chatScroll}
        onContentSizeChange={() => chatScroll.current?.scrollToEnd({ animated: true })}
        style={{
          position: 'absolute',
          left: px(CHAT.x),
          width: px(CHAT.width + 4),
          top: px(chatOpen ? 300 : tabsY + 40),
          height: px(chatOpen ? Math.max(CHAT.rowHeight + 10, 700 + extra - 300) : Math.max(CHAT.rowHeight + 10, CONTROLS.input.y + extra - 6 - (tabsY + 40))),
        }}
        contentContainerStyle={{ gap: px(CHAT.rowGap), paddingBottom: px(4) }}
        showsVerticalScrollIndicator={false}
      >
        {chatTab !== 'Gifts' ? <NoticeCard text={notice} /> : null}
        {rows.map((row) => (
          row.entry ? <EntryRow key={row.key} user={row.user} text={row.text} /> : <ChatRow key={row.key} user={row.user} text={row.text} gift={row.gift} />
        ))}
      </ScrollView>

      {/* ------------------------------------------------ right column */}
      <Pressable onPress={() => setOverlay({ kind: 'games' })} style={{ position: 'absolute', left: px(SIDE.wheel.label.centerX - SIDE.wheel.label.width / 2), top: px(SIDE.wheel.y + extra - 40), width: px(SIDE.wheel.label.width), alignItems: 'center' }}>
        <Image source={require('../../assets/room/lucky-wheel.png')} resizeMode="cover" style={{ width: px(SIDE.wheel.size), height: px(SIDE.wheel.size) }} />
        <Text style={[styles.regular, { marginTop: px(2), fontSize: px(SIDE.wheel.label.size), color: colors.white }]}>Lucky Wheel</Text>
      </Pressable>

      {room.casuals.map((c) => {
        const i = seats.findIndex((x) => x.user?.uuid === c.user?.uuid);
        const spot = i >= 0 ? spots[i] : null;
        const size = spot ? spot.ring * 1.3 : 120;
        return (
          <CasualBubble
            key={c.id}
            casual={c}
            x={spot ? spot.x + spot.ring / 2 - size / 2 : 201 - size / 2}
            y={spot ? spot.y + spot.ring / 2 - size / 2 : 330}
            size={size}
            onDone={() => room.dismissCasual(c.id)}
          />
        );
      })}
      {/* ------------------------------------------------ bottom bar */}
      <View style={{ position: 'absolute', left: px(12), right: px(12), top: px(CONTROLS.input.y + extra - 2), }}>
        <BottomBar
          draft={draft}
          onDraft={setDraft}
          onSend={send}
          onEmoji={() => setEmojiOpen((v) => !v)}
          onType={() => setComposer('keys')}
          onGift={() => setOverlay({ kind: 'gifts', receiver: giftReceiver() })}
          speakerOff={speakerOff}
          onSpeaker={() => { setSpeakerOff((v) => !v); toast.show(speakerOff ? 'Speaker on' : 'Speaker off'); }}
          seated={Boolean(mySeat)}
          micOn={Boolean(mySeat && !mySeat.muted)}
          onMic={toggleMic}
          onGames={() => setOverlay({ kind: 'games' })}
        />
      </View>

      {/* ------------------------------------------------ overlays */}
      {overlay?.kind === 'clearChat' ? (
        <ClearDialog onCancel={() => setOverlay(null)} onConfirm={() => { room.clearChat(); setOverlay(null); }} />
      ) : null}
      {overlay?.kind === 'drawer' ? (
        <RoomDrawer
          roomUuid={params.uuid}
          onClose={() => setOverlay(null)}
          onMinimize={() => navigation.goBack()}
          onExit={() => setOverlay({ kind: 'leave' })}
        />
      ) : null}
      {overlay?.kind === 'power' ? (
        <PowerOverlay
          onClose={() => setOverlay(null)}
          onMinimize={() => navigation.goBack()}
          onExit={() => { setOverlay(null); leave(); }}
        />
      ) : null}
      {overlay?.kind === 'hostMenu' ? (
        <HostMenu
          isHost={isHost}
          onClose={() => setOverlay(null)}
          onPick={(k: HostMenuKey) => {
            if (k === 'share') setOverlay({ kind: 'share' });
            else if (k === 'announcement') setOverlay({ kind: 'announcement' });
            else {
              setOverlay(null);
              toast.show('Coming soon');
            }
          }}
        />
      ) : null}
      {overlay?.kind === 'announcement' ? (
        <AnnouncementDialog
          initial={snapshot?.room.announcement ?? ''}
          onClose={() => setOverlay(null)}
          onSave={(text) => {
            setOverlay(null);
            run(async () => {
              await api(`/rooms/${params.uuid}/announcement`, { method: 'PATCH', body: { announcement: text || null }, token });
              await room.refresh();
            }, 'Announcement saved');
          }}
        />
      ) : null}
      {emojiOpen ? (
        <EmojiSheet
          onClose={() => setEmojiOpen(false)}
          onKeyboard={() => { setEmojiOpen(false); setComposer('keys'); }}
          onSmiley={(e) => { setEmojiOpen(false); run(() => room.sendMessage(e)); }}
          onCasual={(kind) => {
            setEmojiOpen(false);
            run(() => room.playCasual(kind));
          }}
        />
      ) : null}
      {composer ? (
        <Composer
          mode={composer}
          setMode={setComposer}
          kb={kb}
          draft={draft}
          onDraft={setDraft}
          onSend={async () => { await send(); setComposer(null); }}
          onClose={() => { Keyboard.dismiss(); setComposer(null); }}
          onImage={() => toast.show('Coming soon')}
          recent={recentEmoji}
          onPickEmoji={(e) => {
            setDraft((d) => d + e);
            setRecentEmoji((l) => [e, ...l.filter((x) => x !== e)].slice(0, 5));
          }}
        />
      ) : null}
      {overlay?.kind === 'seatMenu' ? (
        <SeatMenu
          onClose={() => setOverlay(null)}
          onProfile={() => {
            setOverlay(null);
            toast.show('Coming soon');
          }}
          onLeave={() => {
            setOverlay(null);
            run(() => room.leaveSeat());
          }}
          onGift={() => setOverlay({ kind: 'gifts', receiver: giftReceiver() })}
        />
      ) : null}
      {overlay?.kind === 'leave' ? <LeaveDialog busy={leaving} onCancel={() => setOverlay(null)} onConfirm={leave} /> : null}
      {overlay?.kind === 'tools' ? <ToolsSheet extra={extra} onClose={() => setOverlay(null)} onPick={onTool} /> : null}
      {overlay?.kind === 'kickout' ? (
        <KickoutSheet
          extra={extra}
          name={overlay.user.display_name ?? 'Guftagu user'}
          onClose={() => setOverlay(null)}
          onConfirm={async (minutes) => {
            await run(() => room.kick(overlay.user.uuid, minutes), 'Kicked out');
            setOverlay(null);
          }}
        />
      ) : null}
      {overlay?.kind === 'gifts' ? (
        <GiftSheet
          receiver={overlay.receiver}
          onClose={() => setOverlay(null)}
          onSend={async (gift, quantity) => {
            if (!overlay.receiver) return;
            const res = await room.sendGift(gift.id, overlay.receiver.uuid, quantity);
            toast.show(`Sent ${gift.name_en} to ${res.receiver.display_name ?? 'them'}`);
            return res.coin_balance;
          }}
        />
      ) : null}
      {overlay?.kind === 'music' ? <MusicSheet extra={extra} onClose={() => setOverlay(null)} /> : null}
      {overlay?.kind === 'share' ? (
        <ShareSheet
          extra={extra}
          roomName={snapshot?.room.name ?? 'Guftagu'}
          roomCode={snapshot?.room.room_code ?? ''}
          onClose={() => setOverlay(null)}
          onFriends={() => toast.show('Coming soon')}
        />
      ) : null}
      {overlay?.kind === 'games' ? <GamesSheet extra={extra} onClose={() => setOverlay(null)} onPick={() => toast.show('Coming soon')} /> : null}

      {room.entrance ? <EntranceBanner key={room.entrance.id} entrance={room.entrance} onDone={room.nextEntrance} /> : null}
      <EnteringOverlay visible={!snapshot} />

      {toast.node}
    </View>
  );
}

// ---------------------------------------------------------------- pieces

function SeatView({ seat, spot, mine, picking, speaking, invite, onPress }: { seat: Seat; spot: SeatSpot; mine: boolean; picking: boolean; speaking: boolean; invite: boolean; onPress: () => void }) {
  const { px } = useDesignScale();
  // Every part of a seat is Figma's 47.053 one, scaled to this layout's ring.
  const k = spot.ring / SEAT.ring;
  const ring = seat.is_vip ? SEAT.vipRingSvg : SEAT.ringSvg;
  const face = spot.ring - 4 * k;
  const labelWidth = Math.max(SEAT.label.width, spot.ring + 26 * k);
  // An empty locked or VIP seat is a glass disc (locked: pale, VIP: gold-rimmed), not the pink ring.
  const glass = !seat.user && (seat.locked || seat.is_vip);

  return (
    <>
      {speaking ? <SpeakingRipple x={spot.x} y={spot.y} size={spot.ring} /> : null}
      {invite ? <InviteHint x={spot.x} y={spot.y} size={spot.ring} /> : null}
      {glass ? null : (
        <View pointerEvents="none" style={{ position: 'absolute', left: px(spot.x + ring.dx * k), top: px(spot.y + ring.dy * k), opacity: picking ? 0.75 : 1 }}>
          <SvgXml xml={seat.is_vip ? icons.seatRingVip : icons.seatRing} width={px(ring.size * k)} height={px(ring.size * k)} />
        </View>
      )}
      <Pressable
        onPress={onPress}
        style={{ position: 'absolute', left: px(spot.x), top: px(spot.y), width: px(spot.ring), height: px(spot.ring), borderRadius: px(spot.ring / 2), alignItems: 'center', justifyContent: 'center' }}
      >
        {seat.user ? (
          // Figma draws no occupied seat; the occupant's face fills the ring.
          <Image
            source={avatarOf(seat.user)}
            style={{ width: px(face), height: px(face), borderRadius: px(face / 2), borderWidth: mine ? px(1.5) : 0, borderColor: YELLOW }}
          />
        ) : seat.locked ? (
          // Mazag's own locked-seat disc.
          <Image source={require('../../assets/room/mz/seat-lock.png')} style={{ width: px(spot.ring), height: px(spot.ring), opacity: picking ? 0.75 : 1 }} />
        ) : seat.is_vip ? (
          // Mazag's VIP seat: its glass chair disc under the gold ring frame.
          <View style={{ width: px(spot.ring), height: px(spot.ring), alignItems: 'center', justifyContent: 'center', opacity: picking ? 0.75 : 1 }}>
            <Image source={require('../../assets/room/mz/seat-empty.png')} style={{ position: 'absolute', width: px(spot.ring), height: px(spot.ring), tintColor: '#F2C14E' }} />
            <Image source={require('../../assets/room/mz/vip-ring-10.png')} style={{ position: 'absolute', width: px(spot.ring * 1.04), height: px(spot.ring * 1.04) }} />
          </View>
        ) : (
          // Centred in the ring, as Figma renders it — the export's (3, 2) mask offset
          // inside the Seat box reads as off-centre once drawn literally.
          <SvgXml xml={seat.is_vip ? icons.seatVip : icons.seat} color={SEAT_PINK} width={px(SEAT.glyph.width * k)} height={px(SEAT.glyph.height * k)} />
        )}
        {seat.user && seat.muted ? (
          <View style={{ position: 'absolute', right: px(-2), bottom: px(-2), width: px(16 * k), height: px(16 * k), borderRadius: px(8 * k), backgroundColor: '#BD2727', alignItems: 'center', justifyContent: 'center' }}>
            <SvgXml xml={icons.toolMute.replace(/stroke="[^"]*"/g, 'stroke="white"')} width={px(11 * k)} height={px(11 * k)} />
          </View>
        ) : null}
      </Pressable>
      {seat.user ? (
        <SeatCaption seat={seat} spot={spot} width={labelWidth} />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.medium,
            { position: 'absolute', left: px(spot.labelX - SEAT.label.width / 2), width: px(SEAT.label.width), top: px(spot.labelY), fontSize: px(spot.labelSize), color: '#F0EEFF', textAlign: 'center' },
          ]}
        >
          {seat.seat_number}
        </Text>
      )}
    </>
  );
}

const BADGE = { male: '#2F8CFF', female: '#FF5C93' } as const;

/** 14700000 → 14.7M, 1500 → 1.5K, as the pill under a seat prints it. */
function shortCount(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

/**
 * What sits under an occupied seat: a round number badge and the person's name, then a pill
 * with the gifts they have been sent here. The pill's colour is its tier — gold with a
 * crown from 50K, purple from 10K, dark below.
 */
function SeatCaption({ seat, spot, width }: { seat: Seat; spot: SeatSpot; width: number }) {
  const { px } = useDesignScale();
  const size = spot.labelSize;
  const badge = size + 5;
  const value = seat.gift_value ?? 0;
  const tier = value >= 50_000 ? 'gold' : value >= 10_000 ? 'purple' : 'dark';
  const colour = BADGE[seat.gender as keyof typeof BADGE] ?? '#B06CFF';
  const pillH = size + 3;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: px(spot.labelX - width / 2), width: px(width), top: px(spot.labelY), alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(3), maxWidth: px(width) }}>
        <View style={{ width: px(badge), height: px(badge), borderRadius: px(badge / 2), backgroundColor: colour, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.medium, { fontSize: px(size - 4), color: colors.white }]}>{seat.seat_number}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.medium, { flexShrink: 1, fontSize: px(size - 2), color: '#F0EEFF' }]}>
          {seat.user?.display_name ?? ''}
        </Text>
      </View>
      {tier === 'gold' ? (
        <LinearGradient
          colors={['#FFC83A', '#F58A12']}
          style={{ marginTop: px(2), height: px(pillH), minWidth: px(width * 0.7), paddingHorizontal: px(5), borderRadius: px(pillH / 2), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(2), borderWidth: 1, borderColor: '#FFE9A6' }}
        >
          <Text style={{ fontSize: px(size - 5), color: '#B54A00' }}>♛</Text>
          <Text style={[styles.medium, { fontSize: px(size - 4), color: '#7A2E00' }]}>{shortCount(value)}</Text>
        </LinearGradient>
      ) : (
        <View
          style={{ marginTop: px(2), height: px(pillH), minWidth: px(width * 0.7), paddingHorizontal: px(5), borderRadius: px(pillH / 2), alignItems: 'center', justifyContent: 'center', backgroundColor: tier === 'purple' ? '#5A1F78' : 'rgba(0,0,0,0.62)' }}
        >
          <Text style={[styles.medium, { fontSize: px(size - 4), color: colors.white }]}>{shortCount(value)}</Text>
        </View>
      )}
    </View>
  );
}

/** Rings that grow out of a seat and fade while its occupant is talking. */
function SpeakingRipple({ x, y, size }: { x: number; y: number; size: number }) {
  const { px } = useDesignScale();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  // Two rings half a cycle apart. `t` is 0..1, so the second is simply shifted.
  const ring = (shift: number) => {
    const input = shift === 0 ? [0, 1] : [0, 0.5, 0.5001, 1];
    const scale = shift === 0 ? [1, 1.7] : [1.35, 1.7, 1, 1.35];
    const fade = shift === 0 ? [0.7, 0] : [0.35, 0, 0.7, 0.35];
    return {
      opacity: t.interpolate({ inputRange: input, outputRange: fade }),
      transform: [{ scale: t.interpolate({ inputRange: input, outputRange: scale }) }],
    };
  };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: px(x), top: px(y), width: px(size), height: px(size) }}>
      {[0, 1].map((d) => (
        <Animated.View key={d} style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: px(size / 2), borderWidth: px(2), borderColor: 'rgba(255,255,255,0.85)' }, ring(d)]} />
      ))}
    </View>
  );
}

/** "Go on..." over the first open seat, with a hand tapping it. */
function InviteHint({ x, y, size }: { x: number; y: number; size: number }) {
  const { px } = useDesignScale();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(t, { toValue: 1, duration: 450, useNativeDriver: true }), Animated.timing(t, { toValue: 0, duration: 450, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: px(x - 12), top: px(y - 22), width: px(size + 24), alignItems: 'center' }}>
      <View style={{ paddingHorizontal: px(8), paddingVertical: px(2), borderRadius: px(10), backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(10), color: colors.white }}>Go on...</Text>
      </View>
      <Animated.Text style={{ position: 'absolute', top: px(size + 14), fontSize: px(18), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>👆</Animated.Text>
    </View>
  );
}

/** Text with its emojis drawn larger than the letters, the way Mazag sets a mixed message. */
function RichText({ text, size, line }: { text: string; size: number; line: number }) {
  const runs: { t: string; emoji: boolean }[] = [];
  for (const ch of Array.from(text)) {
    const emoji = (ch.codePointAt(0) ?? 0) > 0x2000;
    const last = runs[runs.length - 1];
    if (last && last.emoji === emoji) last.t += ch;
    else runs.push({ t: ch, emoji });
  }
  return (
    <Text style={[styles.regular, { fontSize: size, lineHeight: line, color: colors.white }]}>
      {runs.map((r, i) => (r.emoji ? <Text key={i} style={{ fontSize: size * 1.7, lineHeight: line * 1.5 }}>{r.t}</Text> : r.t))}
    </Text>
  );
}

/** The room's announcement (or the platform welcome) as the first card of the chat list, like Mazag. */
function NoticeCard({ text }: { text: string }) {
  const { px } = useDesignScale();
  return (
    <View style={{ width: px(CHAT.width), paddingHorizontal: px(14), paddingVertical: px(12), borderRadius: px(10), backgroundColor: 'rgba(36,26,24,0.62)' }}>
      <Text style={[styles.regular, { fontSize: px(13), lineHeight: px(22), color: '#F5A33A' }]}>{text}</Text>
    </View>
  );
}

function ChatRow({ user, text, gift }: { user: RoomUser | null; text: string; gift?: Row['gift'] }) {
  const { px } = useDesignScale();
  const c = CHAT;
  const trimmed = text.trim();
  const emojiOnly = trimmed.length > 0 && Array.from(trimmed).length <= 4 && /^[^\x00-\x7F]+$/.test(trimmed);
  // Mazag's layout: a small face on the left; name and badges on a line, the words in a dark bubble under them.
  return (
    <View style={{ width: px(c.width), flexDirection: 'row', alignItems: 'flex-start', gap: px(10) }}>
      <Image source={avatarOf(user)} style={{ width: px(24), height: px(24), borderRadius: px(12), marginTop: px(2) }} />
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
          <Text numberOfLines={1} style={[styles.medium, { maxWidth: px(110), fontSize: px(c.name.size + 1), lineHeight: px(c.name.height + 2), color: YELLOW }]}>
            {user?.display_name ?? 'Guftagu user'}
          </Text>
          <View style={{ width: px(c.badges.width), height: px(c.badges.height), overflow: 'hidden' }}>
            <Image
              source={require('../../assets/room/badge-strip.png')}
              resizeMode="stretch"
              style={{ position: 'absolute', left: px(c.badges.width * c.badges.imageLeft), width: px(c.badges.width * c.badges.imageWidth), height: px(c.badges.height) }}
            />
          </View>
        </View>
        {gift ? (
          // Mazag's gift line: a gold card, "To <name>", the gift, "x N", and its picture on the right.
          <View style={{ marginTop: px(4), minWidth: px(190), maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(10), paddingHorizontal: px(12), paddingVertical: px(8), borderRadius: px(10), backgroundColor: 'rgba(168,126,58,0.55)' }}>
            <View style={{ flexShrink: 1 }}>
              <Text numberOfLines={1} style={[styles.medium, { fontSize: px(13), color: colors.white }]}>
                <Text style={{ color: '#F5C96A', fontStyle: 'italic' }}>To </Text>
                {gift.to}
              </Text>
              <Text numberOfLines={1} style={[styles.regular, { marginTop: px(2), fontSize: px(13), color: colors.white }]}>{gift.name}</Text>
              <Text style={[styles.medium, { marginTop: px(2), fontSize: px(18), fontStyle: 'italic', color: '#F5C96A' }]}>x {gift.qty}</Text>
            </View>
            {gift.image ? <Image source={{ uri: gift.image }} resizeMode="contain" style={{ width: px(52), height: px(52) }} /> : null}
          </View>
        ) : emojiOnly ? (
          // A lone emoji is a sticker in Mazag: a big face on a dark square, no speech bubble.
          <View style={{ marginTop: px(4), minWidth: px(58), height: px(58), paddingHorizontal: px(6), borderRadius: px(10), backgroundColor: 'rgba(40,30,28,0.62)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: px(36), lineHeight: px(44) }}>{trimmed}</Text>
          </View>
        ) : (
          <View style={{ marginTop: px(4), maxWidth: '100%', paddingHorizontal: px(12), paddingVertical: px(6), borderRadius: px(10), backgroundColor: 'rgba(40,30,28,0.62)' }}>
            <RichText text={text} size={px(c.text.size + 2)} line={px(c.text.height + 2)} />
          </View>
        )}
      </View>
    </View>
  );
}

/** "<name> entered with …" — a compact pill, not a speech bubble. */
function EntryRow({ user, text }: { user: RoomUser | null; text: string }) {
  const { px } = useDesignScale();
  const c = CHAT;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        maxWidth: px(c.width),
        flexDirection: 'row',
        alignItems: 'center',
        gap: px(6),
        paddingHorizontal: px(10),
        paddingVertical: px(6),
        borderRadius: px(18),
        backgroundColor: 'rgba(24,18,18,0.6)',
      }}
    >
      <View style={{ width: px(c.badges.width), height: px(c.badges.height), overflow: 'hidden' }}>
        <Image
          source={require('../../assets/room/badge-strip.png')}
          resizeMode="stretch"
          style={{ position: 'absolute', left: px(c.badges.width * c.badges.imageLeft), width: px(c.badges.width * c.badges.imageWidth), height: px(c.badges.height) }}
        />
      </View>
      <Text style={[styles.regular, { flexShrink: 1, fontSize: px(13), color: colors.white }]}>
        <Text style={[styles.medium, { color: YELLOW }]}>{user?.display_name ?? 'Guftagu user'} </Text>
        {text}
      </Text>
    </View>
  );
}

function ControlButton({ x, y, xml, color, onPress }: { x: number; y: number; xml: string; color?: string; onPress: () => void }) {
  const { px } = useDesignScale();
  const s = CONTROLS.ringSvg;
  return (
    <Pressable onPress={onPress} hitSlop={px(4)} style={{ position: 'absolute', left: px(x + s.dx), top: px(y + s.dy) }}>
      <SvgXml xml={xml} color={color} width={px(s.size)} height={px(s.size)} />
    </Pressable>
  );
}

/** A one-line notice over the room; nothing in the frame says how these look. */
function useToast() {
  const { px } = useDesignScale();
  const [text, setText] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (t: string) => {
      setText(t);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setText(null));
      }, 2200);
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const node = text ? (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: px(40), right: px(40), top: px(185), alignItems: 'center', opacity }}>
      <View style={{ paddingHorizontal: px(14), paddingVertical: px(8), borderRadius: px(18), backgroundColor: 'rgba(0,0,0,0.75)' }}>
        <Text style={[styles.regular, { fontSize: px(12), color: colors.white, textAlign: 'center' }]}>{text}</Text>
      </View>
    </Animated.View>
  ) : null;

  return useMemo(() => ({ show, node }), [show, node]);
}

type Row = { key: string; user: RoomUser | null; text: string; at: number; entry?: boolean; gift?: { to: string; name: string; qty: number; image: string | null } };

/** All = messages and gifts by time; Message and Gift are each on their own. */
function chatRows(tab: ChatTab, messages: ChatMessage[], gifts: GiftEvent[]): Row[] {
  const fromMessages = messages.map((m) => ({ key: m.uuid, user: m.user, text: m.body, at: time(m.created_at), entry: m.entry }));
  const fromGifts = gifts.map((g, i) => ({
    key: `gift-${i}-${g.created_at}`,
    user: g.sender,
    text: '',
    at: time(g.created_at),
    gift: { to: g.receiver?.display_name ?? 'someone', name: g.gift.code, qty: g.quantity, image: g.gift.thumbnail_url },
  }));
  if (tab === 'Chat') return fromMessages.filter((m) => !m.entry);
  if (tab === 'Gifts') return fromGifts;
  return [...fromMessages, ...fromGifts].sort((a, b) => a.at - b.at);
}

function time(iso: string | null) {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/** 50000 → 50k, as the trophy pill prints it. */
function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(n);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  regular: { fontFamily: typography.fontFamily.regular },
  medium: { fontFamily: typography.fontFamily.medium },
});
