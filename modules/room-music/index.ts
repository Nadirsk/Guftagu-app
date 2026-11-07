import { requireOptionalNativeModule } from 'expo-modules-core';

/** A song already on the phone (Room → Music → Local). */
export type LocalSong = {
  id: string;
  uri: string;
  title: string;
  artist: string | null;
  durationMs: number;
  size: number;
  mime: string | null;
  fileName: string | null;
};

export type MusicStatus = {
  path: string | null;
  playing: boolean;
  paused: boolean;
  positionMs: number;
  durationMs: number;
  /** True once the mixer sits on the live microphone — only then does the room hear it. */
  mixerAttached: boolean;
};

type Native = {
  listLocal(): Promise<LocalSong[]>;
  importSong(uri: string, id: string, fileName: string | null): Promise<string>;
  deleteSong(path: string): boolean;
  play(path: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  setMusicVolume(volume: number): void;
  setMicVolume(volume: number): void;
  setMicOpen(open: boolean): void;
  attachMixer(): boolean;
  status(): MusicStatus;
};

/**
 * Room music, Mazag style, entirely on the phone (Android): songs are copied into the
 * app, played here and mixed into the microphone, so a seated user's music reaches the
 * room in their voice stream. Null where the native module is missing (web, an older
 * build) — the screens then say music is unavailable.
 */
export const RoomMusic = requireOptionalNativeModule<Native>('RoomMusic');
