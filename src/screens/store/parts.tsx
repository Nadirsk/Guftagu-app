import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/store/icons';
import { SvgaPlayer } from '../../components/SvgaPlayer';
import { colors, typography } from '../../theme/tokens';
import { DIALOG, GHOST, ORANGE, STORE } from './geometry';

/** "image 19". */
export const coinArt = require('../../assets/store/coin.png');

/** `GET /store/items` — `StoreController::payload()`. */
export type StoreItem = {
  id: number;
  type: string;
  name: string;
  image_url: string | null;
  animation_url: string | null;
  animation_type: string | null;
  coin_price: number;
  /** Null means the item is kept for good. */
  rental_days: number | null;
  required_vip_tier_id: number | null;
};

/** Figma's four item types, in its order — the Store's tabs and the Item Bag's slots. */
export const STORE_TABS: { type: string; label: string }[] = [
  { type: 'frame', label: 'Frame' },
  { type: 'entrance_effect', label: 'Entry Effect' },
  { type: 'bubble', label: 'Bubbles' },
  { type: 'entry_banner', label: 'Entry Banner' },
];

/** The other types the admin can stock, after Figma's four: Store tabs when stocked, Item Bag categories always. */
export const STORE_EXTRA_TABS: { type: string; label: string }[] = [
  { type: 'mic_wave', label: 'Sound Waves' },
  { type: 'profile_card', label: 'Profile Card' },
  { type: 'room_background', label: 'Room Background' },
  { type: 'floating_screen', label: 'Floating Screen' },
];

/** "100000/3Day", as every card writes it. */
export const priceLabel = (item: StoreItem) =>
  `${item.coin_price}/${item.rental_days == null ? 'Permanent' : `${item.rental_days}Day`}`;

/** Only a frame is worn around an avatar, so only a frame's previews put one inside it. */
export const wornOnAvatar = (item: StoreItem) => item.type === 'frame';

/** Converts a design pixel of whichever canvas the caller is on to device points. */
export type Unit = (value: number) => number;

/** Coin, then the price — `Frame 1597881013`. */
export function PriceRow({ item, u }: { item: StoreItem; u: Unit }) {
  const p = STORE.price;
  return (
    <View style={[styles.row, { gap: u(p.gap) }]}>
      <Image source={coinArt} resizeMode="contain" style={{ width: u(p.coin.width), height: u(p.coin.height) }} />
      <Text numberOfLines={1} style={[styles.price, { fontSize: u(p.size), lineHeight: u(p.line) }]}>
        {priceLabel(item)}
      </Text>
    </View>
  );
}

/** arrow-left-normal at its spot, and the title centred across the page. */
export function TopBar({
  back,
  title,
  color,
  onBack,
  u,
}: {
  back: { x: number; y: number; size: number };
  title: { text: string; y: number; size: number; line: number };
  color: string;
  onBack: () => void;
  u: Unit;
}) {
  return (
    <>
      <Text numberOfLines={1} style={[styles.medium, styles.line, { color, top: u(title.y), fontSize: u(title.size), lineHeight: u(title.line) }]}>
        {title.text}
      </Text>
      <Pressable
        onPress={onBack}
        hitSlop={u(12)}
        accessibilityLabel="Back"
        style={[styles.center, { position: 'absolute', left: u(back.x), top: u(back.y), width: u(back.size), height: u(back.size) }]}
      >
        <SvgXml xml={icons.arrowLeft(color)} width={u(17)} height={u(14.1667)} />
      </Pressable>
    </>
  );
}

/** The 44-tall pill pair: Send / Purchase on the sheet, Cancel / Confirm in the dialog. */
export function PillButton({
  label,
  primary,
  width,
  height,
  radius,
  size,
  disabled,
  onPress,
}: {
  label: string;
  primary?: boolean;
  width: number;
  height: number;
  radius: number;
  size: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.center,
        { width, height, borderRadius: radius, opacity: primary && disabled ? 0.6 : 1 },
        primary ? { backgroundColor: ORANGE } : { backgroundColor: GHOST.background, borderWidth: 1, borderColor: GHOST.border },
      ]}
    >
      <Text style={[styles.regular, styles.white, { fontSize: size }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * A frame with the wearer's avatar showing through its hole. A frame with an
 * `.svga` plays it, as in Mehfil's Mall; its still artwork shows until the
 * animation paints its first frame.
 */
export function FramedAvatar({
  item,
  avatar,
  size,
  avatarSize,
  avatarDx = 0,
  avatarDy,
  u,
}: {
  item: StoreItem;
  avatar?: { uri: string } | number;
  size: number;
  avatarSize: number;
  avatarDx?: number;
  avatarDy?: number;
  u: Unit;
}) {
  const dy = avatarDy ?? (size - avatarSize) / 2;
  // Keyed by URL, so switching items shows the new still until its own animation paints.
  const [playing, setPlaying] = useState<string | null>(null);
  const svga = item.animation_url;
  return (
    <View style={{ width: u(size), height: u(size) }}>
      {avatar && wornOnAvatar(item) ? (
        <Image
          source={avatar}
          style={{
            position: 'absolute',
            left: u((size - avatarSize) / 2 + avatarDx),
            top: u(dy),
            width: u(avatarSize),
            height: u(avatarSize),
            borderRadius: u(avatarSize / 2),
          }}
        />
      ) : null}
      {item.image_url && !(svga && playing === svga) ? (
        <Image source={{ uri: item.image_url }} resizeMode="contain" style={{ width: u(size), height: u(size) }} />
      ) : null}
      {svga ? (
        <SvgaPlayer key={svga} url={svga} style={StyleSheet.absoluteFill} onFirstFrame={() => setPlaying(svga)} />
      ) : null}
    </View>
  );
}

/**
 * 4001:8107 (purchase) / 4001:8158 (send) — black for the top quarter, fading to grey,
 * the item worn by whoever will own it, the question, then Cancel and Confirm. The send
 * one has a border and a wider, two-line question.
 */
export function ConfirmDialog({
  variant,
  item,
  question,
  avatar,
  busy,
  onCancel,
  onConfirm,
  u,
}: {
  variant: 'purchase' | 'send';
  item: StoreItem;
  question: string;
  avatar?: { uri: string } | number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  u: Unit;
}) {
  const d = DIALOG;
  const b = d.buttons;
  const send = variant === 'send';
  const questionWidth = send ? d.question.sendWidth : d.question.width;
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: d.scrim }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onCancel} />
      <LinearGradient
        colors={d.gradient.colors}
        locations={d.gradient.locations}
        style={[
          { width: u(d.width), height: u(d.height), borderRadius: u(d.radius), overflow: 'hidden' },
          send ? { borderWidth: 1, borderColor: d.sendBorder } : null,
        ]}
      >
        <View style={[styles.preview, { top: u(d.preview.top) }]}>
          <FramedAvatar item={item} avatar={avatar} size={d.preview.size} avatarSize={d.preview.avatar} u={u} />
        </View>
        <Text numberOfLines={1} style={[styles.regular, styles.white, styles.line, { top: u(d.name.top), fontSize: u(d.name.size), lineHeight: u(d.name.line) }]}>
          {item.name}
        </Text>
        <View style={[styles.line, styles.center, { top: u(d.price.top) }]}>
          <PriceRow item={item} u={u} />
        </View>
        <Text
          numberOfLines={2}
          style={[styles.medium, styles.white, styles.question, { top: u(d.question.top), width: u(questionWidth), marginLeft: u(-questionWidth / 2), fontSize: u(d.question.size), lineHeight: u(d.question.line) }]}
        >
          {question}
        </Text>
        <View style={[styles.row, styles.line, { justifyContent: 'center', top: u(b.top), gap: u(b.gap) }]}>
          <PillButton label="Cancel" width={u(b.width)} height={u(b.height)} radius={u(b.radius)} size={u(b.size)} disabled={busy} onPress={onCancel} />
          <PillButton label="Confirm" primary width={u(b.width)} height={u(b.height)} radius={u(b.radius)} size={u(b.size)} disabled={busy} onPress={onConfirm} />
        </View>
      </LinearGradient>
    </View>
  );
}

/** The server refuses a purchase the wallet cannot cover with one of these. */
export const isInsufficientCoins = (e: unknown) =>
  typeof e === 'object' && e !== null && ['INSUFFICIENT_BALANCE', 'INSUFFICIENT_COINS'].includes((e as { code?: string }).code ?? '');

/**
 * "Your coins is insufficient, please recharge" — what a purchase that the wallet
 * cannot cover opens instead of a plain alert; "Go to recharge" leads to Wallet → Coins.
 */
export function InsufficientCoinsDialog({ onClose, onRecharge, u }: { onClose: () => void; onRecharge: () => void; u: Unit }) {
  const coin = 75;
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={{ width: u(279), borderRadius: u(14), backgroundColor: '#2A2424', paddingTop: u(coin / 2 + 14), paddingBottom: u(16), paddingHorizontal: u(16), alignItems: 'center' }}>
        <Image source={coinArt} resizeMode="contain" style={{ position: 'absolute', top: u(-coin / 2), width: u(coin), height: u(coin) }} />
        <Text style={[styles.regular, styles.white, { fontSize: u(15), lineHeight: u(22), textAlign: 'center' }]}>
          {'Your coins is insufficient\nplease recharge'}
        </Text>
        <Pressable onPress={onRecharge} style={[styles.center, { marginTop: u(18), width: '100%', height: u(40), borderRadius: u(20), backgroundColor: ORANGE }]}>
          <Text style={[styles.medium, styles.white, { fontSize: u(15) }]}>Go to recharge</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  preview: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  line: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  question: { position: 'absolute', left: '50%', textAlign: 'center' },
  regular: { fontFamily: typography.fontFamily.regular },
  medium: { fontFamily: typography.fontFamily.medium },
  semiBold: { fontFamily: typography.fontFamily.semiBold },
  white: { color: colors.white },
  price: { fontFamily: typography.fontFamily.regular, color: 'rgba(255,255,255,0.56)' },
});
