import { useRef } from 'react';
import {
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
  ViewStyle,
} from 'react-native';

import { colors, typography } from '../theme/tokens';

type OtpInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  /** All sizes are already scaled to device points by the caller. */
  boxSize: number;
  gap: number;
  radius: number;
  fontSize: number;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function OtpInput({
  value,
  onChange,
  boxSize,
  gap,
  radius,
  fontSize,
  autoFocus,
  style,
}: OtpInputProps) {
  const refs = useRef<(TextInput | null)[]>([]);

  function handleChange(index: number, text: string) {
    // Keep the last character so retyping over a filled box replaces it.
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < value.length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyPress(
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    // Backspace in an already-empty box steps back instead of doing nothing.
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={[styles.row, { gap }, style]}>
      {value.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChangeText={(text) => handleChange(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          autoFocus={autoFocus && index === 0}
          style={[
            styles.box,
            { width: boxSize, height: boxSize, borderRadius: radius, fontSize },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  box: {
    borderWidth: 1,
    borderColor: colors.otpBorder,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    includeFontPadding: false,
  },
});
