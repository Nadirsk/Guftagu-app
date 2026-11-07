import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { SvgaPlayer } from '../../components/SvgaPlayer';
import { UserAvatar } from '../../components/UserAvatar';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf } from './sheets';
import type { Cosmetic, RoomUser } from './useRoom';

/**
 * What a user wears from the Item Bag, drawn the way Mazag draws it in a room.
 *   MicWave      a seat's voice ring while its owner talks (a `.svga`, or a still ring that spins)
 *   NineSlice    a chat bubble: the ornate corners keep their size, the middle stretches to the words
 */

const isSvga = (c: Cosmetic) => !!c.animation_url && (c.animation_type === 'svga' || c.animation_url.toLowerCase().includes('.svga'));

/** Sits centred on a seat ring `size` wide, a quarter of the ring larger on every side. */
export function MicWave({ x, y, size, item }: { x: number; y: number; size: number; item: Cosmetic }) {
  const { px } = useDesignScale();
  const t = useRef(new Animated.Value(0)).current;
  const svga = isSvga(item);
  useEffect(() => {
    if (svga) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [svga, t]);

  const box = px(size * 1.3);
  const left = px(x) - (box - px(size)) / 2;
  const top = px(y) - (box - px(size)) / 2;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: box, height: box }}>
      {svga ? (
        <SvgaPlayer url={item.animation_url as string} style={{ width: box, height: box }} />
      ) : item.image_url ? (
        <Animated.Image
          source={{ uri: item.image_url }}
          resizeMode="contain"
          style={{
            width: box,
            height: box,
            transform: [
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              // A slow breath, so the ring pulses as well as turns.
              { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.94, 1.04, 0.94] }) },
            ],
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * A 9-slice picture behind `children`. Android's Image has no capInsets, so the nine pieces
 * are cut from the one bitmap: each is a clipped view holding the whole image, offset and
 * scaled so only its own cell shows. `source` is square art `src` px wide with `inset` px
 * of corner on each side; the corners are drawn `corner` design pixels wide.
 */
export function NineSlice({ uri, src = 100, inset = 30, corner = 14, children, minHeight = 0 }: { uri: string; src?: number; inset?: number; corner?: number; children: React.ReactNode; minHeight?: number }) {
  const { px } = useDesignScale();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s.w === width && s.h === height ? s : { w: width, h: height }));
  };

  const c = px(corner);
  const { w, h } = size;
  const mid = src - 2 * inset;
  // Source columns / rows and where they land.
  const cols = [
    { s: 0, sw: inset, d: 0, dw: c },
    { s: inset, sw: mid, d: c, dw: Math.max(0, w - 2 * c) },
    { s: src - inset, sw: inset, d: w - c, dw: c },
  ];
  const rows = [
    { s: 0, sw: inset, d: 0, dw: c },
    { s: inset, sw: mid, d: c, dw: Math.max(0, h - 2 * c) },
    { s: src - inset, sw: inset, d: h - c, dw: c },
  ];

  return (
    <View onLayout={onLayout} style={{ minHeight }}>
      {w > 0 && h > 0
        ? rows.flatMap((r, ri) =>
            cols.map((col, ci) => {
              const kx = col.dw / col.sw;
              const ky = r.dw / r.sw;
              return (
                <View key={`${ri}${ci}`} pointerEvents="none" style={{ position: 'absolute', left: col.d, top: r.d, width: col.dw, height: r.dw, overflow: 'hidden' }}>
                  <Image
                    source={{ uri }}
                    resizeMode="stretch"
                    style={{ position: 'absolute', left: -col.s * kx, top: -r.s * ky, width: src * kx, height: src * ky }}
                  />
                </View>
              );
            }),
          )
        : null}
      {children}
    </View>
  );
}

/**
 * "View profile card", Mazag's way: a sheet rising from the bottom, the worn Profile Card laid
 * over its top as a border (wings above, rails down both sides, a round hole for the face), the
 * name, ID and levels under it, and Follow / Gift at the foot. The card art is 750 x 600 with the
 * hole centred at (375, 105); it is drawn as wide as the screen and the sheet starts below the wings.
 */
export function ProfileCardSheet({ user, mine, onClose, onGift, onFollow, onChat }: { user: RoomUser; mine: boolean; onClose: () => void; onGift: () => void; onFollow: () => void; onChat: () => void }) {
  const { px } = useDesignScale();
  const card = user.cosmetics?.profile_card;
  const W = 402;
  const artH = (W * 600) / 750;
  const holeY = (105 / 600) * artH;
  const sheetTop = card ? 34 : 60;
  const faceY = card ? holeY : 60;
  const [animated, setAnimated] = useState(false);
  const white = colors.white;
  const round = (label: string, color: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: px(86) }}>
      <View style={{ width: px(48), height: px(48), borderRadius: px(24), backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: px(18), color: white }}>{label === 'Gift' ? '🎁' : label === 'Chat' ? '💬' : '♥'}</Text>
      </View>
      <Text style={{ marginTop: px(6), fontFamily: typography.fontFamily.regular, fontSize: px(12), color: 'rgba(255,255,255,0.85)' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(sheetTop + 330) }}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: px(sheetTop), bottom: 0, backgroundColor: '#1A1424', borderTopLeftRadius: px(20), borderTopRightRadius: px(20) }} />
        {card?.image_url && !animated ? <Image source={{ uri: card.image_url }} resizeMode="contain" style={{ position: 'absolute', left: 0, top: 0, width: px(W), height: px(artH) }} /> : null}
        {card && isSvga(card) ? <SvgaPlayer url={card.animation_url as string} style={{ position: 'absolute', left: 0, top: 0, width: px(W), height: px(artH) }} onFirstFrame={() => setAnimated(true)} /> : null}
        <View style={{ position: 'absolute', left: 0, right: 0, top: px(faceY - 40), alignItems: 'center' }}>
          <UserAvatar source={avatarOf(user)} frame={user.frame} size={px(80)} />
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, top: px(faceY + 62), alignItems: 'center' }}>
          <Text numberOfLines={1} style={{ maxWidth: px(300), fontFamily: typography.fontFamily.medium, fontSize: px(20), color: white }}>{user.display_name ?? 'Guftagu user'}</Text>
          {user.guftagu_id ? <Text style={{ marginTop: px(4), fontFamily: typography.fontFamily.regular, fontSize: px(13), color: 'rgba(255,255,255,0.7)' }}>ID:{user.guftagu_id}</Text> : null}
          <Text style={{ marginTop: px(8), fontFamily: typography.fontFamily.regular, fontSize: px(12), color: '#F5C96A' }}>Wealth Lv.{user.wealth_level ?? 0}  ·  Charm Lv.{user.charm_level ?? 0}</Text>
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: px(26), flexDirection: 'row', justifyContent: 'center', gap: px(20) }}>
          {mine ? null : round('Follow', '#E6577A', onFollow)}
          {mine ? null : round('Chat', '#2FA4B8', onChat)}
          {round('Gift', '#7B5CF0', onGift)}
        </View>
      </View>
    </View>
  );
}
