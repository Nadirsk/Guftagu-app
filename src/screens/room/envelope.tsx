import { useEffect, useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/room/envelope/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { ENVELOPE } from './geometry';
import { avatarOf } from './sheets';
import type { RoomUser } from './useRoom';

/**
 * Red envelopes — section 575:2742. Tools → Red Packet opens the send sheet;
 * Send leaves an envelope in the room; tapping it opens it, and opening shows
 * what you got and who else claimed.
 *
 * Nothing on the server knows about envelopes yet, so an envelope lives in the
 * room screen only: no coins leave or reach a wallet, and the split is made here.
 */

export type EnvelopeClaim = { user: RoomUser; amount: number; at: Date };
export type RedEnvelope = { id: string; sender: RoomUser; gold: number; count: number; claims: EnvelopeClaim[] };

const art = {
  sheetBg: require('../../assets/room/envelope/sheet-bg.png'),
  titlePill: require('../../assets/room/envelope/title-pill.png'),
  popupBg: require('../../assets/room/envelope/popup-bg.png'),
  claimedBg: require('../../assets/room/envelope/result-bg.png'),
  coin: require('../../assets/room/envelope/coin.png'),
};

/** One envelope's share: random, at least 1 coin each, and the last one takes what is left. */
export function claimShare(env: RedEnvelope) {
  const left = env.count - env.claims.length;
  const remaining = env.gold - env.claims.reduce((sum, c) => sum + c.amount, 0);
  if (left <= 1) return remaining;
  const max = remaining - (left - 1);
  return Math.min(max, Math.max(1, Math.round(Math.random() * ((2 * remaining) / left))));
}

/** A label centred on a Figma point; Poppins' "normal" line is 1.5x its size. */
function Centered({ cx, cy, size, width, style, children }: { cx: number; cy: number; size: number; width: number; style: StyleProp<TextStyle>; children: React.ReactNode }) {
  const { px } = useDesignScale();
  return (
    <Text
      numberOfLines={1}
      style={[style, { position: 'absolute', left: px(cx - width / 2), top: px(cy - (size * 1.5) / 2), width: px(width), fontSize: px(size), lineHeight: px(size * 1.5), textAlign: 'center' }]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- 575:3216 / 575:3417

type Pick = { preset: number | null; custom: string };
const valueOf = (p: Pick) => (p.custom ? Number(p.custom) : p.preset ?? 0);

export function EnvelopeSheet({ extra, onClose, onSend }: { extra: number; onClose: () => void; onSend: (gold: number, count: number) => void }) {
  const { px } = useDesignScale();
  const S = ENVELOPE.sheet;
  const [gold, setGold] = useState<Pick>({ preset: ENVELOPE.goldChips[0].value, custom: '' });
  const [count, setCount] = useState<Pick>({ preset: ENVELOPE.countChips[0].value, custom: '' });
  const [rules, setRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The sheet sits on the bottom edge, so it rides up over the keyboard while a number is typed.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const send = () => {
    const g = valueOf(gold);
    const n = valueOf(count);
    if (!Number.isInteger(g) || g <= 0) return setError('Enter the gold to send');
    if (!Number.isInteger(n) || n <= 0) return setError('Enter how many envelopes');
    if (n > g) return setError('Each envelope needs at least 1 gold');
    onSend(g, n);
  };

  const chip = (key: string, box: { x: number; y: number; width: number }, label: string, selected: boolean, dim: boolean | undefined, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[styles.chip, { left: px(box.x), top: px(box.y), width: px(box.width), height: px(S.chip.height), borderRadius: px(S.chip.radius), backgroundColor: selected ? colors.white : dim ? S.chip.dim : S.chip.idle }]}
    >
      <Text numberOfLines={1} style={[styles.medium, { fontSize: px(S.chip.size), color: selected ? S.chip.selectedText : colors.white }]}>{label}</Text>
    </Pressable>
  );

  const input = (box: (typeof ENVELOPE)['goldInput'] | (typeof ENVELOPE)['countInput'], pick: Pick, set: (p: Pick) => void) => {
    const selected = pick.custom !== '';
    return (
      <View style={[styles.chip, { left: px(box.x), top: px(box.y), width: px(box.width), height: px(S.chip.height), borderRadius: px(S.chip.radius), backgroundColor: selected ? colors.white : box.dim ? S.chip.dim : S.chip.idle }]}>
        <TextInput
          value={pick.custom}
          onChangeText={(t) => {
            setError(null);
            const digits = t.replace(/[^0-9]/g, '').slice(0, 7);
            set(digits ? { preset: null, custom: digits } : { preset: pick.preset, custom: '' });
          }}
          placeholder="Enter Number"
          placeholderTextColor={box.color}
          keyboardType="number-pad"
          style={[selected ? styles.medium : styles.regular, { width: '100%', height: '100%', padding: 0, textAlign: 'center', fontSize: px(selected ? S.chip.size : box.size), color: selected ? S.chip.selectedText : colors.white }]}
        />
      </View>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: px(S.y + extra) - kb,
          bottom: kb,
          overflow: 'hidden',
          borderTopLeftRadius: px(S.radius.left),
          borderTopRightRadius: px(S.radius.right),
          backgroundColor: colors.white,
        }}
      >
        <Image source={art.sheetBg} resizeMode="stretch" style={{ position: 'absolute', left: px(S.bg.x), bottom: px(S.height + S.bg.y - S.bg.height), width: px(S.bg.width), height: px(S.bg.height) }} />

        <Pressable onPress={() => setRules((v) => !v)} hitSlop={px(8)} style={{ position: 'absolute', left: px(S.help.x), top: px(S.help.y) }}>
          <SvgXml xml={icons.help} width={px(S.help.size)} height={px(S.help.size)} />
        </Pressable>
        <View style={{ position: 'absolute', left: px(S.title.x), top: px(S.title.y), width: px(S.title.width), height: px(S.title.height), overflow: 'hidden' }}>
          <Image source={art.titlePill} resizeMode="stretch" style={{ position: 'absolute', left: 0, top: px(S.title.imageTop), width: px(S.title.width), height: px(S.title.imageHeight) }} />
        </View>
        <Centered cx={S.title.centerX} cy={S.title.centerY} size={S.title.size} width={S.title.width} style={styles.semiBold}>Red envelopes</Centered>
        <Pressable onPress={onClose} hitSlop={px(4)} style={{ position: 'absolute', left: px(S.close.x), top: px(S.close.y), width: px(S.close.size), height: px(S.close.size) }}>
          <SvgXml xml={icons.closeDisc} width={px(S.close.size)} height={px(S.close.size)} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: px(S.close.cross.centerX - S.close.x - S.close.cross.width / 2),
              top: px(S.close.cross.centerY - S.close.y - S.close.cross.height / 2),
              transform: [{ rotate: S.close.cross.rotate }],
            }}
          >
            <SvgXml xml={icons.closeCross} width={px(S.close.cross.width)} height={px(S.close.cross.height)} />
          </View>
        </Pressable>

        {rules ? (
          <RulesPanel />
        ) : (
          <>
            <Centered cx={S.gold.label.centerX} cy={S.gold.label.centerY} size={S.labelSize} width={100} style={styles.medium}>Gold</Centered>
            {ENVELOPE.goldChips.map((c) =>
              chip(`g${c.value}`, c, String(c.value), !gold.custom && gold.preset === c.value, 'dim' in c ? c.dim : false, () => {
                setError(null);
                setGold({ preset: c.value, custom: '' });
              }),
            )}
            {input(ENVELOPE.goldInput, gold, setGold)}

            <Centered cx={S.numbers.label.centerX} cy={S.numbers.label.centerY} size={S.labelSize} width={120} style={styles.medium}>Numbers</Centered>
            {ENVELOPE.countChips.map((c) =>
              chip(`n${c.value}`, c, String(c.value), !count.custom && count.preset === c.value, false, () => {
                setError(null);
                setCount({ preset: c.value, custom: '' });
              }),
            )}
            {input(ENVELOPE.countInput, count, setCount)}

            {error ? (
              <Text style={[styles.regular, { position: 'absolute', left: 0, right: 0, top: px(S.send.y - 26), fontSize: px(12), color: colors.white, textAlign: 'center' }]}>{error}</Text>
            ) : null}
            <Pressable
              onPress={send}
              style={[styles.chip, { left: px(S.send.x), top: px(S.send.y), width: px(S.send.width), height: px(S.send.height), borderRadius: px(S.send.radius), backgroundColor: colors.white }]}
            >
              <Text style={[styles.medium, { fontSize: px(S.send.size), color: S.send.color }]}>Send</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/** Group 1597881005 — Figma's copy, word for word. */
const RULES: [string, boolean][] = [
  ['Weekly Gift Contribution Event Rules', true],
  ['', false],
  ['1. Weekly Gift Contribution Value Task', true],
  ['When the total gift contribution value in a room reaches the specified task target within a week, the Room Owner will receive a gold coin reward based on the achievement.', false],
  ['', false],
  ['2. Reward Distribution Time', true],
  ['The weekly gold coin rewards will be automatically deposited into the Room Reward (Claimable Section) at 00:00 (GMT+3) every Monday.', false],
  ['', false],
  ['3. Gold Coin Claiming Conditions', true],
  ['Claiming is allowed only on Monday, between 00:00 and 23:59 (GMT+3).', false],
];

function RulesPanel() {
  const { px } = useDesignScale();
  const R = ENVELOPE.rules;
  const top = R.y - ENVELOPE.sheet.y;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: px(top), bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: px(R.radius), borderTopRightRadius: px(R.radius) }}>
      <Centered cx={201} cy={R.title.centerY} size={R.title.size} width={200} style={[styles.medium, { color: colors.black }]}>Rules</Centered>
      <Text style={{ position: 'absolute', left: px(R.body.x), top: px(R.body.y), width: px(R.body.width) }}>
        {RULES.map(([line, bold], i) => (
          <Text key={i} style={[bold ? styles.semiBold : styles.regular, { fontSize: px(R.body.size), lineHeight: px(R.body.size * 1.5), color: R.body.color }]}>
            {line || ' '}
            {i < RULES.length - 1 ? '\n' : ''}
          </Text>
        ))}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- 575:2854

export function EnvelopeTile({ extra, onPress }: { extra: number; onPress: () => void }) {
  const { px } = useDesignScale();
  const T = ENVELOPE.tile;
  return (
    <Pressable onPress={onPress} style={{ position: 'absolute', left: px(T.x), top: px(T.y + extra), width: px(T.width), height: px(T.height), borderRadius: px(T.radius), overflow: 'hidden' }}>
      {/* 137.68deg, #FF8B25 → #F55066 → #EB11AA, as the Tools sheet's packet. */}
      <LinearGradient
        colors={['#FF8B25', '#F55066', '#EB11AA']}
        locations={[0.0165, 0.48605, 0.9835]}
        start={{ x: 0.17, y: 0.13 }}
        end={{ x: 0.83, y: 0.87 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: 'absolute', left: px(T.flap.x), top: px(T.flap.y) }}>
        <SvgXml xml={icons.tileFlap} width={px(T.flap.width)} height={px(T.flap.height)} />
      </View>
      <Image source={art.coin} resizeMode="cover" style={{ position: 'absolute', left: px(T.coin.x), top: px(T.coin.y), width: px(T.coin.size), height: px(T.coin.size) }} />
    </Pressable>
  );
}

// ---------------------------------------------------------------- 575:3103

function Popup({ extra, onClose, children, white }: { extra: number; onClose: () => void; children: React.ReactNode; white?: boolean }) {
  const { px } = useDesignScale();
  const P = ENVELOPE.popup;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: ENVELOPE.scrim }]} />
      <View style={{ position: 'absolute', left: px(P.x), top: px(P.y + extra / 2), width: px(P.width), height: px(P.height), borderRadius: px(P.radius), overflow: 'hidden', backgroundColor: white ? colors.white : undefined }}>
        {children}
      </View>
    </View>
  );
}

export function EnvelopeOpenPopup({ extra, sender, onOpen, onClose }: { extra: number; sender: RoomUser; onOpen: () => void; onClose: () => void }) {
  const { px } = useDesignScale();
  const O = ENVELOPE.open;
  const W = ENVELOPE.popup.width;
  return (
    <Popup extra={extra} onClose={onClose} white>
      <Image source={art.popupBg} resizeMode="cover" style={{ position: 'absolute', left: px(O.bg.x), top: px(O.bg.y), width: px(O.bg.width), height: px(O.bg.height) }} />
      <Image source={avatarOf(sender)} resizeMode="cover" style={{ position: 'absolute', left: px((W - O.avatar.size) / 2), top: px(O.avatar.y), width: px(O.avatar.size), height: px(O.avatar.size), borderRadius: px(O.avatar.size / 2) }} />
      <Centered cx={O.name.centerX} cy={O.name.centerY} size={O.name.size} width={W - 20} style={styles.medium}>
        {`${sender.display_name ?? 'Guftagu user'}’s red envelope`}
      </Centered>
      <View pointerEvents="none" style={{ position: 'absolute', left: px((W - O.ring.size) / 2), top: px(O.ring.y) }}>
        <SvgXml xml={icons.openRing} width={px(O.ring.size)} height={px(O.ring.size)} />
      </View>
      <Pressable onPress={onOpen} style={{ position: 'absolute', left: px((W - O.disc.size) / 2), top: px(O.disc.y), width: px(O.disc.size), height: px(O.disc.size) }}>
        <SvgXml xml={icons.openDisc} width={px(O.disc.size)} height={px(O.disc.size)} />
      </Pressable>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Centered cx={O.label.centerX} cy={O.label.centerY} size={O.label.size} width={96} style={styles.medium}>Open</Centered>
      </View>
      {/* Figma's 4px gold stroke is inside the frame; drawn on top so it moves nothing. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: px(O.border.width), borderColor: O.border.color, borderRadius: px(ENVELOPE.popup.radius) }]} />
    </Popup>
  );
}

// ---------------------------------------------------------------- 575:2972

const stamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function EnvelopeClaimedPopup({ extra, envelope, mine, onClose }: { extra: number; envelope: RedEnvelope; mine: EnvelopeClaim | null; onClose: () => void }) {
  const { px } = useDesignScale();
  const C = ENVELOPE.claimed;
  const W = ENVELOPE.popup.width;
  const R = C.row;
  const black = { color: colors.black };
  return (
    <Popup extra={extra} onClose={onClose} white>
      <View style={{ position: 'absolute', left: px(C.bg.x), top: px(C.bg.y), width: px(C.bg.width), height: px(C.bg.height), borderRadius: px(C.bg.radius), overflow: 'hidden' }}>
        {/* Bottom-anchored: the image is taller than the pill. */}
        <Image source={art.claimedBg} resizeMode="stretch" style={{ position: 'absolute', left: 0, bottom: 0, width: px(C.bg.width), height: px((C.bg.width * 1024) / 608) }} />
      </View>
      <Image source={avatarOf(envelope.sender)} resizeMode="cover" style={{ position: 'absolute', left: px(C.avatar.x), top: px(C.avatar.y), width: px(C.avatar.size), height: px(C.avatar.size), borderRadius: px(C.avatar.size / 2) }} />
      <Centered cx={C.name.centerX} cy={C.name.centerY} size={C.name.size} width={W - 20} style={[styles.medium, black]}>
        {`${envelope.sender.display_name ?? 'Guftagu user'}’s red envelope`}
      </Centered>
      {mine ? (
        <>
          <Text numberOfLines={1} style={[styles.semiBold, { position: 'absolute', left: 0, width: px(W), top: px(C.amount.y), textAlign: 'center', fontSize: px(C.amount.size), lineHeight: px(C.amount.size * 1.5), color: C.amount.color }]}>
            {mine.amount}
            <Text style={[styles.medium, { fontSize: px(C.amount.unitSize), color: C.amount.color }]}> Coins</Text>
          </Text>
          <Text style={[styles.regular, { position: 'absolute', left: 0, width: px(W), top: px(C.credited.y), textAlign: 'center', fontSize: px(C.credited.size), color: colors.black, opacity: 0.4 }]}>
            Credited to your account
          </Text>
        </>
      ) : null}
      <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: px(C.summary.x), top: px(C.summary.centerY - C.summary.size * 0.75), fontSize: px(C.summary.size), lineHeight: px(C.summary.size * 1.5), color: colors.black, opacity: 0.4 }]}>
        {`Claimed ${envelope.claims.length}/${envelope.count}, Total ${envelope.gold} coins`}
      </Text>
      {/* Rows from 575:2982 down; the popup shows one, the rest scroll under it. */}
      <ScrollView style={{ position: 'absolute', left: 0, width: px(W), top: px(R.avatar.y), bottom: 0 }} showsVerticalScrollIndicator={false}>
        {envelope.claims.map((c) => {
          return (
            <View key={c.user.uuid} style={{ height: px(R.step) }}>
              <Image source={avatarOf(c.user)} resizeMode="cover" style={{ position: 'absolute', left: px(R.avatar.x), top: 0, width: px(R.avatar.width), height: px(R.avatar.height), borderRadius: px(R.avatar.width) }} />
              <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: px(R.name.x), top: px(R.name.y - R.avatar.y), width: px(R.amount.centerX - 55 - R.name.x), fontSize: px(R.name.size), color: colors.black }]}>
                {c.user.display_name ?? 'Guftagu user'}
              </Text>
              <Text numberOfLines={1} style={[styles.regular, { position: 'absolute', left: px(R.date.x), top: px(R.date.y - R.avatar.y), fontSize: px(R.date.size), color: colors.black, opacity: 0.4 }]}>
                {stamp(c.at)}
              </Text>
              <Centered cx={R.amount.centerX} cy={R.amount.centerY - R.avatar.y} size={R.amount.size} width={110} style={[styles.medium, { color: R.amount.color }]}>
                {`${c.amount} coins`}
              </Centered>
            </View>
          );
        })}
      </ScrollView>
    </Popup>
  );
}

const styles = StyleSheet.create({
  chip: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  regular: { fontFamily: typography.fontFamily.regular, color: colors.white },
  medium: { fontFamily: typography.fontFamily.medium, color: colors.white },
  semiBold: { fontFamily: typography.fontFamily.semiBold, color: colors.white },
});
