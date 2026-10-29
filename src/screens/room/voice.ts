import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { getEcho } from '../../api/realtime';

/**
 * Peer-to-peer voice for a room — the same protocol as the web preview page
 * (`backend/resources/views/rooms/show.blade.php`, written up in docs/webrtc-voice-chat.md),
 * so the app and that page can sit in one room and hear each other.
 *
 * Reverb only introduces the peers; audio goes directly between them.
 *
 * - One connection per pair of people, carrying audio both ways if both are seated.
 * - Only someone on a seat ever *starts* a call. A listener has nothing to send and only
 *   answers. That alone connects every speaker to every listener.
 * - Two speakers would otherwise both call at once; the smaller uuid calls, the other waits.
 * - Signalling is one Reverb client event, `client-signal`:
 *   `{ to, from, type: 'offer' | 'answer' | 'ice', payload }` — `payload` is the SDP
 *   (`{type, sdp}`) or the ICE candidate. Everyone on the channel gets it; each ignores
 *   what is not addressed to them.
 * - `client-speaking` `{ uuid, speaking }` is the app's own addition (the web page does not
 *   send or read it); it drives the ring round a talking avatar.
 *
 * A mesh does not scale: every speaker uploads one stream per person in the room. Fine for
 * testing and small rooms; a busy room needs a media server in the middle.
 *
 * `react-native-webrtc` is a native module, absent from Expo Go. It is required lazily so
 * the app still runs there — the room just stays silent and `status` is 'unavailable'.
 */
type SessionDescription = { type: string; sdp?: string };
type Rtc = {
  mediaDevices: { getUserMedia: (c: unknown) => Promise<MediaStreamLike> };
  RTCPeerConnection: new (cfg: unknown) => PeerLike;
  RTCSessionDescription: new (d: unknown) => unknown;
  RTCIceCandidate: new (c: unknown) => unknown;
};
type TrackLike = { enabled: boolean; stop: () => void };
type MediaStreamLike = { getTracks: () => TrackLike[]; getAudioTracks: () => TrackLike[] };
type PeerLike = {
  addTrack: (t: TrackLike, s: MediaStreamLike) => void;
  createOffer: (o?: unknown) => Promise<SessionDescription>;
  createAnswer: () => Promise<SessionDescription>;
  setLocalDescription: (d: unknown) => Promise<void>;
  setRemoteDescription: (d: unknown) => Promise<void>;
  addIceCandidate: (c: unknown) => Promise<void>;
  addEventListener: (e: string, f: (ev: any) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  getReceivers?: () => { track?: TrackLike }[];
  getStats: () => Promise<{ forEach: (f: (r: Record<string, unknown>) => void) => void }>;
  close: () => void;
  remoteDescription: unknown;
  signalingState: string;
  connectionState: string;
  iceConnectionState: string;
};

let rtc: Rtc | null | undefined;
function loadRtc(): Rtc | null {
  if (rtc !== undefined) return rtc;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rtc = require('react-native-webrtc') as Rtc;
  } catch (e) {
    if (__DEV__) console.log('[voice] react-native-webrtc not loadable', String(e).slice(0, 300));
    rtc = null;
  }
  return rtc;
}

export const voiceAvailable = () => loadRtc() !== null;

const log = (...a: unknown[]) => __DEV__ && console.log('[voice]', ...a);

type Signal = { to: string; from: string; type: 'offer' | 'answer' | 'ice'; payload: unknown };
type Ice = { urls: string };
type Channel = ReturnType<NonNullable<ReturnType<typeof getEcho>>['join']> & {
  here: (f: (u: { uuid: string }[]) => void) => unknown;
  joining: (f: (u: { uuid: string }) => void) => unknown;
  leaving: (f: (u: { uuid: string }) => void) => unknown;
  listenForWhisper: (e: string, f: (p: never) => void) => unknown;
  whisper: (e: string, p: object) => unknown;
};

/** Speech above this audio level (0..1) counts as talking. */
const TALK_LEVEL = 0.02;

export type VoiceArgs = {
  roomUuid: string;
  token: string | null;
  meUuid: string | undefined;
  /** Seat numbers → who sits there, from the room snapshot. */
  seated: { seat: number; uuid: string }[];
  /** True when I hold a seat and am neither self-muted nor muted by the host. */
  micOpen: boolean;
  speakerOff: boolean;
  iceServers: Ice[];
  /** Only listen and speak once the room has been joined. */
  ready: boolean;
};

export function useVoice({ roomUuid, token, meUuid, seated, micOpen, speakerOff, iceServers, ready }: VoiceArgs) {
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'off' | 'unavailable' | 'live' | 'denied'>('off');

  const iAmSeated = seated.some((s) => s.uuid === meUuid);
  const publishers = seated.map((s) => s.uuid).filter((u) => u !== meUuid);

  const channel = useRef<Channel | null>(null);
  const local = useRef<MediaStreamLike | null>(null);
  /** One connection per person, keyed by their uuid. */
  const peers = useRef(new Map<string, PeerLike>());
  /** Candidates that arrived before their connection had a remote description. */
  const queued = useRef(new Map<string, unknown[]>());
  /** Connections that wanted to renegotiate mid-handshake; replayed once stable. */
  const deferred = useRef(new Set<string>());
  const members = useRef(new Set<string>());
  const knownPublishers = useRef(new Set<string>());
  const latest = useRef({ micOpen, speakerOff, iceServers, meUuid, publishers, iAmSeated });
  latest.current = { micOpen, speakerOff, iceServers, meUuid, publishers, iAmSeated };

  const whisper = (event: string, payload: object) => {
    try {
      channel.current?.whisper(event, payload);
    } catch {
      // Signalling is best-effort; the next member change or seat change retries.
    }
  };
  const signal = (to: string, type: Signal['type'], payload: unknown) =>
    whisper('signal', { to, from: latest.current.meUuid, type, payload });

  const closePeer = (who: string) => {
    peers.current.get(who)?.close();
    peers.current.delete(who);
    queued.current.delete(who);
    deferred.current.delete(who);
  };

  const closeAll = () => [...peers.current.keys()].forEach(closePeer);

  /** Inbound audio plays by itself; the speaker toggle just mutes the tracks. */
  const applySpeaker = () => {
    peers.current.forEach((pc) =>
      pc.getReceivers?.().forEach((r) => {
        if (r.track) r.track.enabled = !latest.current.speakerOff;
      }),
    );
  };

  const flushIce = async (who: string, pc: PeerLike) => {
    const lib = loadRtc();
    const pending = queued.current.get(who);
    if (!lib || !pending) return;
    queued.current.delete(who);
    for (const c of pending) await pc.addIceCandidate(new lib.RTCIceCandidate(c)).catch(() => undefined);
  };

  /** A connection to `who`. If I am seated it carries my mic, which is what triggers the offer. */
  const createPeer = (who: string): PeerLike | null => {
    const lib = loadRtc();
    if (!lib) return null;
    const pc = new lib.RTCPeerConnection({ iceServers: latest.current.iceServers });
    const stream = local.current;
    stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
    log('peer created for', who, 'sending:', Boolean(stream));

    const negotiate = () => {
      if (pc.signalingState !== 'stable') {
        deferred.current.add(who);
        return;
      }
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => signal(who, 'offer', { type: offer.type, sdp: offer.sdp }))
        .catch((e) => log('offer failed for', who, String(e)));
    };
    pc.addEventListener('negotiationneeded', negotiate);
    pc.addEventListener('signalingstatechange', () => {
      if (pc.signalingState === 'stable' && deferred.current.delete(who)) negotiate();
    });
    pc.addEventListener('icecandidate', (e: { candidate?: { toJSON?: () => unknown } | null }) => {
      if (e.candidate) signal(who, 'ice', e.candidate.toJSON?.() ?? e.candidate);
    });
    pc.addEventListener('iceconnectionstatechange', () => log('ICE with', who, pc.iceConnectionState));
    pc.addEventListener('track', () => {
      log('audio track from', who);
      applySpeaker();
    });
    pc.addEventListener('connectionstatechange', () => {
      if (['failed', 'closed'].includes(pc.connectionState) && peers.current.get(who) === pc) peers.current.delete(who);
    });

    peers.current.set(who, pc);
    return pc;
  };

  /** Seated speakers call; of two speakers only the smaller uuid does. */
  const ensureConnectionTo = (who: string) => {
    const me = latest.current.meUuid;
    if (!me || who === me || !latest.current.iAmSeated || !local.current) return;
    if (latest.current.publishers.includes(who) && me > who) return;
    if (peers.current.has(who)) return;
    createPeer(who);
  };

  const callEveryone = () => members.current.forEach(ensureConnectionTo);

  const onSignal = async ({ from, to, type, payload }: Signal) => {
    const lib = loadRtc();
    if (!lib || to !== latest.current.meUuid) return;

    if (type === 'offer') {
      const pc = peers.current.get(from) ?? createPeer(from);
      if (!pc) return;
      // Both sides offered at once: the smaller uuid's offer wins, the other drops its own.
      if (pc.signalingState === 'have-local-offer' && to < from) return;
      await pc.setRemoteDescription(new lib.RTCSessionDescription(payload));
      await flushIce(from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signal(from, 'answer', { type: answer.type, sdp: answer.sdp });
    } else if (type === 'answer') {
      const pc = peers.current.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new lib.RTCSessionDescription(payload));
      await flushIce(from, pc);
    } else if (type === 'ice') {
      const pc = peers.current.get(from);
      if (pc?.remoteDescription) await pc.addIceCandidate(new lib.RTCIceCandidate(payload)).catch(() => undefined);
      else queued.current.set(from, [...(queued.current.get(from) ?? []), payload]);
    }
  };

  // ---- the channel: subscribe once the room is joined
  useEffect(() => {
    if (!ready || !token) return;
    if (!loadRtc()) {
      setStatus('unavailable');
      return;
    }
    const echo = getEcho(token);
    if (!echo) return;
    const ch = echo.join(`room.${roomUuid}`) as unknown as Channel;
    channel.current = ch;

    ch.here((users) => {
      users.forEach((u) => members.current.add(u.uuid));
      callEveryone();
    });
    // `useRoom` usually subscribes first, so `here` has already fired by now; the
    // subscription still holds the member list.
    const already = (ch as unknown as { subscription?: { members?: { members?: Record<string, { uuid?: string }> } } }).subscription?.members?.members;
    if (already) {
      Object.values(already).forEach((m) => m.uuid && members.current.add(m.uuid));
      callEveryone();
    }
    ch.joining((u) => {
      members.current.add(u.uuid);
      ensureConnectionTo(u.uuid);
    });
    ch.leaving((u) => {
      members.current.delete(u.uuid);
      closePeer(u.uuid);
      setSpeaking((prev) => {
        const next = new Set(prev);
        next.delete(u.uuid);
        return next;
      });
    });
    ch.listenForWhisper('signal', ((p: Signal) => void onSignal(p).catch((e) => log('signal', p.type, 'failed', String(e)))) as never);
    ch.listenForWhisper('speaking', ((p: { uuid: string; speaking: boolean }) =>
      setSpeaking((prev) => {
        const next = new Set(prev);
        if (p.speaking) next.add(p.uuid);
        else next.delete(p.uuid);
        return next;
      })) as never);

    return () => {
      channel.current = null;
      closeAll();
    };
    // Handlers read live values through `latest`; only a new room or token resubscribes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, roomUuid]);

  // ---- publishing: capture the mic while seated, drop it on leaving
  useEffect(() => {
    const lib = loadRtc();
    if (!ready || !lib || !iAmSeated) return;
    let cancelled = false;

    // react-native-webrtc does not ask for the microphone itself on Android.
    const allowed =
      Platform.OS === 'android'
        ? PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then((r) => r === PermissionsAndroid.RESULTS.GRANTED)
        : Promise.resolve(true);

    allowed
      .then((ok) => {
        if (!ok) throw new Error('microphone permission denied');
        return lib.mediaDevices.getUserMedia({ audio: true, video: false });
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        local.current = stream;
        stream.getAudioTracks().forEach((t) => (t.enabled = latest.current.micOpen));
        log('publishing');
        setStatus('live');
        // Anything open so far was receive-only: put my mic on it. Adding a track fires
        // `negotiationneeded`, which sends a fresh offer on that same connection.
        peers.current.forEach((pc) => stream.getTracks().forEach((t) => pc.addTrack(t, stream)));
        callEveryone();
      })
      .catch((e) => {
        log('cannot publish', String(e));
        setStatus('denied');
      });

    return () => {
      cancelled = true;
      local.current?.getTracks().forEach((t) => t.stop());
      local.current = null;
      whisper('speaking', { uuid: latest.current.meUuid, speaking: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, iAmSeated]);

  // ---- someone else takes a seat: what I have with them was receive-only, rebuild it
  const publisherKey = publishers.join(',');
  useEffect(() => {
    const now = new Set(publishers);
    now.forEach((who) => {
      if (knownPublishers.current.has(who) || !latest.current.iAmSeated || !local.current) return;
      ensureConnectionTo(who);
    });
    knownPublishers.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publisherKey]);

  // ---- mic open / closed: the track stays, it just stops carrying sound
  useEffect(() => {
    local.current?.getAudioTracks().forEach((t) => (t.enabled = micOpen));
    if (!micOpen && meUuid) {
      whisper('speaking', { uuid: meUuid, speaking: false });
      setSpeaking((prev) => {
        const next = new Set(prev);
        next.delete(meUuid);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOpen]);

  useEffect(applySpeaker, [speakerOff]);

  // ---- who is talking: read my own outbound level and tell the room
  useEffect(() => {
    if (!ready || !iAmSeated || !micOpen || !meUuid) return;
    let was = false;
    const t = setInterval(async () => {
      const first = peers.current.values().next().value as PeerLike | undefined;
      if (!first) return;
      let level = 0;
      await first
        .getStats()
        .then((report) =>
          report.forEach((r) => {
            if (r.type === 'media-source' && r.kind === 'audio' && typeof r.audioLevel === 'number') level = Math.max(level, r.audioLevel);
          }),
        )
        .catch(() => undefined);
      const talking = level > TALK_LEVEL;
      if (talking === was) return;
      was = talking;
      whisper('speaking', { uuid: meUuid, speaking: talking });
      setSpeaking((prev) => {
        const next = new Set(prev);
        if (talking) next.add(meUuid);
        else next.delete(meUuid);
        return next;
      });
    }, 400);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, iAmSeated, micOpen, meUuid]);

  return { speaking, status };
}
