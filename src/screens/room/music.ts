import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { type LocalSong, RoomMusic, type MusicStatus } from '../../../modules/room-music';

/**
 * Room music, as Mazag does it — nothing goes to the server:
 *  - Local: the songs on this phone. Adding one copies it into the app ("My Music").
 *  - My Music lives in the app's own storage with its list in `my-music.json`.
 *  - Playing needs a seat: the song is mixed into this user's microphone, so the room
 *    hears it in their voice stream; standing up (or leaving) stops it.
 */

export type MySong = { id: string; title: string; artist: string | null; durationMs: number; path: string };
type Saved = { songs: MySong[]; musicVolume: number; micVolume: number };

const file = () => new File(Paths.document, 'my-music.json');

function load(): Saved {
  try {
    const f = file();
    if (f.exists) {
      const parsed = JSON.parse(f.textSync()) as Partial<Saved>;
      return { songs: Array.isArray(parsed.songs) ? parsed.songs : [], musicVolume: parsed.musicVolume ?? 100, micVolume: parsed.micVolume ?? 100 };
    }
  } catch {
    // An unreadable list is an empty one.
  }
  return { songs: [], musicVolume: 100, micVolume: 100 };
}

function save(saved: Saved) {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(saved));
  } catch {
    // Costs only the list on the next start.
  }
}

/** Android 13+ asks for READ_MEDIA_AUDIO, older versions for storage. */
async function askForSongs(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const permission =
    Number(Platform.Version) >= 33
      ? ('android.permission.READ_MEDIA_AUDIO' as typeof PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE)
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
}

export const musicAvailable = RoomMusic !== null;

export const formatMs = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Everything the room's music sheet needs. `seated` and `micOpen` come from the room:
 * playing is refused off a seat, standing up stops the song, and with the mic off the
 * song still goes out while the voice does not.
 */
export function useRoomMusic({ seated, micOpen }: { seated: boolean; micOpen: boolean }) {
  const [saved, setSaved] = useState<Saved>(load);
  const [local, setLocal] = useState<LocalSong[] | null>(null);
  const [localDenied, setLocalDenied] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [status, setStatus] = useState<MusicStatus | null>(() => RoomMusic?.status() ?? null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const update = useCallback((next: Saved) => {
    setSaved(next);
    save(next);
  }, []);

  // Volumes carry over between rooms and app starts.
  useEffect(() => {
    RoomMusic?.setMusicVolume(saved.musicVolume);
    RoomMusic?.setMicVolume(saved.micVolume);
  }, [saved.musicVolume, saved.micVolume]);

  useEffect(() => {
    RoomMusic?.setMicOpen(micOpen);
  }, [micOpen]);

  // The song needs a seat: off the seat, off the air.
  const wasSeated = useRef(seated);
  useEffect(() => {
    if (wasSeated.current && !seated && RoomMusic?.status().path) {
      RoomMusic.stop();
      setCurrentId(null);
    }
    wasSeated.current = seated;
  }, [seated]);

  // Leaving the room ends the music.
  useEffect(() => () => RoomMusic?.stop(), []);

  // Progress, while something is on.
  useEffect(() => {
    const native = RoomMusic;
    if (!native) return;
    const t = setInterval(() => setStatus(native.status()), 500);
    return () => clearInterval(t);
  }, []);

  const loadLocal = useCallback(async () => {
    if (!RoomMusic) return;
    if (!(await askForSongs())) {
      setLocalDenied(true);
      setLocal([]);
      return;
    }
    setLocalDenied(false);
    setLocal(await RoomMusic.listLocal());
  }, []);

  /** Local → My Music: copy the file into the app. */
  const add = useCallback(
    async (song: LocalSong) => {
      if (!RoomMusic || saved.songs.some((s) => s.id === song.id)) return;
      setAdding(song.id);
      try {
        const path = await RoomMusic.importSong(song.uri, song.id, song.fileName);
        update({ ...saved, songs: [{ id: song.id, title: song.title, artist: song.artist, durationMs: song.durationMs, path }, ...saved.songs] });
      } finally {
        setAdding(null);
      }
    },
    [saved, update],
  );

  const remove = useCallback(
    (song: MySong) => {
      RoomMusic?.deleteSong(song.path);
      if (currentId === song.id) setCurrentId(null);
      update({ ...saved, songs: saved.songs.filter((s) => s.id !== song.id) });
    },
    [currentId, saved, update],
  );

  /** Returns false when the user is not on a seat (the caller says so). */
  const play = useCallback(
    (song: MySong) => {
      if (!RoomMusic || !seated) return false;
      RoomMusic.play(song.path);
      // The mic starts before any song does; if the mixer did not catch it, join it now.
      if (!RoomMusic.status().mixerAttached) RoomMusic.attachMixer();
      setCurrentId(song.id);
      setStatus(RoomMusic.status());
      return true;
    },
    [seated],
  );

  const current = saved.songs.find((s) => s.id === currentId) ?? null;

  /** ▶ / ⏸: resumes or pauses; with nothing on, starts the first song. */
  const toggle = useCallback(() => {
    if (!RoomMusic) return false;
    const s = RoomMusic.status();
    if (s.path && s.playing) RoomMusic.pause();
    else if (s.path && s.paused) RoomMusic.resume();
    else if (saved.songs[0]) return play(current ?? saved.songs[0]);
    setStatus(RoomMusic.status());
    return true;
  }, [current, play, saved.songs]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!saved.songs.length) return false;
      const at = current ? saved.songs.findIndex((s) => s.id === current.id) : -1;
      const next = saved.songs[(at + dir + saved.songs.length) % saved.songs.length];
      return play(next);
    },
    [current, play, saved.songs],
  );

  const stop = useCallback(() => {
    RoomMusic?.stop();
    setCurrentId(null);
  }, []);

  return {
    available: musicAvailable,
    songs: saved.songs,
    local,
    localDenied,
    adding,
    loadLocal,
    add,
    remove,
    play,
    toggle,
    next: () => step(1),
    prev: () => step(-1),
    stop,
    current,
    status,
    isOn: !!status?.path && !!current,
    isPlaying: !!status?.playing && !!current,
    musicVolume: saved.musicVolume,
    micVolume: saved.micVolume,
    setMusicVolume: (v: number) => update({ ...saved, musicVolume: Math.round(v) }),
    setMicVolume: (v: number) => update({ ...saved, micVolume: Math.round(v) }),
  };
}

export type RoomMusicApi = ReturnType<typeof useRoomMusic>;
