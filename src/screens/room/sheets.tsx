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
  TextInput,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import * as icons from '../../assets/room/icons';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import {
  DRAWER,
  GAMES,
  GIFTS,
  KICKOUT,
  KICKOUT_CHOICES,
  LEAVE,
  MUSIC,
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
  const [rooms, setRooms] = useState<LiveRoom[] | null>(null);
  const c = DRAWER.card;
  const btn = DRAWER.button;

  useEffect(() => {
    api<LiveRoom[]>(`/rooms/live?limit=20&except=${roomUuid}`, { token })
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [roomUuid, token]);

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
              <View style={{ position: 'absolute', left: px(c.count.waveX), top: px(c.count.waveY) }}>
                <SvgXml xml={icons.liveWave} width={px(c.count.wave)} height={px(c.count.wave)} />
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

export type ToolKey = 'clear' | 'theme' | 'sound' | 'music' | 'kick' | 'mute' | 'lock' | 'redPacket' | 'luckyDraw' | 'luckyNumber';

const TOOL_ROWS: { key: ToolKey; label: string; xml: string; size: number }[][] = [
  [
    { key: 'clear', label: 'Clear chat', xml: icons.toolBrush, size: 17 },
    { key: 'theme', label: 'Room Theme', xml: icons.toolTheme, size: 16 },
    { key: 'sound', label: 'Sound Effect', xml: icons.toolSound, size: 16 },
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
  sheet: '#1F1F37',
  bar: '#13121A',
  pill: '#1C1B23',
  selectedFill: '#533013',
  selectedBorder: '#D9963B',
  orange: '#F7A23B',
  dim: '#8B8B98',
  name: '#BFBFCB',
};

export function GiftSheet({
  receiver,
  onClose,
  onSend,
}: {
  receiver: RoomUser | null;
  onClose: () => void;
  onSend: (gift: Gift, quantity: number) => Promise<number | void>;
}) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const [gifts, setGifts] = useState<Gift[] | null>(null);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [category, setCategory] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [coins, setCoins] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const g = GIFTS;

  useEffect(() => {
    api<Gift[]>('/gifts', { token }).then(setGifts).catch(() => setGifts([]));
    api<GiftCategory[]>('/gifts/categories', { token }).then(setCategories).catch(() => undefined);
    api<{ coin_balance: number }>('/wallet', { token }).then((w) => setCoins(w.coin_balance)).catch(() => undefined);
  }, [token]);

  const shown = useMemo(() => (gifts ?? []).filter((x) => category === null || x.category_id === category), [gifts, category]);
  const perPage = g.grid.columns * g.grid.rows;
  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const visible = shown.slice(page * perPage, page * perPage + perPage);
  const tabs = [{ id: null as number | null, label: 'All' }, ...categories.map((c) => ({ id: c.id as number | null, label: c.name_en ?? c.name ?? '' }))];
  const chosen = shown.find((x) => x.id === selected) ?? null;

  const send = async () => {
    if (!chosen || !receiver) return;
    setBusy(true);
    setError(null);
    try {
      const balance = await onSend(chosen, quantity);
      if (typeof balance === 'number') setCoins(balance);
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Could not send that gift.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop onClose={onClose} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: px(g.height),
          backgroundColor: GIFT_COLORS.sheet,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: px(4),
          shadowOffset: { width: 0, height: px(4) },
          elevation: 8,
        }}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ position: 'absolute', left: 0, right: 0, top: px(g.tabs.y) }} contentContainerStyle={{ paddingLeft: px(g.tabs.x), gap: px(g.tabs.gap) }}>
          {tabs.map((t) => {
            const on = t.id === category;
            return (
              <Pressable key={String(t.id)} onPress={() => { setCategory(t.id); setPage(0); }} style={{ alignItems: 'center' }}>
                <Text style={[on ? styles.semiBold : styles.regular, { fontSize: px(g.tabs.size), color: on ? colors.white : GIFT_COLORS.dim }]}>{t.label}</Text>
                <View style={{ marginTop: px(g.tabs.underline.gap), width: px(g.tabs.underline.width), height: px(g.tabs.underline.height), borderRadius: px(2), backgroundColor: on ? colors.white : 'transparent' }} />
              </Pressable>
            );
          })}
        </ScrollView>

        {gifts === null ? (
          <ActivityIndicator style={{ marginTop: px(150) }} color={colors.white} />
        ) : visible.length === 0 ? (
          <Text style={[styles.regular, { marginTop: px(150), textAlign: 'center', color: GIFT_COLORS.dim, fontSize: px(13) }]}>No gifts here yet</Text>
        ) : (
          <View style={{ position: 'absolute', left: px(g.grid.x), top: px(g.grid.y), width: px(g.grid.columns * g.grid.cardWidth + (g.grid.columns - 1) * g.grid.colGap) + 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: px(g.grid.colGap), rowGap: px(g.grid.rowGap) }}>
            {visible.map((gift) => {
              const on = gift.id === selected;
              return (
                <Pressable
                  key={gift.id}
                  onPress={() => setSelected(gift.id)}
                  style={{
                    width: px(g.grid.cardWidth),
                    height: px(g.grid.cardHeight),
                    borderRadius: px(8),
                    borderWidth: on ? 1.5 : 0,
                    borderColor: GIFT_COLORS.selectedBorder,
                    backgroundColor: on ? GIFT_COLORS.selectedFill : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  {gift.thumbnail_url ? (
                    <Image source={{ uri: gift.thumbnail_url }} resizeMode="contain" style={{ marginTop: px(g.thumb.top), width: px(g.thumb.size), height: px(g.thumb.size) }} />
                  ) : (
                    <View style={{ marginTop: px(g.thumb.top), width: px(g.thumb.size), height: px(g.thumb.size) }} />
                  )}
                  <View style={{ position: 'absolute', top: px(g.price.top), flexDirection: 'row', alignItems: 'center', gap: px(3) }}>
                    <Coin size={px(g.price.coin)} />
                    <Text style={[styles.regular, { fontSize: px(g.price.size), color: GIFT_COLORS.dim }]}>{gift.coin_price}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', top: px(g.name.top), width: px(g.grid.cardWidth - 4), textAlign: 'center', fontSize: px(g.name.size), color: on ? colors.white : GIFT_COLORS.name }]}>
                    {gift.name_en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* The page dots — tap one to turn the page. */}
        <View style={{ position: 'absolute', top: px(g.dots.y), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: px(g.dots.gap) }}>
          {Array.from({ length: pages }, (_, i) => (
            <Pressable key={i} hitSlop={px(6)} onPress={() => setPage(i)} style={{ width: px(g.dots.size), height: px(g.dots.size), borderRadius: px(g.dots.size / 2), backgroundColor: i === page ? colors.white : GIFT_COLORS.dim }} />
          ))}
        </View>

        {error ? (
          <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: px(16), right: px(16), bottom: px(g.bar.height + 4), textAlign: 'center', fontSize: px(11), color: '#FF6B6B' }]}>{error}</Text>
        ) : null}

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(g.bar.height), backgroundColor: GIFT_COLORS.bar }}>
          <View style={{ position: 'absolute', left: px(g.bar.pill.x), top: px((g.bar.height - g.bar.pill.height) / 2), height: px(g.bar.pill.height), borderRadius: px(g.bar.pill.radius), backgroundColor: GIFT_COLORS.pill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(12), gap: px(6) }}>
            <Coin size={px(16)} />
            <Text style={[styles.medium, { fontSize: px(15), color: colors.white }]}>{coins === null ? '—' : coins.toFixed(2)}</Text>
            <Text style={[styles.regular, { marginLeft: px(10), fontSize: px(15), color: GIFT_COLORS.orange }]}>Recharge  ›</Text>
          </View>

          <View style={{ position: 'absolute', right: px(16), top: px((g.bar.height - g.bar.pill.height) / 2), width: px(g.bar.qty.width), height: px(g.bar.pill.height), borderRadius: px(g.bar.pill.radius), borderWidth: 1, borderColor: GIFT_COLORS.orange, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
            <Pressable
              onPress={() => setQuantity((q) => (q >= 99 ? 1 : q === 1 ? 10 : q === 10 ? 99 : 1))}
              style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            >
              <Text style={[styles.regular, { fontSize: px(14), color: colors.white }]}>{quantity} ›</Text>
            </Pressable>
            <Pressable
              onPress={send}
              disabled={!chosen || !receiver || busy}
              style={{ width: px(g.bar.send.width), height: '100%', backgroundColor: GIFT_COLORS.orange, alignItems: 'center', justifyContent: 'center', opacity: !chosen || !receiver ? 0.6 : 1 }}
            >
              {busy ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={[styles.medium, { fontSize: px(15), color: colors.white }]}>Send</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

/** The gold coin the render prints beside every price. */
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
export function MusicSheet({ extra, onClose }: { extra: number; onClose: () => void }) {
  const { px } = useDesignScale();
  const [tab, setTab] = useState<'PlayList' | 'Local'>('Local');
  const [query, setQuery] = useState('');
  const m = MUSIC;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop dim="rgba(16,19,23,0.8)" onClose={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: px(m.y + extra), bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: px(m.radius), borderTopRightRadius: px(m.radius) }}>
        <View style={{ position: 'absolute', top: px(m.handle.y), left: px((402 - m.handle.width) / 2), width: px(m.handle.width), height: px(m.handle.height), borderRadius: px(15), backgroundColor: '#D9D9D9' }} />
        {(['PlayList', 'Local'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ position: 'absolute', top: px(m.tabs.y), left: px((t === 'PlayList' ? m.tabs.playlistX : m.tabs.localX) - m.tabs.width / 2), width: px(m.tabs.width) }}>
            <Text style={[styles.medium, { fontSize: px(m.tabs.size), textAlign: 'center', color: tab === t ? colors.black : 'rgba(0,0,0,0.5)' }]}>{t}</Text>
          </Pressable>
        ))}
        <View style={{ position: 'absolute', left: px(m.search.x), top: px(m.search.y), width: px(m.search.width), height: px(m.search.height), borderRadius: px(30), backgroundColor: '#E5E5E5', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', paddingLeft: px(19), gap: px(m.search.gap) }}>
          <SvgXml xml={icons.search} width={px(m.search.icon)} height={px(m.search.icon)} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Please Search the music name"
            placeholderTextColor="rgba(124,121,121,0.4)"
            style={[styles.medium, { flex: 1, fontSize: px(m.search.size), color: '#7C7979', padding: 0 }]}
          />
        </View>
        <Text style={[styles.regular, { position: 'absolute', left: 0, right: 0, top: px(m.list.y + 40), textAlign: 'center', fontSize: px(13), color: 'rgba(0,0,0,0.4)' }]}>
          {tab === 'PlayList' ? 'Your playlist is empty' : 'No music on this device yet'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Group 8778

export function ShareSheet({ extra, roomName, roomCode, onClose, onFriends }: { extra: number; roomName: string; roomCode: string; onClose: () => void; onFriends: () => void }) {
  const { px } = useDesignScale();
  const s = SHARE;
  const message = `Join me in "${roomName}" on Guftagu — room ID ${roomCode}`;

  const targets = [
    {
      label: 'Facebook',
      image: require('../../assets/room/share-facebook.png'),
      onPress: () => Share.share({ message }),
    },
    {
      label: 'WhatsApp',
      image: require('../../assets/room/share-whatsapp.png'),
      onPress: () =>
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => Share.share({ message })),
    },
    { label: 'Friends', image: require('../../assets/room/share-friends.png'), onPress: onFriends },
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Backdrop dim="rgba(16,19,23,0.8)" onClose={onClose} />
      <View style={{ position: 'absolute', left: px(-1), right: px(-1), top: px(s.y + extra), bottom: 0, backgroundColor: '#1C1B23', borderRadius: px(s.radius) }}>
        <Text style={[styles.semiBold, { position: 'absolute', left: 0, right: 0, top: px(s.title.y), textAlign: 'center', fontSize: px(s.title.size), color: colors.white }]}>Share to</Text>
        {targets.map((t, i) => (
          <Pressable key={t.label} onPress={t.onPress} style={{ position: 'absolute', left: px(s.items[i].centerX - 55), width: px(110), top: px(s.icon.y), alignItems: 'center' }}>
            <Image source={t.image} resizeMode="cover" style={{ width: px(s.icon.size), height: px(s.icon.size) }} />
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
