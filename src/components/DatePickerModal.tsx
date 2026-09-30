import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

// The sheet borrows SelectModal's shell (node 297:3329) — same corner radius,
// scrim, drag handle and row fill — but hugs its content instead of starting at
// y=231, because three wheels and a button are far shorter than an option list.
const D = {
  sheet: { radius: 15 },
  handle: { width: 40, height: 5, top: 12, stripHeight: 44 },
  body: { paddingHorizontal: 15 },
  header: { height: 32, fontSize: 13 }, // includes the breathing room above the first row
  wheel: { itemHeight: 46, visibleCount: 5, radius: 10, gap: 10, fontSize: 17 },
  confirm: { height: 55, radius: 42, marginTop: 24, marginHorizontal: 3, fontSize: 16 },
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/** 31/07/1998 — the format the profile form shows a date of birth in. */
export function formatDateDMY(date: Date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

/** `month` is 1-based, so day 0 of the next month is the last day of this one. */
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Blocks of the value list stacked up for a looping wheel; must be odd. */
const LOOP_BLOCKS = 5;

type WheelProps = {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  /** Repeats the list so the column never runs out above or below the centre. */
  loop?: boolean;
  itemHeight: number;
  visibleCount: number;
  fontSize: number;
  label: string;
};

function Wheel({
  values,
  value,
  onChange,
  format = String,
  loop = false,
  itemHeight,
  visibleCount,
  fontSize,
  label,
}: WheelProps) {
  const ref = useRef<ScrollView>(null);
  const padding = ((visibleCount - 1) / 2) * itemHeight;

  // Days and months wrap, so their columns are the list repeated an odd number
  // of times with the wheel parked in the middle block: 01 then always has rows
  // above it, and the last day of the month always has rows below.
  const items = useMemo(
    () =>
      loop
        ? Array.from({ length: LOOP_BLOCKS * values.length }, (_, i) => values[i % values.length])
        : values,
    [loop, values],
  );
  const blockStart = loop ? Math.floor(LOOP_BLOCKS / 2) * values.length : 0;
  const target = blockStart + Math.max(0, values.indexOf(value));

  const align = useCallback(
    (animated: boolean) => {
      ref.current?.scrollTo({ y: target * itemHeight, animated });
    },
    [target, itemHeight],
  );

  // Re-centres the column whenever the value changes — from outside the wheel
  // (the day drops from 31 to 30 because the month moved to April) and after
  // the user's own scroll, which is what walks a looping wheel back to the
  // middle block. That hop is a whole number of blocks, so it lands on
  // identical rows and cannot be seen.
  useEffect(() => {
    align(false);
  }, [align]);

  const settle = (offsetY: number) => {
    const row = Math.min(items.length - 1, Math.max(0, Math.round(offsetY / itemHeight)));
    const next = values[row % values.length];
    // Unchanged value means the effect above won't fire, so re-centre here —
    // otherwise a wheel flicked back to where it started keeps drifting away
    // from the middle block.
    if (next === value) align(false);
    else onChange(next);
  };

  return (
    <ScrollView
      ref={ref}
      accessibilityLabel={label}
      style={{ height: itemHeight * visibleCount }}
      contentContainerStyle={{ paddingVertical: padding }}
      showsVerticalScrollIndicator={false}
      snapToInterval={itemHeight}
      decelerationRate="fast"
      // scrollTo only lands correctly once the rows have been measured.
      onContentSizeChange={() => align(false)}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      // A slow drag released without a flick never produces a momentum event, so
      // settle it here instead — but only then, or this would cut the flick off.
      onScrollEndDrag={(e) => {
        if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) {
          settle(e.nativeEvent.contentOffset.y);
        }
      }}
    >
      {items.map((item, i) => (
        <View key={i} style={[styles.wheelItem, { height: itemHeight }]}>
          <Text
            style={[styles.wheelText, { fontSize }, item === value ? styles.wheelTextSelected : null]}
          >
            {format(item)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

type DatePickerModalProps = {
  visible: boolean;
  /** Announced to screen readers; the sheet itself shows only the DD/MM/YYYY headers. */
  title: string;
  value?: Date;
  /** Oldest selectable year. Defaults to 100 years before the maximum date. */
  minimumYear?: number;
  /** Latest selectable day. Defaults to today, so a birth date cannot be in the future. */
  maximumDate?: Date;
  /** Date the wheels open on when nothing is picked yet. Defaults to 1 Jan, 20 years ago. */
  defaultValue?: Date;
  confirmLabel?: string;
  onConfirm: (date: Date) => void;
  onClose: () => void;
};

export default function DatePickerModal({
  visible,
  title,
  value,
  minimumYear,
  maximumDate,
  defaultValue,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { px } = useDesignScale();

  const max = useMemo(() => maximumDate ?? new Date(), [maximumDate]);
  const maxYear = max.getFullYear();
  const minYear = minimumYear ?? maxYear - 100;

  const [year, setYear] = useState(maxYear - 20);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);

  // The wheels are a draft: they start from the saved date (or the default)
  // every time the sheet opens, and only reach the form on Confirm.
  useEffect(() => {
    if (!visible) return;
    const start = value ?? defaultValue ?? new Date(maxYear - 20, 0, 1);
    setYear(start.getFullYear());
    setMonth(start.getMonth() + 1);
    setDay(start.getDate());
  }, [visible, value, defaultValue, maxYear]);

  const yearValues = useMemo(() => range(minYear, maxYear), [minYear, maxYear]);
  // Trimming the lists at the maximum date is what keeps a future date
  // unreachable, so no combination of wheels ever has to be rejected.
  const monthValues = useMemo(
    () => range(1, year === maxYear ? max.getMonth() + 1 : 12),
    [year, maxYear, max],
  );
  const safeMonth = Math.min(month, monthValues.length);
  const dayValues = useMemo(
    () =>
      range(
        1,
        year === maxYear && safeMonth === max.getMonth() + 1
          ? max.getDate()
          : daysInMonth(year, safeMonth),
      ),
    [year, safeMonth, maxYear, max],
  );
  // Clamped for display rather than stored, so leaving a short month restores
  // the original day: 31 Mar -> Apr shows 30, and back to Mar shows 31 again.
  const safeDay = Math.min(day, dayValues.length);

  const itemHeight = px(D.wheel.itemHeight);
  // The header used to be its own row of flexed Text, which put it on a
  // different measuring pass from the wheels and left DD/MM/YYYY sitting off to
  // the left of their numbers. Header and wheel now live in one column, so they
  // cannot drift apart.
  const columns = [
    {
      header: 'DD',
      label: 'Day',
      flex: 1,
      loop: true,
      values: dayValues,
      value: safeDay,
      onChange: setDay,
      format: pad2,
    },
    {
      header: 'MM',
      label: 'Month',
      flex: 1,
      loop: true,
      values: monthValues,
      value: safeMonth,
      onChange: setMonth,
      format: pad2,
    },
    {
      header: 'YYYY',
      label: 'Year',
      flex: 1.4,
      loop: false,
      values: yearValues,
      value: year,
      onChange: setYear,
      format: String,
    },
  ];
  const wheelProps = {
    itemHeight,
    visibleCount: D.wheel.visibleCount,
    fontSize: px(D.wheel.fontSize),
  };

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
              paddingBottom: insets.bottom + px(18),
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

          <View
            style={[
              styles.columns,
              {
                gap: px(D.wheel.gap),
                height: px(D.header.height) + itemHeight * D.wheel.visibleCount,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.selectionBand,
                {
                  top: px(D.header.height) + itemHeight * ((D.wheel.visibleCount - 1) / 2),
                  height: itemHeight,
                  borderRadius: px(D.wheel.radius),
                },
              ]}
            />

            {columns.map((column) => (
              <View key={column.header} style={{ flex: column.flex }}>
                <View style={[styles.header, { height: px(D.header.height) }]}>
                  <Text style={[styles.headerText, { fontSize: px(D.header.fontSize) }]}>
                    {column.header}
                  </Text>
                </View>

                <Wheel
                  {...wheelProps}
                  label={column.label}
                  loop={column.loop}
                  values={column.values}
                  value={column.value}
                  onChange={column.onChange}
                  format={column.format}
                />
              </View>
            ))}
          </View>

          <Pressable
            style={[
              styles.confirmButton,
              {
                marginTop: px(D.confirm.marginTop),
                marginHorizontal: px(D.confirm.marginHorizontal),
                height: px(D.confirm.height),
                borderRadius: px(D.confirm.radius),
              },
            ]}
            onPress={() => {
              onConfirm(new Date(year, safeMonth - 1, safeDay));
              onClose();
            }}
          >
            <Text style={[styles.confirmButtonText, { fontSize: px(D.confirm.fontSize) }]}>
              {confirmLabel}
            </Text>
          </Pressable>
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
  columns: {
    flexDirection: 'row',
  },
  header: {
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.sheetRowFill,
  },
  wheelItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  wheelTextSelected: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
  },
  confirmButton: {
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
  },
});
