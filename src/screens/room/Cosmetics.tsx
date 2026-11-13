import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { Flag, Gift, MessageCircle, UserPlus, UserRound } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';

import * as profileIcons from '../../assets/profile/icons';
import { SvgaPlayer } from '../../components/SvgaPlayer';
import { COUNTRY_OPTIONS, countryFlagEmoji } from '../../constants/countryOptions';
import { LevelBadge } from '../level/LevelBadge';
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
 * name with gender badge, flag + ID, the wealth/charm medals, and Follow / Chat / Gift / Report
 * at the foot. The card art is 750 x 600 with the
 * hole centred at (375, 105); it is drawn as wide as the screen and the sheet starts below the wings.
 */
/** The flag for a country stored by name ("Pakistan") or by ISO code ("PK"); null when unknown. */
function flagOf(country: string | null | undefined) {
  if (!country) return null;
  const c = country.trim();
  const hit = COUNTRY_OPTIONS.find((o) => o.code.toLowerCase() === c.toLowerCase() || o.name.toLowerCase() === c.toLowerCase());
  return hit ? countryFlagEmoji(hit.code) : null;
}

export function ProfileCardSheet({
  user,
  mine,
  onClose,
  onGift,
  onFollow,
  onChat,
  onReport,
  onMyProfile,
}: {
  user: RoomUser;
  mine: boolean;
  onClose: () => void;
  onGift: () => void;
  onFollow: () => void;
  onChat: () => void;
  onReport: () => void;
  /** Your own card: leaves the room minimised and opens your Profile. */
  onMyProfile: () => void;
}) {
  const { px } = useDesignScale();
  const card = user.cosmetics?.profile_card;
  const W = 402;
  const artH = (W * 600) / 750;
  const holeY = (105 / 600) * artH;
  const sheetTop = card ? 34 : 60;
  const faceY = card ? holeY : 60;
  const [animated, setAnimated] = useState(false);
  const white = colors.white;
  const flag = flagOf(user.country);
  const round = (label: string, color: string, Icon: typeof Gift, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: px(label.length > 8 ? 130 : 76) }}>
      <View style={{ width: px(48), height: px(48), borderRadius: px(24), backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={px(22)} color={white} strokeWidth={2.2} />
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
          {/* Name with the gender badge beside it, as on the Profile tab. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(6), maxWidth: px(320) }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: typography.fontFamily.medium, fontSize: px(20), color: white }}>{user.display_name ?? 'Guftagu user'}</Text>
            {user.gender === 'male' || user.gender === 'female' ? (
              <SvgXml xml={user.gender === 'male' ? profileIcons.male : profileIcons.female} width={px(20)} height={px(20)} />
            ) : null}
          </View>
          {/* Country flag, then the ID. */}
          <View style={{ marginTop: px(4), flexDirection: 'row', alignItems: 'center', gap: px(6) }}>
            {flag ? <Text style={{ fontSize: px(15) }}>{flag}</Text> : null}
            {user.guftagu_id ? <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(13), color: 'rgba(255,255,255,0.7)' }}>ID:{user.guftagu_id}</Text> : null}
          </View>
          {/* The wealth and charm grade medals, as on the Profile tab, in place of the level text. */}
          <View style={{ marginTop: px(10), flexDirection: 'row', gap: px(6) }}>
            <LevelBadge kind="wealth" level={user.wealth_level ?? 0} height={22} />
            <LevelBadge kind="charm" level={user.charm_level ?? 0} height={22} />
          </View>
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: px(26), flexDirection: 'row', justifyContent: 'center', gap: px(10) }}>
          {mine ? null : round('Follow', '#E6577A', UserPlus, onFollow)}
          {mine ? null : round('Chat', '#2FA4B8', MessageCircle, onChat)}
          {/* Your own card has nothing to send yourself: it takes you to your Profile instead. */}
          {mine ? round('Go to my profile', '#7B5CF0', UserRound, onMyProfile) : round('Gift', '#7B5CF0', Gift, onGift)}
          {mine ? null : round('Report', '#5C5F6B', Flag, onReport)}
        </View>
      </View>
    </View>
  );
}
