import { LinearGradient } from 'expo-linear-gradient';
import {
  Armchair,
  EllipsisVertical,
  Gamepad2,
  Gift,
  ImageIcon,
  Lock,
  LockKeyhole,
  Megaphone,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Power,
  Settings,
  Share2,
  Smile,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useState } from 'react';
import { SvgXml } from 'react-native-svg';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import * as icons from '../../assets/room/icons';
import { SIDE, TOP_ACTIONS } from './geometry';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf } from './sheets';
import type { RoomUser } from './useRoom';

const GOLD = '#FFC83A';
const font = { regular: typography.fontFamily.regular, medium: typography.fontFamily.medium };

/** The room's "who is in" pill: three newest faces, a person glyph and the head count. */
export function ViewersPill({ members, count, onPress }: { members: (RoomUser | null)[]; count: number; onPress: () => void }) {
  const { px } = useDesignScale();
  const faces = members.slice(0, 3);
  return (
    <Pressable
      onPress={onPress}
      style={{ height: px(25), minWidth: px(101), borderRadius: px(12.5), paddingLeft: px(2), paddingRight: px(8), flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(45,34,28,0.62)' }}
    >
      <View style={{ flexDirection: 'row' }}>
        {faces.map((m, i) => (
          <Image key={`${m?.uuid ?? 'x'}-${i}`} source={avatarOf(m)} style={{ width: px(21), height: px(21), borderRadius: px(10.5), borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', marginLeft: i === 0 ? 0 : px(-3) }} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <User size={px(11)} color={colors.white} fill={colors.white} />
      <Text style={{ marginLeft: px(4), fontFamily: font.regular, fontSize: px(14), color: colors.white }}>{count}</Text>
    </Pressable>
  );
}

/** ⋮ (host menu) and power in one capsule, split by a thin rule. */
export function ActionPill({ onShare, onPower }: { onShare: () => void; onPower: () => void }) {
  const { px } = useDesignScale();
  return (
    <View style={{ height: px(30), width: px(67), borderRadius: px(15), flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(45,34,28,0.62)' }}>
      <Pressable onPress={onShare} hitSlop={px(6)} style={{ flex: 1, alignItems: 'center' }}>
        <SvgXml xml={icons.share} width={px(TOP_ACTIONS.share.width)} height={px(TOP_ACTIONS.share.height)} />
      </Pressable>
      <View style={{ width: StyleSheet.hairlineWidth * 2, height: px(16), backgroundColor: 'rgba(255,255,255,0.35)' }} />
      <Pressable onPress={onPower} hitSlop={px(6)} style={{ flex: 1, alignItems: 'center' }}>
        <SvgXml xml={icons.power} width={px(20)} height={px(20)} />
      </Pressable>
    </View>
  );
}

export function TopRoomPill({ onPress }: { onPress: () => void }) {
  const { px } = useDesignScale();
  return (
    <Pressable onPress={onPress} style={{ height: px(25), width: px(86), borderRadius: px(12.5), paddingHorizontal: px(8), flexDirection: 'row', alignItems: 'center', gap: px(4), backgroundColor: 'rgba(45,34,28,0.62)' }}>
      <Trophy size={px(13)} color={GOLD} />
      <Text style={{ fontFamily: font.regular, fontSize: px(11), color: '#FFE9B0' }}>Top Room</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ power overlay

/** Power: the whole screen dims, Minimize above Exit, each a round button with its name. */
export function PowerOverlay({ onClose, onMinimize, onExit }: { onClose: () => void; onMinimize: () => void; onExit: () => void }) {
  const { px } = useDesignScale();
  const item = (label: string, colorsPair: [string, string], icon: React.ReactNode, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: px(10) }}>
      <LinearGradient colors={colorsPair} style={{ width: px(76), height: px(76), borderRadius: px(38), alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: px(40), height: px(40), borderRadius: px(10), backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      </LinearGradient>
      <Text style={{ fontFamily: font.regular, fontSize: px(14), color: colors.white }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)' }]} />
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: px(34) }]}>
        {item('Minimize', ['#F2B27A', '#B5703E'], <Minimize2 size={px(22)} color="#C77A3E" />, onMinimize)}
        {item('Exit', ['#7CD3EE', '#2B8FB0'], <Power size={px(22)} color="#2B8FB0" />, onExit)}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ host menu (⋮)

export type HostMenuKey = 'setting' | 'background' | 'micMode' | 'share' | 'lock' | 'announcement';

const MENU: { key: HostMenuKey; label: string; pair: [string, string]; icon: (c: string, s: number) => React.ReactNode; host: boolean }[] = [
  { key: 'setting', label: 'Setting', pair: ['#7ED3EC', '#2D7FA0'], icon: (c, s) => <Settings size={s} color={c} />, host: true },
  { key: 'background', label: 'Room\nBackground', pair: ['#F08CA0', '#B5455E'], icon: (c, s) => <ImageIcon size={s} color={c} />, host: true },
  { key: 'micMode', label: 'Mic Mode', pair: ['#58C878', '#2A8A4A'], icon: (c, s) => <Armchair size={s} color={c} />, host: true },
  { key: 'share', label: 'Share', pair: ['#EAB083', '#B7733E'], icon: (c, s) => <Share2 size={s} color={c} />, host: false },
  { key: 'lock', label: 'Lock Room', pair: ['#7ED3EC', '#2D7FA0'], icon: (c, s) => <LockKeyhole size={s} color={c} />, host: true },
  { key: 'announcement', label: 'Announcement', pair: ['#9C8CF0', '#5B48C6'], icon: (c, s) => <Megaphone size={s} color={c} />, host: true },
];

/** ⋮ opens a panel that drops from the top: six round shortcuts (only Share for a guest). */
export function HostMenu({ isHost, onClose, onPick }: { isHost: boolean; onClose: () => void; onPick: (k: HostMenuKey) => void }) {
  const { px } = useDesignScale();
  const items = MENU.filter((m) => isHost || !m.host);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: px(54), paddingBottom: px(18), paddingHorizontal: px(10), flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#2B2733', borderBottomLeftRadius: px(18), borderBottomRightRadius: px(18) }}>
        {items.map((m) => (
          <Pressable key={m.key} onPress={() => onPick(m.key)} style={{ width: '25%', alignItems: 'center', marginTop: px(14) }}>
            <LinearGradient colors={m.pair} style={{ width: px(52), height: px(52), borderRadius: px(26), alignItems: 'center', justifyContent: 'center' }}>
              {m.icon(colors.white, px(22))}
            </LinearGradient>
            <Text style={{ marginTop: px(6), textAlign: 'center', fontFamily: font.regular, fontSize: px(12), color: '#E8E4F0' }}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Announcement editor opened from the ⋮ menu. */
export function AnnouncementDialog({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (text: string) => void }) {
  const { px } = useDesignScale();
  const [text, setText] = useState(initial);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
      <View style={{ position: 'absolute', left: px(24), right: px(24), top: px(200), borderRadius: px(14), padding: px(16), backgroundColor: '#1B0F1A' }}>
        <Text style={{ fontFamily: font.medium, fontSize: px(15), color: colors.white, marginBottom: px(10) }}>Announcement</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          placeholder="Write what everyone should read"
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={{ minHeight: px(90), textAlignVertical: 'top', borderRadius: px(10), padding: px(10), backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, fontFamily: font.regular, fontSize: px(13) }}
        />
        <View style={{ flexDirection: 'row', gap: px(10), marginTop: px(14) }}>
          <Pressable onPress={onClose} style={{ flex: 1, height: px(42), borderRadius: px(21), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            <Text style={{ fontFamily: font.regular, color: colors.white }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => onSave(text.trim())} style={{ flex: 1, height: px(42), borderRadius: px(21), alignItems: 'center', justifyContent: 'center', backgroundColor: '#8A3DFF' }}>
            <Text style={{ fontFamily: font.medium, color: colors.white }}>Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ chat bar

export type ChatTab = 'All' | 'Gifts' | 'Chat';

/** All · Gifts · Chat (a short underline marks the open one), then Clear and expand. */
export function ChatBar({ tab, onTab, onClear, expanded, onExpand }: { tab: ChatTab; onTab: (t: ChatTab) => void; onClear: () => void; expanded: boolean; onExpand: () => void }) {
  const { px } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: px(34) }}>
      {(['All', 'Gifts', 'Chat'] as const).map((t) => (
        <Pressable key={t} onPress={() => onTab(t)} hitSlop={px(6)} style={{ marginRight: px(16), alignItems: 'flex-start' }}>
          <Text style={{ fontFamily: font.regular, fontSize: px(16), color: colors.white, opacity: tab === t ? 1 : 0.5 }}>{t}</Text>
          <View style={{ marginTop: px(3), width: px(12), height: px(2.5), borderRadius: px(2), backgroundColor: tab === t ? colors.white : 'transparent' }} />
        </Pressable>
      ))}
      <Pressable onPress={onClear} style={{ marginLeft: px(4), height: px(28), paddingHorizontal: px(16), borderRadius: px(14), justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Text style={{ fontFamily: font.regular, fontSize: px(13), color: colors.white }}>Clear</Text>
      </Pressable>
      <Pressable onPress={onExpand} hitSlop={px(6)} style={{ marginLeft: px(14), height: px(28), width: px(44), borderRadius: px(14), alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        {expanded ? <Minimize2 size={px(15)} color={colors.white} /> : <Maximize2 size={px(15)} color={colors.white} />}
      </Pressable>
    </View>
  );
}

// ------------------------------------------------------------------ bottom bar

/**
 * Typing field with the emoji button inside it, then gift · speaker · mic (only on a seat)
 * · messages · settings · games — Mazag's order.
 */
export function BottomBar(props: {
  draft: string;
  onDraft: (t: string) => void;
  onSend: () => void;
  onEmoji: () => void;
  onType: () => void;
  onGift: () => void;
  speakerOff: boolean;
  onSpeaker: () => void;
  seated: boolean;
  micOn: boolean;
  onMic: () => void;
  onGames: () => void;
}) {
  const { px } = useDesignScale();
  const round = (child: React.ReactNode, onPress: () => void, extra?: React.ReactNode) => (
    <Pressable onPress={onPress} hitSlop={px(3)} style={{ width: px(34), height: px(34), borderRadius: px(17), alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
      {child}
      {extra}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
      <View style={{ flex: 1, height: px(40), borderRadius: px(20), flexDirection: 'row', alignItems: 'center', paddingLeft: px(12), paddingRight: px(6), backgroundColor: 'rgba(20,8,18,0.63)', borderWidth: 1, borderColor: 'rgba(246,246,246,0.18)' }}>
        <Pressable onPress={props.onType} style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: px(13), color: props.draft ? colors.white : 'rgba(255,255,255,0.5)' }}>{props.draft || 'Typing...'}</Text>
        </Pressable>
        <Pressable onPress={props.onEmoji} hitSlop={px(6)}>
          <Smile size={px(20)} color={colors.white} />
        </Pressable>
      </View>
      <Pressable onPress={props.onGift} hitSlop={px(3)} style={{ width: px(46), height: px(44), alignItems: 'center', justifyContent: 'center' }}>
        <SvgXml xml={icons.giftRing} width={px(SIDE.gift.ring.width)} height={px(SIDE.gift.ring.height)} />
        <Image source={require('../../assets/room/gift-box.png')} resizeMode="contain" style={{ position: 'absolute', width: px(44), height: px(44), transform: [{ rotate: SIDE.gift.box.rotate }] }} />
      </Pressable>
      {round(props.speakerOff ? <VolumeX size={px(17)} color={colors.white} /> : <Volume2 size={px(17)} color={colors.white} />, props.onSpeaker)}
      {props.seated ? round(props.micOn ? <Mic size={px(17)} color={colors.white} /> : <MicOff size={px(17)} color="rgba(255,255,255,0.6)" />, props.onMic) : null}
      <Pressable onPress={props.onGames} hitSlop={px(3)}>
        <LinearGradient colors={['#4FD37A', '#1E9A4C']} style={{ width: px(40), height: px(40), borderRadius: px(20), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B8F5CC' }}>
          <Gamepad2 size={px(20)} color={colors.white} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export { Lock as LockGlyph };

/** Mazag's "Tips" confirmation before the chat list is wiped. */
export function ClearDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { px } = useDesignScale();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onCancel} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
      <View style={{ position: 'absolute', left: px(30), right: px(30), top: px(330), borderRadius: px(18), backgroundColor: '#3B332F', paddingHorizontal: px(18), paddingTop: px(22), paddingBottom: px(20) }}>
        <Text style={{ textAlign: 'center', fontFamily: font.medium, fontSize: px(20), color: colors.white }}>Tips</Text>
        <Text style={{ marginTop: px(18), textAlign: 'center', fontFamily: font.regular, fontSize: px(16), lineHeight: px(26), color: colors.white }}>Confirm to delete all messages in the list</Text>
        <View style={{ marginTop: px(22), flexDirection: 'row', gap: px(14) }}>
          <Pressable onPress={onCancel} style={{ flex: 1, height: px(44), borderRadius: px(22), borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font.regular, fontSize: px(16), color: colors.white }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={{ flex: 1 }}>
            <LinearGradient colors={['#F7B24A', '#EE9A2F']} style={{ height: px(44), borderRadius: px(22), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font.regular, fontSize: px(16), color: colors.white }}>Confirm</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
