import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf } from './sheets';
import type { RoomUser } from './useRoom';

export type SeatAction = { label: string; onPress: () => void; danger?: boolean };

/**
 * The seat action sheet: rows up the bottom edge with Cancel under them — never a system alert.
 * `title` names whose seat it is when it is not yours.
 */
export function SeatActionSheet({ title, rows, onClose }: { title?: string; rows: SeatAction[]; onClose: () => void }) {
  const { px } = useDesignScale();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: px(24), backgroundColor: '#1B0F1A', borderTopLeftRadius: px(20), borderTopRightRadius: px(20), overflow: 'hidden' }}>
        {title ? (
          <View style={{ height: px(46), alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
            <Text numberOfLines={1} style={{ maxWidth: '80%', fontFamily: typography.fontFamily.medium, fontSize: px(14), color: 'rgba(255,255,255,0.55)' }}>{title}</Text>
          </View>
        ) : null}
        {rows.map((r) => (
          <Pressable key={r.label} onPress={r.onPress} style={{ height: px(54), alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(15), color: r.danger ? '#FF6B6B' : colors.white }}>{r.label}</Text>
          </Pressable>
        ))}
        <View style={{ height: px(8), backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <Pressable onPress={onClose} style={{ height: px(54), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(15), color: 'rgba(255,255,255,0.7)' }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** What tapping your own seat offers. */
export function SeatMenu({
  onClose,
  onProfile,
  onLeave,
  onGift,
}: {
  onClose: () => void;
  onProfile: () => void;
  onLeave: () => void;
  onGift: () => void;
}) {
  return (
    <SeatActionSheet
      onClose={onClose}
      rows={[
        { label: 'View profile card', onPress: onProfile },
        { label: 'Leave the Mic', onPress: onLeave, danger: true },
        { label: 'Send gift', onPress: onGift },
      ]}
    />
  );
}

/**
 * "Take on the Mic" → Mazag's Online listeners: everyone in the room who is not on a mic, each
 * with a "Take on" button that puts them on the seat the owner tapped.
 */
export function ListenersSheet({
  seatNumber,
  load,
  version,
  onTakeOn,
  onClose,
}: {
  seatNumber: number;
  /** Bumps whenever someone arrives, leaves or changes seat — the list follows it live. */
  version: number;
  load: () => Promise<RoomUser[]>;
  onTakeOn: (user: RoomUser) => void;
  onClose: () => void;
}) {
  const { px } = useDesignScale();
  const [rows, setRows] = useState<RoomUser[] | null>(null);

  useEffect(() => {
    let live = true;
    load().then((r) => live && setRows(r)).catch(() => live && setRows([]));
    return () => {
      live = false;
    };
    // Re-read on every roster change; `load` is a fresh function on every room render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', backgroundColor: '#1B0F1A', borderTopLeftRadius: px(20), borderTopRightRadius: px(20), overflow: 'hidden' }}>
        <View style={{ height: px(52), alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
          <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(16), color: colors.white }}>Online listeners</Text>
          <Text style={{ fontFamily: typography.fontFamily.regular, fontSize: px(11), color: 'rgba(255,255,255,0.5)' }}>Seat {seatNumber}</Text>
        </View>
        {rows === null ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: px(40) }} />
        ) : rows.length === 0 ? (
          <Text style={{ marginTop: px(60), textAlign: 'center', fontFamily: typography.fontFamily.regular, fontSize: px(14), color: 'rgba(255,255,255,0.5)' }}>No Data Yet</Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingVertical: px(6) }}>
            {rows.map((u) => (
              <View key={u.uuid} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(16), paddingVertical: px(10) }}>
                <Image source={avatarOf(u)} style={{ width: px(46), height: px(46), borderRadius: px(23) }} />
                <Text numberOfLines={1} style={{ flex: 1, marginLeft: px(12), fontFamily: typography.fontFamily.regular, fontSize: px(15), color: colors.white }}>
                  {u.display_name ?? 'Guftagu user'}
                </Text>
                <Pressable onPress={() => onTakeOn(u)} style={{ paddingHorizontal: px(14), height: px(30), borderRadius: px(15), alignItems: 'center', justifyContent: 'center', backgroundColor: '#F39A2E' }}>
                  <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(13), color: colors.white }}>Take on</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
