import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, HelpCircle, X } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';

import { ApiError } from '../../api/client';
import * as icons from '../../assets/room/envelope/icons';
import { useAuth } from '../../auth/AuthContext';
import { peek, refresh } from '../../lib/swrCache';
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
  popupBg: require('../../assets/room/envelope/popup-bg.png'),
  coin: require('../../assets/room/envelope/coin.png'),
};

// ---------------------------------------------------------------- 575:3216 / 575:3417

const GOLD_PRESETS = [1000, 2000, 5000, 10000, 20000];
const COUNT_PRESETS = [5, 10, 20, 30, 40];
/** Same as RoomEnvelopeService::MAX_COUNT and LIFETIME_MINUTES on the server. */
const MAX_ENVELOPES = 100;
const REFUND_MINUTES = 10;
const SHEET_RED = '#A51B22';
const SEND_RED = '#E8151F';

type Pick = { preset: number | null; custom: string };
const valueOf = (p: Pick) => (p.custom ? Number(p.custom) : p.preset ?? 0);
const fmt = (n: number) => n.toLocaleString('en-US');

const RULES = [
  'The coins leave your balance as soon as you send.',
  'The total is split at random — every envelope holds at least 1 coin.',
  'Everyone in the room except you can open one envelope each, first come first served.',
  'Each person only sees what they got; nobody sees anyone else’s amount.',
  `Anything not opened within ${REFUND_MINUTES} minutes comes back to you automatically.`,
];

export function EnvelopeSheet({ onClose, onSend }: { extra?: number; onClose: () => void; onSend: (gold: number, count: number) => void | Promise<void> }) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const [gold, setGold] = useState<Pick>({ preset: GOLD_PRESETS[0], custom: '' });
  const [count, setCount] = useState<Pick>({ preset: COUNT_PRESETS[0], custom: '' });
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [balance, setBalance] = useState<number | null>(() => peek<{ coin_balance: number }, number>('/wallet', token, (w) => w.coin_balance));
  useEffect(() => refresh<{ coin_balance: number }, number>('/wallet', token, setBalance, (w) => w.coin_balance), [token]);

  // The sheet sits on the bottom edge, so it rides up over the keyboard while a number is typed.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Slides up from the bottom edge; closing plays it backwards.
  const { height: winH } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [t]);
  const dismiss = () => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    Animated.timing(t, { toValue: 0, duration: 210, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
  };

  const g = valueOf(gold);
  const n = valueOf(count);
  const problem =
    !Number.isInteger(g) || g <= 0 ? 'Choose how many coins to send'
    : !Number.isInteger(n) || n <= 0 ? 'Choose how many envelopes'
    : n > MAX_ENVELOPES ? `Up to ${MAX_ENVELOPES} envelopes at a time`
    : n > g ? 'Each envelope needs at least 1 coin'
    : balance !== null && g > balance ? 'You don’t have enough coins'
    : null;

  const send = async () => {
    setTried(true);
    if (problem || busy) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      await onSend(g, n);
    } finally {
      setBusy(false);
    }
  };

  const cellStyle = (selected: boolean) => [
    styles.center,
    {
      width: '31.5%' as const,
      height: px(42),
      marginBottom: px(10),
      borderRadius: px(21),
      borderWidth: 1,
      borderColor: selected ? colors.white : 'rgba(255,255,255,0.28)',
      backgroundColor: selected ? colors.white : 'rgba(255,255,255,0.14)',
    },
  ];

  const grid = (presets: number[], pick: Pick, set: (p: Pick) => void, withCoin: boolean) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      {presets.map((v) => {
        const on = !pick.custom && pick.preset === v;
        return (
          <Pressable key={v} onPress={() => { Keyboard.dismiss(); set({ preset: v, custom: '' }); }} style={[cellStyle(on), styles.row]}>
            {withCoin ? <Image source={art.coin} style={{ width: px(16), height: px(16), marginRight: px(5) }} /> : null}
            <Text style={[on ? styles.semiBold : styles.medium, { fontSize: px(15), color: on ? SEND_RED : colors.white }]}>{fmt(v)}</Text>
          </Pressable>
        );
      })}
      <View style={cellStyle(pick.custom !== '')}>
        <TextInput
          value={pick.custom}
          onChangeText={(txt) => {
            const digits = txt.replace(/[^0-9]/g, '').slice(0, 7);
            set(digits ? { preset: null, custom: digits } : { preset: pick.preset ?? presets[0], custom: '' });
          }}
          placeholder="Custom"
          placeholderTextColor="rgba(255,255,255,0.7)"
          keyboardType="number-pad"
          style={[pick.custom ? styles.semiBold : styles.regular, { width: '100%', height: '100%', padding: 0, textAlign: 'center', fontSize: px(15), color: pick.custom ? SEND_RED : colors.white }]}
        />
      </View>
    </View>
  );

  const label = (text: string, hint: string) => (
    <View style={[styles.row, { justifyContent: 'space-between', marginBottom: px(10) }]}>
      <Text style={[styles.semiBold, { fontSize: px(15) }]}>{text}</Text>
      <Text style={[styles.regular, { fontSize: px(12), opacity: 0.75 }]}>{hint}</Text>
    </View>
  );

  const roundBtn = (onPress: () => void, child: React.ReactNode) => (
    <Pressable onPress={onPress} hitSlop={px(8)} style={[styles.center, { width: px(36), height: px(36), borderRadius: px(18), backgroundColor: 'rgba(0,0,0,0.25)' }]}>
      {child}
    </Pressable>
  );

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [winH, 0] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: t }]}>
        <Pressable onPress={dismiss} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: kb,
          overflow: 'hidden',
          borderTopLeftRadius: px(26),
          borderTopRightRadius: px(26),
          backgroundColor: SHEET_RED,
          transform: [{ translateY }],
        }}
      >
        <Image source={art.sheetBg} resizeMode="cover" style={StyleSheet.absoluteFill} />
        {/* Calms the art so every label and chip reads on it. */}
        <LinearGradient colors={['rgba(165,27,34,0.35)', 'rgba(165,27,34,0.82)', SHEET_RED]} locations={[0, 0.35, 0.8]} style={StyleSheet.absoluteFill} />

        {/* With the keyboard up there is less room than the sheet needs: it scrolls rather than
            pushing its header off the top of the screen. */}
        <ScrollView
          style={{ maxHeight: winH - kb - px(44) }}
          contentContainerStyle={{ paddingHorizontal: px(20), paddingTop: px(16), paddingBottom: px(26) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header: help / back, title, close. */}
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: px(16) }]}>
            {roundBtn(() => setRules((v) => !v), rules ? <ChevronLeft size={px(22)} color={colors.white} /> : <HelpCircle size={px(20)} color={colors.white} />)}
            <Text style={[styles.semiBold, { fontSize: px(19) }]}>{rules ? 'Rules' : 'Red envelopes'}</Text>
            {roundBtn(dismiss, <X size={px(20)} color={colors.white} />)}
          </View>

          {rules ? (
            <View style={{ minHeight: px(380) }}>
              {RULES.map((line, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: px(14) }}>
                  <View style={[styles.center, { width: px(24), height: px(24), borderRadius: px(12), backgroundColor: GOLD, marginRight: px(12) }]}>
                    <Text style={[styles.semiBold, { fontSize: px(12), color: SHEET_RED }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.regular, { flex: 1, fontSize: px(14), lineHeight: px(21) }]}>{line}</Text>
                </View>
              ))}
              <Pressable onPress={() => setRules(false)} style={[styles.center, { marginTop: 'auto', height: px(50), borderRadius: px(25), backgroundColor: colors.white }]}>
                <Text style={[styles.semiBold, { fontSize: px(17), color: SEND_RED }]}>Got it</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Balance — dropped while typing to keep the sheet short. */}
              {kb > 0 ? null : <View style={[styles.row, { alignSelf: 'center', marginBottom: px(18), paddingHorizontal: px(14), height: px(30), borderRadius: px(15), backgroundColor: 'rgba(0,0,0,0.25)' }]}>
                <Text style={[styles.regular, { fontSize: px(13), opacity: 0.85 }]}>Balance</Text>
                <Image source={art.coin} style={{ width: px(16), height: px(16), marginLeft: px(8), marginRight: px(4) }} />
                <Text style={[styles.semiBold, { fontSize: px(13), color: '#FFE58A' }]}>{balance === null ? '…' : fmt(balance)}</Text>
              </View>}

              {label('Total coins', 'Split at random')}
              {grid(GOLD_PRESETS, gold, setGold, true)}

              <View style={{ height: px(8) }} />
              {label('Number of envelopes', `Up to ${MAX_ENVELOPES}`)}
              {grid(COUNT_PRESETS, count, setCount, false)}

              {/* What is about to happen, in one line. */}
              <View style={[styles.center, { marginTop: px(8), paddingVertical: px(10), borderRadius: px(14), backgroundColor: 'rgba(0,0,0,0.22)' }]}>
                <Text style={[styles.medium, { fontSize: px(14) }]}>
                  {g > 0 && n > 0 && n <= g ? `${n} envelope${n === 1 ? '' : 's'} · about ${fmt(Math.floor(g / n))} coins each` : '—'}
                </Text>
                <Text style={[styles.regular, { marginTop: px(2), fontSize: px(11), opacity: 0.75 }]}>{`Unopened coins return to you after ${REFUND_MINUTES} min`}</Text>
              </View>

              <Text style={[styles.medium, { height: px(30), lineHeight: px(30), textAlign: 'center', fontSize: px(13), color: '#FFE58A' }]}>
                {tried && problem ? problem : ''}
              </Text>

              <Pressable
                onPress={send}
                disabled={busy}
                style={[styles.center, styles.row, { height: px(52), borderRadius: px(26), backgroundColor: colors.white, opacity: problem && tried ? 0.6 : 1 }]}
              >
                {busy ? (
                  <ActivityIndicator color={SEND_RED} />
                ) : (
                  <>
                    <Text style={[styles.semiBold, { fontSize: px(17), color: SEND_RED }]}>Send</Text>
                    {g > 0 ? (
                      <>
                        <Image source={art.coin} style={{ width: px(18), height: px(18), marginLeft: px(8), marginRight: px(4) }} />
                        <Text style={[styles.semiBold, { fontSize: px(17), color: SEND_RED }]}>{fmt(g)}</Text>
                      </>
                    ) : null}
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </Animated.View>
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

  // The room re-renders all the time and hands a new onDone each time; holding it in a ref keeps
  // `close` stable, so the auto-close timer below is not restarted on every render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(card, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => onDoneRef.current());
  }, [card]);

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

            <Pressable onPress={open} style={[styles.center, { marginTop: px(26), height: px(34), paddingHorizontal: px(22), borderRadius: px(17), backgroundColor: GOLD }]}>
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
              {/* Calms the burst's bright middle so the amount reads. */}
              <LinearGradient colors={['rgba(165,27,34,0)', 'rgba(165,27,34,0.85)', RED]} locations={[0.22, 0.5, 0.75]} style={StyleSheet.absoluteFill} />
              <View style={{ alignItems: 'center', paddingTop: px(26), paddingBottom: px(24), paddingHorizontal: px(16) }}>
                <Image source={avatarOf(envelope.sender)} resizeMode="cover" style={{ width: px(64), height: px(64), borderRadius: px(32), borderWidth: px(2), borderColor: GOLD }} />
                <Text numberOfLines={1} style={[styles.medium, { marginTop: px(8), fontSize: px(14), opacity: 0.9 }]}>{`${name}’s red envelope`}</Text>
                {phase === 'opened' ? (
                  <>
                    <View style={[styles.row, { marginTop: px(14) }]}>
                      <Image source={art.coin} resizeMode="cover" style={{ width: px(36), height: px(36), marginRight: px(8) }} />
                      <Text style={[styles.semiBold, { fontSize: px(42), lineHeight: px(52), color: '#FFE58A', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }]}>{`+${amount}`}</Text>
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
