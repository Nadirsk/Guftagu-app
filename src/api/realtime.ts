import EchoModule from 'laravel-echo';
import PusherModule from 'pusher-js';

import { API_BASE_URL } from './client';

/**
 * Reverb (Pusher protocol) for the room's presence channel. Expo only inlines
 * `process.env.EXPO_PUBLIC_*` when written out in full, so each one is read here by name.
 *
 * Reverb listens on its own port (8080), which the ngrok tunnel to the API does not
 * carry. On a USB-connected phone, `adb reverse tcp:8080 tcp:8080` plus
 * `EXPO_PUBLIC_REVERB_HOST=127.0.0.1` reaches it; elsewhere it needs a tunnel of its own.
 * With no key set, realtime is off and the screens keep polling.
 */
const KEY = process.env.EXPO_PUBLIC_REVERB_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_REVERB_HOST ?? '';
const PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080);
const TLS = process.env.EXPO_PUBLIC_REVERB_TLS === 'true';

/**
 * Metro's interop hands these packages back wrapped, and Echo then does `new` on the
 * wrapper ("Object cannot be used as a constructor"). pusher-js's React Native build
 * exports the class as `module.exports.Pusher`; laravel-echo's CJS build as `.default`.
 */
type Wrapped<T> = T | { default?: T; Pusher?: T };
function unwrap<T>(mod: Wrapped<T>, key: 'default' | 'Pusher'): T {
  const inner = (mod as { default?: T; Pusher?: T })[key];
  return (typeof inner === 'function' ? inner : mod) as T;
}
const Echo = unwrap(EchoModule as Wrapped<typeof EchoModule>, 'default');
const Pusher = unwrap(PusherModule as Wrapped<typeof PusherModule>, 'Pusher');

export const realtimeConfigured = Boolean(KEY && HOST);

/** `https://host/api/v1` → `https://host` — `/broadcasting/auth` lives at the root. */
const ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

let echo: InstanceType<typeof Echo<'reverb'>> | null = null;
let echoToken: string | null = null;

/** One socket for the whole app, rebuilt when the signed-in token changes. */
export function getEcho(token: string): InstanceType<typeof Echo<'reverb'>> | null {
  if (!realtimeConfigured) return null;
  if (echo && echoToken === token) return echo;

  echo?.disconnect();
  (globalThis as { Pusher?: unknown }).Pusher = Pusher;
  echo = new Echo({
    broadcaster: 'reverb',
    key: KEY,
    wsHost: HOST,
    wsPort: PORT,
    wssPort: PORT,
    forceTLS: TLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${ORIGIN}/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'ngrok-skip-browser-warning': '1' } },
  });
  echoToken = token;
  if (__DEV__) {
    const conn = (echo.connector as { pusher?: { connection: { bind: (e: string, f: (x: unknown) => void) => void } } }).pusher?.connection;
    conn?.bind('state_change', (s) => console.log('[realtime] state', JSON.stringify(s)));
    conn?.bind('error', (e) => console.log('[realtime] error', JSON.stringify(e)));
  }
  return echo;
}

export function closeEcho() {
  echo?.disconnect();
  echo = null;
  echoToken = null;
}
