import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { api, ApiError } from '../../api/client';
import { getEcho } from '../../api/realtime';
import { useAuth } from '../../auth/AuthContext';

/** `SocialPresenter::user()`. */
export type RoomUser = {
  uuid: string;
  guftagu_id?: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country?: string | null;
};

export type Seat = {
  seat_number: number;
  locked: boolean;
  is_vip: boolean;
  camera_on: boolean;
  muted: boolean;
  user: RoomUser | null;
  /** The occupant's gender, which tints the number badge (blue / pink). */
  gender?: string | null;
  /** Coins' worth of gifts the occupant has been sent in this room. */
  gift_value?: number;
};

/** `Api\RoomController::snapshot()` — verified against the controller. */
export type RoomSnapshot = {
  room: {
    uuid: string;
    room_code: string;
    name: string;
    status: string;
    visibility: string;
    listener_count: number;
    diamonds: number;
    video_enabled: boolean;
    announcement: string | null;
    theme: { background_url: string | null } | null;
    /** The host's own upload, else the theme's picture. */
    background_url: string | null;
  };
  owner: RoomUser | null;
  members: RoomUser[];
  seats: Seat[];
  raised_hands: RoomUser[];
  my: {
    role: string | null;
    is_host: boolean;
    hand_raised: boolean;
    seat_number: number | null;
    muted: boolean;
    camera_on: boolean;
    can_take_seat: boolean;
    /** Only on the join response — what plays for your own arrival. */
    arrival?: Arrival | null;
  };
  /** The presence channel peers signal over, and the STUN servers they dial through. */
  signaling?: { channel: string; ice_servers: { urls: string }[] };
};

/** `InventoryService::arrival()` — what plays when somebody walks in. */
export type Arrival = {
  vip: { level: number; name: string } | null;
  banner: { name: string; image_url: string | null } | null;
  effect: {
    name: string;
    image_url: string | null;
    animation_url: string | null;
    animation_type: string | null;
    duration_ms: number | null;
  } | null;
};

export type CasualKind = 'dice' | 'mora' | 'machine';
export type Casual = { id: string; user: RoomUser | null; type: CasualKind; result: number[] };

export type Entrance = { id: string; user: RoomUser | null; arrival: Arrival };

export type ChatMessage = {
  uuid: string;
  body: string;
  user: RoomUser | null;
  created_at: string | null;
  /** Written here, not fetched — "entered the room" when you join. */
  local?: boolean;
  /** An arrival line, drawn as a pill rather than a bubble. */
  entry?: boolean;
};

/** `RoomGiftController::index()`. */
export type GiftEvent = {
  sender: RoomUser | null;
  receiver: RoomUser | null;
  gift: { code: string; thumbnail_url: string | null; tier: string };
  quantity: number;
  created_at: string | null;
};

/**
 * How often the room is re-read. The backend broadcasts every change on the
 * `room.{uuid}` presence channel, but the app has no websocket client yet, so
 * for now the screen polls — seats and chat are a few seconds behind.
 */
const STATE_EVERY = 4000;
const CHAT_EVERY = 3000;
const GIFTS_EVERY = 6000;

/**
 * One voice room: joins it, keeps its state, chat and gift feed fresh while
 * the screen is up, and carries every action the screen can take on it.
 * Nothing here leaves the room on unmount — minimising keeps you in it, and only
 * `leave()` (the exit dialog's Confirm) walks out.
 */
export function useRoom(uuid: string) {
  const { token, user } = useAuth();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gifts, setGifts] = useState<GiftEvent[]>([]);
  /** Set when joining fails for good — a closed room, a kick, a wrong password. */
  const [fatal, setFatal] = useState<string | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  /** Chat cleared from Tools → Clear chat hides everything up to this moment. */
  const clearedAt = useRef(0);
  /** Arrivals waiting their turn on the banner — shown one at a time. */
  const [entrances, setEntrances] = useState<Entrance[]>([]);
  const [casuals, setCasuals] = useState<Casual[]>([]);

  const path = `/rooms/${uuid}`;

  const refreshState = useCallback(async () => {
    try {
      setSnapshot(await api<RoomSnapshot>(`${path}/state`, { token }));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404 || e.status === 410)) {
        setFatal(e.displayMessage);
      }
    }
  }, [path, token]);

  const refreshChat = useCallback(async () => {
    try {
      const rows = await api<ChatMessage[]>(`${path}/messages?limit=30`, { token });
      // Newest first from the server; the list reads top to bottom, oldest first.
      const fetched = [...rows].reverse();
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.uuid, m]));
        for (const m of fetched) byId.set(m.uuid, m);
        return Array.from(byId.values()).sort((a, b) => stamp(a.created_at) - stamp(b.created_at));
      });
    } catch {
      // Keep what is on screen; the next tick tries again.
    }
  }, [path, token]);

  const refreshGifts = useCallback(async () => {
    try {
      const rows = await api<GiftEvent[]>(`${path}/gifts`, { token });
      setGifts([...rows].reverse());
    } catch {
      // As above.
    }
  }, [path, token]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // Join once. A second join while already inside is harmless server-side.
  useEffect(() => {
    let cancelled = false;
    api<RoomSnapshot>(`${path}/join`, { method: 'POST', token })
      .then((s) => {
        if (cancelled) return;
        setSnapshot(s);
        const me = user
          ? { uuid: user.uuid, display_name: user.display_name ?? null, avatar_url: user.avatar_url ?? null }
          : null;
        if (s.my.arrival) setEntrances((q) => [...q, { id: `me-${Date.now()}`, user: me, arrival: s.my.arrival! }]);
        setMessages((prev) => [
          ...prev,
          {
            uuid: `local-join-${Date.now()}`,
            entry: true,
            body: entryText(s.my.arrival),
            user: user
              ? {
                  uuid: user.uuid,
                  display_name: user.display_name ?? null,
                  avatar_url: user.avatar_url ?? null,
                }
              : null,
            created_at: new Date().toISOString(),
            local: true,
          },
        ]);
      })
      .catch((e) => {
        if (!cancelled) setFatal(e instanceof ApiError ? e.displayMessage : 'Could not join this room.');
      });
    return () => {
      cancelled = true;
    };
    // `user` only names the local "entered" line; re-joining on a profile change would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, token]);

  useEffect(() => {
    if (!active || !snapshot) return;
    refreshChat();
    refreshGifts();
    const s = setInterval(refreshState, STATE_EVERY);
    const c = setInterval(refreshChat, CHAT_EVERY);
    const g = setInterval(refreshGifts, GIFTS_EVERY);
    return () => {
      clearInterval(s);
      clearInterval(c);
      clearInterval(g);
    };
    // Only (re)start the timers when the room first arrives or the app wakes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, Boolean(snapshot), refreshChat, refreshGifts, refreshState]);

  /** `member.joined` fires first; hold it briefly in case an `entrance.effect` follows. */
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const addEntryLine = (who: RoomUser, arrival: Arrival | null) =>
    setMessages((prev) => [
      ...prev,
      { uuid: `entry-${who.uuid}-${Date.now()}`, body: entryText(arrival), user: who, created_at: new Date().toISOString(), local: true, entry: true },
    ]);

  // Realtime: arrivals and departures on the room's presence channel. Joined only once
  // the server has us as a member (the channel refuses anyone else). Polling carries on
  // underneath, so a dead socket costs speed, not correctness.
  const joined = Boolean(snapshot);
  useEffect(() => {
    if (!joined || !token) return;
    const echo = getEcho(token);
    if (!echo) return;
    const channel = echo.join(`room.${uuid}`);

    channel.listen('.member.joined', (e: { user: RoomUser; listener_count: number }) => {
      setSnapshot((prev) => (prev ? { ...prev, room: { ...prev.room, listener_count: e.listener_count } } : prev));
      // Whoever has an effect gets "entered with …" from `entrance.effect` instead.
      pending.current.set(e.user.uuid, setTimeout(() => {
        pending.current.delete(e.user.uuid);
        addEntryLine(e.user, null);
      }, 400));
    });
    channel.listen('.entrance.effect', (e: { user: RoomUser } & Arrival) => {
      const t = pending.current.get(e.user.uuid);
      if (t) {
        clearTimeout(t);
        pending.current.delete(e.user.uuid);
      }
      const arrival: Arrival = { vip: e.vip, banner: e.banner, effect: e.effect };
      addEntryLine(e.user, arrival);
      setEntrances((q) => [...q, { id: `${e.user.uuid}-${Date.now()}`, user: e.user, arrival }]);
    });
    channel.listen('.casual.played', (e: { user: RoomUser; type: CasualKind; result: number[] }) => {
      const id = `${e.user.uuid}-${Date.now()}`;
      // One active roll per player: a new one replaces theirs.
      setCasuals((q) => [...q.filter((c) => c.user?.uuid !== e.user.uuid), { id, user: e.user, type: e.type, result: e.result }]);
    });
    channel.listen('.member.left', (e: { listener_count: number }) => {
      setSnapshot((prev) => (prev ? { ...prev, room: { ...prev.room, listener_count: e.listener_count } } : prev));
    });

    const waiting = pending.current;
    return () => {
      waiting.forEach(clearTimeout);
      waiting.clear();
      echo.leave(`room.${uuid}`);
    };
    // `addEntryLine` only touches state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, token, uuid]);

  /** The banner that just finished (or was dismissed) leaves the queue. */
  const dismissCasual = useCallback((id: string) => setCasuals((q) => q.filter((c) => c.id !== id)), []);
  const playCasual = useCallback((type: CasualKind) => api(`${path}/casual`, { method: 'POST', body: { type }, token }), [path, token]);

  const nextEntrance = useCallback(() => setEntrances((q) => q.slice(1)), []);

  /** Every action answers with a fresh snapshot or nothing; either way, re-read. */
  const act = useCallback(
    async (p: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => {
      const res = await api<RoomSnapshot | null>(`${path}${p}`, { method, body, token });
      if (res && typeof res === 'object' && 'seats' in res) setSnapshot(res);
      else refreshState();
    },
    [path, refreshState, token],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      const sent = await api<{ uuid: string; body: string; created_at: string | null }>(`${path}/messages`, {
        method: 'POST',
        body: { body },
        token,
      });
      setMessages((prev) => [
        ...prev,
        {
          ...sent,
          user: user ? { uuid: user.uuid, display_name: user.display_name ?? null, avatar_url: user.avatar_url ?? null } : null,
        },
      ]);
    },
    [path, token, user],
  );

  const sendGift = useCallback(
    async (giftId: number, toUser: string, quantity: number) => {
      const res = await api<{ coin_balance: number; receiver: RoomUser }>(`${path}/gifts`, {
        method: 'POST',
        body: { gift_id: giftId, to_user: toUser, quantity },
        token,
      });
      refreshGifts();
      refreshState();
      return res;
    },
    [path, refreshGifts, refreshState, token],
  );

  const clearChat = useCallback(() => {
    clearedAt.current = Date.now();
    setMessages([]);
    setGifts([]);
  }, []);

  return {
    snapshot,
    refresh: refreshState,
    fatal,
    messages: messages.filter((m) => m.local || stamp(m.created_at) > clearedAt.current),
    gifts: gifts.filter((g) => stamp(g.created_at) > clearedAt.current),
    entrance: entrances[0] ?? null,
    nextEntrance,
    casuals,
    dismissCasual,
    playCasual,
    me: user,
    takeSeat: (seat: number) => act(`/seats/${seat}/take`, 'POST'),
    leaveSeat: () => act('/seats/leave', 'POST'),
    setMic: (muted: boolean) => act('/mic', 'PATCH', { muted }),
    muteSeat: (seat: number, muted: boolean) => act(`/seats/${seat}/mute`, 'POST', { muted }),
    lockSeat: (seat: number, locked: boolean) => act(`/seats/${seat}/lock`, 'PATCH', { locked }),
    kick: (userUuid: string, minutes: number) => act(`/members/${userUuid}/kick`, 'POST', { minutes }),
    leave: () => api(`${path}/leave`, { method: 'POST', token }),
    sendMessage,
    sendGift,
    clearChat,
  };
}

export type RoomApi = ReturnType<typeof useRoom>;

/** "entered the room", or "entered with Top supercars" when something is being worn. */
export function entryText(arrival: Arrival | null | undefined): string {
  const worn = arrival?.effect?.name ?? arrival?.banner?.name ?? (arrival?.vip ? `${arrival.vip.name} Enter` : null);
  return worn ? `entered with ${worn}` : 'entered the room';
}

function stamp(iso: string | null): number {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}
