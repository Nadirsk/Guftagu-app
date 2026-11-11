import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import * as icons from '../../assets/room/icons';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/AppAlert';
import LevelMeter from '../../components/LevelMeter';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { Backpack, Mic, ShoppingBag } from 'lucide-react-native';
import { colors, typography } from '../../theme/tokens';
import {
  DRAWER,
  GAMES,
  GIFTS,
  KICKOUT,
  KICKOUT_CHOICES,
  LEAVE,
  SHARE,
  TOOLS,
} from './geometry';
import type { RoomUser } from './useRoom';

const avatarPlaceholder = require('../../assets/avatar-placeholder.png');
const roomBackground = require('../../assets/room/background.jpg');

export function avatarOf(user: RoomUser | null | undefined) {
  return user?.avatar_url ? { uri: user.avatar_url } : avatarPlaceholder;
}

/** Tap-anywhere-to-close layer the sheets sit on. `dim` is the scrim's colour. */
function Backdrop({ dim, onClose }: { dim?: string; onClose: () => void }) {
  return <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: dim ?? 'transparent' }]} />;
}

// ---------------------------------------------------------------- 49:809

/** "Are you sure you want to leave?" — Figma draws no scrim behind it. */
export function LeaveDialog({ onCancel, onConfirm, busy }: { onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const { px } = useDesignScale();
  const b = LEAVE.buttons;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop onClose={onCancel} />
      <View
        style={{
          position: 'absolute',
          left: px(LEAVE.x),
          top: px(LEAVE.y),
          width: px(LEAVE.width),
          height: px(LEAVE.height),
          borderRadius: px(LEAVE.radius),
          backgroundColor: colors.white,
          alignItems: 'center',
          paddingTop: px(LEAVE.title.y),
        }}
      >
        <Text style={[styles.medium, { fontSize: px(LEAVE.title.size), color: colors.black }]}>
          Are you sure you want to leave?
        </Text>
        <View style={{ flexDirection: 'row', gap: px(b.gap), marginTop: px(b.top) }}>
          <Pressable
            onPress={onCancel}
            style={[styles.center, { width: px(b.width), height: px(b.height), borderRadius: px(b.radius), borderWidth: 1, borderColor: 'rgba(0,0,0,0.13)' }]}
          >
            <Text style={[styles.regular, { fontSize: px(b.size), color: colors.black }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={busy}
            style={[styles.center, { width: px(b.width), height: px(b.height), borderRadius: px(b.radius), backgroundColor: '#BD2727' }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.regular, { fontSize: px(b.size), color: colors.white }]}>Confirm</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- 45:2759

type LiveRoom = {
  uuid: string;
  name: string;
  cover_url: string | null;
  listener_count: number;
  owner: RoomUser | null;
  members: RoomUser[];
};

/**
 * The drawer the power button opens: minimise (stay in the room, go back),
 * exit (asks first), and the other rooms live right now — tap one to hop.
 */
export function RoomDrawer({
  roomUuid,
  onClose,
  onMinimize,
  onExit,
}: {
  roomUuid: string;
  onClose: () => void;
  onMinimize: () => void;
  onExit: () => void;
}) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roomsPath = `/rooms/live?limit=20&except=${roomUuid}`;
  // Reopened: show what was fetched last time at once and only swap if it changed.
  const [rooms, setRooms] = useState<LiveRoom[] | null>(() => peek<LiveRoom[]>(roomsPath, token));
  const c = DRAWER.card;
  const btn = DRAWER.button;

  useEffect(() => {
    return refresh<LiveRoom[]>(roomsPath, token, setRooms, undefined, () => setRooms((r) => r ?? []));
  }, [roomsPath, token]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop onClose={onClose} />
      <View
        style={{
          position: 'absolute',
          left: px(DRAWER.x),
          top: 0,
          bottom: 0,
          width: px(DRAWER.width),
          backgroundColor: 'rgba(0,0,0,0.82)',
        }}
      >
        {[
          { x: btn.minimizeX, xml: icons.minimize, onPress: onMinimize },
          { x: btn.exitX, xml: icons.powerRed, onPress: onExit },
        ].map((b) => (
          <Pressable
            key={b.x}
            onPress={b.onPress}
            style={[
              styles.center,
              {
                position: 'absolute',
                left: px(b.x),
                top: px(btn.y),
                width: px(btn.size),
                height: px(btn.size),
                borderRadius: px(btn.radius),
                backgroundColor: colors.white,
              },
            ]}
          >
            <SvgXml xml={b.xml} width={px(btn.icon)} height={px(btn.icon)} />
          </Pressable>
        ))}

        <View
          style={{
            position: 'absolute',
            left: px((DRAWER.width - DRAWER.line.width) / 2),
            top: px(DRAWER.line.y),
            width: px(DRAWER.line.width),
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />

        <ScrollView
          style={{ position: 'absolute', left: 0, right: 0, top: px(DRAWER.line.y + 1), bottom: 0 }}
          contentContainerStyle={{ paddingTop: px(c.y - DRAWER.line.y - 1), paddingBottom: px(24) }}
        >
          {rooms === null ? <ActivityIndicator color={colors.white} /> : null}
          {rooms?.length === 0 ? (
            <Text style={[styles.regular, { color: colors.white, opacity: 0.5, fontSize: px(12), textAlign: 'center' }]}>
              No other rooms are live
            </Text>
          ) : null}
          {rooms?.map((room) => (
            <Pressable
              key={room.uuid}
              onPress={() => navigation.replace('Room', { uuid: room.uuid })}
              style={{ marginLeft: px(c.x), marginBottom: px(c.step - c.height), width: px(c.width + 1.13), height: px(c.height) }}
            >
              <Image
                source={room.cover_url ? { uri: room.cover_url } : roomBackground}
                resizeMode="cover"
                style={{ width: px(c.width), height: px(c.height), borderRadius: px(c.radius) }}
              />
              <View style={{ position: 'absolute', left: px(c.info.x), top: px(c.info.y), width: px(c.info.width + 60) }}>
                <View style={{ height: px(23), flexDirection: 'row', alignItems: 'flex-start' }}>
                  {room.owner?.country === 'India' ? (
                    <View style={{ marginTop: px(c.flag.top), marginRight: px(c.title.left - c.flag.width) }}>
                      <SvgXml xml={icons.flagIN} width={px(c.flag.width)} height={px(c.flag.height)} />
                    </View>
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[styles.semiBold, { marginTop: px(c.title.top), fontSize: px(c.title.size), color: colors.white, maxWidth: px(120) }]}
                  >
                    {room.name}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', marginTop: px(4) }}>
                  {(room.members.length ? room.members : [room.owner]).slice(0, 5).map((m, i, all) => (
                    <Image
                      key={`${m?.uuid ?? 'x'}-${i}`}
                      source={avatarOf(m)}
                      style={{
                        width: px(c.stack.size),
                        height: px(c.stack.size),
                        borderRadius: px(c.stack.size / 2),
                        borderWidth: 1,
                        borderColor: colors.white,
                        marginRight: i === all.length - 1 ? 0 : px(-c.stack.overlap),
                      }}
                    />
                  ))}
                </View>
              </View>
              <View style={{ position: 'absolute', left: px(c.count.x), top: px(c.count.y) }}>
                <SvgXml xml={icons.liveCount} width={px(c.count.width)} height={px(c.count.height)} />
              </View>
              {/* The level meter beside the count — animated like Party's rows and the Live tab, not a still icon. */}
              <View style={{ position: 'absolute', left: px(c.count.waveX), top: px(c.count.waveY), width: px(c.count.wave), height: px(c.count.wave), alignItems: 'center', justifyContent: 'center' }}>
                <LevelMeter heights={[5.33, 3.67, 12, 17, 5.33]} width={2} gap={1.75} />
              </View>
              <Text
                style={[
                  styles.semiBold,
                  {
                    position: 'absolute',
                    left: px(c.count.textCenterX - 15),
                    width: px(30),
                    top: px(c.count.y + c.count.textY),
                    fontSize: px(c.count.size),
                    color: colors.black,
                    textAlign: 'center',
                  },
                ]}
              >
                {room.listener_count}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- 280:5181

export type ToolKey = 'clear' | 'theme' | 'mode' | 'sound' | 'music' | 'kick' | 'mute' | 'lock' | 'redPacket' | 'luckyDraw' | 'luckyNumber';

const TOOL_ROWS: { key: ToolKey; label: string; xml: string; size: number }[][] = [
  [
    { key: 'clear', label: 'Clear chat', xml: icons.toolBrush, size: 17 },
    { key: 'theme', label: 'Room Theme', xml: icons.toolTheme, size: 16 },
    // 280:5055 puts Room Mode where Sound Effect was (that one only ever said "Coming soon").
    { key: 'mode', label: 'Room Mode', xml: icons.toolHouse, size: 16 },
  ],
  [
    { key: 'music', label: 'Music', xml: icons.toolMusic, size: 17 },
    { key: 'kick', label: 'Kick-Out', xml: icons.toolKick, size: 16 },
    { key: 'mute', label: 'Mute', xml: icons.toolMute, size: 16 },
  ],
];

export function ToolsSheet({ extra, onClose, onPick }: { extra: number; onClose: () => void; onPick: (key: ToolKey) => void }) {
  const { px } = useDesignScale();
  const g = TOOLS.games;

  // Figma sets these in Mona Sans; Poppins runs wider, so every cell is LABEL wide,
  // centred where Figma centres it — a narrower cell would cut the label short.
  const LABEL = 124;
  const cell = (centerX: number, y: number) =>
    ({ position: 'absolute', left: px(centerX - LABEL / 2), top: px(y), width: px(LABEL), alignItems: 'center' }) as const;
  const label = (text: string, size: number = TOOLS.label.size) => (
    <Text numberOfLines={1} style={[styles.medium, { fontSize: px(size), color: colors.black, textAlign: 'center' }]}>{text}</Text>
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop dim="rgba(0,0,0,0.5)" onClose={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: px(TOOLS.y + extra), bottom: 0, backgroundColor: colors.white }}>
        <Text style={[styles.medium, { position: 'absolute', left: px(TOOLS.title.centerX - 30), width: px(60), top: px(TOOLS.title.y), fontSize: px(TOOLS.title.size), color: colors.black, textAlign: 'center' }]}>
          Tools
        </Text>
        <Pressable onPress={onClose} hitSlop={px(10)} style={{ position: 'absolute', left: px(TOOLS.close.x), top: px(TOOLS.close.y) }}>
          <SvgXml xml={icons.close} width={px(TOOLS.close.size)} height={px(TOOLS.close.size)} />
        </Pressable>

        {TOOLS.rows.map((row, r) => {
          // Figma lays each row out with flex gaps; the same centres, placed directly,
          // let every cell be LABEL wide without moving its icon.
          let x = TOOLS.rowX;
          return TOOL_ROWS[r].map((tool, i) => {
            const center = x + row.items[i].width / 2;
            x += row.items[i].width + TOOLS.rowGap;
            return (
              <Pressable key={tool.key} onPress={() => onPick(tool.key)} style={[cell(center, row.y), { gap: px(TOOLS.iconGap) }]}>
                <View style={{ height: px(39), justifyContent: 'center' }}>
                  <SvgXml xml={tool.xml} width={px(row.items[i].icon)} height={px(row.items[i].icon)} />
                </View>
                {label(tool.label, tool.size)}
              </Pressable>
            );
          });
        })}
        <Pressable
          onPress={() => onPick('lock')}
          style={[cell(TOOLS.lock.x + TOOLS.lock.width / 2, TOOLS.lock.y), { gap: px(TOOLS.iconGap) }]}
        >
          <SvgXml xml={icons.toolLock} width={px(TOOLS.lock.icon)} height={px(TOOLS.lock.icon)} />
          {label('Seat Lock')}
        </Pressable>

        <Text style={[styles.medium, { position: 'absolute', left: px(g.title.centerX - 40), width: px(80), top: px(g.title.y), fontSize: px(g.title.size), color: colors.black, textAlign: 'center' }]}>
          Games
        </Text>
        <Pressable onPress={() => onPick('redPacket')} style={[cell(g.redPacket.x + g.redPacket.width / 2, g.redPacket.y), { gap: px(g.gap) }]}>
          {/* 577:5295 — the envelope is drawn, not an image: gradient, shine, coin. */}
          <View style={{ width: px(g.redPacket.box.width), height: px(g.redPacket.box.height), borderRadius: px(g.redPacket.box.radius), overflow: 'hidden' }}>
            <RedPacketFill />
            <View style={{ position: 'absolute', left: px(-13), top: px(-52) }}>
              <SvgXml xml={icons.redPacketShine} width={px(76)} height={px(79)} />
            </View>
            <Image source={require('../../assets/room/red-packet-coin.png')} style={{ position: 'absolute', left: px(15), top: px(11), width: px(20), height: px(20) }} />
          </View>
          {label('Red Packet')}
        </Pressable>
        <Pressable onPress={() => onPick('luckyDraw')} style={[cell(g.luckyDraw.x + g.luckyDraw.width / 2, g.luckyDraw.y), { gap: px(g.gap) }]}>
          <Image source={require('../../assets/room/lucky-draw.png')} resizeMode="cover" style={{ width: px(g.luckyDraw.image.width), height: px(g.luckyDraw.image.height) }} />
          {label('Lucky Draw')}
        </Pressable>
        <Pressable onPress={() => onPick('luckyNumber')} style={[cell(g.luckyNumber.x + g.luckyNumber.width / 2, g.luckyNumber.y), { gap: px(g.gap) }]}>
          <Image source={require('../../assets/room/lucky-number.png')} resizeMode="cover" style={{ width: px(g.luckyNumber.image.width), height: px(g.luckyNumber.image.height) }} />
          {label('Lucky Number')}
        </Pressable>
      </View>
    </View>
  );
}

/** 577:5295's fill — 137.84deg, #FF8B25 → #F55066 → #EB11AA. */
function RedPacketFill() {
  return (
    <LinearGradient
      colors={['#FF8B25', '#F55066', '#EB11AA']}
      locations={[0.0165, 0.48605, 0.9835]}
      start={{ x: 0.17, y: 0.13 }}
      end={{ x: 0.83, y: 0.87 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

// ---------------------------------------------------------------- 613:6295

export function KickoutSheet({
  extra,
  name,
  onClose,
  onConfirm,
}: {
  extra: number;
  name: string;
  onClose: () => void;
  onConfirm: (minutes: number) => Promise<void>;
}) {
  const { px } = useDesignScale();
  const [choice, setChoice] = useState(KICKOUT_CHOICES.length - 1);
  const [busy, setBusy] = useState(false);
  const o = KICKOUT.option;
  const b = KICKOUT.buttons;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop dim="rgba(0,0,0,0.5)" onClose={onClose} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(KICKOUT.y + extra),
          bottom: 0,
          backgroundColor: colors.white,
          borderTopLeftRadius: px(KICKOUT.radius),
          borderTopRightRadius: px(KICKOUT.radius),
          shadowColor: '#000',
          shadowOpacity: 0.16,
          shadowRadius: px(18),
          shadowOffset: { width: 0, height: px(-12) },
          elevation: 12,
        }}
      >
        <Pressable onPress={onClose} hitSlop={px(10)} style={{ position: 'absolute', left: px(KICKOUT.close.x), top: px(KICKOUT.close.y) }}>
          <SvgXml xml={icons.close} width={px(KICKOUT.close.size)} height={px(KICKOUT.close.size)} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.medium, { position: 'absolute', left: px(40), right: px(40), top: px(KICKOUT.title.y), fontSize: px(KICKOUT.title.size), color: colors.black, textAlign: 'center' }]}>
          Set Kickout duration
        </Text>
        <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: px(40), right: px(40), top: px(KICKOUT.title.y + 25), fontSize: px(12), color: 'rgba(0,0,0,0.45)', textAlign: 'center' }]}>
          {name}
        </Text>

        <View style={{ position: 'absolute', left: px(KICKOUT.list.x), top: px(KICKOUT.list.y), width: px(KICKOUT.list.width), gap: px(KICKOUT.list.gap) }}>
          {KICKOUT_CHOICES.map((c, i) => (
            <Pressable
              key={c.minutes}
              onPress={() => setChoice(i)}
              style={{ height: px(o.height), borderRadius: px(o.radius), backgroundColor: 'rgba(23,23,23,0.12)', justifyContent: 'center' }}
            >
              <Text style={[styles.regular, { marginLeft: px(o.textX), fontSize: px(o.size), color: colors.black }]}>{c.label}</Text>
              <View style={{ position: 'absolute', left: px(o.radio.x), top: px((o.height - o.radio.size) / 2) }}>
                <SvgXml xml={i === choice ? icons.radioOn : icons.radioOff} width={px(o.radio.size)} height={px(o.radio.size)} />
              </View>
              {i === choice ? (
                <View style={{ position: 'absolute', left: px(o.radio.x + (o.radio.size - o.check) / 2), top: px((o.height - o.check) / 2) }}>
                  <SvgXml xml={icons.check} width={px(o.check)} height={px(o.check)} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={onClose}
          style={[styles.center, { position: 'absolute', left: px(b.cancel.x), top: px(b.y), width: px(b.cancel.width), height: px(b.height), borderRadius: px(b.radius), backgroundColor: 'rgba(255,0,0,0.06)' }]}
        >
          <Text style={[styles.regular, { fontSize: px(b.size), color: '#FF0000' }]}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await onConfirm(KICKOUT_CHOICES[choice].minutes);
            } finally {
              setBusy(false);
            }
          }}
          style={[styles.center, { position: 'absolute', left: px(b.confirm.x), top: px(b.y), width: px(b.confirm.width), height: px(b.height), borderRadius: px(b.radius), backgroundColor: 'rgba(26,159,11,0.08)' }]}
        >
          {busy ? <ActivityIndicator color="#1A9F0B" /> : <Text style={[styles.regular, { fontSize: px(b.size), color: '#1A9F0B' }]}>Confirm</Text>}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- 592:7686

type Gift = { id: number; name_en: string; coin_price: number; thumbnail_url: string | null; category_id: number | null; tier: string };
type GiftCategory = { id: number; name_en?: string; name?: string };

/** Measured off 592:7686's render — the sheet only exists in Figma as a picture. */
const GIFT_COLORS = {
  sheet: '#1F1D26',
  bar: '#1F1D26',
  pill: '#26242D',
  selectedBorder: '#E48C20',
  orange: '#F0A03E',
  orangeRing: '#EC9527',
  dim: '#767579',
  price: '#8F8E93',
  name: '#D4D3D8',
};

export function GiftSheet({
  receiver,
  onMic,
  onClose,
  onSend,
  dm,
}: {
  /** A one-to-one chat: the one face is the person in the thread, with no seat badge and no ALL. */
  dm?: boolean;
  receiver: RoomUser | 'all' | null;
  /** Everyone on a mic, with the seat they are on — the faces along the top. */
  onMic: { seat: number; user: RoomUser }[];
  onClose: () => void;
  /** `'all'` when every mic is ticked, else exactly the ticked users. */
  onSend: (gift: Gift, quantity: number, targets: RoomUser[] | 'all') => void;
}) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const [gifts, setGifts] = useState<Gift[] | null>(() => peek<Gift[]>('/gifts', token));
  const [categories, setCategories] = useState<GiftCategory[]>(() => peek<GiftCategory[]>('/gifts/categories', token) ?? []);
  const [category, setCategory] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [bag, setBag] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [coins, setCoins] = useState<number | null>(() => peek<{ coin_balance: number }, number>('/wallet', token, (w) => w.coin_balance));
  // Mazag's faces are check marks: orange ring = ticked, white ring = not. ALL ticks every one.
  const [ticked, setTicked] = useState<Set<string>>(
    () => new Set(receiver && receiver !== 'all' ? [receiver.uuid] : onMic.map((m) => m.user.uuid)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  /** Recharge: close the panel and open the Wallet on its Coin tab; Back returns to the room/chat. */
  const goRecharge = () => {
    onClose();
    navigation.navigate('Wallet', { tab: 'coin' });
  };
  const g = GIFTS;
  // In a chat there is no row of faces to pick from, so everything under it moves up.
  const off = dm ? g.tabs.y - g.faces.y - 6 : 0;

  useEffect(() => {
    const stops = [
      refresh<Gift[]>('/gifts', token, setGifts, undefined, () => setGifts((g) => g ?? [])),
      refresh<GiftCategory[]>('/gifts/categories', token, setCategories),
      // The balance changes with every send, so it is always re-read; the key only keeps the last value.
      refresh<{ coin_balance: number }, number>('/wallet', token, setCoins, (w) => w.coin_balance),
    ];
    return () => stops.forEach((s) => s());
  }, [token]);

  // There is no "All" tab: the first category is open until another is picked.
  const activeCategory = category ?? categories[0]?.id ?? null;
  const shown = useMemo(() => (gifts ?? []).filter((x) => activeCategory === null || x.category_id === activeCategory), [gifts, activeCategory]);
  const tabs = categories.map((c) => ({ id: c.id as number | null, label: c.name_en ?? c.name ?? '' }));
  // As in Mazag's chat, the first gift is already picked when the sheet opens.
  const chosen = shown.find((x) => x.id === selected) ?? (dm ? (shown[0] ?? null) : null);
  const everyone = onMic.length > 0 && onMic.every((m) => ticked.has(m.user.uuid));
  const toggle = (uuid: string) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  const toggleAll = () => setTicked(everyone ? new Set() : new Set(onMic.map((m) => m.user.uuid)));

  const send = () => {
    if (!chosen) return;
    if (ticked.size === 0) {
      // Silence here looks like a broken Send button — say why nothing happened.
      Alert.alert('Nobody to send to', dm ? 'Open the chat with the person you want to gift.' : 'Gifts go to the people on a mic. Take a seat or wait for someone to join one.');
      return;
    }
    const price = chosen.coin_price * quantity * ticked.size;
    if (coins !== null && price > coins) {
      setError('Not enough coins');
      // Flow chart: not enough coins -> Wallet.
      Alert.alert('Not enough coins', `This needs ${price.toLocaleString('en-US')} coins and you have ${coins.toLocaleString('en-US')}. Recharge to keep going.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Recharge', onPress: goRecharge },
      ]);
      return;
    }
    setError(null);
    onSend(chosen, quantity, everyone ? 'all' : onMic.filter((m) => ticked.has(m.user.uuid)).map((m) => m.user));
  };

  const canSend = Boolean(chosen) && ticked.size > 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop onClose={onClose} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: px(g.height - off),
          backgroundColor: GIFT_COLORS.sheet,
          borderTopLeftRadius: px(14),
          borderTopRightRadius: px(14),
          overflow: 'hidden',
        }}
      >
        {dm ? null : (
          <>
        {/* Who gets it: faces with a seat badge, and ALL. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ position: 'absolute', left: 0, right: px(g.faces.allWidth), top: px(g.faces.y), height: px(g.faces.size + 12) }}
          contentContainerStyle={{ paddingLeft: px(g.faces.x), gap: px(g.faces.gap) }}
        >
          {onMic.map(({ seat, user }) => {
            const on = ticked.has(user.uuid);
            return (
              <Pressable key={user.uuid} onPress={() => toggle(user.uuid)} hitSlop={px(4)} style={{ width: px(g.faces.size), height: px(g.faces.size + 8) }}>
                <Image source={avatarOf(user)} style={{ width: px(g.faces.size), height: px(g.faces.size), borderRadius: px(g.faces.size / 2), borderWidth: px(1.5), borderColor: on ? GIFT_COLORS.orangeRing : '#FFFFFF' }} />
                {dm ? null : (
                  <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center', minWidth: px(15), height: px(15), paddingHorizontal: px(4), borderRadius: px(8), backgroundColor: on ? GIFT_COLORS.orangeRing : '#2A1B3D', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: px(9), color: colors.white, fontFamily: typography.fontFamily.medium }}>{seat}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        {dm ? null : (
        <Pressable onPress={toggleAll} style={{ position: 'absolute', right: px(g.faces.allRight), top: px(g.faces.y - 2), width: px(g.faces.allSize), alignItems: 'center' }}>
          <View style={{ width: px(g.faces.allSize), height: px(g.faces.allSize), borderRadius: px(g.faces.allSize / 2), alignItems: 'center', justifyContent: 'center', backgroundColor: everyone ? 'rgba(236,149,39,0.22)' : 'rgba(255,255,255,0.06)', borderWidth: px(1.5), borderColor: everyone ? GIFT_COLORS.orangeRing : 'transparent' }}>
            <Mic size={px(18)} color={everyone ? GIFT_COLORS.orangeRing : '#6D6C73'} />
          </View>
          <View style={{ marginTop: px(-9), minWidth: px(30), height: px(14), borderRadius: px(7), paddingHorizontal: px(6), alignItems: 'center', justifyContent: 'center', backgroundColor: everyone ? GIFT_COLORS.orangeRing : 'transparent' }}>
            <Text style={{ fontSize: px(9), color: colors.white, fontFamily: typography.fontFamily.medium }}>ALL</Text>
          </View>
        </Pressable>
        )}

          </>
        )}

        {/* Tabs. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ position: 'absolute', left: 0, right: px(66), top: px(g.tabs.y - off) }} contentContainerStyle={{ paddingLeft: px(g.tabs.x), gap: px(g.tabs.gap) }}>
          {tabs.map((t) => {
            const on = !bag && t.id === activeCategory;
            return (
              <Pressable key={String(t.id)} onPress={() => { setBag(false); setCategory(t.id); }} style={{ alignItems: 'center' }}>
                <Text style={[on ? styles.semiBold : styles.regular, { fontSize: px(g.tabs.size), color: on ? colors.white : GIFT_COLORS.dim }]}>{t.label}</Text>
                <View style={{ marginTop: px(g.tabs.underline.gap), width: px(g.tabs.underline.width), height: px(g.tabs.underline.height), borderRadius: px(2), backgroundColor: on ? colors.white : 'transparent' }} />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Backpack: the gifts you already own, behind a thin rule, as in Mazag. */}
        <View style={{ position: 'absolute', right: px(66), top: px(g.tabs.y + 4 - off), width: StyleSheet.hairlineWidth * 2, height: px(20), backgroundColor: 'rgba(255,255,255,0.25)' }} />
        <Pressable onPress={() => setBag((v) => !v)} hitSlop={px(8)} style={{ position: 'absolute', right: px(14), top: px(g.tabs.y - 6 - off), width: px(38), height: px(38), borderRadius: px(19), alignItems: 'center', justifyContent: 'center', backgroundColor: bag ? 'rgba(214,120,255,0.18)' : 'transparent' }}>
          <ShoppingBag size={px(22)} color="#F29CFF" strokeWidth={1.8} />
        </Pressable>

        {/* The gifts: four across, edge to edge, scrolling. */}
        {bag ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: px(g.grid.y + 40 - off), alignItems: 'center' }}>
            <Backpack size={px(44)} color="#6D6C73" />
            <Text style={[styles.regular, { marginTop: px(12), fontSize: px(13), color: GIFT_COLORS.dim }]}>Your backpack is empty</Text>
          </View>
        ) : gifts === null ? (
          <ActivityIndicator style={{ marginTop: px(200) }} color={colors.white} />
        ) : shown.length === 0 ? (
          <Text style={[styles.regular, { marginTop: px(200), textAlign: 'center', color: GIFT_COLORS.dim, fontSize: px(13) }]}>No gifts here yet</Text>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ position: 'absolute', left: 0, right: 0, top: px(g.grid.y - off), bottom: px(g.bar.height) }}
            contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}
          >
            {shown.map((gift) => {
              const on = gift.id === chosen?.id;
              return (
                <Pressable
                  key={gift.id}
                  onPress={() => {
                    setSelected(gift.id);
                    setError(null);
                  }}
                  style={{ width: '25%', height: px(g.grid.cardHeight), alignItems: 'center' }}
                >
                  <View style={{ position: 'absolute', left: px(2), right: px(2), top: px(2), bottom: px(2), borderRadius: px(10), borderWidth: on ? px(1.5) : 0, borderColor: GIFT_COLORS.selectedBorder }} />
                  {gift.thumbnail_url ? (
                    <Image source={{ uri: gift.thumbnail_url }} resizeMode="contain" style={{ marginTop: px(g.thumb.top), width: px(g.thumb.size), height: px(g.thumb.size) }} />
                  ) : (
                    <View style={{ marginTop: px(g.thumb.top), width: px(g.thumb.size), height: px(g.thumb.size) }} />
                  )}
                  <View style={{ position: 'absolute', top: px(g.price.top), flexDirection: 'row', alignItems: 'center', gap: px(3) }}>
                    <Coin size={px(g.price.coin)} />
                    <Text style={[styles.regular, { fontSize: px(g.price.size), color: GIFT_COLORS.price }]}>{gift.coin_price}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', top: px(g.name.top), width: px(94), textAlign: 'center', fontSize: px(g.name.size), color: on ? colors.white : GIFT_COLORS.name }]}>
                    {gift.name_en}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {error ? (
          <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: px(16), right: px(16), bottom: px(g.bar.height + 4), textAlign: 'center', fontSize: px(11), color: '#FF6B6B' }]}>{error}</Text>
        ) : null}

        {/* Balance on the left, quantity + Send on the right. */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(g.bar.height), backgroundColor: GIFT_COLORS.bar }}>
          <View style={{ position: 'absolute', left: px(g.bar.pill.x), top: px((g.bar.height - g.bar.pill.height) / 2), height: px(g.bar.pill.height), borderRadius: px(g.bar.pill.radius), backgroundColor: GIFT_COLORS.pill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(10), gap: px(5) }}>
            <Coin size={px(15)} />
            <Text style={[styles.regular, { fontSize: px(14), color: colors.white }]}>{coins === null ? '—' : coins.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <View style={{ width: StyleSheet.hairlineWidth * 2, height: px(14), marginHorizontal: px(8), backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <Pressable onPress={goRecharge} hitSlop={px(10)} accessibilityRole="button" accessibilityLabel="Recharge">
              <Text style={[styles.regular, { fontSize: px(14), color: GIFT_COLORS.orange }]}>Recharge  ›</Text>
            </Pressable>
          </View>

          <View style={{ position: 'absolute', right: px(14), top: px((g.bar.height - g.bar.pill.height) / 2), width: px(g.bar.qty.width), height: px(g.bar.pill.height), borderRadius: px(g.bar.pill.radius), borderWidth: px(1), borderColor: GIFT_COLORS.orange, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
            <Pressable
              onPress={() => setQuantity((q) => (q === 1 ? 7 : q === 7 ? 77 : q === 77 ? 177 : 1))}
              style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            >
              <Text style={[styles.regular, { fontSize: px(14), color: colors.white }]}>{quantity}  ›</Text>
            </Pressable>
            <Pressable
              onPress={send}
              disabled={!canSend}
              style={{ width: px(g.bar.send.width), height: '100%', backgroundColor: GIFT_COLORS.orange, alignItems: 'center', justifyContent: 'center', opacity: canSend ? 1 : 0.6 }}
            >
              {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={[styles.regular, { fontSize: px(14), color: colors.white }]}>Send</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function Coin({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F6C00E', borderWidth: size / 8, borderColor: '#E59B05' }} />
  );
}

// ---------------------------------------------------------------- 613:6542

/**
 * Music: PlayList / Local and the search pill. Figma's list is a phone
 * screenshot; there is no song source behind it yet, so the list says so.
 */


// ---------------------------------------------------------------- Group 8778

const SHARE_ICON_FACEBOOK = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="#1877F2"/><path d="M35.6 64V39.5h8.2l1.3-9.6H35.6v-6.1c0-2.8.8-4.7 4.8-4.7h5.1v-8.6c-.9-.1-3.9-.4-7.4-.4-7.3 0-12.3 4.4-12.3 12.6v7.2h-8.2v9.6h8.2V64h5.8z" fill="#fff"/></svg>`;

const SHARE_ICON_WHATSAPP = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="#25D366"/><g transform="translate(14 14) scale(1.5)"><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></g></svg>`;

const SHARE_ICON_FRIENDS = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fr" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#7B5CFF"/><stop offset="1" stop-color="#E24BD0"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#fr)"/><circle cx="25" cy="25" r="6.5" fill="#fff"/><path d="M12 44c0-6.6 5.8-11 13-11s13 4.4 13 11v1.5H12V44z" fill="#fff"/><circle cx="41.5" cy="26.5" r="5.5" fill="#fff" fill-opacity=".8"/><path d="M41 34c6.2 0 11 3.8 11 9.6V45.5H41.2c.3-.5.3-1 .3-1.5 0-3.6-1.5-7-4.4-9.2.9-.5 2-.8 3.9-.8z" fill="#fff" fill-opacity=".8"/></svg>`;

export function ShareSheet({ extra, roomName, roomCode, onClose, onFriends }: { extra: number; roomName: string; roomCode: string; onClose: () => void; onFriends: () => void }) {
  const { px } = useDesignScale();
  const s = SHARE;
  const message = `Join me in "${roomName}" on Guftagu — room ID ${roomCode}`;

  const targets = [
    {
      label: 'Facebook',
      xml: SHARE_ICON_FACEBOOK,
      onPress: () => Share.share({ message }),
    },
    {
      label: 'WhatsApp',
      xml: SHARE_ICON_WHATSAPP,
      onPress: () =>
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => Share.share({ message })),
    },
    { label: 'Friends', xml: SHARE_ICON_FRIENDS, onPress: onFriends },
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop dim="rgba(16,19,23,0.8)" onClose={onClose} />
      <View style={{ position: 'absolute', left: px(-1), right: px(-1), top: px(s.y + extra), bottom: 0, backgroundColor: '#1C1B23', borderRadius: px(s.radius) }}>
        <Text style={[styles.semiBold, { position: 'absolute', left: 0, right: 0, top: px(s.title.y), textAlign: 'center', fontSize: px(s.title.size), color: colors.white }]}>Share to</Text>
        {targets.map((t, i) => (
          <Pressable key={t.label} onPress={t.onPress} style={{ position: 'absolute', left: px(s.items[i].centerX - 55), width: px(110), top: px(s.icon.y), alignItems: 'center' }}>
            <SvgXml xml={t.xml} width={px(s.icon.size)} height={px(s.icon.size)} />
            <Text style={[styles.semiBold, { position: 'absolute', top: px(s.label.y - s.icon.y), fontSize: px(s.label.size), color: colors.white, opacity: 0.7 }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- 613:4733

/** "More" — the games grid, which Figma draws as one picture (Rectangle 47). */
export function GamesSheet({ extra, onClose, onPick }: { extra: number; onClose: () => void; onPick: () => void }) {
  const { px } = useDesignScale();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop dim="rgba(16,19,23,0.8)" onClose={onClose} />
      <Pressable onPress={onPick} style={{ position: 'absolute', left: px(-1), width: px(402), top: px(GAMES.y + extra), height: px(GAMES.height), borderRadius: px(GAMES.radius), borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)', backgroundColor: '#1C1B23', overflow: 'hidden' }}>
        <Image source={require('../../assets/room/games-sheet.jpg')} resizeMode="contain" style={{ width: px(402), height: px(GAMES.height) }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  regular: { fontFamily: typography.fontFamily.regular },
  medium: { fontFamily: typography.fontFamily.medium },
  semiBold: { fontFamily: typography.fontFamily.semiBold },
});
