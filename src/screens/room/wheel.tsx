import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Alert } from '../../components/AppAlert';
import { Cropped, Img, Label, useBox } from '../../components/figmaLayers';
import { peek, refresh } from '../../lib/swrCache';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { WHEEL } from './geometry';

/**
 * Lucky Wheel — section 575:3421. The Lucky Wheel button opens the sheet (575:3598);
 * Record opens Roulette Records (575:3818).
 *
 * Both wheels and their eight slots come from the server (GET /lucky-wheel), set in the
 * admin panel. A spin is paid and drawn on the server; the wheel here only turns to where
 * the server says it landed. The bitmap's own printed slots are covered by a drawn disk.
 */

const art = {
  stage: require('../../assets/room/wheel/stage.jpg'),
  tab: require('../../assets/room/wheel/tab.png'),
  tag: require('../../assets/room/wheel/record-tag.png'),
  pedestal: require('../../assets/room/wheel/pedestal.png'),
  wheel: require('../../assets/room/wheel/wheel.png'),
  coins: require('../../assets/room/wheel/coins.png'),
  spin: require('../../assets/room/wheel/spin-button.png'),
  recharge: require('../../assets/room/wheel/recharge.png'),
  panel: require('../../assets/room/wheel/records-panel.png'),
  logo: require('../../assets/room/wheel/logo.png'),
  close: require('../../assets/room/wheel/close.png'),
  coin: require('../../assets/room/envelope/coin.png'),
  diamond: require('../../assets/profile/diamond.png'),
};

/** Ellipse 75 (575:3827), the close button's ring. */
const closeRing = `<svg preserveAspectRatio="none" overflow="visible" style="display: block;" width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
<path id="Ellipse 75" d="M50.5 26C50.5 39.531 39.531 50.5 26 50.5C12.469 50.5 1.5 39.531 1.5 26C1.5 12.469 12.469 1.5 26 1.5C39.531 1.5 50.5 12.469 50.5 26Z" stroke-width="3" stroke="white"/>
</svg>`;

type Mode = (typeof WHEEL.tabs)[number]['key'];

type Item = { id: number; type: string; name: string; image_url: string | null } | null;
type Prize = { position: number; label: string; reward_type: string; reward_value: number; icon_url?: string | null; item: Item; duration_days?: number | null };
type Wheel = { mode: Mode; name: string; is_active: boolean; spin_cost: number; multi_count: number; multi_cost: number; prizes: Prize[] };
type WheelData = { coin_balance: number; wheels: Wheel[] };
type SpinResult = { batch: string; coin_balance: number; results: (Prize & { id: number })[] };
type SpinRecord = Prize & { id: number; mode: Mode; cost: number; at: string | null };

const SLOTS = 8;
const SLICE = 360 / SLOTS;

/** Where the wheel bitmap's disc sits inside wheel.png (1084×1626): centre, slot ring, GO hub, pointer tip. */
const BITMAP = { w: 1084, cx: 540, cy: 770, disk: 420, hub: 132, tip: 215 };

const PALETTE: Record<Mode, { a: string; b: string; text: string }> = {
  classic: { a: '#4A5ED5', b: '#5D74E8', text: '#FFFFFF' },
  glory: { a: '#6E2FC4', b: '#8A45DE', text: '#FFE58A' },
};

const fmt = (n: number) => n.toLocaleString('en-US');

function prizeIcon(p: Prize): ImageSourcePropType {
  if (p.icon_url) return { uri: p.icon_url };
  if (p.item?.image_url) return { uri: p.item.image_url };
  return p.reward_type === 'diamonds' ? art.diamond : art.coin;
}

/** A point `r` out from the centre at `deg` clockwise from straight up. */
const polar = (c: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(c + r * Math.sin(a)).toFixed(2)} ${(c - r * Math.cos(a)).toFixed(2)}`;
};
const wedge = (c: number, r: number, from: number, to: number) => `M ${c} ${c} L ${polar(c, r, from)} A ${r} ${r} 0 0 1 ${polar(c, r, to)} Z`;

function diskXml(r: number, mode: Mode) {
  const p = PALETTE[mode];
  const slices = Array.from({ length: SLOTS }, (_, i) => `<path d="${wedge(r, r, i * SLICE - SLICE / 2, i * SLICE + SLICE / 2)}" fill="${i % 2 ? p.b : p.a}"/>`).join('');
  const lines = Array.from({ length: SLOTS }, (_, i) => `<path d="M ${r} ${r} L ${polar(r, r, i * SLICE - SLICE / 2)}" stroke="rgba(255,255,255,0.28)" stroke-width="1"/>`).join('');
  return `<svg width="${2 * r}" height="${2 * r}" viewBox="0 0 ${2 * r} ${2 * r}" xmlns="http://www.w3.org/2000/svg">${slices}${lines}<circle cx="${r}" cy="${r}" r="${r - 0.5}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1"/></svg>`;
}

/** The slot under the pointer, outlined — Figma's highlighted top slot. */
function highlightXml(r: number) {
  return `<svg width="${2 * r}" height="${2 * r}" viewBox="0 0 ${2 * r} ${2 * r}" xmlns="http://www.w3.org/2000/svg"><path d="${wedge(r, r - 1, -SLICE / 2, SLICE / 2)}" fill="rgba(140,235,255,0.16)" stroke="#8CEBFF" stroke-width="2"/></svg>`;
}

function pointerXml(w: number, h: number) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7D44A"/><stop offset="0.5" stop-color="#FFF2A8"/><stop offset="1" stop-color="#D99A12"/></linearGradient></defs><path d="M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z" fill="url(#g)" stroke="#B9780A" stroke-width="1"/></svg>`;
}

export function LuckyWheelSheet({ roomUuid, onClose, onRecharge }: { roomUuid?: string; onClose: () => void; onRecharge: () => void }) {
  const { px } = useDesignScale();
  const abs = useBox();
  const { token } = useAuth();
  const [mode, setMode] = useState<Mode>('classic');
  const [records, setRecords] = useState(false);
  const [data, setData] = useState<WheelData | null>(() => peek<WheelData>('/lucky-wheel', token));
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<SpinResult['results'] | null>(null);
  useEffect(() => refresh<WheelData>('/lucky-wheel', token, setData), [token]);

  const W = WHEEL;
  const wheel = data?.wheels.find((w) => w.mode === mode) ?? null;
  const title = wheel?.name ?? W.tabs.find((t) => t.key === mode)?.label ?? 'Classic';

  // Where the drawn disk goes: over the bitmap's own slots, same centre and radius.
  const g = useMemo(() => {
    const b = W.wheel.box;
    const c = W.wheel.crop;
    const left = b.x + (b.w * c.l) / 100;
    const top = b.y + (b.h * c.t) / 100;
    const imgW = (b.w * c.w) / 100;
    const imgH = (b.h * c.h) / 100;
    const s = imgW / BITMAP.w;
    return { cx: left + BITMAP.cx * s, cy: top + BITMAP.cy * s, r: BITMAP.disk * s, hub: BITMAP.hub * s, tip: BITMAP.tip * s, imgW, imgH, s };
  }, [W]);

  const R = px(g.r);
  const disk = useMemo(() => diskXml(R, mode), [R, mode]);
  const rot = useRef(new Animated.Value(0)).current;
  const angle = useRef(0);
  const rotate = rot.interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] });

  // A multi-spin plays every spin in turn: each prize drops into the tray as the wheel stops on
  // it, and the full haul is shown together at the end. Skip jumps straight to that.
  const [tray, setTray] = useState<Prize[] | null>(null);
  const [round, setRound] = useState<{ at: number; of: number } | null>(null);
  const skip = useRef(false);
  const pop = useRef(new Animated.Value(0)).current;
  const [popped, setPopped] = useState<Prize | null>(null);

  /** Degrees per ms the wheel is turning at once it has spun up. */
  const FREE_SPEED = 1.62;

  /** Runs one timing to `to` and records it; every turn runs to its end, so `angle` is always exact. */
  const run = (to: number, duration: number, easing: (t: number) => number) =>
    new Promise<boolean>((resolve) => {
      angle.current = to;
      Animated.timing(rot, { toValue: to, duration, easing, useNativeDriver: true }).start(({ finished }) => resolve(finished));
    });

  /**
   * Turns `rounds` full turns plus whatever puts `position` dead centre under the pointer.
   * With `speed` the slow-down starts at that speed (out-cubic starts at 3 × distance ÷ time),
   * so it carries straight on from the free spin without a jolt.
   */
  const turnTo = (position: number, rounds: number, timing: { duration: number } | { speed: number }) => {
    const land = -((position - 1) * SLICE);
    const now = ((angle.current % 360) + 360) % 360;
    const delta = (((land - now) % 360) + 360) % 360;
    const target = angle.current + 360 * rounds + delta;
    const duration = 'speed' in timing ? (3 * (target - angle.current)) / timing.speed : timing.duration;
    return run(target, duration, Easing.out(Easing.cubic));
  };

  const showPop = (p: Prize) => {
    setPopped(p);
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const spin = async (times: number) => {
    if (!wheel || spinning) return;
    if (!wheel.is_active) return Alert.alert('Lucky Wheel', 'This wheel is closed right now.');
    setSpinning(true);
    skip.current = false;
    // The wheel starts turning on the tap, already moving in the first frame: a 540° spin-up whose
    // speed runs from 0.5 to 1.5 × 540 ÷ 500 (= FREE_SPEED), then whole turns at that speed until
    // the server has drawn.
    const box: { res: SpinResult | null; failed: unknown } = { res: null, failed: null };
    api<SpinResult>(`/lucky-wheel/${mode}/spin`, { method: 'POST', body: { times, room: roomUuid }, token }).then(
      (r) => { box.res = r; },
      (e) => { box.failed = e ?? new Error('spin failed'); },
    );
    try {
      await run(angle.current + 540, 500, (t) => 0.5 * t * t + 0.5 * t);
      while (!box.res && !box.failed) await run(angle.current + 360, 360 / FREE_SPEED, Easing.linear);
      if (box.failed || !box.res) throw box.failed;
      const res = box.res;
      const all = res.results;
      // The balance pays up front and then counts each coin prize in as the wheel stops on it;
      // the server's own figure replaces it at the end.
      const winnings = all.reduce((sum, r) => sum + (r.reward_type === 'coins' ? r.reward_value : 0), 0);
      setData((d) => (d ? { ...d, coin_balance: res.coin_balance - winnings } : d));
      if (all.length > 1) setTray([]);
      for (let i = 0; i < all.length; i++) {
        if (skip.current) break;
        if (all.length > 1) setRound({ at: i + 1, of: all.length });
        // The first carries on from the free spin; the rest are quick so ten do not drag.
        const done = await turnTo(all[i].position, i === 0 ? (all.length === 1 ? 4 : 3) : 2, i === 0 ? { speed: FREE_SPEED } : { duration: 1300 });
        if (!done || skip.current) break;
        showPop(all[i]);
        if (all[i].reward_type === 'coins') {
          const won = all[i].reward_value;
          setData((d) => (d ? { ...d, coin_balance: d.coin_balance + won } : d));
        }
        if (all.length > 1) {
          setTray((t) => [...(t ?? []), all[i]]);
          await wait(550);
        }
      }
      if (skip.current) {
        // Skipped mid-turn: put the wheel back where that turn was heading, then on the last prize.
        rot.stopAnimation();
        rot.setValue(angle.current);
        await turnTo(all[all.length - 1].position, 0, { duration: 350 });
      }
      setData((d) => (d ? { ...d, coin_balance: res.coin_balance } : d));
      setTray(null);
      setRound(null);
      setWon(all);
      setSpinning(false);
    } catch (e) {
      // No spin happened: let the free spin coast down and stop on a slot.
      const nearest = Math.round(-angle.current / SLICE);
      await turnTo((((nearest % SLOTS) + SLOTS) % SLOTS) + 1, 1, { speed: FREE_SPEED });
      setTray(null);
      setRound(null);
      setSpinning(false);
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') {
        Alert.alert('Not enough coins', `${times} spin${times === 1 ? '' : 's'} on ${title} needs ${fmt(times === wheel.multi_count ? wheel.multi_cost : wheel.spin_cost * times)} coins.`, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Recharge', onPress: onRecharge },
        ]);
      } else {
        Alert.alert('Lucky Wheel', e instanceof ApiError ? e.displayMessage : 'Could not spin the wheel.');
      }
    }
  };

  const pal = PALETTE[mode];
  const iconSize = px(g.r * 0.24);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={spinning ? undefined : onClose} style={StyleSheet.absoluteFill} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: px(W.height),
          overflow: 'hidden',
          borderTopLeftRadius: px(W.radius),
          borderTopRightRadius: px(W.radius),
          backgroundColor: '#000',
        }}
      >
        <Img source={art.stage} box={{ x: W.stage.x, y: W.stage.y, w: W.stage.width, h: W.stage.height }} resizeMode="cover" />
        <Label cx={W.title.centerX} y={W.title.y} size={W.title.size} lineHeight={W.title.size * 1.5} weight="medium" width={200}>
          {round ? `Spin ${round.at}/${round.of}` : title}
        </Label>

        {tray ? (
          // The multi-spin's tray takes the tabs' place: one cell per spin, filled as each one stops.
          <View style={[styles.row, { position: 'absolute', left: 0, right: 0, top: px(W.tab.y - 4), justifyContent: 'center' }]}>
            {Array.from({ length: round?.of ?? 10 }, (_, i) => {
              const p = tray[i];
              return (
                <View
                  key={i}
                  style={[styles.center, { width: px(35), height: px(44), marginHorizontal: px(2), borderRadius: px(7), borderWidth: 1, borderColor: p ? '#FFDE07' : 'rgba(255,255,255,0.25)', backgroundColor: p ? 'rgba(255,222,7,0.18)' : 'rgba(0,0,0,0.35)' }]}
                >
                  {p ? (
                    <>
                      <Image source={prizeIcon(p)} resizeMode="contain" style={{ width: px(20), height: px(20) }} />
                      <Text numberOfLines={1} style={[styles.semiBold, { fontSize: px(8), color: colors.white, maxWidth: px(33) }]}>{p.label}</Text>
                    </>
                  ) : (
                    <Text style={[styles.medium, { fontSize: px(11), color: 'rgba(255,255,255,0.45)' }]}>{i + 1}</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          W.tabs.map((t) => (
            <Pressable key={t.key} disabled={spinning} onPress={() => setMode(t.key)} style={[abs({ x: t.x, y: W.tab.y, w: 114, h: W.tab.height }), { opacity: mode === t.key ? 1 : 0.55 }]}>
              <Img source={art.tab} box={{ x: 0, y: 0, w: W.tab.width, h: W.tab.height }} resizeMode="cover" />
              <Label cx={57} y={W.tab.labelY - W.tab.y} size={W.tab.size} lineHeight={W.tab.size * 1.5} weight="medium" width={100}>
                {t.label}
              </Label>
            </Pressable>
          ))
        )}

        {/* Balance, opposite Record. */}
        <View style={[styles.row, { position: 'absolute', left: px(12), top: px(W.record.box.y + 6), height: px(26), paddingHorizontal: px(10), borderRadius: px(13), backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <Image source={art.coin} style={{ width: px(16), height: px(16), marginRight: px(5) }} />
          <Text style={[styles.semiBold, { fontSize: px(12), color: '#FFE58A' }]}>{data ? fmt(data.coin_balance) : '…'}</Text>
        </View>

        <Pressable onPress={() => setRecords(true)} style={abs(W.record.box)}>
          <Cropped source={art.tag} box={{ ...W.record.box, x: 0, y: 0 }} crop={W.record.crop} />
          <Label x={W.record.labelX - W.record.box.x} y={W.record.labelY - W.record.box.y} size={W.record.size} lineHeight={W.record.size * 1.5} weight="medium" width={60}>
            Record
          </Label>
        </Pressable>

        <Cropped source={art.pedestal} box={W.pedestal.box} crop={W.pedestal.crop} />
        <Cropped source={art.wheel} box={W.wheel.box} crop={W.wheel.crop} />

        {/* The slots, drawn over the bitmap's printed ones and turned by the spin. */}
        <Animated.View style={{ position: 'absolute', left: px(g.cx) - R, top: px(g.cy) - R, width: 2 * R, height: 2 * R, transform: [{ rotate }] }}>
          <SvgXml xml={disk} width={2 * R} height={2 * R} />
          {wheel?.prizes.map((p) => (
            <View key={p.position} pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', transform: [{ rotate: `${(p.position - 1) * SLICE}deg` }] }]}>
              <Text numberOfLines={1} style={[styles.semiBold, { marginTop: px(g.r * 0.1), width: px(g.r * 0.62), textAlign: 'center', fontSize: px(11), color: pal.text }]}>
                {p.label}
              </Text>
              <Image source={prizeIcon(p)} resizeMode="contain" style={{ marginTop: px(3), width: iconSize, height: iconSize }} />
            </View>
          ))}
        </Animated.View>
        {wheel ? null : (
          <View style={[styles.center, { position: 'absolute', left: px(g.cx) - R, top: px(g.cy) - R, width: 2 * R, height: 2 * R }]}>
            <ActivityIndicator color={colors.white} />
          </View>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', left: px(g.cx) - R, top: px(g.cy) - R }}>
          <SvgXml xml={highlightXml(R)} width={2 * R} height={2 * R} />
        </View>
        {/* Pointer, then the bitmap's own GO hub cut back out on top of the disk. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: px(g.cx - g.hub * 0.28), top: px(g.cy - g.tip) }}>
          <SvgXml xml={pointerXml(px(g.hub * 0.56), px(g.tip - g.hub + 6))} width={px(g.hub * 0.56)} height={px(g.tip - g.hub + 6)} />
        </View>
        <PressScale
          onPress={() => spin(1)}
          disabled={spinning}
          style={{ position: 'absolute', left: px(g.cx - g.hub), top: px(g.cy - g.hub), width: px(2 * g.hub), height: px(2 * g.hub) }}
          innerStyle={{ borderRadius: px(g.hub), overflow: 'hidden' }}
        >
          <Image
            source={art.wheel}
            resizeMode="stretch"
            style={{ position: 'absolute', left: -px(BITMAP.cx * g.s - g.hub), top: -px(BITMAP.cy * g.s - g.hub), width: px(g.imgW), height: px(g.imgH) }}
          />
        </PressScale>

        {/* What the spin just landed on, rising off the hub. */}
        {popped ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.row,
              {
                position: 'absolute',
                left: 0,
                right: 0,
                top: px(g.cy - g.hub - 40),
                justifyContent: 'center',
                opacity: pop.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [px(20), -px(26)] }) },
                  { scale: pop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.15, 1] }) },
                ],
              },
            ]}
          >
            <View style={[styles.row, { paddingHorizontal: px(12), height: px(32), borderRadius: px(16), backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 1, borderColor: '#FFDE07' }]}>
              <Image source={prizeIcon(popped)} resizeMode="contain" style={{ width: px(20), height: px(20), marginRight: px(6) }} />
              <Text style={[styles.semiBold, { fontSize: px(15), color: '#FFE58A' }]}>{popped.reward_type === 'coins' ? `+${fmt(popped.reward_value)}` : popped.label}</Text>
            </View>
          </Animated.View>
        ) : null}

        <Cropped source={art.coins} box={W.coins.box} crop={W.coins.crop} />

        {W.spins.map((s, i) => {
          const times = i === 0 ? 1 : wheel?.multi_count ?? s.times;
          const cost = !wheel ? s.coins : i === 0 ? wheel.spin_cost : wheel.multi_cost;
          return (
            <PressScale key={s.times} disabled={spinning} onPress={() => spin(times)} style={[abs(s.box), { opacity: spinning ? 0.6 : 1 }]}>
              {[0, 1, 2].map((k) => (
                <Cropped key={k} source={art.spin} box={{ ...s.box, x: 0, y: 0 }} crop={W.spinCrop} />
              ))}
              <Label cx={s.centerX - s.box.x} y={W.spinLabel.y - s.box.y} size={W.spinLabel.size} lineHeight={W.spinLabel.size * 1.5} weight="medium" width={120} lines={2}>
                {`${times} Time${times === 1 ? '' : 's'}\n(Coins : ${fmt(cost)})`}
              </Label>
            </PressScale>
          );
        })}

        <PressScale onPress={onRecharge} disabled={spinning} style={abs(W.recharge.box)}>
          <Cropped source={art.recharge} box={{ ...W.recharge.box, x: 0, y: 0 }} crop={W.recharge.crop} />
          {/* Futura Bold in Figma. */}
          <Label cx={W.recharge.box.w / 2} y={W.recharge.centerY - W.recharge.box.y - 12} size={W.recharge.size} lineHeight={24} weight="bold" width={160}>
            Recharge
          </Label>
        </PressScale>

        {round ? (
          <Pressable
            onPress={() => {
              skip.current = true;
              rot.stopAnimation();
            }}
            hitSlop={px(8)}
            style={[styles.center, { position: 'absolute', right: px(12), top: px(W.record.box.y + 46), height: px(28), paddingHorizontal: px(14), borderRadius: px(14), backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }]}
          >
            <Text style={[styles.semiBold, { fontSize: px(12), color: colors.white }]}>Skip ›</Text>
          </Pressable>
        ) : null}

        {won ? <ResultDialog results={won} onClose={() => setWon(null)} /> : null}
        {records ? <RecordsDialog mode={mode} onClose={() => setRecords(false)} /> : null}
      </View>
    </View>
  );
}

/**
 * A bitmap button that behaves like one: it sinks and dims under the finger and springs
 * back on release. `style` places it; the children are laid out inside the moving part.
 */
function PressScale({
  onPress,
  disabled,
  style,
  innerStyle,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number, bouncy: boolean) =>
    Animated.spring(press, { toValue: v, useNativeDriver: true, speed: bouncy ? 16 : 40, bounciness: bouncy ? 12 : 0 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(1, false)} onPressOut={() => to(0, true)} style={style}>
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            // Fading rather than a dark overlay: the button bitmaps have transparent corners.
            opacity: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }),
            transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }, { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }],
          },
          innerStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Frame 1908's panel, title tag and close ring, holding whatever goes in it. */
function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { px } = useDesignScale();
  const abs = useBox();
  const R = WHEEL.records;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: R.scrim }]} />
      <View pointerEvents="box-none" style={abs({ x: R.x, y: R.y, w: R.width, h: R.close.y + R.close.size })}>
        <Img source={art.panel} box={R.panel} resizeMode="cover" />
        <View style={{ position: 'absolute', left: 0, right: 0, top: px(28), height: px(R.close.y - 28 - 34) }}>{children}</View>
        <Cropped source={art.tag} box={R.title.box} crop={WHEEL.record.crop} />
        <Label cx={R.empty.centerX} y={R.title.labelY} size={R.title.size} lineHeight={R.title.size * 1.5} weight="medium" width={R.title.box.w}>
          {title}
        </Label>
        <Pressable onPress={onClose} hitSlop={px(6)} style={abs({ x: R.close.x, y: R.close.y, w: R.close.size, h: R.close.size })}>
          <SvgXml xml={closeRing} width={px(R.close.size)} height={px(R.close.size)} />
          <Image
            source={art.close}
            resizeMode="cover"
            style={{ position: 'absolute', left: px(R.close.icon.inset), top: px(R.close.icon.inset), width: px(R.close.icon.size), height: px(R.close.icon.size) }}
          />
        </Pressable>
      </View>
    </View>
  );
}

function rewardText(p: Prize) {
  if (p.reward_type === 'coins') return `${fmt(p.reward_value)} coins`;
  if (p.reward_type === 'diamonds') return `${fmt(p.reward_value)} diamonds`;
  return `${p.item?.name ?? p.label}${p.duration_days ? ` · ${p.duration_days} days` : ''}`;
}

/** What a tap won: the prizes, same ones counted together. */
function ResultDialog({ results, onClose }: { results: SpinResult['results']; onClose: () => void }) {
  const { px } = useDesignScale();
  const groups = useMemo(() => {
    const m = new Map<number, { prize: Prize; n: number }>();
    for (const r of results) {
      const g = m.get(r.position);
      if (g) g.n += 1;
      else m.set(r.position, { prize: r, n: 1 });
    }
    return [...m.values()].sort((a, b) => b.prize.reward_value * b.n - a.prize.reward_value * a.n);
  }, [results]);
  const coins = results.reduce((sum, r) => sum + (r.reward_type === 'coins' ? r.reward_value : 0), 0);

  return (
    <Panel title="Congratulations" onClose={onClose}>
      {coins > 0 ? (
        <View style={[styles.row, { alignSelf: 'center', marginBottom: px(12) }]}>
          <Image source={art.coin} style={{ width: px(30), height: px(30), marginRight: px(6) }} />
          <Text style={[styles.semiBold, { fontSize: px(30), color: '#FFE58A' }]}>{`+${fmt(coins)}`}</Text>
        </View>
      ) : null}
      <ScrollView style={{ flexGrow: 0, maxHeight: px(250) }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: px(10) }}>
        {groups.map(({ prize, n }) => (
          <View key={prize.position} style={[styles.center, { width: px(80), margin: px(5), paddingVertical: px(8), borderRadius: px(10), backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,222,7,0.35)' }]}>
            <Image source={prizeIcon(prize)} resizeMode="contain" style={{ width: px(36), height: px(36) }} />
            <Text numberOfLines={1} style={[styles.semiBold, { marginTop: px(4), fontSize: px(12), color: colors.white }]}>{prize.label}</Text>
            {n > 1 ? <Text style={[styles.medium, { fontSize: px(11), color: '#FFE58A' }]}>{`×${n}`}</Text> : null}
          </View>
        ))}
      </ScrollView>
      <Pressable onPress={onClose} style={[styles.center, { alignSelf: 'center', marginTop: px(10), height: px(36), paddingHorizontal: px(34), borderRadius: px(18), backgroundColor: '#FFDE07' }]}>
        <Text style={[styles.semiBold, { fontSize: px(14), color: '#7A1010' }]}>OK</Text>
      </Pressable>
    </Panel>
  );
}

const when = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Frame 1908 — Roulette Records: your own spins on this wheel, newest first. */
function RecordsDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const R = WHEEL.records;
  const [rows, setRows] = useState<SpinRecord[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let live = true;
    api<{ records: SpinRecord[]; next_before: number | null }>(`/lucky-wheel/records?mode=${mode}`, { token })
      .then((r) => { if (live) { setRows(r.records); setNext(r.next_before); } })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [mode, token]);

  const more = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api<{ records: SpinRecord[]; next_before: number | null }>(`/lucky-wheel/records?mode=${mode}&before=${next}`, { token });
      setRows((prev) => [...(prev ?? []), ...r.records]);
      setNext(r.next_before);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Panel title="Roulette Records" onClose={onClose}>
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: px(120) }} color={colors.white} />
      ) : rows.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: px(R.logo.y - 28) }}>
          {/* The logo's 50% is already in the export's alpha. */}
          <Image source={art.logo} resizeMode="cover" style={{ width: px(R.logo.size), height: px(R.logo.size) }} />
          <Text style={[styles.medium, { marginTop: px(20), fontSize: px(R.empty.size), color: colors.white, opacity: 0.5 }]}>No Data Yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: px(14), paddingBottom: px(8) }} onScrollEndDrag={more} onMomentumScrollEnd={more}>
          {rows.map((r) => (
            <View key={r.id} style={[styles.row, { paddingVertical: px(8), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' }]}>
              <Image source={prizeIcon(r)} resizeMode="contain" style={{ width: px(30), height: px(30), marginRight: px(10) }} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.semiBold, { fontSize: px(13), color: colors.white }]}>{rewardText(r)}</Text>
                <Text style={[styles.regular, { fontSize: px(10), color: colors.white, opacity: 0.55 }]}>{when(r.at)}</Text>
              </View>
              <Text style={[styles.regular, { fontSize: px(11), color: colors.white, opacity: 0.7 }]}>{`-${fmt(r.cost)}`}</Text>
            </View>
          ))}
          {loadingMore ? <ActivityIndicator style={{ marginTop: px(8) }} color={colors.white} /> : null}
        </ScrollView>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  regular: { fontFamily: typography.fontFamily.regular },
  medium: { fontFamily: typography.fontFamily.medium },
  semiBold: { fontFamily: typography.fontFamily.semiBold },
});
