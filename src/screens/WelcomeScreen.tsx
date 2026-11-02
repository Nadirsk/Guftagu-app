import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, EarthLock, MailMinus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../api/client';
import { useSocialSignIn } from '../auth/social';
import LanguageModal from '../components/LanguageModal';
import FacebookIcon from '../components/icons/FacebookIcon';
import GoogleIcon from '../components/icons/GoogleIcon';
import PhoneIcon from '../components/icons/PhoneIcon';
import { findLanguage } from '../i18n/languages';
import { RootStackParamList } from '../navigation/types';
import { useDesignScale } from '../theme/layout';
import { colors, radii, typography } from '../theme/tokens';

const background = require('../assets/welcome-bg.png');
const logo = require('../assets/guftagu-logo.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

// Figma node 388:1843 ("onboarding") — every number below is a design pixel on
// the 402x874 frame, positioned absolutely like the design.
const D = {
  background: { x: -62, y: -45, width: 525, height: 927 }, // node 388:1886 "image 205672"
  scrim: { x: -3, width: 408, height: 622 }, // node 388:1888, pinned to the frame's bottom
  languagePill: { x: 18, y: 68, width: 145, height: 38, padding: 10 }, // node 388:1849
  // Already rotated -6.39deg in the export (see ProfileSetupScreen), so no transform.
  logo: { x: 103, y: 198, width: 197, height: 54.3 }, // node 388:1871
  welcome: { y: 285, width: 178 }, // node 388:1846
  buttons: { x: 18, y: 431, width: 365, gap: 14, height: 52 }, // node 388:1853
  divider: { y: 574, lineY: 585, leftX: 127, rightX: 254, lineWidth: 24 }, // nodes 388:1872/1873/1874
  circles: { y: 615, mailX: 130, phoneX: 217, size: 52 }, // nodes 388:1861 / 388:1865
  // Wider than Figma's 232 so a longer translation stays on one line.
  signUp: { y: 812, width: 370 }, // node 388:1848
  fontSize: { body: 14, button: 15, heading: 32 },
};

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, busy } = useSocialSignIn();
  const { t, i18n } = useTranslation();
  const { px } = useDesignScale();
  const [languageOpen, setLanguageOpen] = useState(false);

  // One handler for both providers — they differ only in which token the SDK
  // hands back, and `signIn` already covers that. On success the navigator
  // swaps stacks by itself.
  async function socialSignIn(provider: 'google' | 'facebook') {
    try {
      await signIn(provider);
    } catch (error) {
      Alert.alert(
        t('welcome.signInFailed'),
        error instanceof ApiError
          ? error.displayMessage
          : error instanceof Error
            ? error.message
            : t('common.somethingWrong'),
      );
    }
  }

  const abs = (x: number, y: number, width?: number, height?: number) => ({
    position: 'absolute' as const,
    left: px(x),
    top: px(y),
    ...(width !== undefined && { width: px(width) }),
    ...(height !== undefined && { height: px(height) }),
  });

  return (
    <View style={styles.screen}>
      <Image
        source={background}
        resizeMode="cover"
        style={abs(D.background.x, D.background.y, D.background.width, D.background.height)}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.71)', 'rgba(0,0,0,0.71)']}
        locations={[0, 0.38531, 1]}
        style={{
          position: 'absolute',
          left: px(D.scrim.x),
          bottom: 0,
          width: px(D.scrim.width),
          height: px(D.scrim.height),
        }}
      />

      <Pressable
        onPress={() => setLanguageOpen(true)}
        style={[
          styles.languagePill,
          abs(D.languagePill.x, D.languagePill.y),
          {
            minWidth: px(D.languagePill.width),
            height: px(D.languagePill.height),
            paddingHorizontal: px(D.languagePill.padding),
          },
        ]}
      >
        <EarthLock size={px(19)} color={colors.white} strokeWidth={2} />
        <Text style={[styles.languageText, { fontSize: px(D.fontSize.body) }]}>
          {findLanguage(i18n.language).native}
        </Text>
        <ChevronRight size={px(23)} color={colors.white} strokeWidth={2} />
      </Pressable>

      <Image
        source={logo}
        resizeMode="contain"
        style={abs(D.logo.x, D.logo.y, D.logo.width, D.logo.height)}
      />

      <Text
        style={[
          styles.welcome,
          abs((402 - D.welcome.width) / 2, D.welcome.y, D.welcome.width),
          { fontSize: px(D.fontSize.heading) },
        ]}
      >
        {t('welcome.title')}
      </Text>

      <View
        style={[
          abs(D.buttons.x, D.buttons.y, D.buttons.width),
          { gap: px(D.buttons.gap) },
        ]}
      >
        <Pressable
          onPress={() => socialSignIn('google')}
          disabled={busy !== null}
          style={[
            styles.authButton,
            styles.googleButton,
            { height: px(D.buttons.height), gap: px(19) },
            busy !== null && styles.disabled,
          ]}
        >
          {busy === 'google' ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <>
              <GoogleIcon size={px(24)} />
              <Text style={[styles.googleButtonText, { fontSize: px(D.fontSize.button) }]}>
                {t('welcome.google')}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => socialSignIn('facebook')}
          disabled={busy !== null}
          style={[
            styles.authButton,
            styles.facebookButton,
            { height: px(D.buttons.height), gap: px(19) },
            busy !== null && styles.disabled,
          ]}
        >
          {busy === 'facebook' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <FacebookIcon size={px(24)} />
              <Text style={[styles.facebookButtonText, { fontSize: px(D.fontSize.button) }]}>
                {t('welcome.facebook')}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={[styles.dividerLine, abs(D.divider.leftX, D.divider.lineY, D.divider.lineWidth, 1)]} />
      <Text
        style={[
          styles.dividerText,
          abs(0, D.divider.y, 402),
          { fontSize: px(D.fontSize.button) },
        ]}
      >
        {t('welcome.otherLogin')}
      </Text>
      <View style={[styles.dividerLine, abs(D.divider.rightX, D.divider.lineY, D.divider.lineWidth, 1)]} />

      <Pressable
        onPress={() => navigation.navigate('EmailAuth')}
        style={abs(D.circles.mailX, D.circles.y, D.circles.size, D.circles.size)}
      >
        <LinearGradient colors={colors.goldGradient} style={styles.iconCircle}>
          <MailMinus size={px(24)} color={colors.white} strokeWidth={2} />
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('PhoneAuth')}
        style={abs(D.circles.phoneX, D.circles.y, D.circles.size, D.circles.size)}
      >
        <LinearGradient colors={colors.darkGradient} style={styles.iconCircle}>
          <PhoneIcon width={px(19.75)} height={px(22.25)} />
        </LinearGradient>
      </Pressable>

      {/* In Figma this link sits underneath the photo and scrim, so it never shows;
          it is kept and drawn on top, with the muted prefix lifted to white so it
          reads against the dark scrim. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.signUpText,
          abs((402 - D.signUp.width) / 2, D.signUp.y, D.signUp.width),
          { fontSize: px(D.fontSize.body) },
        ]}
      >
        {t('welcome.noAccount')}{' '}
        <Text style={styles.signUpLink} onPress={() => navigation.navigate('ProfileSetup')}>
          {t('welcome.signUp')}
        </Text>
      </Text>

      <LanguageModal visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    overflow: 'hidden',
    // The design is positioned with physical left/top pixels. In an RTL language
    // React Native mirrors `left` and row order, which pushed the language pill
    // to the right; pin this screen to LTR so it matches Figma in every language.
    direction: 'ltr',
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.pill,
    backgroundColor: colors.languagePillBg,
  },
  languageText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
  },
  welcome: {
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  authButton: {
    width: '100%',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  googleButtonText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.black,
  },
  facebookButton: {
    backgroundColor: colors.facebookBlue,
    borderWidth: 1,
    borderColor: colors.white,
  },
  facebookButtonText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
  },
  dividerLine: {
    backgroundColor: colors.white,
  },
  dividerText: {
    fontFamily: typography.fontFamily.regular,
    color: colors.white,
    textAlign: 'center',
  },
  iconCircle: {
    flex: 1,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    fontFamily: typography.fontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  signUpLink: {
    color: colors.linkBlue,
  },
});
