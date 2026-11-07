import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { api, ApiError } from '../api/client';
import type { AvatarFrame } from '../components/UserAvatar';

const TOKEN_KEY = 'guftagu.auth.token';
const DEVICE_KEY = 'guftagu.device.id';

/**
 * expo-secure-store has no web implementation (Android/iOS only) — calling it on
 * web throws instead of no-op'ing, so web falls back to localStorage here.
 */
export const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return window.localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export type AuthUser = {
  uuid: string;
  guftagu_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** The frame they wear from the Item Bag; null when none. */
  frame?: AvatarFrame | null;
  gender: string | null;
  date_of_birth: string | null;
  country: string | null;
  /** Settings → Language; a code from the Language screen (en, hi, mr, ur, bn). */
  language?: string | null;
  /** Settings → Notification toggles, keyed by the screen's switches. */
  notification_prefs?: Record<string, boolean> | null;
  status: string;
  is_profile_complete: boolean;
};

type SignInResult = {
  token: string;
  expires_at: string;
  is_new_user: boolean;
  requires_profile_setup: boolean;
  user: AuthUser;
};

/**
 * 'loading' while the stored token is being checked, then one of the three
 * states the navigator branches on. `needsProfile` is the backend's
 * `requires_profile_setup`, i.e. a signed-in account with no profile yet.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

type OtpIdentifier =
  | { channel: 'email'; email: string }
  | { channel: 'phone'; phone: string; country_code: string };

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /**
   * The bearer token, for feature screens that call `api()` themselves. Auth
   * calls stay in here; anything else (search, follow, feed) reads this rather
   * than growing a method on this context for every endpoint in the app.
   */
  token: string | null;
  sendOtp: (identifier: OtpIdentifier) => Promise<void>;
  verifyOtp: (identifier: OtpIdentifier, otp: string) => Promise<SignInResult>;
  socialSignIn: (provider: 'google' | 'facebook', providerToken: string) => Promise<SignInResult>;
  completeProfile: (profile: {
    display_name: string;
    gender: string;
    date_of_birth: string;
    country?: string | null;
    // Unverified — only reaches this screen when signup (OTP/social) didn't already set it.
    email?: string | null;
    phone?: string | null;
  }) => Promise<void>;
  /**
   * `PATCH /profile` (Settings → Account, Language, Notification): saves the fields and
   * swaps in the user the server sends back, so every screen shows the change at once.
   */
  updateProfile: (fields: {
    display_name?: string;
    avatar_url?: string | null;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'undisclosed';
    language?: string | null;
    notification_prefs?: Record<string, boolean>;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The backend keys tokens and push registration on a stable device id, so it is
 * generated once and kept — not regenerated per sign-in, or every login would
 * look like a new device.
 */
async function deviceInfo() {
  let deviceId = await storage.getItemAsync(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await storage.setItemAsync(DEVICE_KEY, deviceId);
  }

  return {
    device_id: deviceId,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    app_version: Constants.expoConfig?.version ?? undefined,
    os_version: String(Platform.Version),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const applySession = useCallback(async (nextToken: string, nextUser: AuthUser) => {
    await storage.setItemAsync(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setStatus(nextUser.is_profile_complete ? 'ready' : 'needsProfile');
  }, []);

  const clearSession = useCallback(async () => {
    await storage.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Restore on launch. A stored token can still be expired or revoked, so it is
  // only trusted once /auth/me accepts it.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await storage.getItemAsync(TOKEN_KEY);
      if (!stored) {
        if (!cancelled) setStatus('signedOut');
        return;
      }

      try {
        const data = await api<{ user: AuthUser }>('/auth/me', { token: stored });
        if (cancelled) return;
        setToken(stored);
        setUser(data.user);
        setStatus(data.user.is_profile_complete ? 'ready' : 'needsProfile');
      } catch (error) {
        if (cancelled) return;
        // Only a rejected token means signed out — a dead network should leave
        // the stored token alone so the next launch can still use it.
        if (error instanceof ApiError && error.status === 401) {
          await storage.deleteItemAsync(TOKEN_KEY);
        }
        setStatus('signedOut');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,

      sendOtp: async (identifier) => {
        await api('/auth/otp/send', {
          method: 'POST',
          body: { ...identifier, purpose: 'auth' },
        });
      },

      verifyOtp: async (identifier, otp) => {
        const result = await api<SignInResult>('/auth/otp/verify', {
          method: 'POST',
          body: { ...identifier, otp, device: await deviceInfo() },
        });
        await applySession(result.token, result.user);
        return result;
      },

      socialSignIn: async (provider, providerToken) => {
        const result = await api<SignInResult>('/auth/social', {
          method: 'POST',
          body: { provider, token: providerToken, device: await deviceInfo() },
        });
        await applySession(result.token, result.user);
        return result;
      },

      completeProfile: async (profile) => {
        const data = await api<{ user: AuthUser }>('/auth/profile/setup', {
          method: 'POST',
          body: profile,
          token,
        });
        setUser(data.user);
        setStatus(data.user.is_profile_complete ? 'ready' : 'needsProfile');
      },

      token,

      updateProfile: async (fields) => {
        const data = await api<{ user: AuthUser }>('/profile', { method: 'PATCH', body: fields, token });
        setUser(data.user);
      },

      signOut: async () => {
        // Best effort: if revoking server-side fails the local session still goes.
        try {
          await api('/auth/logout', { method: 'POST', token });
        } catch {
          /* ignore */
        }
        await clearSession();
      },
    }),
    [applySession, clearSession, status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
