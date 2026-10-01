import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import OtpInput from '../components/OtpInput';
import SelectModal from '../components/SelectModal';
import { COUNTRY_OPTIONS, countryFlagEmoji } from '../constants/countryOptions';
import { OTP_RESEND_COOLDOWN_SECONDS } from '../constants/otp';
import { useCountdown } from '../hooks/useCountdown';
import { RootStackParamList } from '../navigation/types';
import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

// The design only specifies India, and this is its flag exactly as exported, so
// it stays the raster asset. Every other country falls back to its flag emoji.
const flagIndia = require('../assets/flag-in.png');
const whatsappIcon = require('../assets/whatsapp.png');

// "Continue with Phone Number" — the same 402x874 frame in two states, before
// and after the code is requested, measured off the 4x PNG exports. Note this
// screen is inset 18px where the e-mail screen is inset 16px, and its field is
// a pill rather than a 10px-radius box; both are how the design is drawn.
//
// Text is positioned by where its ink sits in the export: with
// lineHeight = 1.4 x fontSize (Poppins' ascent + descent), the cap top lands
// 0.35 x fontSize below the Text box top, which is what `capTop` bakes in.
const capTop = (inkTop: number, fontSize: number) => inkTop - 0.35 * fontSize;

const D = {
  back: { x: 20, y: 88, size: 24 },
  title: { x: 58, inkTop: 93.25, fontSize: 20 },
  // The field's content is a flex row, not the Figma offsets a fixed "+91" was measured
  // at — a longer dial code (e.g. "+359", "+998") doesn't fit the same fixed gap before
  // the divider, so every width here is content-driven instead of an absolute position.
  field: { x: 18, y: 196, width: 366, height: 52, paddingLeft: 27.75, paddingRight: 20 },
  flag: { width: 28.5, height: 18 },
  flagToDialGap: 16,
  dial: { fontSize: 16, marginRight: 14 },
  divider: { width: 1, height: 18, marginRight: 10 },
  phoneInput: { fontSize: 16 },
  // Only in state 1. Icon and label are centred as a pair, so the label keeps
  // its 8px gap even though Poppins measures differently from the design font.
  getCode: { x: 18, y: 264, width: 366, height: 52, iconSize: 22, gap: 8, fontSize: 15 },
  // Only in state 2.
  otp: { x: 18, y: 264, size: 57, gap: 5, radius: 8, count: 6, fontSize: 20 },
  resend: { right: 17, inkTop: 348.75, fontSize: 15 },
  // Not in the Figma frame: confirmation of where the code went, on its own
  // line below the resend link so the two can never collide.
  sentNote: { x: 18, right: 17, inkTop: 381, fontSize: 13 },
  submit: { x: 20, y: 765, width: 363, height: 50, fontSize: 18 },
};

const COUNTRY_SELECT_OPTIONS = COUNTRY_OPTIONS.map((c) => ({
  value: c.code,
  label: c.name,
  leading: countryFlagEmoji(c.code),
}));

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhoneAuth'>;

export default function PhoneAuthScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { px } = useDesignScale();
  const { sendOtp, verifyOtp } = useAuth();

  const [phone, setPhone] = useState('');
  // The TextInput's own border/outline is stripped (see phoneInput style) so the focus
  // ring can't look like a rectangle cut out of the pill — this drives the whole pill's
  // border instead, same as EmailAuthScreen.
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [countryCode, setCountryCode] = useState('IN');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState<string[]>(() => Array(D.otp.count).fill(''));
  // Remounting the boxes on resend clears them and refocuses the first one.
  const [attempt, setAttempt] = useState(0);

  const country =
    COUNTRY_OPTIONS.find((c) => c.code === countryCode) ?? COUNTRY_OPTIONS[0];

  const [pending, setPending] = useState<'send' | 'verify' | null>(null);
  const busy = pending !== null;
  // Which number the last code actually went to, so the screen can say so
  // rather than leaving the user guessing whether the tap registered.
  const [sentTo, setSentTo] = useState<string>();
  const resendIn = useCountdown();

  // The backend joins country_code + digits itself, so the number goes up bare.
  const identifier = {
    channel: 'phone',
    phone: phone.replace(/\D/g, ''),
    country_code: country.dial,
  } as const;

  // Also the resend handler: the backend invalidates any code still in flight
  // for this number when it issues a new one, so resending is the same call.
  async function requestCode() {
    if (busy) return;
    if (identifier.phone.length < 6) {
      Alert.alert('Phone number required', 'Enter your phone number first.');
      return;
    }

    setPending('send');
    try {
      await sendOtp(identifier);
      setCode(Array(D.otp.count).fill(''));
      setAttempt((n) => n + 1);
      setCodeRequested(true);
      setSentTo(`${identifier.country_code} ${identifier.phone}`);
      resendIn.start(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      Alert.alert(
        'Could not send the code',
        error instanceof ApiError ? error.displayMessage : 'Something went wrong. Try again.',
      );
    } finally {
      setPending(null);
    }
  }

  // On success the navigator swaps stacks on its own — a verified account goes
  // straight home, a brand new one lands on profile setup.
  async function submit() {
    if (busy || !codeRequested) return;

    const otp = code.join('');
    if (otp.length !== D.otp.count) {
      Alert.alert('Enter the code', `Type all ${D.otp.count} digits you received.`);
      return;
    }

    setPending('verify');
    try {
      await verifyOtp(identifier, otp);
    } catch (error) {
      Alert.alert(
        'Could not verify',
        error instanceof ApiError ? error.displayMessage : 'Something went wrong. Try again.',
      );
    } finally {
      setPending(null);
    }
  }

  const resendWaiting = busy || resendIn.secondsLeft > 0;
  const resendLabel =
    pending === 'send'
      ? 'Sending…'
      : resendIn.secondsLeft > 0
        ? `Resend in ${resendIn.secondsLeft}s`
        : 'Resend Code';

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);
  const backY = topInset + 8;
  const topShift = D.back.y - backY;

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1, position: 'relative', top: -px(topShift) }}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={{ position: 'absolute', left: px(D.back.x), top: px(D.back.y) }}
        >
        <ArrowLeft size={px(D.back.size)} color={colors.black} strokeWidth={2} />
      </Pressable>

      <Text
        style={[
          styles.title,
          {
            left: px(D.title.x),
            top: px(capTop(D.title.inkTop, D.title.fontSize)),
            fontSize: px(D.title.fontSize),
            lineHeight: px(D.title.fontSize * 1.4),
          },
        ]}
      >
        Continue with Phone Number
      </Text>

      <View
        style={[
          styles.field,
          phoneFocused && styles.fieldFocused,
          {
            left: px(D.field.x),
            top: px(D.field.y),
            width: px(D.field.width),
            height: px(D.field.height),
            borderRadius: px(D.field.height / 2),
            paddingLeft: px(D.field.paddingLeft),
            paddingRight: px(D.field.paddingRight),
          },
        ]}
      >
        <Pressable
          onPress={() => setCountryModalVisible(true)}
          style={[styles.countryButton, { gap: px(D.flagToDialGap) }]}
        >
          {country.code === 'IN' ? (
            <Image
              source={flagIndia}
              resizeMode="contain"
              style={{ width: px(D.flag.width), height: px(D.flag.height) }}
            />
          ) : (
            <Text
              style={[
                styles.flagEmoji,
                {
                  width: px(D.flag.width),
                  height: px(D.flag.height),
                  fontSize: px(D.flag.height),
                  lineHeight: px(D.flag.height),
                },
              ]}
            >
              {countryFlagEmoji(country.code)}
            </Text>
          )}

          <Text
            style={[
              styles.dial,
              {
                marginRight: px(D.dial.marginRight),
                fontSize: px(D.dial.fontSize),
                lineHeight: px(D.dial.fontSize * 1.4),
              },
            ]}
          >
            {country.dial}
          </Text>
        </Pressable>

        <View
          style={[
            styles.divider,
            { height: px(D.divider.height), marginRight: px(D.divider.marginRight) },
          ]}
        />

        <TextInput
          nativeID="phone-number-input"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            // A code already sent was for the old number — editing it even by one digit
            // means Submit would be verifying the wrong identifier, so start over.
            if (codeRequested) setCodeRequested(false);
          }}
          onFocus={() => setPhoneFocused(true)}
          onBlur={() => setPhoneFocused(false)}
          placeholder="Phone Number"
          placeholderTextColor={colors.phonePlaceholder}
          keyboardType="phone-pad"
          style={[styles.phoneInput, { fontSize: px(D.phoneInput.fontSize) }]}
        />
      </View>

      {!codeRequested ? (
        <Pressable
          onPress={requestCode}
          disabled={busy}
          style={[
            styles.getCodeButton,
            busy && styles.disabled,
            {
              left: px(D.getCode.x),
              top: px(D.getCode.y),
              width: px(D.getCode.width),
              height: px(D.getCode.height),
              borderRadius: px(D.getCode.height / 2),
              gap: px(D.getCode.gap),
            },
          ]}
        >
          {pending === 'send' ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Image
              source={whatsappIcon}
              resizeMode="contain"
              style={{ width: px(D.getCode.iconSize), height: px(D.getCode.iconSize) }}
            />
          )}
          <Text style={[styles.getCodeLabel, { fontSize: px(D.getCode.fontSize) }]}>
            {pending === 'send' ? 'Sending…' : 'Get code via WhatsApp'}
          </Text>
        </Pressable>
      ) : (
        <>
          <OtpInput
            key={attempt}
            value={code}
            onChange={setCode}
            autoFocus
            boxSize={px(D.otp.size)}
            gap={px(D.otp.gap)}
            radius={px(D.otp.radius)}
            fontSize={px(D.otp.fontSize)}
            style={{ position: 'absolute', left: px(D.otp.x), top: px(D.otp.y) }}
          />

          <Text
            // No handler at all while it is waiting, so a tap cannot burn one of
            // the three sends the backend allows per hour.
            onPress={resendWaiting ? undefined : requestCode}
            suppressHighlighting
            style={[
              styles.resend,
              resendWaiting && styles.resendWaiting,
              {
                right: px(D.resend.right),
                top: px(capTop(D.resend.inkTop, D.resend.fontSize)),
                fontSize: px(D.resend.fontSize),
                lineHeight: px(D.resend.fontSize * 1.4),
              },
            ]}
          >
            {resendLabel}
          </Text>

          {sentTo && (
            <Text
              numberOfLines={1}
              style={[
                styles.sentNote,
                {
                  left: px(D.sentNote.x),
                  right: px(D.sentNote.right),
                  top: px(capTop(D.sentNote.inkTop, D.sentNote.fontSize)),
                  fontSize: px(D.sentNote.fontSize),
                  lineHeight: px(D.sentNote.fontSize * 1.4),
                },
              ]}
            >
              Code sent to {sentTo}
            </Text>
          )}
        </>
      )}

      <Pressable
        onPress={submit}
        disabled={busy || !codeRequested}
        style={[
          styles.submitButton,
          (busy || !codeRequested) && styles.disabled,
          {
            left: px(D.submit.x),
            top: px(D.submit.y),
            width: px(D.submit.width),
            height: px(D.submit.height),
            borderRadius: px(D.submit.height / 2),
          },
        ]}
      >
        {pending === 'verify' ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={[styles.submitLabel, { fontSize: px(D.submit.fontSize) }]}>Submit</Text>
        )}
      </Pressable>
      </View>

      <SelectModal
        visible={countryModalVisible}
        title="Select Country"
        options={COUNTRY_SELECT_OPTIONS}
        selectedValue={countryCode}
        searchable
        searchPlaceholder="Search countries"
        onSelect={(value) => {
          setCountryCode(value);
          if (codeRequested) setCodeRequested(false);
        }}
        onClose={() => setCountryModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    includeFontPadding: false,
  },
  field: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.phoneFieldBorder,
  },
  fieldFocused: {
    borderColor: colors.black,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dial: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    includeFontPadding: false,
  },
  flagEmoji: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  divider: {
    width: 1,
    backgroundColor: colors.textMuted,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
    // See EmailAuthScreen's emailInput — same web focus-ring/border fix.
    borderWidth: 0,
    outlineWidth: 0,
    ...({ appearance: 'none', boxShadow: 'none', borderStyle: 'none' } as object),
  },
  getCodeButton: {
    position: 'absolute',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getCodeLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    includeFontPadding: false,
  },
  resend: {
    position: 'absolute',
    textAlign: 'right',
    fontFamily: typography.fontFamily.medium,
    color: colors.actionOrange,
    includeFontPadding: false,
  },
  resendWaiting: {
    // Muted while it is not an action — the orange is the call to tap.
    color: colors.textMuted,
  },
  sentNote: {
    position: 'absolute',
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  disabled: {
    opacity: 0.5,
  },
  submitButton: {
    position: 'absolute',
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.white,
    includeFontPadding: false,
  },
});
