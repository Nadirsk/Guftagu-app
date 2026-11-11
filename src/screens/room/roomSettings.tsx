import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import * as icons from '../../assets/room/icons';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { ROOM_MODE, ROOM_THEME } from './geometry';

/** `GET /room-seat-templates`. */
export type SeatTemplate = { id: number; name: string; total_seats: number; vip_positions: number[] };
/** `GET /room-themes`. */
export type RoomThemeItem = { id: number; name: string; background_url: string | null; preview_url: string | null; is_premium: boolean };

const font = { medium: typography.fontFamily.medium, regular: typography.fontFamily.regular };

/** The sheet's white body over the 36% scrim; tapping the scrim closes it. */
function SheetFrame({ top, scrim, title, onClose, children }: { top: number; scrim: string; title: string; onClose: () => void; children: React.ReactNode }) {
  const { px } = useDesignScale();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} accessibilityLabel="Close" />
      <View style={{ position: 'absolute', left: 0, right: 0, top, bottom: 0, backgroundColor: colors.white }}>
        <Text style={{ position: 'absolute', left: 0, right: 0, top: px(ROOM_MODE.title.y), textAlign: 'center', fontFamily: font.medium, fontSize: px(ROOM_MODE.title.size), color: colors.black }}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={px(10)} accessibilityLabel="Close" style={{ position: 'absolute', left: px(ROOM_MODE.close.x), top: px(ROOM_MODE.close.y) }}>
          <SvgXml xml={icons.closeM3} width={px(ROOM_MODE.close.size)} height={px(ROOM_MODE.close.size)} />
        </Pressable>
        {children}
      </View>
    </View>
  );
}

/** Ellipse 62 + Seat: the purple disc with the pink seat glyph on it. */
function SeatDisc({ size }: { size: number }) {
  const { px } = useDesignScale();
  return (
    <View style={{ width: px(size), height: px(size), borderRadius: px(size / 2), backgroundColor: ROOM_MODE.disc }}>
      <View style={{ position: 'absolute', left: px(size * 0.259), top: px(size * 0.232) }}>
        <SvgXml xml={icons.seat} color={ROOM_MODE.seat} width={px(size * 0.482)} height={px(size * 0.536)} />
      </View>
    </View>
  );
}

/** One Room Mode card: its label and a preview of its seats, laid out as Figma's four are. */
function ModeCard({ template, on, onPress }: { template: SeatTemplate; on: boolean; onPress: () => void }) {
  const { px } = useDesignScale();
  const M = ROOM_MODE;
  const G = M.grid;
  const b = M.buckets.find((k) => template.total_seats <= k.upTo) ?? M.buckets[M.buckets.length - 1];
  const shown = Math.min(template.total_seats, b.show);
  const rows: number[] = [];
  for (let n = 0; n < shown; n += b.perRow) rows.push(Math.min(b.perRow, shown - n));
  const look = on ? M.card.on : M.card.off;
  const label = `${template.total_seats} Mic`;
  const seatRows = (
    <View style={{ gap: px(b.rowStep - b.size), alignItems: 'flex-start' }}>
      {rows.map((count, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: px(b.gap) }}>
          {Array.from({ length: count }, (_, i) => (
            <SeatDisc key={i} size={b.size} />
          ))}
        </View>
      ))}
    </View>
  );
  const labelText = <Text style={{ fontFamily: font.medium, fontSize: px(M.label.size), lineHeight: px(M.label.line), color: colors.black, textAlign: 'center' }}>{label}</Text>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={{ width: px(G.width), height: px(G.height), borderRadius: px(M.card.radius), borderWidth: 1, borderColor: look.border, backgroundColor: look.background, overflow: 'hidden' }}
    >
      {template.total_seats <= 2 ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: px(M.twoSeat.labelY) }}>{labelText}</View>
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', transform: [{ translateY: px(M.twoSeat.seatsDy) }] }]}>{seatRows}</View>
        </>
      ) : (
        <View style={{ position: 'absolute', left: px(b.at.x), top: px(b.at.y), width: px(b.width), gap: px(b.labelGap) }}>
          {labelText}
          {seatRows}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Tools → Room Mode (Figma 774:7201). Every seat layout the admin offers, current one in
 * blue; picking another is the caller's to confirm (it empties every seat).
 */
export function RoomModeSheet({ extra, current, busy, onPick, onClose }: { extra: number; current: number | null | undefined; busy: boolean; onPick: (t: SeatTemplate) => void; onClose: () => void }) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const [templates, setTemplates] = useState<SeatTemplate[] | null>(() => peek<SeatTemplate[]>('/room-seat-templates', token, (t) => [...(t ?? [])].sort((a, b) => a.total_seats - b.total_seats)));
  useEffect(
    () =>
      refresh<SeatTemplate[]>('/room-seat-templates', token, setTemplates, (t) => [...(t ?? [])].sort((a, b) => a.total_seats - b.total_seats), () => setTemplates((t) => t ?? [])),
    [token],
  );

  const G = ROOM_MODE.grid;
  return (
    <SheetFrame top={px(ROOM_MODE.y + extra)} scrim={ROOM_MODE.scrim} title="Room Mode" onClose={onClose}>
      {templates === null || busy ? (
        <ActivityIndicator style={{ position: 'absolute', left: 0, right: 0, top: px(G.y + 60) }} color="#005DE9" />
      ) : null}
      {templates && !busy ? (
        <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: px(G.y), bottom: 0 }} contentContainerStyle={{ paddingLeft: px(G.x), paddingBottom: px(40) }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: px(G.colStep + G.width), columnGap: px(G.colStep - G.width), rowGap: px(G.rowStep - G.height) }}>
            {templates.map((t) => (
              <ModeCard key={t.id} template={t} on={t.id === current} onPress={() => onPick(t)} />
            ))}
          </View>
          {templates.length === 0 ? <Text style={{ fontFamily: font.regular, fontSize: px(14), color: 'rgba(0,0,0,0.4)', marginTop: px(40), textAlign: 'center', marginRight: px(G.x) }}>No room modes yet</Text> : null}
        </ScrollView>
      ) : null}
    </SheetFrame>
  );
}

/**
 * Tools → Room Theme (Figma 774:8130). The "+" card uploads the host's own picture; the
 * rest are the admin's themes. Changing it moves nobody.
 */
export function RoomThemeSheet({
  extra,
  currentThemeId,
  currentBackground,
  busy,
  onPickTheme,
  onPickOwned,
  onUpload,
  onClose,
}: {
  extra: number;
  currentThemeId: number | null | undefined;
  currentBackground: string | null | undefined;
  busy: boolean;
  onPickTheme: (t: RoomThemeItem) => void;
  /** A Room Background the host owns (Item Bag) — set as this room's picture. */
  onPickOwned: (url: string) => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const [themes, setThemes] = useState<RoomThemeItem[] | null>(() => peek<RoomThemeItem[], RoomThemeItem[]>('/room-themes', token, (t) => (t ?? []).filter((x) => x.preview_url || x.background_url)));
  // Room Backgrounds bought in the Store sit in the Item Bag; the host can put one behind the room.
  type OwnedBg = { id: number; name: string; image_url: string | null };
  const [owned, setOwned] = useState<OwnedBg[]>(() => peek<(OwnedBg & { type: string })[], OwnedBg[]>('/store/items/mine', token, (rows) => (rows ?? []).filter((r) => r.type === 'room_background' && r.image_url)) ?? []);
  useEffect(
    () =>
      refresh<(OwnedBg & { type: string })[], OwnedBg[]>('/store/items/mine', token, setOwned, (rows) => (rows ?? []).filter((r) => r.type === 'room_background' && r.image_url)),
    [token],
  );
  useEffect(
    () =>
      refresh<RoomThemeItem[]>('/room-themes', token, setThemes, (t) => (t ?? []).filter((x) => x.preview_url || x.background_url), () => setThemes((t) => t ?? [])),
    [token],
  );

  const T = ROOM_THEME;
  // The theme in use is the one whose picture is showing — an upload replaces any theme.
  const inUse = (t: RoomThemeItem) => t.id === currentThemeId && (t.background_url ?? null) === (currentBackground ?? null);
  const custom = !!currentBackground && !(themes ?? []).some((t) => t.background_url === currentBackground) && !owned.some((o) => o.image_url === currentBackground);

  return (
    <SheetFrame top={px(T.y + extra)} scrim={T.scrim} title="Room Theme" onClose={onClose}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', left: 0, right: 0, top: px(T.row.y), height: px(T.row.height) }}
        contentContainerStyle={{ paddingHorizontal: px(T.row.x), gap: px(T.row.gap), alignItems: 'flex-end' }}
      >
        {/* Group 8995 — upload your own background. */}
        <Pressable
          onPress={onUpload}
          disabled={busy}
          accessibilityLabel="Upload your own background"
          style={{ width: px(T.add.width), height: px(T.row.height), borderRadius: px(T.add.radius), borderWidth: custom ? T.current.width : 1, borderColor: custom ? T.current.border : T.add.border }}
        >
          {busy ? (
            <ActivityIndicator style={StyleSheet.absoluteFill} color="#BD8AB0" />
          ) : (
            <View style={{ position: 'absolute', left: px(T.add.plus.x), top: px(T.add.plus.y) }}>
              <SvgXml xml={icons.themePlus} width={px(T.add.plus.size)} height={px(T.add.plus.size)} />
            </View>
          )}
        </Pressable>
        {owned.map((o) => {
          const on = currentBackground === o.image_url;
          return (
            <Pressable key={`own${o.id}`} onPress={() => onPickOwned(o.image_url!)} disabled={busy} accessibilityLabel={o.name} accessibilityState={{ selected: on }}>
              <Image source={{ uri: o.image_url! }} resizeMode="cover" style={{ width: px(T.card.width), height: px(T.row.height), borderRadius: px(T.card.radius) }} />
              {on ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: px(T.card.radius), borderWidth: T.current.width, borderColor: T.current.border }]} /> : null}
            </Pressable>
          );
        })}
        {themes === null ? <ActivityIndicator style={{ width: px(T.card.width), height: px(T.row.height) }} color="#BD8AB0" /> : null}
        {(themes ?? []).map((t) => {
          const on = inUse(t);
          return (
            <Pressable key={t.id} onPress={() => onPickTheme(t)} disabled={busy} accessibilityLabel={t.name} accessibilityState={{ selected: on }}>
              <Image source={{ uri: (t.preview_url ?? t.background_url)! }} resizeMode="cover" style={{ width: px(T.card.width), height: px(T.row.height), borderRadius: px(T.card.radius) }} />
              {on ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: px(T.card.radius), borderWidth: T.current.width, borderColor: T.current.border }]} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SheetFrame>
  );
}
