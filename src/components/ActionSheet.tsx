import { ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

// Same shell and row metrics as SelectModal (node 297:3329 / 297:3334), minus
// the radio: these rows run an action instead of picking a value, and the sheet
// hugs its two or three rows rather than starting at y=231.
const D = {
  sheet: { radius: 15 },
  handle: { width: 40, height: 5, top: 12, stripHeight: 44 },
  body: { paddingHorizontal: 15, paddingBottom: 18 },
  row: {
    height: 62,
    radius: 10,
    gap: 15,
    leadingLeft: 17,
    leadingSize: 30,
    leadingIconSize: 18,
    labelLeft: 53,
  },
  fontSize: 15,
};

export type SheetAction = {
  key: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  /** Announced to screen readers; the sheet itself shows only its rows. */
  title: string;
  actions: SheetAction[];
  onClose: () => void;
};

export default function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const { px } = useDesignScale();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // Without these the sheet stops at the system bars on Android and the
      // dimmed screen shows through beneath it.
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          accessibilityLabel={title}
          style={[
            styles.sheet,
            {
              borderTopLeftRadius: px(D.sheet.radius),
              borderTopRightRadius: px(D.sheet.radius),
              paddingHorizontal: px(D.body.paddingHorizontal),
              paddingBottom: insets.bottom + px(D.body.paddingBottom),
              gap: px(D.row.gap),
            },
          ]}
        >
          <View style={[styles.handleStrip, { height: px(D.handle.stripHeight) }]}>
            <View
              style={[
                styles.handle,
                {
                  marginTop: px(D.handle.top),
                  width: px(D.handle.width),
                  height: px(D.handle.height),
                  borderRadius: px(D.handle.height / 2),
                },
              ]}
            />
          </View>

          {actions.map(({ key, label, Icon, onPress }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              style={[styles.row, { height: px(D.row.height), borderRadius: px(D.row.radius) }]}
              // Close first so the sheet is already on its way out while the
              // camera or gallery opens over it.
              onPress={() => {
                onClose();
                onPress();
              }}
            >
              <View
                style={[
                  styles.leading,
                  {
                    left: px(D.row.leadingLeft),
                    width: px(D.row.leadingSize),
                    height: px(D.row.leadingSize),
                    borderRadius: px(D.row.leadingSize / 2),
                  },
                ]}
              >
                <Icon size={px(D.row.leadingIconSize)} color={colors.black} strokeWidth={1.8} />
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.rowLabel,
                  { fontSize: px(D.fontSize), left: px(D.row.labelLeft), right: px(D.row.leadingLeft) },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 24,
  },
  handleStrip: {
    alignItems: 'center',
  },
  handle: {
    backgroundColor: colors.sheetHandle,
  },
  row: {
    justifyContent: 'center',
    backgroundColor: colors.sheetRowFill,
    overflow: 'hidden',
  },
  leading: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  rowLabel: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
});
