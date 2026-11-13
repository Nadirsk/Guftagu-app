import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf } from './sheets';
import type { GiftHit, RoomUser } from './useRoom';

/** A gift worth at least this many coins in one send also gets the floating banner. */
const BANNER_COINS = 1000;

// Mazag's timeline: ~1.5 s from the top of the room to its middle, ~1 s there, ~1 s to the seat, ~1.5 s on it.
const FLY_MS = 5000;
const PILL_MS = 4200;

type Point = { x: number; y: number };

type Flight = { id: string; image: string | null; targets: Point[] };
type Pill = {
  key: string;
  sender: RoomUser | null;
  to: string;
  image: string | null;
  code: string;
  qty: number;
  bump: number;
  at: number;
};
type Banner = { id: string; text: string; image: string | null; skin: string | null };

const nameOf = (u: RoomUser | null) => u?.display_name ?? 'Someone';

/**
 * Everything a gift does on screen, driven by the room's `gift.sent` feed:
 *  - it grows in the middle of the room, then flies to the receiver's seat (ALL: one copy per seat);
 *  - a "X send Y [gift] xN" pill on the left, one lane per sender, its number popping on every repeat;
 *  - a floating banner at the top for a big send.
 */
export function GiftFx({
  feed,
  seatPoint,
  pillTop,
  centerY,
}: {
  feed: GiftHit[];
  /** The room's vertical middle in design pixels, where the gift is shown big. */
  centerY: number;
  /** Where a user's seat (or avatar) is, in design pixels; null when they are not in the room. */
  seatPoint: (uuid: string) => Point | null;
  pillTop: number;
}) {
  const { px } = useDesignScale();
  // The id of the last hit already drawn: the feed is capped, so its length stops growing.
  const seen = useRef<string | null>(feed.length ? feed[feed.length - 1].id : null);
  const queue = useRef<GiftHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstAt = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pills, setPills] = useState<Pill[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  const flush = () => {
    timer.current = null;
    const hits = queue.current;
    queue.current = [];
    // A batch (ALL) is many events for one send: draw it once, with a copy per seat.
    const groups = new Map<string, GiftHit[]>();
    for (const h of hits) groups.set(h.batch ?? h.id, [...(groups.get(h.batch ?? h.id) ?? []), h]);

    for (const [group, list] of groups) {
      const first = list[0];
      const id = `${group}-${Date.now()}`;
      const image = first.gift.thumbnail_url;
      const targets = list.flatMap((h) => {
        const p = h.receiver ? seatPoint(h.receiver.uuid) : null;
        return p ? [p] : [];
      });
      setFlights((f) => [...f, { id, image, targets: targets.length ? targets : [{ x: 201, y: 120 }] }]);
      setTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), FLY_MS + 1500 + 400);

      const to = list.length > 1 ? 'All on mic' : nameOf(first.receiver);
      const key = `${first.sender?.uuid}|${list.length > 1 ? 'all' : first.receiver?.uuid}|${first.gift.code}`;
      const now = Date.now();
      setPills((p) => {
        const prev = p.find((x) => x.key === key && now - x.at < PILL_MS);
        const rest = p.filter((x) => x !== prev && now - x.at < PILL_MS);
        return [
          ...rest,
          { key, sender: first.sender, to, image, code: first.gift.code, qty: (prev?.qty ?? 0) + first.quantity, bump: (prev?.bump ?? 0) + 1, at: now },
        ].slice(-3);
      });
      setTimeout(() => setPills((p) => p.filter((x) => Date.now() - x.at < PILL_MS)), PILL_MS + 100);

      const coins = list.reduce((sum, h) => sum + (h.coin_value ?? 0), 0);
      if (coins >= BANNER_COINS) {
        const text = `${nameOf(first.sender)} sent ${first.gift.code} to ${to}`;
        setBanners((b) => [...b, { id, text, image, skin: first.sender?.cosmetics?.floating_screen?.image_url ?? null }]);
        setTimeout(() => setBanners((b) => b.filter((x) => x.id !== id)), 4200);
      }
    }
  };

  useEffect(() => {
    const lastIndex = seen.current === null ? -1 : feed.findIndex((h) => h.id === seen.current);
    const fresh = feed.slice(lastIndex + 1);
    if (fresh.length === 0) return;
    queue.current.push(...fresh);
    seen.current = feed[feed.length - 1].id;
    // An ALL send arrives as one frame per receiver, a beat apart: wait for the stream to go quiet
    // (but never longer than 1.4 s) so it is drawn once. The sender's own send is already complete
    // and is drawn the moment they tap.
    if (!firstAt.current) firstAt.current = Date.now();
    if (timer.current) clearTimeout(timer.current);
    const mine = queue.current.some((h) => h.local);
    const wait = mine ? 0 : Math.max(0, Math.min(380, 1400 - (Date.now() - firstAt.current)));
    timer.current = setTimeout(() => {
      firstAt.current = 0;
      flush();
    }, wait);
    // `flush` only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  return (
    <>
      {flights.map((f) => (
        <Flight key={f.id} flight={f} centerY={centerY} />
      ))}
      {pills.map((p, i) => (
        <PillView key={p.key} pill={p} top={pillTop - (pills.length - 1 - i) * 46} />
      ))}
      {banners.slice(0, 1).map((b) => (
        <BannerView key={b.id} banner={b} />
      ))}
    </>
  );
}

const SPARKS = [
  { a: -50, r: 62, s: 12 },
  { a: 20, r: 70, s: 16 },
  { a: 95, r: 60, s: 11 },
  { a: 160, r: 68, s: 14 },
  { a: 230, r: 64, s: 12 },
];

function Flight({ flight, centerY }: { flight: Flight; centerY: number }) {
  const { px } = useDesignScale();
  const n = flight.targets.length;
  // Mazag launches one gift per receiver from the top, about a fifth of a second apart (the whole
  // stream is held to ~1.5 s however many seats it feeds), and each goes to its own seat from the middle.
  const gap = n > 1 ? Math.min(180, 1500 / (n - 1)) : 0;
  const total = FLY_MS + gap * (n - 1);
  const span = FLY_MS / total;
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: total, easing: Easing.linear, useNativeDriver: true }).start();
  }, [t, total]);
  const small = 42;
  const startY = 112;
  // `at(o, ...p)` -> an input range for a gift launched at offset `o` whose own timeline is `p` (0..1 of FLY_MS).
  const at = (o: number, p: number[]) => [0, ...p.map((x) => o + x * span), 1].map((x, i, all) => Math.min(1, Math.max(all[i - 1] ?? 0, x)));
  const out = (first: number, vals: number[], last: number) => [first, ...vals, last];
  const ease = (input: number[], output: number[]) => t.interpolate({ inputRange: input, outputRange: output });
  // 0–.24 top → middle, growing · .24–.42 held · .42–.62 to the seat · .62–1 rests there.
  const P = [0.02, 0.24, 0.27, 0.42, 0.62, 0.96];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* The glow behind the first gift to reach the middle. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: px(201 - 100),
          top: px(centerY - 100),
          width: px(200),
          height: px(200),
          borderRadius: px(100),
          backgroundColor: 'rgba(255,206,110,0.30)',
          opacity: ease([0, 0.18 * span, 0.26 * span, 0.42 * span, 0.5 * span, 1], [0, 0, 1, 1, 0, 0]),
          transform: [{ scale: ease([0, 0.18 * span, 0.3 * span, 0.42 * span, 0.5 * span, 1], [0.4, 0.5, 1.1, 1.0, 1.3, 1.3]) }],
        }}
      />
      {SPARKS.map((sp, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: px(201 + Math.cos((sp.a * Math.PI) / 180) * sp.r - sp.s / 2),
            top: px(centerY + Math.sin((sp.a * Math.PI) / 180) * sp.r - sp.s / 2),
            fontSize: px(sp.s),
            color: '#FFE9A8',
            opacity: ease([0, (0.22 + i * 0.012) * span, (0.28 + i * 0.012) * span, 0.42 * span, 0.48 * span, 1], [0, 0, 1, 1, 0, 0]),
            transform: [{ scale: ease([0, 0.24 * span, (0.32 + i * 0.015) * span, 0.42 * span, 1], [0.3, 0.3, 1.2, 0.6, 0.6]) }],
          }}
        >
          ✦
        </Animated.Text>
      ))}
      {flight.targets.map((tg, i) => {
        const dx = tg.x - 201;
        const dy = tg.y - centerY;
        const o = (i * gap) / total;
        const input = at(o, P);
        // Mazag's six do not land on one spot: each rests a little left/right and a different size.
        const jx = n > 1 ? ((i % 3) - 1) * 38 + (i % 2 ? 10 : -10) : 0;
        const big = n > 1 ? [118, 96, 128, 104, 122, 100][i % 6] : 130;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: px(201 - big / 2 + jx),
              top: px(centerY - big / 2),
              width: px(big),
              height: px(big),
              opacity: ease(at(o, [0.02, 0.04, 0.96]), [0, 0, 1, 1, 0]),
              transform: [
                { translateX: ease(input, out(0, [0, 0, 0, 0, px(dx - jx), px(dx - jx)], px(dx - jx))) },
                { translateY: ease(input, out(px(startY - centerY), [px(startY - centerY), 0, 0, 0, px(dy), px(dy)], px(dy))) },
                { scale: ease(input, out(0.12, [0.12, 1.1, 1, 1.04, small / big, small / big], small / big)) },
              ],
            }}
          >
            {flight.image ? <Image source={{ uri: flight.image }} resizeMode="contain" style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: px(90), textAlign: 'center' }}>🎁</Text>}
          </Animated.View>
        );
      })}
    </View>
  );
}

function PillView({ pill, top }: { pill: Pill; top: number }) {
  const { px } = useDesignScale();
  const slide = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);
  useEffect(() => {
    pop.setValue(1.6);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [pill.bump, pop]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: px(10),
        top: px(top),
        opacity: slide,
        transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [px(-120), 0] }) }],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', height: px(40), maxWidth: px(290), paddingLeft: px(4), paddingRight: px(12), borderRadius: px(20), backgroundColor: 'rgba(40,22,8,0.78)', borderWidth: 1, borderColor: 'rgba(255,196,90,0.55)' }}>
        <Image source={avatarSrc(pill.sender)} style={{ width: px(32), height: px(32), borderRadius: px(16) }} />
        <View style={{ marginLeft: px(6), maxWidth: px(120) }}>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.medium, fontSize: px(11), color: '#FFE9B0' }}>{nameOf(pill.sender)}</Text>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontFamily.regular, fontSize: px(10), color: colors.white }}>send {pill.to}</Text>
        </View>
        {pill.image ? <Image source={{ uri: pill.image }} resizeMode="contain" style={{ width: px(30), height: px(30), marginLeft: px(6) }} /> : null}
        <Animated.Text style={{ marginLeft: px(4), fontFamily: typography.fontFamily.medium, fontSize: px(20), fontStyle: 'italic', color: '#FFC83A', transform: [{ scale: pop }] }}>x{pill.qty}</Animated.Text>
      </View>
    </Animated.View>
  );
}

function BannerView({ banner }: { banner: Banner }) {
  const { px } = useDesignScale();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(t, { toValue: 2, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: px(8),
        right: px(8),
        top: px(112),
        opacity: t.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1, 2], outputRange: [px(-60), 0, px(-60)] }) }],
      }}
    >
      {banner.skin ? (
        // The sender's worn Floating Screen is the banner's own art (a wide 5:1 strip).
        <View style={{ height: px(77), justifyContent: 'center' }}>
          <Image source={{ uri: banner.skin }} resizeMode="stretch" style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: px(74), paddingRight: px(64) }}>
            {banner.image ? <Image source={{ uri: banner.image }} resizeMode="contain" style={{ width: px(28), height: px(28) }} /> : null}
            <Text numberOfLines={2} style={{ flex: 1, marginLeft: px(6), fontFamily: typography.fontFamily.medium, fontSize: px(11), lineHeight: px(14), color: colors.white }}>{banner.text}</Text>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: px(44), paddingHorizontal: px(12), borderRadius: px(22), backgroundColor: 'rgba(150,30,50,0.92)', borderWidth: 1.5, borderColor: '#FFC83A' }}>
          {banner.image ? <Image source={{ uri: banner.image }} resizeMode="contain" style={{ width: px(32), height: px(32) }} /> : null}
          <Text numberOfLines={1} style={{ flex: 1, marginLeft: px(8), fontFamily: typography.fontFamily.medium, fontSize: px(13), color: colors.white }}>{banner.text}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const avatarSrc = (u: RoomUser | null) => avatarOf(u);
