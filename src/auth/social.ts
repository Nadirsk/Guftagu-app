import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from './AuthContext';

// Required by expo-auth-session so the browser tab closes itself once the
// provider redirects back.
WebBrowser.maybeCompleteAuthSession();

/**
 * From `.env` (see .env.example). A provider with a blank id is reported as not
 * ready rather than failing at the tap, so the buttons can say so.
 *
 * The backend verifies a Google **ID token** and a Facebook **access token**
 * (SocialTokenVerifier), which is why the two requests below are of different
 * kinds. Facebook also needs FACEBOOK_APP_ID/SECRET set on the server.
 *
 * Each value is written out in full because that is the only form Expo inlines.
 */
export const SOCIAL_CONFIG = {
  google: {
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
  facebook: {
    appId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',
  },
};

export type SocialProvider = 'google' | 'facebook';

/**
 * Only the id for the running platform decides whether Google is usable — a web
 * client id does nothing for a tap on Android.
 */
const googlePlatformClientId =
  Platform.select({
    ios: SOCIAL_CONFIG.google.iosClientId,
    android: SOCIAL_CONFIG.google.androidClientId,
    default: SOCIAL_CONFIG.google.webClientId,
  }) ?? '';

export function useSocialSignIn() {
  const { socialSignIn } = useAuth();
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  // These ids go in blank rather than as undefined on purpose: the providers
  // only reject an *undefined* id, and they do it while the hook renders — long
  // before `configured` below gets a chance to stop anything. Coercing '' to
  // undefined is what crashed the app at startup on a checkout with no ids yet.
  // A blank id builds a request nobody can reach, because `signIn` refuses
  // first.
  const [, , promptGoogle] = Google.useIdTokenAuthRequest({
    androidClientId: SOCIAL_CONFIG.google.androidClientId,
    iosClientId: SOCIAL_CONFIG.google.iosClientId,
    webClientId: SOCIAL_CONFIG.google.webClientId,
  });

  const [, , promptFacebook] = Facebook.useAuthRequest({
    clientId: SOCIAL_CONFIG.facebook.appId,
  });

  const configured: Record<SocialProvider, boolean> = {
    google: Boolean(googlePlatformClientId),
    facebook: Boolean(SOCIAL_CONFIG.facebook.appId),
  };

  /**
   * Returns the signed-in result, or null when the user backed out — both are
   * normal outcomes, so only a real failure throws.
   */
  async function signIn(provider: SocialProvider) {
    if (!configured[provider]) {
      throw new Error(`${provider === 'google' ? 'Google' : 'Facebook'} sign-in is not configured yet`);
    }

    setBusy(provider);
    try {
      const result = provider === 'google' ? await promptGoogle() : await promptFacebook();

      if (result.type !== 'success') return null;

      const providerToken =
        provider === 'google'
          ? result.params?.id_token ?? result.authentication?.idToken
          : result.authentication?.accessToken;

      if (!providerToken) {
        throw new Error('Sign-in did not return a token');
      }

      return await socialSignIn(provider, providerToken);
    } finally {
      setBusy(null);
    }
  }

  return { signIn, busy, configured };
}
