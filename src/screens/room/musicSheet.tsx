import { ArrowLeft, CircleCheck, CloudUpload, Music2, Pause, Play, SkipBack, SkipForward, Trash2, Volume2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import * as icons from '../../assets/room/icons';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { MUSIC } from './geometry';
import { formatMs, type RoomMusicApi } from './music';

/** Mazag's player orange. */
const ACCENT = '#FF8A00';
const MUTED = 'rgba(0,0,0,0.45)';
const PLAYER_H = 128;

const font = { regular: typography.fontFamily.regular, medium: typography.fontFamily.medium, semiBold: typography.fontFamily.semiBold };

/** A 0–100 slider; dragging anywhere on the track sets it. */
function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { px } = useDesignScale();
  const width = useRef(1);
  const [live, setLive] = useState(value);
  useEffect(() => setLive(value), [value]);
  const set = (x: number, commit: boolean) => {
    const v = Math.max(0, Math.min(100, (x / width.current) * 100));
    setLive(v);
    if (commit) onChange(v);
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => set(e.nativeEvent.locationX, false),
        onPanResponderMove: (e) => set(e.nativeEvent.locationX, false),
        onPanResponderRelease: (e) => set(e.nativeEvent.locationX, true),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange],
  );
  return (
    <View {...pan.panHandlers} onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)} style={{ height: px(30), justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ height: px(4), borderRadius: px(2), backgroundColor: 'rgba(0,0,0,0.1)' }}>
        <View style={{ width: `${live}%`, height: '100%', borderRadius: px(2), backgroundColor: ACCENT }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${live}%`, marginLeft: -px(9), width: px(18), height: px(18), borderRadius: px(9), backgroundColor: colors.white, borderWidth: 2, borderColor: ACCENT }} />
    </View>
  );
}

function Row({ index, title, sub, right, onPress, active }: { index: number; title: string; sub: string; right: React.ReactNode; onPress?: () => void; active?: boolean }) {
  const { px } = useDesignScale();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', height: px(60), paddingHorizontal: px(22), backgroundColor: pressed && onPress ? 'rgba(0,0,0,0.03)' : 'transparent' })}>
      <Text style={{ width: px(28), fontFamily: font.medium, fontSize: px(15), color: active ? ACCENT : MUTED }}>{index}</Text>
      <View style={{ flex: 1, marginRight: px(10) }}>
        <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: px(15), color: active ? ACCENT : colors.black }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: px(12), color: MUTED }}>{sub}</Text>
      </View>
      {right}
    </Pressable>
  );
}

/**
 * Tools → Music (Figma's sheet: PlayList / Local tabs and the search box), working the
 * way Mazag's does: Local lists the phone's songs and ☁↑ adds one to My Music (copied
 * into the app, nothing uploaded); tapping a PlayList song plays it into the room while
 * this user is on a seat; 🗑 deletes; the player at the bottom has ⏮ ▶/⏸ ⏭ and 🔊, whose
 * panel sets the song's Volume and this user's Microphone.
 */
export function MusicSheet({ extra, music, seated, onToast, onClose }: { extra: number; music: RoomMusicApi; seated: boolean; onToast: (t: string) => void; onClose: () => void }) {
  const { px } = useDesignScale();
  const [tab, setTab] = useState<'PlayList' | 'Local'>(music.songs.length ? 'PlayList' : 'Local');
  const [query, setQuery] = useState('');
  const [volumePanel, setVolumePanel] = useState(false);
  const m = MUSIC;

  useEffect(() => {
    if (tab === 'Local' && music.local === null) music.loadLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const q = query.trim().toLowerCase();
  const match = (t: string, a: string | null) => !q || t.toLowerCase().includes(q) || (a ?? '').toLowerCase().includes(q);
  const sub = (artist: string | null, ms: number) => `${artist ?? 'Unknown'}  ·  ${formatMs(ms)}`;
  const needSeat = () => onToast('Take a seat to play music');

  const playOrSay = (ok: boolean) => {
    if (!ok) needSeat();
  };

  const confirmDelete = (song: (typeof music.songs)[number]) =>
    Alert.alert('Delete song?', `"${song.title}" will be removed from My Music.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => music.remove(song) },
    ]);

  const pos = music.status?.positionMs ?? 0;
  const dur = music.status?.durationMs || music.current?.durationMs || 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,19,23,0.8)' }]} accessibilityLabel="Close" />
      <View style={{ position: 'absolute', left: 0, right: 0, top: px(m.y + extra - (volumePanel ? 0 : 0)), bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: px(m.radius), borderTopRightRadius: px(m.radius), overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: px(m.handle.y), left: px((402 - m.handle.width) / 2), width: px(m.handle.width), height: px(m.handle.height), borderRadius: px(15), backgroundColor: '#D9D9D9' }} />

        {!music.available ? (
          <Text style={[styles.center, { top: px(110), fontFamily: font.regular, fontSize: px(14), color: MUTED }]}>Music needs the latest app update.</Text>
        ) : volumePanel ? (
          // 🔊 — Volume (the song, for the room and here) and Microphone (this user's voice).
          <View style={{ position: 'absolute', left: px(22), right: px(22), top: px(m.tabs.y - 8) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', height: px(40) }}>
              <Pressable onPress={() => setVolumePanel(false)} hitSlop={px(10)} accessibilityLabel="Back">
                <ArrowLeft size={px(22)} color={colors.black} />
              </Pressable>
              <Text style={{ flex: 1, textAlign: 'center', marginRight: px(22), fontFamily: font.medium, fontSize: px(18), color: colors.black }}>Volume</Text>
            </View>
            {(
              [
                ['Volume', music.musicVolume, music.setMusicVolume],
                ['Microphone', music.micVolume, music.setMicVolume],
              ] as const
            ).map(([label, value, set]) => (
              <View key={label} style={{ marginTop: px(18), padding: px(16), borderRadius: px(14), backgroundColor: 'rgba(0,0,0,0.04)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: font.medium, fontSize: px(15), color: colors.black }}>{label}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: px(13), color: MUTED }}>{Math.round(value)}%</Text>
                </View>
                <Slider value={value} onChange={set} />
              </View>
            ))}
          </View>
        ) : (
          <>
            {(['PlayList', 'Local'] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={{ position: 'absolute', top: px(m.tabs.y), left: px((t === 'PlayList' ? m.tabs.playlistX : m.tabs.localX) - m.tabs.width / 2), width: px(m.tabs.width) }}>
                <Text style={{ fontFamily: font.medium, fontSize: px(m.tabs.size), textAlign: 'center', color: tab === t ? colors.black : 'rgba(0,0,0,0.5)' }}>{t}</Text>
              </Pressable>
            ))}
            <View style={{ position: 'absolute', left: px(m.search.x), top: px(m.search.y), width: px(m.search.width), height: px(m.search.height), borderRadius: px(30), backgroundColor: '#E5E5E5', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flexDirection: 'row', alignItems: 'center', paddingLeft: px(19), gap: px(m.search.gap) }}>
              <SvgXml xml={icons.search} width={px(m.search.icon)} height={px(m.search.icon)} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Please Search the music name" placeholderTextColor="rgba(124,121,121,0.4)" style={{ flex: 1, fontFamily: font.medium, fontSize: px(m.search.size), color: '#7C7979', padding: 0 }} />
            </View>

            <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: px(m.list.y - 6), bottom: px(PLAYER_H) }} keyboardShouldPersistTaps="handled">
              {tab === 'PlayList' ? (
                music.songs.filter((s) => match(s.title, s.artist)).length ? (
                  music.songs
                    .filter((s) => match(s.title, s.artist))
                    .map((s, i) => {
                      const on = music.current?.id === s.id;
                      return (
                        <Row
                          key={s.id}
                          index={i + 1}
                          title={s.title}
                          sub={sub(s.artist, s.durationMs)}
                          active={on}
                          onPress={() => playOrSay(music.play(s))}
                          right={
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(16) }}>
                              {on && music.isPlaying ? <Music2 size={px(18)} color={ACCENT} /> : null}
                              <Pressable onPress={() => confirmDelete(s)} hitSlop={px(8)} accessibilityLabel={`Delete ${s.title}`}>
                                <Trash2 size={px(20)} color="#FF3B30" />
                              </Pressable>
                            </View>
                          }
                        />
                      );
                    })
                ) : (
                  <Text style={[styles.empty, { marginTop: px(40), fontFamily: font.regular, fontSize: px(13), color: MUTED }]}>
                    {q ? 'No song matches' : 'No songs yet — add some from Local'}
                  </Text>
                )
              ) : music.local === null ? (
                <ActivityIndicator style={{ marginTop: px(40) }} color={ACCENT} />
              ) : music.localDenied ? (
                <View style={{ alignItems: 'center', marginTop: px(30), gap: px(12) }}>
                  <Text style={[styles.empty, { fontFamily: font.regular, fontSize: px(13), color: MUTED }]}>Allow access to music to see the songs on this phone.</Text>
                  <Pressable onPress={music.loadLocal} style={{ paddingHorizontal: px(20), height: px(38), borderRadius: px(19), backgroundColor: ACCENT, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: font.medium, fontSize: px(14), color: colors.white }}>Allow</Text>
                  </Pressable>
                </View>
              ) : music.local.filter((s) => match(s.title, s.artist)).length ? (
                music.local
                  .filter((s) => match(s.title, s.artist))
                  .map((s, i) => {
                    const added = music.songs.some((x) => x.id === s.id);
                    return (
                      <Row
                        key={s.id}
                        index={i + 1}
                        title={s.title}
                        sub={sub(s.artist, s.durationMs)}
                        right={
                          music.adding === s.id ? (
                            <ActivityIndicator color={ACCENT} />
                          ) : added ? (
                            <CircleCheck size={px(22)} color="#E0459B" />
                          ) : (
                            <Pressable
                              onPress={() => {
                                if (s.size > 15 * 1024 * 1024) return onToast('A song can be up to 15 MB');
                                music.add(s).then(() => onToast(`Added: ${s.title}`)).catch(() => onToast('Could not add that song'));
                              }}
                              hitSlop={px(8)}
                              accessibilityLabel={`Add ${s.title}`}
                            >
                              <CloudUpload size={px(22)} color={colors.black} />
                            </Pressable>
                          )
                        }
                      />
                    );
                  })
              ) : (
                <Text style={[styles.empty, { marginTop: px(40), fontFamily: font.regular, fontSize: px(13), color: MUTED }]}>{q ? 'No song matches' : 'No music on this phone yet'}</Text>
              )}
            </ScrollView>
          </>
        )}

        {/* The player — Mazag's: what is on, its progress, ⏮ ▶/⏸ ⏭ and 🔊. */}
        {music.available ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: px(PLAYER_H), paddingHorizontal: px(22), paddingTop: px(12), borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', backgroundColor: colors.white }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(10) }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: px(14), color: music.current ? colors.black : MUTED }}>
                {music.current ? music.current.title : 'No music playing'}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: px(12), color: MUTED }}>
                {formatMs(music.current ? pos : 0)} / {formatMs(music.current ? dur : 0)}
              </Text>
            </View>
            <View style={{ height: px(3), borderRadius: px(2), marginTop: px(8), backgroundColor: 'rgba(0,0,0,0.08)' }}>
              <View style={{ width: `${music.current && dur ? Math.min(100, (pos / dur) * 100) : 0}%`, height: '100%', borderRadius: px(2), backgroundColor: ACCENT }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: px(12), gap: px(28) }}>
              <Pressable onPress={() => setVolumePanel((v) => !v)} hitSlop={px(8)} accessibilityLabel="Volume" style={[styles.round, { width: px(40), height: px(40), borderRadius: px(20), position: 'absolute', left: 0 }]}>
                <Volume2 size={px(20)} color={volumePanel ? ACCENT : colors.black} />
              </Pressable>
              <Pressable onPress={() => playOrSay(music.prev())} hitSlop={px(8)} accessibilityLabel="Previous" style={[styles.round, { width: px(42), height: px(42), borderRadius: px(21) }]}>
                <SkipBack size={px(20)} color={colors.black} fill={colors.black} />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!music.songs.length) return onToast('Add a song from Local first');
                  playOrSay(music.toggle());
                }}
                accessibilityLabel={music.isPlaying ? 'Pause' : 'Play'}
                style={{ width: px(56), height: px(56), borderRadius: px(28), backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}
              >
                {music.isPlaying ? <Pause size={px(24)} color={colors.white} fill={colors.white} /> : <Play size={px(24)} color={colors.white} fill={colors.white} style={{ marginLeft: px(3) }} />}
              </Pressable>
              <Pressable onPress={() => playOrSay(music.next())} hitSlop={px(8)} accessibilityLabel="Next" style={[styles.round, { width: px(42), height: px(42), borderRadius: px(21) }]}>
                <SkipForward size={px(20)} color={colors.black} fill={colors.black} />
              </Pressable>
            </View>
            {!seated && music.songs.length ? (
              <Text style={{ position: 'absolute', right: px(22), bottom: px(8), fontFamily: font.regular, fontSize: px(11), color: MUTED }}>Take a seat to play</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  empty: { textAlign: 'center', paddingHorizontal: 30 },
  round: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
});
