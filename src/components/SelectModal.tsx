import { Check, Search } from 'lucide-react-native';
import { ComponentType, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

// Figma node 297:3329 (the sheet inside frame 297:3298 "iPhone 17 - 8"), in
// design pixels on the 402x874 frame. The sheet is drawn 876px tall at
// bottom:-233, i.e. its top edge sits at y=231 — exactly where the profile
// card starts — and it runs off the bottom of the frame, so only the top
// corners are ever visible.
const D = {
  sheet: { top: 231, radius: 15 },
  // Figma has a close X at (360, 28); we show a drag handle instead. The strip
  // around it is the grab area, and the whole sheet drags too.
  handle: { width: 40, height: 5, top: 12, stripHeight: 81 },
  search: {
    left: 15,
    right: 15,
    top: 81,
    height: 62,
    radius: 10,
    iconLeft: 16,
    iconSize: 24,
    textLeft: 52,
  },
  list: { left: 15, right: 15, top: 169, topWithoutSearch: 81, gap: 15 },
  row: {
    height: 62,
    radius: 10,
    leadingLeft: 17,
    leadingSize: 30,
    leadingIconSize: 18,
    labelLeft: 53,
    radioRight: 17,
    radioSize: 30,
    checkSize: 14,
  },
  fontSize: 15,
};

// How far the sheet has to travel (as a share of its height), or how fast it has
// to be flicked, before letting go dismisses it instead of snapping back.
const DISMISS_DISTANCE_RATIO = 0.25;
const DISMISS_VELOCITY = 800;

type LeadingIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export type SelectOption = {
  value: string;
  label: string;
  /** Short text shown in the leading slot, e.g. a country flag emoji. */
  leading?: string;
  /** Icon shown in the leading slot instead of `leading`. */
  Icon?: LeadingIcon;
};

type SelectModalProps = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export default function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  searchable,
  searchPlaceholder = 'Search',
  onSelect,
  onClose,
}: SelectModalProps) {
  const insets = useSafeAreaInsets();
  const { px } = useDesignScale();
  const { height: screenHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');

  // y=231 is where the Figma sheet starts, but that is a ceiling, not a fixed
  // top: a four-option list would leave most of the sheet blank. Measuring the
  // rows instead lets a short list sit low and a long one fill the sheet.
  // Measured from `options`, not the filtered list, so typing in the search box
  // doesn't resize the sheet under the keyboard.
  const contentHeight =
    px(searchable ? D.list.top : D.list.topWithoutSearch) +
    options.length * px(D.row.height) +
    Math.max(0, options.length - 1) * px(D.list.gap) +
    px(D.list.gap) +
    insets.bottom;
  const sheetHeight = Math.min(screenHeight - px(D.sheet.top), contentHeight);
  const sheetTop = screenHeight - sheetHeight;
  const translateY = useRef(new Animated.Value(0)).current;

  // The drag may only take over while the list is at its top, otherwise pulling
  // down inside a long list would move the sheet instead of scrolling. Held as
  // state so the gesture can be rebuilt, but flipped only when the list crosses
  // the boundary — not on every scroll frame.
  const [atTop, setAtTop] = useState(true);
  const atTopRef = useRef(true);

  // The sheet keeps its query and drag offset between openings otherwise.
  // Resetting in a layout effect means a sheet that was dragged shut is back at
  // rest before the next open paints.
  useLayoutEffect(() => {
    if (!visible) setQuery('');
    else translateY.setValue(0);
  }, [visible, translateY]);

  // Slide the sheet the rest of the way down before unmounting it, so a
  // dismissing drag reads as one continuous motion.
  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: 180,
      useNativeDriver: true,
    }).start(onClose);
  }, [onClose, sheetHeight, translateY]);

  const springBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  // PanResponder's "should set responder" callbacks never fire inside a Modal
  // (facebook/react-native#14295), so the drag uses gesture-handler instead.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(atTop)
        // Only a downward pull drags the sheet; an upward one fails the gesture
        // and hands it straight back to the list.
        .activeOffsetY(10)
        .failOffsetY(-10)
        .runOnJS(true)
        .onUpdate((e) => {
          translateY.setValue(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          if (
            e.translationY > sheetHeight * DISMISS_DISTANCE_RATIO ||
            e.velocityY > DISMISS_VELOCITY
          ) {
            dismiss();
          } else {
            springBack();
          }
        }),
    [atTop, dismiss, sheetHeight, springBack, translateY],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // Without these the modal window stops at the system bars, so on Android
      // the sheet floats above the navigation bar and the dimmed screen shows
      // through underneath it.
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* A Modal is its own window, so on Android it needs its own gesture root
          nested inside the app's — without this no gesture in here activates. */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                top: sheetTop,
                borderTopLeftRadius: px(D.sheet.radius),
                borderTopRightRadius: px(D.sheet.radius),
                transform: [{ translateY }],
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

            {searchable && (
              <View
                style={[
                  styles.searchBox,
                  {
                    left: px(D.search.left),
                    right: px(D.search.right),
                    top: px(D.search.top),
                    height: px(D.search.height),
                    borderRadius: px(D.search.radius),
                    paddingLeft: px(D.search.iconLeft),
                  },
                ]}
              >
                <Search
                  size={px(D.search.iconSize)}
                  color={colors.sheetPlaceholder}
                  strokeWidth={2}
                />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.sheetPlaceholder}
                  style={[
                    styles.searchInput,
                    {
                      fontSize: px(D.fontSize),
                      marginLeft: px(D.search.textLeft - D.search.iconLeft - D.search.iconSize),
                    },
                  ]}
                />
              </View>
            )}

            <FlatList
              accessibilityLabel={title}
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              scrollEventThrottle={16}
              onScroll={(e) => {
                const next = e.nativeEvent.contentOffset.y <= 0;
                if (next !== atTopRef.current) {
                  atTopRef.current = next;
                  setAtTop(next);
                }
              }}
              style={{
                position: 'absolute',
                left: px(D.list.left),
                right: px(D.list.right),
                top: px(searchable ? D.list.top : D.list.topWithoutSearch),
                bottom: 0,
              }}
              contentContainerStyle={{
                gap: px(D.list.gap),
                paddingBottom: insets.bottom + px(D.list.gap),
              }}
              renderItem={({ item }) => {
                const selected = item.value === selectedValue;
                const { Icon } = item;
                const hasLeading = !!Icon || !!item.leading;
                return (
                  <Pressable
                    style={[
                      styles.row,
                      { height: px(D.row.height), borderRadius: px(D.row.radius) },
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    {hasLeading && (
                      <View
                        style={[
                          styles.leading,
                          {
                            left: px(D.row.leadingLeft),
                            width: px(D.row.leadingSize),
                            height: px(D.row.leadingSize),
                          },
                          // Icons need the circle to read as a chip on the grey
                          // row; a flag is already a self-contained image, so it
                          // sits on the row directly.
                          Icon && {
                            backgroundColor: colors.white,
                            borderRadius: px(D.row.leadingSize / 2),
                            overflow: 'hidden' as const,
                          },
                        ]}
                      >
                        {Icon ? (
                          <Icon
                            size={px(D.row.leadingIconSize)}
                            color={colors.black}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Text style={{ fontSize: px(D.row.leadingSize * 0.8) }}>
                            {item.leading}
                          </Text>
                        )}
                      </View>
                    )}

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.rowLabel,
                        {
                          fontSize: px(D.fontSize),
                          left: px(hasLeading ? D.row.labelLeft : D.row.leadingLeft),
                          right: px(D.row.radioRight + D.row.radioSize + 12),
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                    <View
                      style={[
                        styles.radio,
                        {
                          right: px(D.row.radioRight),
                          width: px(D.row.radioSize),
                          height: px(D.row.radioSize),
                          borderRadius: px(D.row.radioSize / 2),
                        },
                        selected
                          ? { backgroundColor: colors.radioSelected }
                          : {
                              backgroundColor: colors.white,
                              borderWidth: 1,
                              borderColor: colors.radioBorder,
                            },
                      ]}
                    >
                      {selected && (
                        <Check size={px(D.row.checkSize)} color={colors.white} strokeWidth={2} />
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  handle: {
    backgroundColor: colors.sheetHandle,
  },
  searchBox: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sheetFieldFill,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
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
  },
  rowLabel: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  radio: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
