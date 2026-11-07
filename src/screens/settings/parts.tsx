import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/settings/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { HEADER, RULE, SETTINGS_SCALE, TEXT } from './geometry';

/** A pixel of the 440-wide Settings frames, in device points. */
export function useSettingsUnit() {
  const { px } = useDesignScale();
  return (value: number) => px(value * SETTINGS_SCALE);
}

/** Frame 1597881607 — the back arrow, and the title ending at x 262. */
export function SettingsHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const u = useSettingsUnit();
  const navigation = useNavigation();
  const b = HEADER.back;
  const t = HEADER.title;
  return (
    <>
      <Text numberOfLines={1} style={[styles.medium, { position: 'absolute', left: 0, width: u(t.right), top: u(t.y), fontSize: u(t.size), lineHeight: u(t.line), textAlign: 'right' }]}>
        {title}
      </Text>
      <Pressable
        onPress={onBack ?? (() => navigation.goBack())}
        hitSlop={u(10)}
        accessibilityLabel="Back"
        style={{ position: 'absolute', left: u(b.x), top: u(b.y), width: u(b.size), height: u(b.size) }}
      >
        <SvgXml xml={icons.arrowLeft} width={u(b.size)} height={u(b.size)} />
      </Pressable>
    </>
  );
}

/** Line 25 …: a 1px rule. */
export function Rule({ x, y, width }: { x: number; y: number; width: number }) {
  const u = useSettingsUnit();
  return <View style={{ position: 'absolute', left: u(x), top: u(y) - 0.5, width: u(width), height: 1, backgroundColor: RULE }} />;
}

/** chevron_forward. */
export function Chevron({ size = 24 }: { size?: number }) {
  const u = useSettingsUnit();
  return <SvgXml xml={icons.chevronForward} width={u(size)} height={u(size)} />;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  line: { position: 'absolute', left: 0, right: 0 },
  regular: { fontFamily: typography.fontFamily.regular, color: TEXT },
  medium: { fontFamily: typography.fontFamily.medium, color: TEXT },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
