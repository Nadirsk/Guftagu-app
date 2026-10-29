import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/** What tapping your own seat offers: an action sheet, not a system alert. */
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
  const { px } = useDesignScale();
  const rows: { label: string; onPress: () => void; danger?: boolean }[] = [
    { label: 'View profile card', onPress: onProfile },
    { label: 'Leave the Mic', onPress: onLeave, danger: true },
    { label: 'Send gift', onPress: onGift },
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: px(24), backgroundColor: '#1B0F1A', borderTopLeftRadius: px(20), borderTopRightRadius: px(20), overflow: 'hidden' }}>
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
