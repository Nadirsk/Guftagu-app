import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { OTP_RESEND_COOLDOWN_SECONDS } from '../constants/otp';
import { useCountdown } from '../hooks/useCountdown';
import { RootStackParamList } from '../navigation/types';
import { useDesignScale } from '../theme/layout';
import { colors, typography } from '../theme/tokens';

// "Continue with E-mail Address" — Figma nodes 297:3367 (before the code is
// requested) and 299:3419 (after). Both are the same 402x874 frame, measured
// off the 4x PNG exports, so every number here is a design pixel.
//
// Text is positioned by where its ink sits in the export: with
// lineHeight = 1.4 x fontSize (Poppins' ascent + descent), the cap top lands
// 0.35 x fontSize below the Text box top, which is what `capTop` bakes in.
const capTop = (inkTop: number, fontSize: number) => inkTop - 0.35 * fontSize;

const D = {
  back: { x: 20, y: 88, size: 24 },
  title: { x: 58, inkTop: 93.5, fontSize: 20 },
  label: { x: 16, inkTop: 188, fontSize: 18 },
  emailBox: {
    x: 16,
    y: 215,
    width: 370,
    height: 54,
    radius: 10,
    paddingLeft: 20,
    fontSize: 15,
  },
  // Only in state 1. Slightly wider than the email box above it — that is how
  // the design is drawn, not a rounding slip. Icon and label are centred as a
  // pair, so the label keeps its 8px gap even though Poppins measures
  // differently from the design font.
  getCode: { x: 16, y: 285, width: 373, height: 52, iconSize: 22, gap: 8, fontSize: 15 },
  // Only in state 2.
  otp: { x: 16, y: 287, size: 57, gap: 5, radius: 8, count: 6, fontSize: 20 },
  resend: { right: 16, inkTop: 363.25, fontSize: 15 },
  // Not in the Figma frame: confirmation of where the code went, on its own
  // line below the resend link so the two can never collide.
  sentNote: { x: 16, right: 16, inkTop: 395, fontSize: 13 },
  submit: { x: 20, y: 773, width: 363, height: 50, fontSize: 18 },
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'EmailAuth'>;

export default function EmailAuthScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { px } = useDesignScale();
  const { sendOtp, verifyOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState<string[]>(() => Array(D.otp.count).fill(''));
  // Remounting the boxes on resend clears them and refocuses the first one.
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<'send' | 'verify' | null>(null);
  const busy = pending !== null;
  // Where the last code actually went, so the screen can say so rather than
  // leaving the user guessing whether the tap registered.
  const [sentTo, setSentTo] = useState<string>();
  const resendIn = useCountdown();

  const identifier = { channel: 'email', email: email.trim() } as const;

  // Also the resend handler: the backend invalidates any code still in flight
  // for this address when it issues a new one, so resending is the same call.
  async function requestCode() {
    if (busy) return;
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email address first.');
      return;
    }

    setPending('send');
    try {
      await sendOtp(identifier);
      setCode(Array(D.otp.count).fill(''));
      setAttempt((n) => n + 1);
      setCodeRequested(true);
      setSentTo(identifier.email);
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
      Alert.alert('Enter the code', `Type all ${D.otp.count} digits from your email.`);
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
        Continue with E-mail Address
      </Text>

      <Text
        style={[
          styles.label,
          {
            left: px(D.label.x),
            top: px(capTop(D.label.inkTop, D.label.fontSize)),
            fontSize: px(D.label.fontSize),
            lineHeight: px(D.label.fontSize * 1.4),
          },
        ]}
      >
        Email
      </Text>

      <View
        style={[
          styles.emailBox,
          {
            left: px(D.emailBox.x),
            top: px(D.emailBox.y),
            width: px(D.emailBox.width),
            height: px(D.emailBox.height),
            borderRadius: px(D.emailBox.radius),
          },
        ]}
      >
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="abc@gmail.com"
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.emailInput,
            {
              paddingHorizontal: px(D.emailBox.paddingLeft),
              fontSize: px(D.emailBox.fontSize),
            },
          ]}
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
            <Mail size={px(D.getCode.iconSize)} color={colors.black} strokeWidth={2} />
          )}
          <Text style={[styles.getCodeLabel, { fontSize: px(D.getCode.fontSize) }]}>
            {pending === 'send' ? 'Sending…' : 'Get code via Email'}
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
  label: {
    position: 'absolute',
    fontFamily: typography.fontFamily.medium,
    color: colors.black,
    includeFontPadding: false,
  },
  emailBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emailInput: {
    height: '100%',
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
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
