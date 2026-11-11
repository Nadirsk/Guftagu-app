import type { ReactNode } from 'react';
import { Image, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SvgXml } from 'react-native-svg';

import * as settingsIcons from '../../assets/settings/icons';
import * as icons from '../../assets/wallet/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import type { MethodKind } from './withdrawMethods';

/**
 * Pieces shared by the withdrawal flow (Figma 346:6627) and Transfer (797:8041). Every number is a
 * Figma pixel of the 402-wide frame, scaled by `px`. The design's Delight / Mona Sans stand in as
 * Poppins, like the rest of the app.
 */

const LINE = 1.28;
export const LINK_ORANGE = '#DE4200';
export const FIELD_BORDER = 'rgba(0,0,0,0.19)';

export function useUi() {
  const { px } = useDesignScale();
  const at = (left: number, top: number) => ({ position: 'absolute' as const, left: px(left), top: px(top) });
  const text = (size: number, weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular', color: string = colors.black) => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: px(size),
    lineHeight: px(Math.round(size * LINE)),
    color,
  });
  return { px, at, text };
}

/** arrow_back + the page title (Frame 1597881400). */
export function BackTitle({ title, onBack }: { title: string; onBack: () => void }) {
  const { px, at, text } = useUi();
  return (
    <>
      <Pressable onPress={onBack} hitSlop={px(10)} accessibilityLabel="Back" style={[at(16, 91), { width: px(24), height: px(24) }]}>
        <SvgXml xml={icons.arrowBack} width={px(24)} height={px(24)} />
      </Pressable>
      {title !== '' && (
        <Text numberOfLines={1} style={[at(53, 91), text(16, 'semiBold')]}>
          {title}
        </Text>
      )}
    </>
  );
}

/** The black pill at the foot of every page (Frame 1597881063): 372 x 55 at (15, 757). */
export function BlackButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { px, at, text } = useUi();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[at(15, 757), { width: px(372), height: px(55), borderRadius: px(26), backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.6 : 1 }]}
    >
      <Text style={text(16, 'medium', colors.white)}>{label}</Text>
    </Pressable>
  );
}

/**
 * A label over a 372 x 59 outlined box (Frame 1597881414): the label is 20 high, then 10, then the box.
 * `boxHeight` 114 is the Binance address.
 */
export function Field({
  top,
  label,
  labelWeight = 'medium',
  boxHeight = 59,
  ...input
}: { top: number; label: string; labelWeight?: 'medium' | 'semiBold'; boxHeight?: number } & TextInputProps) {
  const { px, at, text } = useUi();
  const multiline = boxHeight > 59;
  return (
    <>
      <Text style={[at(15, top), text(16, labelWeight)]}>{label}</Text>
      <View style={[at(15, top + 30), { width: px(372), height: px(boxHeight), borderRadius: px(11), borderWidth: 1, borderColor: FIELD_BORDER, overflow: 'hidden' }]}>
        <TextInput
          {...input}
          multiline={multiline}
          placeholderTextColor="rgba(0,0,0,0.4)"
          underlineColorAndroid="transparent"
          style={[
            {
              position: 'absolute',
              left: px(13),
              right: px(13),
              top: px(19),
              ...(multiline ? { bottom: px(12), textAlignVertical: 'top' as const } : { height: px(18) }),
              padding: 0,
              includeFontPadding: false,
            },
            text(14, 'medium'),
          ]}
        />
      </View>
    </>
  );
}

/** "Select withdrawal method" with its chevron (Frame 1597881397): 372 x 59. */
export function PickerBox({ top, value, placeholder, onPress }: { top: number; value?: string; placeholder: string; onPress: () => void }) {
  const { px, at, text } = useUi();
  return (
    <Pressable onPress={onPress} style={[at(15, top), { width: px(372), height: px(59), borderRadius: px(11), borderWidth: 1, borderColor: FIELD_BORDER, overflow: 'hidden', justifyContent: 'center' }]}>
      <Text numberOfLines={1} style={[text(14, 'medium'), { marginLeft: px(13), marginRight: px(48), opacity: value ? 1 : 0.4 }]}>
        {value ?? placeholder}
      </Text>
      <SvgXml xml={settingsIcons.chevronForward} width={px(24)} height={px(24)} style={{ position: 'absolute', left: px(333), top: px(16.5) }} />
    </Pressable>
  );
}

/** The 63 x 63 round badge of a method: Binance (its own disc), Bank (a picture), UPI (the logo on white). */
export function MethodIcon({ kind }: { kind: MethodKind }) {
  const { px } = useUi();
  if (kind === 'binance') return <SvgXml xml={icons.binance} width={px(63)} height={px(63)} />;
  if (kind === 'bank') {
    return (
      <View style={{ width: px(63), height: px(63), borderRadius: px(70), borderWidth: 1, borderColor: 'rgba(0,0,0,0.21)', overflow: 'hidden' }}>
        <Image source={require('../../assets/wallet/method-bank.png')} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }
  return (
    <View style={{ width: px(63), height: px(63), borderRadius: px(31.5), borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' }}>
      <View style={{ position: 'absolute', left: px(9), top: px(21), width: px(43), height: px(22), overflow: 'hidden' }}>
        <Image
          source={require('../../assets/wallet/method-upi.png')}
          resizeMode="stretch"
          style={{ position: 'absolute', left: px(-0.1 * 43), top: px(-0.3889 * 22), width: px(1.2571 * 43), height: px(1.8333 * 22) }}
        />
      </View>
    </View>
  );
}

/** One method row (Frame 1597881405): icon, two lines, and the orange pill at x 270. 355 x 63. */
export function MethodRow({
  top,
  left = 20,
  kind,
  title,
  subtitle,
  action,
  onAction,
}: {
  top: number;
  left?: number;
  kind: MethodKind;
  title: string;
  subtitle: string;
  action: string;
  onAction: () => void;
}) {
  const { px, at, text } = useUi();
  return (
    <View style={[at(left, top), { width: px(355), height: px(63) }]}>
      <MethodIcon kind={kind} />
      <Text numberOfLines={1} style={[at(74, 11.5), { width: px(186) }, text(17, 'semiBold')]}>
        {title}
      </Text>
      <Text numberOfLines={1} style={[at(74, 33.5), { width: px(186), opacity: 0.4 }, text(14, 'regular')]}>
        {subtitle}
      </Text>
      <Pressable onPress={onAction} style={[at(270, 13), { width: px(85), height: px(37), borderRadius: px(24), backgroundColor: LINK_ORANGE, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={text(16, 'semiBold', colors.white)}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** "Withdrawal method added" (Frame 1597881415): 248 x 50, white, outlined. */
export function Toast({ message, top = 690 }: { message: string; top?: number }) {
  const { px, at, text } = useUi();
  return (
    <View
      pointerEvents="none"
      style={[at(77, top), { width: px(248), height: px(50), borderRadius: px(10), borderWidth: 1, borderColor: 'rgba(0,0,0,0.28)', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }]}
    >
      <Text style={text(14, 'medium')}>{message}</Text>
    </View>
  );
}

/** The blue balance card of Points / Transfer (Frame 2109): "Balance : n" over the value. */
export function BalanceCard({ children }: { children?: ReactNode }) {
  const { px, at } = useUi();
  return (
    <View style={[at(15, 167), { width: px(372), height: px(145), borderRadius: px(10), overflow: 'hidden', backgroundColor: colors.white }]}>
      <Image source={require('../../assets/wallet/points-card.png')} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width: px(372), height: px(145) }} />
      {children}
    </View>
  );
}

/**
 * "Balance : 122" over "$0". The server keeps diamonds and pays out in INR, so there is no dollar
 * value to show yet: the figure stays the design's "$0".
 */
export function BalanceText({ diamonds }: { diamonds: number }) {
  const { px, at, text } = useUi();
  return (
    <>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[at(132 - 45.5, 27), { width: px(200), textAlign: 'center' }, text(18, 'medium', colors.white)]}>
        Balance : {diamonds}
      </Text>
      <Text style={[at(132, 61), { width: px(109), textAlign: 'center', fontFamily: typography.fontFamily.semiBold, fontSize: px(38), lineHeight: px(57), color: colors.white }]}>$0</Text>
    </>
  );
}
