import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';

/**
 * Everything that touches `expo-audio`, in one file. The native module only exists in a dev
 * client built after it was added, so `ConversationScreen` loads this file inside a
 * try/catch: an older build keeps working and just says voice needs the new build.
 */

export type VoiceClip = { uri: string; durationMs: number };

/** Hold-to-record: `start()` on press, `stop()` on release (or `cancel()` when slid away). */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 100);

  const start = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async (): Promise<VoiceClip | null> => {
    const durationMs = recorder.getStatus().durationMillis;
    try {
      await recorder.stop();
    } catch {
      return null;
    } finally {
      // Back to playback mode so the next voice note is not played through the earpiece.
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
    return recorder.uri ? { uri: recorder.uri, durationMs } : null;
  }, [recorder]);

  return { start, stop, recording: state.isRecording, durationMs: state.durationMillis };
}

function clock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const BARS = 24;
/** A fixed, per-message waveform: the same clip always draws the same bars. */
function barHeights(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: BARS }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 6 + ((h >>> 16) % 20) + (i % 3);
  });
}

/** Play / pause, the waveform filling as it plays, and the time left. */
export function VoicePlayer({ url, durationMs, mine }: { url: string; durationMs: number; mine: boolean }) {
  const { px } = useDesignScale();
  const player = useAudioPlayer(url, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  // A voice note plays once, like WhatsApp: it never repeats on its own.
  useEffect(() => {
    player.loop = false;
  }, [player]);

  // Finished: stop first, then rewind. Seeking an ended player while it still wants to play
  // restarts it, which is what made the clip loop; now it waits at 0 for the next press.
  useEffect(() => {
    if (!status.didJustFinish) return;
    player.pause();
    player.seekTo(0).catch(() => undefined);
  }, [status.didJustFinish, player]);

  const total = status.duration > 0 ? status.duration * 1000 : durationMs;
  const played = status.playing || status.currentTime > 0 ? status.currentTime * 1000 : 0;
  const ratio = total > 0 ? Math.min(1, played / total) : 0;
  const bars = barHeights(url);
  const on = mine ? colors.white : '#005DE9';
  const off = mine ? 'rgba(255,255,255,0.45)' : '#B7C9EE';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10), width: px(226), paddingVertical: px(8), paddingLeft: px(8), paddingRight: px(14) }}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'}
        style={{ width: px(36), height: px(36), borderRadius: px(18), backgroundColor: mine ? colors.white : '#005DE9', alignItems: 'center', justifyContent: 'center' }}
      >
        {status.playing ? (
          <Pause size={px(16)} color={mine ? '#005DE9' : colors.white} fill={mine ? '#005DE9' : colors.white} />
        ) : (
          <Play size={px(16)} color={mine ? '#005DE9' : colors.white} fill={mine ? '#005DE9' : colors.white} />
        )}
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: px(28) }}>
        {bars.map((h, i) => (
          <View key={i} style={{ width: px(3), height: px(h), borderRadius: px(2), backgroundColor: i / BARS < ratio ? on : off }} />
        ))}
      </View>
      <Text style={{ fontFamily: typography.fontFamily.medium, fontSize: px(11), color: mine ? '#E6EEFF' : '#5B6475', minWidth: px(28), textAlign: 'right' }}>
        {clock(status.playing ? total - played : total)}
      </Text>
    </View>
  );
}
