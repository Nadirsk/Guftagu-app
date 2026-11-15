import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { WebView, type DomWebViewRef } from '@expo/dom-webview';

import { API_BASE_URL } from '../../api/client';
import { peek, refresh } from '../../lib/swrCache';
import { useAuth } from '../../auth/AuthContext';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import type { SeatTemplate } from './roomSettings';
import { videoPosition, type RoomVideo } from './useRoom';

/** Pulls the 11-char YouTube id out of a full link, a youtu.be / shorts / embed link, or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const patterns = [/[?&]v=([A-Za-z0-9_-]{11})/, /youtu\.be\/([A-Za-z0-9_-]{11})/, /youtube\.com\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Figma 769:10220's video band: full width, y 187, 188 tall, plain grey until a video is picked. */
export const CINEMA_VIDEO = { y: 187, height: 188 } as const;
/** How far the seat block drops under the band: first ring top y 388 (Figma) vs ~126 in a plain room, measured on device. */
export const CINEMA_SEAT_DROP = 261;

/**
 * The player page, hosted next to the API (`backend/public/cinema-player.html`). It puts YouTube's
 * IFrame player inside a real https page; a bare youtube.com/embed URL opened alone gives Error 153.
 */
function playerUrl(id: string, muted: boolean, startAt: number, state: 'playing' | 'paused', owner: boolean) {
  const origin = new URL(API_BASE_URL).origin;
  return `${origin}/cinema-player.html?v=${id}&t=${Math.max(0, startAt).toFixed(1)}&s=${state}&m=${muted ? 1 : 0}&o=${owner ? 1 : 0}`;
}

/**
 * The cinema band: the room's shared YouTube player (an IFrame inside a WebView) once the owner has
 * loaded a video, plain grey before. The page starts where the room is and follows `video` as the owner
 * plays, pauses or seeks; when this phone is the owner's, the page reports those back through
 * `onReport`. The owner also gets a small controls button on it.
 */
export function CinemaStage({
  video,
  muted,
  owner,
  onReport,
  onControls,
}: {
  video: RoomVideo;
  muted: boolean;
  owner: boolean;
  onReport: (state: 'playing' | 'paused' | 'stopped', position: number) => void;
  onControls: () => void;
}) {
  const { px } = useDesignScale();
  const web = useRef<DomWebViewRef>(null);
  // The page address only changes with the video, so a later pause, seek or mute never reloads it.
  const latest = useRef({ video, muted, owner });
  latest.current = { video, muted, owner };
  const videoId = video.id;
  // Shown until the player page says its first frame is up (the page and YouTube take a few seconds).
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [videoId]);
  const uri = useMemo(() => {
    if (!videoId) return null;
    const { video: v, muted: m, owner: o } = latest.current;
    return playerUrl(videoId, m, videoPosition(v), v.state === 'paused' ? 'paused' : 'playing', o);
  }, [videoId]);

  useEffect(() => {
    web.current?.injectJavaScript(`window.setMuted && window.setMuted(${muted}); true;`);
  }, [muted]);

  // Follow the room: every change of state or position goes into the page.
  useEffect(() => {
    if (!videoId || video.state === 'stopped') return;
    web.current?.injectJavaScript(`window.applyState && window.applyState('${video.state}', ${videoPosition(video).toFixed(2)}); true;`);
  }, [videoId, video.state, video.position, video.updated_at]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: px(CINEMA_VIDEO.y), height: px(CINEMA_VIDEO.height), backgroundColor: '#B3B3B3' }}>
      {uri ? (
        // Only the owner steers the video; everybody else just watches, so touches never reach their player.
        <View pointerEvents={owner ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
        <WebView
          key={videoId!}
          ref={web}
          source={{ uri }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={(e) => {
            try {
              const m = JSON.parse(e.nativeEvent.data) as { type?: string; state?: 'playing' | 'paused' | 'stopped'; position?: number };
              if (m.type === 'ready') setLoaded(true);
              else if (owner && m.type === 'state' && m.state) onReport(m.state, m.position ?? 0);
            } catch {
              /* not ours */
            }
          }}
          style={{ flex: 1, backgroundColor: '#000' }}
        />
        </View>
      ) : owner ? (
        <Pressable onPress={onControls} accessibilityLabel="Video controls" style={StyleSheet.absoluteFill} />
      ) : null}
      {uri && !loaded ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}
      {owner && uri ? (
        <Pressable
          onPress={onControls}
          hitSlop={px(6)}
          accessibilityLabel="Video controls"
          style={{ position: 'absolute', right: px(8), top: px(8), width: px(30), height: px(30), borderRadius: px(15), backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: px(16), lineHeight: px(18), fontFamily: typography.fontFamily.medium }}>⋯</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Figma's cinema seat (769:10220): a red armchair (57×68, 4 left / 9 below the ring) under a 49 px
 * glass ring, a thin "+" in the ring when empty, and the seat number in 21 px under it. Everything
 * is placed from the ring's top-left, in design px, scaled by `k` (ring / 49).
 */
export function CinemaChair({ x, y, ring, empty }: { x: number; y: number; ring: number; empty: boolean }) {
  const { px } = useDesignScale();
  const k = ring / 49;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: px(x), top: px(y), width: px(ring), height: px(ring) }}>
      <Image source={require('../../assets/room/cinema/armchair.png')} resizeMode="stretch" style={{ position: 'absolute', left: px(-4 * k), top: px(9 * k), width: px(57 * k), height: px(68 * k) }} />
      <SvgXml xml={ICON.ring} width={px(ring)} height={px(ring)} style={{ position: 'absolute', left: 0, top: 0 }} />
      {empty ? <SvgXml xml={ICON.plus} width={px(24 * k)} height={px(24 * k)} style={{ position: 'absolute', left: px(12.5 * k), top: px(12.5 * k) }} /> : null}
    </View>
  );
}

/**
 * Cinema room sheets — Figma "youtube room" (769:10917): the dark controls bar (769:10498), the
 * video list (769:10634) and the seat-count picker (769:10781). Measurements are the frame's own
 * (402 wide), scaled by `px`.
 */

const font = { medium: typography.fontFamily.medium, regular: typography.fontFamily.regular };
const BAR_BG = '#1C1C1C';
const BUTTON_BG = '#4A4A4A';
const GRADIENT = ['#F5F43B', '#3DD8F4'] as const;

/* --------------------------------------------------------------------- icons (white, 24 grid) */
const ICON = {
  seat: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 11V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3M4 12.5a2 2 0 0 1 4 0V15h8v-2.5a2 2 0 0 1 4 0V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5.5ZM7 19v2M17 19v2" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  search: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10.5" cy="10.5" r="6.5" stroke="white" stroke-width="2.6"/><path d="M15.5 15.5L21 21" stroke="white" stroke-width="2.8" stroke-linecap="round"/></svg>`,
  volume: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5h3.5L11 5v14l-4.5-4.5H3v-5Z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/><path d="M14.5 9a4 4 0 0 1 0 6M17 6.5a7.5 7.5 0 0 1 0 11" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  volumeOff: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9.5h3.5L11 5v14l-4.5-4.5H3v-5Z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 9.5l5 5M20 9.5l-5 5" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  power: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.5v8M7 6.2a8 8 0 1 0 10 0" stroke="white" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  searchDark: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10.5" cy="10.5" r="6.5" stroke="#1C1C1C" stroke-width="2.6"/><path d="M15.5 15.5L21 21" stroke="#1C1C1C" stroke-width="2.8" stroke-linecap="round"/></svg>`,
  ring: `<svg width="49" height="49" viewBox="0 0 49 49" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24.5" cy="24.5" r="24" fill="white" fill-opacity="0.2" stroke="white"/></svg>`,
  plus: `<svg width="24" height="24" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" fill="white"/></svg>`,
  /** Drawn over the sound button when the video is muted (Figma has no muted state). */
  slash: `<svg width="62" height="62" viewBox="0 0 62 62" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 45L45 17" stroke="#4A4A4A" stroke-width="7" stroke-linecap="round"/><path d="M17 45L45 17" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>`,
  seatMini: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#C8202B" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.5"/><path d="M12 7.5v9M7.5 12h9" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
};

/** A dim scrim; tapping it closes the sheet. */
function Scrim({ onClose, dim = 'rgba(0,0,0,0.31)' }: { onClose: () => void; dim?: string }) {
  return <Pressable onPress={onClose} accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: dim }]} />;
}

/* ============================================================== 769:10498 — controls bar */

/** The dark bar under the room: seat layout, video list, video sound, and stop the video. */
export function CinemaBar({
  extra,
  muted,
  playing,
  onClose,
  onSeats,
  onVideos,
  onToggleSound,
  onStop,
}: {
  extra: number;
  muted: boolean;
  playing: boolean;
  onClose: () => void;
  onSeats: () => void;
  onVideos: () => void;
  onToggleSound: () => void;
  onStop: () => void;
}) {
  const { px } = useDesignScale();
  // Figma: bar 402×169 at y 708 of 874; the four 62 px buttons are Figma's own artwork (cropped from
  // its screenshot), centred at x 76 / 157 / 238 / 320.
  const buttons = [
    { key: 'seats', src: require('../../assets/room/cinema/bar-seats.png'), x: 76, label: 'Seat layout', onPress: onSeats },
    { key: 'videos', src: require('../../assets/room/cinema/bar-videos.png'), x: 157, label: 'Choose a video', onPress: onVideos },
    { key: 'sound', src: require('../../assets/room/cinema/bar-sound.png'), x: 238, label: muted ? 'Unmute video' : 'Mute video', onPress: onToggleSound },
    { key: 'stop', src: require('../../assets/room/cinema/bar-power.png'), x: 320, label: 'Stop video', onPress: onStop, off: !playing },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Scrim onClose={onClose} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(169) + extra, backgroundColor: BAR_BG }}>
        {buttons.map((b) => (
          <Pressable
            key={b.key}
            onPress={b.onPress}
            accessibilityLabel={b.label}
            style={{
              position: 'absolute',
              left: px(b.x - 31),
              top: px(66),
              width: px(62),
              height: px(62),
              opacity: b.off ? 0.5 : 1,
            }}
          >
            <Image source={b.src} resizeMode="contain" style={{ width: px(62), height: px(62) }} />
            {b.key === 'sound' && muted ? (
              <SvgXml xml={ICON.slash} width={px(62)} height={px(62)} style={{ position: 'absolute', left: 0, top: 0 }} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ============================================================== 769:10634 — video list */

export type SavedVideo = { id: string; title: string; channel: string; at: string };
const HISTORY_KEY = 'room_video_history';
const HISTORY_MAX = 12;

async function loadHistory(): Promise<SavedVideo[]> {
  try {
    const raw = await SecureStore.getItemAsync(HISTORY_KEY);
    const list = raw ? (JSON.parse(raw) as SavedVideo[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveHistory(list: SavedVideo[]) {
  try {
    await SecureStore.setItemAsync(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    /* history is a convenience; a failed write only means it is not remembered */
  }
}

/** `YYYY-MM-DD HH:mm:ss`, local time, as Figma's rows show. */
function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** Title and channel of a video, from YouTube's public oEmbed (no key). */
async function lookup(id: string): Promise<{ title: string; channel: string } | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string; author_name?: string };
    return { title: j.title ?? id, channel: j.author_name ?? '' };
  } catch {
    return null;
  }
}

/** A pasted link, or a bare 11-char id — but a plain word that happens to be 11 letters is a search. */
function asVideoId(input: string): string | null {
  const id = parseYouTubeId(input);
  if (!id) return null;
  const bare = /^[A-Za-z0-9_-]{11}$/.test(input.trim());
  if (bare && !/[0-9_-]/.test(id) && !(/[a-z]/.test(id) && /[A-Z]/.test(id))) return null;
  return id;
}

type Runs = { runs?: { text?: string }[]; simpleText?: string } | undefined;
const textOf = (t: Runs) => t?.simpleText ?? t?.runs?.map((r) => r.text ?? '').join('') ?? '';

/**
 * Searches YouTube itself — the same results youtube.com shows — through the web client's own search
 * endpoint (no API key). It is unofficial, so a YouTube change can break it; swap in the Data API
 * (`search.list`, behind the backend) if that ever happens.
 */
async function searchYouTube(query: string, signal: AbortSignal): Promise<SavedVideo[]> {
  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'en' } }, query }),
    signal,
  });
  if (!res.ok) throw new Error(`YouTube search ${res.status}`);
  const json = await res.json();
  const sections: any[] = json?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  const out: SavedVideo[] = [];
  for (const sec of sections) {
    for (const item of sec?.itemSectionRenderer?.contents ?? []) {
      const v = item?.videoRenderer;
      if (!v?.videoId) continue;
      const meta = [textOf(v.publishedTimeText), textOf(v.lengthText)].filter(Boolean).join(' · ');
      out.push({ id: v.videoId, title: textOf(v.title), channel: textOf(v.ownerText), at: meta });
    }
  }
  // Many videos (music labels, mostly) have embedding switched off by their owner and can never play
  // in an iframe. YouTube's oEmbed answers 200 only for embeddable ones, so keep just those.
  const first = out.slice(0, 18);
  const checks = await Promise.all(first.map((v) => canEmbed(v.id, signal)));
  return first.filter((_, i) => checks[i]);
}

async function canEmbed(id: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal });
    return res.status === 200;
  } catch {
    // Offline or aborted: do not hide the video just because the check could not run.
    return !signal.aborted;
  }
}

/**
 * Tools bar → search. Type anything to search YouTube; paste a link (or id) to find that exact video;
 * with an empty box it lists what this phone played before. Tapping a row plays it.
 */
export function VideoLibrarySheet({ onClose, onPlay }: { onClose: () => void; onPlay: (id: string, title: string) => void }) {
  const { px } = useDesignScale();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<SavedVideo[] | null>(null);
  const [found, setFound] = useState<SavedVideo | null>(null);
  const [results, setResults] = useState<SavedVideo[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const q = query.trim();
  const id = asVideoId(q);
  const searching = !id && q.length >= 2;

  // A pasted link: look the one video up.
  useEffect(() => {
    setFound(null);
    if (!id) return;
    let live = true;
    setBusy(true);
    lookup(id).then((meta) => {
      if (!live) return;
      setFound({ id, title: meta?.title ?? id, channel: meta?.channel ?? '', at: stamp() });
      setBusy(false);
    });
    return () => {
      live = false;
    };
  }, [id]);

  // Anything else: search YouTube, a beat after the last keystroke.
  useEffect(() => {
    setFailed(false);
    if (!searching) {
      setResults([]);
      setBusy(false);
      return;
    }
    const ctl = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      searchYouTube(q, ctl.signal)
        .then((list) => {
          setResults(list);
          setBusy(false);
        })
        .catch(() => {
          if (ctl.signal.aborted) return;
          setResults([]);
          setFailed(true);
          setBusy(false);
        });
    }, 450);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, searching]);

  const play = (v: SavedVideo) => {
    const next = [{ ...v, at: stamp() }, ...(history ?? []).filter((h) => h.id !== v.id)];
    setHistory(next);
    saveHistory(next);
    onPlay(v.id, v.title);
    onClose();
  };

  const rows = id ? (found ? [found, ...(history ?? []).filter((h) => h.id !== found.id)] : history ?? []) : searching ? results : history ?? [];
  const empty =
    searching && !busy && results.length === 0
      ? failed
        ? 'Could not reach YouTube. Check the connection.'
        : `No playable videos for "${q}". Many videos can not be played outside YouTube; try another search.`
      : !searching && !id && history && history.length === 0
        ? 'Search YouTube or paste a link to play it for the room'
        : null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Scrim onClose={onClose} />
      {/* Figma: white sheet from y 305, 27 radius; search field 11..391 × 313..348. */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: px(305), bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: px(27), borderTopRightRadius: px(27), overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: px(11), right: px(11), top: px(8), height: px(35), borderRadius: px(18), backgroundColor: '#D9D9D9', flexDirection: 'row', alignItems: 'center', paddingLeft: px(12) }}>
          <SvgXml xml={ICON.searchDark} width={px(20)} height={px(20)} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search YouTube or paste a link"
            placeholderTextColor="rgba(0,0,0,0.4)"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => found && play(found)}
            style={{ flex: 1, marginLeft: px(8), paddingVertical: 0, fontFamily: font.regular, fontSize: px(14), color: colors.black }}
          />
          {busy ? <ActivityIndicator size="small" color="#1C1C1C" style={{ marginRight: px(10) }} /> : null}
        </View>

        <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: px(54), bottom: 0 }} contentContainerStyle={{ paddingBottom: px(24) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {history === null ? <ActivityIndicator style={{ marginTop: px(40) }} color="#1C1C1C" /> : null}
          {empty ? <Text style={{ marginTop: px(40), marginHorizontal: px(24), textAlign: 'center', fontFamily: font.regular, fontSize: px(14), color: 'rgba(0,0,0,0.4)' }}>{empty}</Text> : null}
          {rows.map((v) => (
            <Pressable key={v.id} onPress={() => play(v)} style={{ flexDirection: 'row', height: px(103), paddingLeft: px(15), paddingTop: px(10) }}>
              <Image source={{ uri: thumb(v.id) }} resizeMode="cover" style={{ width: px(105), height: px(80), borderRadius: px(7), backgroundColor: '#000' }} />
              <View style={{ flex: 1, marginLeft: px(10), marginRight: px(14), justifyContent: 'center' }}>
                <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: px(14), lineHeight: px(19), color: '#222222' }}>{v.title}</Text>
                {v.channel ? <Text numberOfLines={1} style={{ marginTop: px(5), fontFamily: font.regular, fontSize: px(11), color: colors.black }}>{v.channel}</Text> : null}
                {v.at ? <Text numberOfLines={1} style={{ marginTop: px(5), fontFamily: font.regular, fontSize: px(11), color: colors.black }}>{v.at}</Text> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/* ============================================================== 769:10781 — seat count */

const CHOICES = [2, 4, 8] as const;

/**
 * Figma's theatre card (172×282 at y 437). The 8-seat art is Figma's own; the 4- and 2-seat ones are
 * the same art with the extra seats painted out, since Figma only draws the 8.
 */
const PREVIEW: Record<number, number> = {
  2: require('../../assets/room/cinema/seat-preview-2.png'),
  4: require('../../assets/room/cinema/seat-preview-4.png'),
  8: require('../../assets/room/cinema/seat-preview-8.png'),
};

function SeatPreview({ count }: { count: number }) {
  const { px } = useDesignScale();
  return <Image source={PREVIEW[count] ?? PREVIEW[8]} resizeMode="stretch" style={{ width: px(172), height: px(282) }} />;
}

/**
 * Tools bar → seat icon: 2 / 4 / 8 seats under the video, with a preview and Apply. It maps to the
 * admin's seat templates, so a count only shows when a template with that many seats exists.
 */
export function CinemaSeatsSheet({
  extra,
  current,
  busy,
  onApply,
  onClose,
}: {
  extra: number;
  current: number | null | undefined;
  busy: boolean;
  onApply: (t: SeatTemplate) => void;
  onClose: () => void;
}) {
  const { px } = useDesignScale();
  const { token } = useAuth();
  const sort = (t: SeatTemplate[] | null) => [...(t ?? [])].sort((a, b) => a.total_seats - b.total_seats);
  const [templates, setTemplates] = useState<SeatTemplate[] | null>(() => peek<SeatTemplate[]>('/room-seat-templates', token, sort));
  useEffect(() => refresh<SeatTemplate[]>('/room-seat-templates', token, setTemplates, sort, () => setTemplates((t) => t ?? [])), [token]);

  const available = CHOICES.filter((n) => templates?.some((t) => t.total_seats === n));
  const currentCount = templates?.find((t) => t.id === current)?.total_seats;
  const [picked, setPicked] = useState<number | null>(null);
  const shown = picked ?? (currentCount && available.includes(currentCount as 2 | 4 | 8) ? currentCount : available[available.length - 1] ?? 8);

  const apply = () => {
    const t = templates?.find((x) => x.total_seats === shown);
    if (t) onApply(t);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Scrim onClose={onClose} />
      {/* Figma 769:10781: sheet from y 404 (27 radius); card 172×282 at y 437; pills 54×32 at y 745; Apply 302×46 at y 795. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: px(404), backgroundColor: '#1E1E1E', borderTopLeftRadius: px(27), borderTopRightRadius: px(27), alignItems: 'center' }}>
        <View style={{ marginTop: px(33) }}>
          <SeatPreview count={shown} />
        </View>
        <View style={{ flexDirection: 'row', gap: px(19), marginTop: px(26), alignSelf: 'flex-start', marginLeft: px(49) }}>
          {templates === null ? <ActivityIndicator color="#FFFFFF" /> : null}
          {(templates ? CHOICES : []).map((n) => {
            const on = n === shown;
            const there = available.includes(n);
            return (
              <Pressable
                key={n}
                onPress={() => there && setPicked(n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: !there }}
                style={{ width: px(54), height: px(32), borderRadius: px(16), overflow: 'hidden', opacity: there ? 1 : 0.4 }}
              >
                {on ? <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#9E9E9E' }]} />}
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontFamily: font.regular, fontSize: px(14), color: on ? '#FFFFFF' : '#1E1E1E' }}>{n}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={apply} disabled={busy || !templates || available.length === 0} style={{ marginTop: px(18), width: px(302), height: px(46), borderRadius: px(23), overflow: 'hidden', opacity: busy ? 0.6 : 1 }}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontFamily: font.medium, fontSize: px(15), color: '#FFFFFF' }}>Apply</Text>}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
