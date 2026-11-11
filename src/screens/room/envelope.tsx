import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';

import { ApiError } from '../../api/client';
import * as icons from '../../assets/room/envelope/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { ENVELOPE } from './geometry';
import { avatarOf } from './sheets';
import type { EnvelopeClaimResult, RoomEnvelope } from './useRoom';

/**
 * Red envelopes — section 575:2742. Tools → Red Packet opens the send sheet;
 * Send drops an envelope in the middle of the room for everyone except the
 * sender. Each person opens their own and sees only their own share.
 */

const art = {
  sheetBg: require('../../assets/room/envelope/sheet-bg.png'),
  titlePill: require('../../assets/room/envelope/title-pill.png'),
  popupBg: require('../../assets/room/envelope/popup-bg.png'),
  coin: require('../../assets/room/envelope/coin.png'),
};

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

export function EnvelopeSheet({ extra, onClose, onSend }: { extra: number; onClose: () => void; onSend: (gold: number, count: number) => void | Promise<void> }) {
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

const RED = '#A51B22';
const GOLD = '#FFDE07';
const COINS_OUT = 10;

/**
 * A red envelope someone else sent, dropped in the middle of the room. Everyone opens their own:
 * tapping it claims your share right here, coins burst out and a card shows what you got — and
 * only what you got. Nobody sees anyone else's amount.
 */
export function EnvelopeDrop({
  envelope,
  more,
  onClaim,
  onDone,
}: {
  envelope: RoomEnvelope;
  /** Other unopened envelopes waiting behind this one. */
  more: number;
  onClaim: () => Promise<EnvelopeClaimResult>;
  onDone: () => void;
}) {
  const { px } = useDesignScale();
  const T = ENVELOPE.tile;
  const k = 1.45;
  const W = px(T.width * k);
  const H = px(T.height * k);
  const name = envelope.sender.display_name ?? 'Guftagu user';

  const [phase, setPhase] = useState<'idle' | 'opening' | 'opened' | 'failed'>('idle');
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  const drop = useRef(new Animated.Value(0)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  // Falls into the middle of the room, bounces to rest, then keeps swinging under a breathing glow.
  useEffect(() => {
    Animated.spring(drop, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }).start();
    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(swing, { toValue: -1, duration: 960, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(swing, { toValue: 0, duration: 480, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    sway.start();
    breathe.start();
    return () => { sway.stop(); breathe.stop(); };
  }, [drop, swing, glow]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(card, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => onDone());
  }, [card, onDone]);

  // The result card leaves on its own after a moment; a tap anywhere closes it sooner.
  useEffect(() => {
    if (phase !== 'opened' && phase !== 'failed') return;
    const t = setTimeout(close, 3500);
    return () => clearTimeout(t);
  }, [phase, close]);

  const open = async () => {
    if (phase !== 'idle') return;
    setPhase('opening');
    try {
      const res = await onClaim();
      setAmount(res.amount);
      setPhase('opened');
      Animated.timing(burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      Animated.spring(card, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    } catch (e) {
      setNote(e instanceof ApiError ? e.displayMessage : 'Could not open the red envelope.');
      setPhase('failed');
      Animated.spring(card, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
    }
  };

  const done = phase === 'opened' || phase === 'failed';
  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [-px(520), 0] });
  const dropScale = drop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const rotate = swing.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] });
  const cardScale = card.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const coinSize = px(T.coin.size * k);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {done ? (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: card }]}>
          <Pressable onPress={close} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}

      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        {!done ? (
          <Animated.View style={{ alignItems: 'center', transform: [{ translateY }, { scale: dropScale }] }}>
            {/* Who it is from. */}
            <View style={[styles.row, { marginBottom: px(10), paddingLeft: px(3), paddingRight: px(12), height: px(30), borderRadius: px(15), backgroundColor: 'rgba(0,0,0,0.55)' }]}>
              <Image source={avatarOf(envelope.sender)} resizeMode="cover" style={{ width: px(24), height: px(24), borderRadius: px(12), borderWidth: 1, borderColor: GOLD }} />
              <Text numberOfLines={1} style={[styles.medium, { marginLeft: px(6), maxWidth: px(200), fontSize: px(12) }]}>{`${name}’s red envelope`}</Text>
            </View>

            <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View
                pointerEvents="none"
                style={{ position: 'absolute', width: W * 1.9, height: W * 1.9, borderRadius: W, backgroundColor: 'rgba(255,196,60,0.28)', opacity: glowOpacity, transform: [{ scale: glowScale }] }}
              />
              <Animated.View
                pointerEvents="none"
                style={{ position: 'absolute', width: W * 1.35, height: W * 1.35, borderRadius: W, backgroundColor: 'rgba(255,214,90,0.30)', opacity: glowOpacity }}
              />
              <Animated.View style={{ width: W, height: H, transform: [{ rotate }] }}>
                <Pressable onPress={open} style={{ width: '100%', height: '100%', borderRadius: px(T.radius * k), overflow: 'hidden', borderWidth: px(2), borderColor: 'rgba(255,222,7,0.7)' }}>
                  <LinearGradient
                    colors={['#FF8B25', '#F55066', '#EB11AA']}
                    locations={[0.0165, 0.48605, 0.9835]}
                    start={{ x: 0.17, y: 0.13 }}
                    end={{ x: 0.83, y: 0.87 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={{ position: 'absolute', left: px(T.flap.x * k), top: px(T.flap.y * k) }}>
                    <SvgXml xml={icons.tileFlap} width={px(T.flap.width * k)} height={px(T.flap.height * k)} />
                  </View>
                  <Image source={art.coin} resizeMode="cover" style={{ position: 'absolute', left: px(T.coin.x * k), top: px(T.coin.y * k), width: coinSize, height: coinSize }} />
                </Pressable>
              </Animated.View>
              {more > 0 ? (
                <View style={[styles.center, { position: 'absolute', right: -px(8), top: -px(8), minWidth: px(26), height: px(26), paddingHorizontal: px(6), borderRadius: px(13), backgroundColor: GOLD, borderWidth: px(2), borderColor: colors.white }]}>
                  <Text style={[styles.semiBold, { fontSize: px(12), color: RED }]}>{`+${more}`}</Text>
                </View>
              ) : null}
            </View>

            <Pressable onPress={open} style={[styles.center, { marginTop: px(14), height: px(34), paddingHorizontal: px(22), borderRadius: px(17), backgroundColor: GOLD }]}>
              <Text style={[styles.semiBold, { fontSize: px(14), color: RED }]}>{phase === 'opening' ? 'Opening…' : 'Tap to open'}</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            {/* Coins flying out of the envelope. */}
            {phase === 'opened'
              ? Array.from({ length: COINS_OUT }, (_, i) => {
                  const a = (i / COINS_OUT) * Math.PI * 2;
                  const r = px(150 + (i % 3) * 22);
                  return (
                    <Animated.Image
                      key={i}
                      source={art.coin}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        width: px(30),
                        height: px(30),
                        opacity: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                        transform: [
                          { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * r] }) },
                          { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * r] }) },
                          { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.1] }) },
                        ],
                      }}
                    />
                  );
                })
              : null}

            {/* What you got — yours only. */}
            <Animated.View style={{ width: px(280), borderRadius: px(22), overflow: 'hidden', backgroundColor: RED, borderWidth: px(3), borderColor: GOLD, opacity: card, transform: [{ scale: cardScale }] }}>
              <Image source={art.popupBg} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: px(280), height: px((280 * 1024) / 608) }} />
              <View style={{ alignItems: 'center', paddingTop: px(26), paddingBottom: px(24), paddingHorizontal: px(16) }}>
                <Image source={avatarOf(envelope.sender)} resizeMode="cover" style={{ width: px(64), height: px(64), borderRadius: px(32), borderWidth: px(2), borderColor: GOLD }} />
                <Text numberOfLines={1} style={[styles.medium, { marginTop: px(8), fontSize: px(14), opacity: 0.9 }]}>{`${name}’s red envelope`}</Text>
                {phase === 'opened' ? (
                  <>
                    <View style={[styles.row, { marginTop: px(14) }]}>
                      <Image source={art.coin} resizeMode="cover" style={{ width: px(36), height: px(36), marginRight: px(8) }} />
                      <Text style={[styles.semiBold, { fontSize: px(42), lineHeight: px(52), color: '#FFE58A' }]}>{`+${amount}`}</Text>
                    </View>
                    <Text style={[styles.medium, { fontSize: px(15) }]}>Coins</Text>
                    <Text style={[styles.regular, { marginTop: px(10), fontSize: px(12), opacity: 0.85 }]}>Credited to your account</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.semiBold, { marginTop: px(16), fontSize: px(22), color: '#FFE58A' }]}>Oops!</Text>
                    <Text style={[styles.regular, { marginTop: px(6), fontSize: px(13), textAlign: 'center', opacity: 0.9 }]}>{note}</Text>
                  </>
                )}
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  regular: { fontFamily: typography.fontFamily.regular, color: colors.white },
  medium: { fontFamily: typography.fontFamily.medium, color: colors.white },
  semiBold: { fontFamily: typography.fontFamily.semiBold, color: colors.white },
});
