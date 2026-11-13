import { createNavigationContainerRef } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Alert, Animated, Easing, Image, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Power, Volume2, VolumeX } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useRoomMusic, type RoomMusicApi } from './music';
import { type RoomApi, useRoom } from './useRoom';
import { useVoice } from './voice';

/** Lets the pill open the room again from outside any screen. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Everything that has to outlive the room *screen*: the room's state and chat, its realtime
 * channel, the voice connections and the room music. They run in {@link RuntimeHost}, above the
 * navigator, so Back / Minimize only hides the screen — you keep hearing, and being heard, until
 * you Exit.
 */
export type RoomRuntime = {
  uuid: string;
  room: RoomApi;
  voice: ReturnType<typeof useVoice>;
  music: RoomMusicApi;
  speakerOff: boolean;
  setSpeakerOff: (off: boolean | ((prev: boolean) => boolean)) => void;
};

// A tiny external store: the host publishes after each render, screens and the pill subscribe.
let current: RoomRuntime | null = null;
const listeners = new Set<() => void>();
const runtimeStore = {
  get: () => current,
  set(next: RoomRuntime | null) {
    current = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** The live room, or null while it is still joining / when none is open. */
export function useRoomRuntime(): RoomRuntime | null {
  return useSyncExternalStore(runtimeStore.subscribe, runtimeStore.get);
}

type Session = {
  /** The room that is open or minimised, if any. */
  activeUuid: string | null;
  minimized: boolean;
  /** The room screen opened: make this the live room (leaving a different one that was minimised). */
  enter: (uuid: string) => void;
  /** Back / Minimize: hide the screen, stay in the room (seat, audio and chat window kept). */
  minimize: () => void;
  /** The user left through the exit dialog (already told the server): tear the live room down. */
  end: () => void;
  /** The pill's Exit: leave server-side — this also vacates the seat — and tear down. */
  exit: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);

export function RoomSessionProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [activeUuid, setActiveUuid] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const leaveOnServer = useCallback(
    (uuid: string) => api(`/rooms/${uuid}/leave`, { method: 'POST', token }).catch(() => undefined),
    [token],
  );

  const activeRef = useRef<string | null>(null);
  activeRef.current = activeUuid;

  const enter = useCallback(
    (uuid: string) => {
      const prev = activeRef.current;
      // Opening a different room while one is minimised walks out of the old one.
      if (prev && prev !== uuid) leaveOnServer(prev);
      setActiveUuid(uuid);
      setMinimized(false);
    },
    [leaveOnServer],
  );
  const minimize = useCallback(() => setMinimized(true), []);
  const end = useCallback(() => {
    setActiveUuid(null);
    setMinimized(false);
  }, []);
  const exit = useCallback(async () => {
    const uuid = activeUuid;
    end();
    if (uuid) await leaveOnServer(uuid);
  }, [activeUuid, end, leaveOnServer]);

  // Signing out drops the room; the server times the old membership out.
  useEffect(() => {
    if (!token) end();
  }, [token, end]);

  const value = useMemo(
    () => ({ activeUuid, minimized, enter, minimize, end, exit }),
    [activeUuid, minimized, enter, minimize, end, exit],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {activeUuid ? <RuntimeHost key={activeUuid} uuid={activeUuid} /> : null}
    </Ctx.Provider>
  );
}

export function useRoomSession(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRoomSession must be used inside RoomSessionProvider');
  return ctx;
}

/** Owns the hooks that used to live in the room screen. Renders nothing. */
function RuntimeHost({ uuid }: { uuid: string }) {
  const { token } = useAuth();
  const room = useRoom(uuid);
  const [speakerOff, setSpeakerOff] = useState(false);
  const { snapshot } = room;

  const me = room.me;
  const seats = snapshot?.seats ?? [];
  const mySeat = seats.find((x) => x.user?.uuid === me?.uuid) ?? null;
  // Room music (Mazag): played on this phone and mixed into the mic, so only from a seat.
  const music = useRoomMusic({ seated: Boolean(mySeat), micOpen: Boolean(mySeat && !mySeat.muted) });
  const voice = useVoice({
    roomUuid: uuid,
    token,
    meUuid: me?.uuid,
    seated: seats.flatMap((x) => (x.user ? [{ seat: x.seat_number, uuid: x.user.uuid }] : [])),
    // `muted` on a seat already folds in the host's mute, not only my own.
    micOpen: Boolean(mySeat && !mySeat.muted),
    // With a song on, the voice track stays live even with the mic off — the mixer then
    // sends the song alone.
    musicOn: music.isPlaying,
    speakerOff,
    iceServers: snapshot?.signaling?.ice_servers ?? [{ urls: 'stun:stun.l.google.com:19302' }],
    ready: Boolean(snapshot),
    video: snapshot?.room.kind === 'video' || snapshot?.room.kind === 'video_party',
    cameraOn: Boolean(mySeat?.camera_on),
  });

  useEffect(() => {
    runtimeStore.set({ uuid, room, voice, music, speakerOff, setSpeakerOff });
  });
  useEffect(() => () => runtimeStore.set(null), []);

  return null;
}

/** Turns its child round and round, like a record — the pill's picture. */
function Spinning({ children }: { children: ReactNode }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.avatar, { transform: [{ rotate }] }]}>{children}</Animated.View>;
}

/**
 * Mazag's minimised room: a capsule floating over every other screen — power (exit), speaker
 * (hear / mute the room) and the room's picture, which opens it again.
 */
export function MiniRoomPill() {
  const { activeUuid, minimized, end, exit } = useRoomSession();
  const rt = useRoomRuntime();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Drag it anywhere: it stays where it is dropped (kept inside the screen) and comes back
  // there the next time the room is minimised.
  const pos = useRef(
    new Animated.ValueXY(lastPillPos ?? { x: screenW - 134, y: screenH - insets.bottom - 96 - 38 }),
  ).current;
  const size = useRef({ w: 130, h: 38 });
  const bounds = useRef({ screenW, screenH, top: insets.top, bottom: insets.bottom });
  bounds.current = { screenW, screenH, top: insets.top, bottom: insets.bottom };
  const start = useRef({ x: 0, y: 0 });
  const place = useCallback(
    (x: number, y: number) => {
      const b = bounds.current;
      const nx = Math.min(Math.max(x, 4), b.screenW - size.current.w - 4);
      const ny = Math.min(Math.max(y, b.top + 4), b.screenH - size.current.h - b.bottom - 4);
      return { x: nx, y: ny };
    },
    [],
  );
  const pan = useRef(
    PanResponder.create({
      // Only a real drag takes the touch; a plain tap still reaches the buttons.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        start.current = { x: (pos.x as unknown as { __getValue(): number }).__getValue(), y: (pos.y as unknown as { __getValue(): number }).__getValue() };
      },
      onPanResponderMove: (_, g) => pos.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy }),
      onPanResponderRelease: (_, g) => {
        const to = place(start.current.x + g.dx, start.current.y + g.dy);
        lastPillPos = to;
        Animated.spring(pos, { toValue: to, useNativeDriver: false, bounciness: 6 }).start();
      },
    }),
  ).current;

  // Kicked or closed while minimised: nothing left to come back to.
  const fatal = rt?.room.fatal;
  const kicked = rt?.room.kicked;
  useEffect(() => {
    if (!minimized || !fatal) return;
    // Kicked or blocked while browsing elsewhere: still say who did it and for how long.
    if (kicked) Alert.alert('Removed from room', fatal);
    end();
  }, [minimized, fatal, kicked, end]);

  if (!minimized || !activeUuid || !rt || rt.uuid !== activeUuid) return null;

  const snap = rt.room.snapshot;
  const picture = snap?.owner?.avatar_url ?? snap?.room.background_url ?? null;
  const name = snap?.room.name ?? '';

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        {...pan.panHandlers}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          size.current = { w: width, h: height };
          // First time: rest against the right edge, just above the bottom bar.
          if (lastPillPos === null) {
            const to = place(screenW, screenH - insets.bottom - 96 - height);
            lastPillPos = to;
            pos.setValue(to);
          }
        }}
        style={[styles.floater, { transform: pos.getTranslateTransform() }]}
      >
      <LinearGradient
        colors={['#FFB75E', '#FF7A1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        <Pressable onPress={exit} hitSlop={8} accessibilityLabel="Exit room" style={styles.icon}>
          <Power size={15} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          onPress={() => rt.setSpeakerOff((v) => !v)}
          hitSlop={8}
          accessibilityLabel={rt.speakerOff ? 'Turn speaker on' : 'Turn speaker off'}
          style={styles.icon}
        >
          {rt.speakerOff ? (
            <VolumeX size={15} color="#FFFFFF" strokeWidth={2.4} />
          ) : (
            <Volume2 size={15} color="#FFFFFF" strokeWidth={2.4} />
          )}
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          onPress={() => navigationRef.isReady() && navigationRef.navigate('Room', { uuid: activeUuid })}
          accessibilityLabel={`Open ${name}`}
          style={styles.avatarRing}
        >
          <Spinning>
            {picture ? (
              <Image source={{ uri: picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.initial}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </Spinning>
        </Pressable>
      </LinearGradient>
      </Animated.View>
    </View>
  );
}

/** Where the pill was last dropped, kept for the next time it shows. */
let lastPillPos: { x: number; y: number } | null = null;

const styles = StyleSheet.create({
  floater: { position: 'absolute', left: 0, top: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 19,
    paddingLeft: 4,
    paddingRight: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    elevation: 10,
    shadowColor: '#FF7A1A',
    shadowOpacity: 0.45,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  icon: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.5)' },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginLeft: 4,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
