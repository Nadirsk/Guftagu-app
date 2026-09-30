import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, EarthLock, MailMinus } from 'lucide-react-native';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { useSocialSignIn } from '../auth/social';
import FacebookIcon from '../components/icons/FacebookIcon';
import GoogleIcon from '../components/icons/GoogleIcon';
import PhoneIcon from '../components/icons/PhoneIcon';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/tokens';

const logo = require('../assets/guftagu-logo.png');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, busy } = useSocialSignIn();

  // One handler for both providers — they differ only in which token the SDK
  // hands back, and `signIn` already covers that. On success the navigator
  // swaps stacks by itself.
  async function socialSignIn(provider: 'google' | 'facebook') {
    try {
      await signIn(provider);
    } catch (error) {
      Alert.alert(
        'Sign-in failed',
        error instanceof ApiError
          ? error.displayMessage
          : error instanceof Error
            ? error.message
            : 'Something went wrong. Try again.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.languageRow}>
        <Pressable style={styles.languagePill}>
          <EarthLock size={19} color={colors.white} strokeWidth={2} />
          <Text style={styles.languageText}>English</Text>
          <ChevronRight size={23} color={colors.white} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={styles.welcome}>Welcome</Text>

        <View style={styles.buttonGroup}>
          <Pressable
            onPress={() => socialSignIn('google')}
            disabled={busy !== null}
            style={[styles.authButton, styles.googleButton, busy !== null && styles.disabled]}
          >
            <GoogleIcon size={24} />
            <Text style={styles.googleButtonText}>Sign In With Google</Text>
          </Pressable>

          <Pressable
            onPress={() => socialSignIn('facebook')}
            disabled={busy !== null}
            style={[styles.authButton, styles.facebookButton, busy !== null && styles.disabled]}
          >
            <FacebookIcon size={24} />
            <Text style={styles.facebookButtonText}>Sign In With Facebook</Text>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Other Login</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.iconRow}>
          <Pressable onPress={() => navigation.navigate('EmailAuth')}>
            <LinearGradient colors={colors.goldGradient} style={styles.iconCircle}>
              <MailMinus size={24} color={colors.white} strokeWidth={2} />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('PhoneAuth')}>
            <LinearGradient colors={colors.darkGradient} style={styles.iconCircle}>
              <PhoneIcon width={19.75} height={22.25} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={styles.signUpRow}>
        <Text style={styles.signUpText}>
          Don’t have an account ?{' '}
          <Text style={styles.signUpLink} onPress={() => navigation.navigate('ProfileSetup')}>
            SIGN UP
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  languageRow: {
    paddingHorizontal: spacing.screenPaddingHorizontal,
    paddingTop: 20,
  },
  languagePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.languagePill.iconGap,
    height: spacing.languagePill.height,
    paddingHorizontal: spacing.languagePill.paddingHorizontal,
    borderRadius: radii.pill,
    backgroundColor: colors.languagePillBg,
    borderWidth: 1,
    borderColor: colors.white,
  },
  languageText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingHorizontal,
  },
  logo: {
    width: 172,
    height: 47,
    marginTop: 90,
    transform: [{ rotate: '-6.39deg' }],
  },
  welcome: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.heading,
    color: colors.black,
    marginTop: 24,
  },
  buttonGroup: {
    width: '100%',
    marginTop: 40,
    gap: spacing.gaps.authButtons,
  },
  disabled: {
    opacity: 0.5,
  },
  authButton: {
    width: '100%',
    height: spacing.authButton.height,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.authButton.iconGap,
  },
  googleButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  googleButtonText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.button,
    color: colors.black,
  },
  facebookButton: {
    backgroundColor: colors.facebookBlue,
  },
  facebookButtonText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.button,
    color: colors.white,
  },
  dividerRow: {
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gaps.dividerRow,
  },
  dividerLine: {
    width: spacing.divider.lineWidth,
    height: spacing.divider.lineHeight,
    backgroundColor: colors.black,
  },
  dividerText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.button,
    color: colors.black,
  },
  iconRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: spacing.gaps.iconRow,
  },
  iconCircle: {
    width: spacing.iconCircle.size,
    height: spacing.iconCircle.size,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpRow: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  signUpText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
  signUpLink: {
    color: colors.linkBlue,
  },
});
