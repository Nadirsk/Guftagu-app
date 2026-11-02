import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Grip, Image as ImageIcon, Send } from 'lucide-react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { EMOJI_IDS, emojiSource } from '../../assets/room/emoji';
import type { Casual, CasualKind } from './useRoom';

const DICE = [require('../../assets/room/mz/dice-1.png'), require('../../assets/room/mz/dice-2.png'), require('../../assets/room/mz/dice-3.png'), require('../../assets/room/mz/dice-4.png'), require('../../assets/room/mz/dice-5.png'), require('../../assets/room/mz/dice-6.png')];
const MORA = [require('../../assets/room/mz/mora-0.png'), require('../../assets/room/mz/mora-1.png'), require('../../assets/room/mz/mora-2.png')];
const MACHINE = [require('../../assets/room/mz/machine-0.png'), require('../../assets/room/mz/machine-1.png'), require('../../assets/room/mz/machine-2.png'), require('../../assets/room/mz/machine-3.png'), require('../../assets/room/mz/machine-4.png'), require('../../assets/room/mz/machine-5.png'), require('../../assets/room/mz/machine-6.png'), require('../../assets/room/mz/machine-7.png'), require('../../assets/room/mz/machine-8.png'), require('../../assets/room/mz/machine-9.png')];
export const CASUAL_FACES = { dice: DICE, mora: MORA };
const CASUAL_ICON: Record<CasualKind, number> = {
  dice: require('../../assets/room/mz/cat-dice.png'),
  mora: require('../../assets/room/mz/cat-mora.png'),
  machine: require('../../assets/room/mz/cat-machine.png'),
};

const MORE = ['😆', '😉', '😋', '😜', '🤪', '🤗', '🤭', '🤫', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '😵', '🤯', '🤠', '🥸', '😕', '😟', '🙁', '😮', '😲', '😳', '🥺', '😦', '😨', '😰', '😥', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😠', '🤬', '😈', '💀', '💩', '🤡', '👻', '👽', '🤖', '🙈', '🙉', '🙊', '💋', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💔', '🧡', '💛', '💚', '💙', '💜', '🖤', '👋', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇', '✊', '👊', '💪', '🙌', '🎂', '🍕', '🍔', '🍺', '☕', '⚽', '🏆', '🎵', '🚀'];
const SMILEYS = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👏', '🙏', '🔥', '❤️', '🎉', '🌹', '💯', '😅', '🤣', '😘', '😇', '🥳', '😴', '🤩', '😭'];

export const ALL_EMOJI = [...SMILEYS, ...MORE];

type Tab = 'casual' | 'smileys';

const SHEET_BG = '#1F1D26';
const GRID_COLS = 7;

/** One animated emoji. Memoised so a re-render of the list never restarts the GIFs on screen. */
const GifCell = memo(function GifCell({ id, cell, size, onPress }: { id: number; cell: number; size: number; onPress: (id: number) => void }) {
  return (
    <Pressable onPress={() => onPress(id)} style={{ width: cell, alignItems: 'center', paddingVertical: size * 0.22 }}>
      <Image source={emojiSource(id)} resizeMode="contain" fadeDuration={0} style={{ width: size, height: size }} />
    </Pressable>
  );
});

/** One plain emoji in the keypad grid. */
const GlyphCell = memo(function GlyphCell({ e, size, onPress }: { e: string; size: number; onPress: (e: string) => void }) {
  return (
    <Pressable onPress={() => onPress(e)} style={{ width: `${100 / GRID_COLS}%`, alignItems: 'center', paddingVertical: size * 0.32 }}>
      <Text style={{ fontSize: size }}>{e}</Text>
    </Pressable>
  );
});

/** Mazag's emoji panel: a bottom sheet with a tab strip, a section label and the casual games. One tap on an emoji sends it. */
export function EmojiSheet({
  onClose,
  onCasual,
  onSmiley,
  onAnimated,
  onKeyboard,
}: {
  onClose: () => void;
  onCasual: (kind: CasualKind) => void;
  onSmiley: (emoji: string) => void;
  /** An animated emoji: one tap sends it. */
  onAnimated: (id: number) => void;
  onKeyboard: () => void;
}) {
  const { px } = useDesignScale();
  const { height, width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('casual');
  const sheetH = height * 0.43;
  const cols = Math.max(4, Math.floor((width - px(40)) / px(72)));

  // Slide up on open, slide down on close. The action runs at once; only the sheet's exit waits.
  const slide = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slide]);
  const dismiss = useCallback(
    (action?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      action?.();
      Animated.timing(slide, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onClose());
    },
    [onClose, slide],
  );

  // The GIF grid is the heavy part: mount it only once the slide-in has finished.
  const [gridReady, setGridReady] = useState(false);
  useEffect(() => {
    if (tab !== 'smileys') return;
    const h = setTimeout(() => setGridReady(true), 60);
    return () => clearTimeout(h);
  }, [tab]);
  const renderGif = useCallback(({ item }: { item: number }) => <GifCell id={item} cell={px(72)} size={px(40)} onPress={(id) => dismiss(() => onAnimated(id))} />, [dismiss, onAnimated, px]);

  const tabs: { key: Tab; node: React.ReactNode }[] = [
    { key: 'casual', node: <Image source={require('../../assets/room/mz/mora-1.png')} style={{ width: px(28), height: px(28) }} /> },
    { key: 'smileys', node: <Text style={{ fontSize: px(26) }}>🙂</Text> },
  ];
  const text = { fontFamily: typography.fontFamily.regular, color: colors.white };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: slide }]}>
        <Pressable onPress={() => dismiss()} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sheetH, backgroundColor: SHEET_BG, borderTopLeftRadius: px(22), borderTopRightRadius: px(22), transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(16), paddingTop: px(22), gap: px(10) }}>
          {tabs.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ width: px(41), height: px(41), borderRadius: px(9), alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t.key ? 'rgba(255,255,255,0.14)' : 'transparent' }}>
              {t.node}
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onKeyboard} style={{ width: px(36), height: px(36), borderRadius: px(18), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Grip size={px(20)} color={SHEET_BG} />
          </Pressable>
        </View>
        {tab === 'casual' ? (
          <>
            <Text style={[text, { marginTop: px(20), marginLeft: px(22), fontSize: px(13) }]}>Casual</Text>
            <View style={{ flexDirection: 'row', marginTop: px(22), paddingLeft: px(26), gap: px(56) }}>
              {(['dice', 'mora', 'machine'] as CasualKind[]).map((k) => (
                <Pressable key={k} onPress={() => dismiss(() => onCasual(k))}>
                  <Image source={CASUAL_ICON[k]} resizeMode="contain" style={{ width: px(46), height: px(46) }} />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={[text, { marginTop: px(20), marginLeft: px(22), fontSize: px(13) }]}>Emoji</Text>
            {gridReady ? (
              <FlatList
                key={cols}
                data={EMOJI_IDS as unknown as number[]}
                keyExtractor={(id) => String(id)}
                numColumns={cols}
                renderItem={renderGif}
                initialNumToRender={cols * 2}
                maxToRenderPerBatch={cols}
                windowSize={3}
                removeClippedSubviews
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: px(20), paddingTop: px(10), paddingBottom: px(30) }}
              />
            ) : null}
          </>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Mazag's message composer: a dark panel riding on the keyboard (input, image and send, then the five
 * recent emojis and a grid button). The grid button swaps the keyboard for a full emoji keypad; emojis
 * build up the message, they are not sent one by one here.
 */
export function Composer({
  mode,
  setMode,
  kb,
  draft,
  onDraft,
  onSend,
  onClose,
  onImage,
  recent,
  onPickEmoji,
}: {
  mode: 'keys' | 'grid';
  setMode: (m: 'keys' | 'grid') => void;
  kb: number;
  draft: string;
  onDraft: (t: string) => void;
  onSend: (text: string) => void;
  onClose: () => void;
  onImage: () => void;
  recent: string[];
  onPickEmoji: (e: string) => void;
}) {
  const { px } = useDesignScale();
  const { height } = useWindowDimensions();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Typing stays in here: pushing every keystroke up would re-render the whole room screen.
  const [text, setText] = useState(draft);
  const latest = useRef(text);
  latest.current = text;
  const flush = useRef(onDraft);
  flush.current = onDraft;
  useEffect(() => () => flush.current(latest.current), []);
  /** A sent message must not be flushed back into the draft when the composer unmounts. */
  const submit = () => {
    const t = text;
    latest.current = '';
    onSend(t);
  };

  const pick = useCallback(
    (e: string) => {
      setText((d) => d + e);
      onPickEmoji(e);
    },
    [onPickEmoji],
  );
  const renderGlyph = useCallback(({ item }: { item: string }) => <GlyphCell e={item} size={px(28)} onPress={pick} />, [pick, px]);

  useEffect(() => {
    if (mode === 'keys') {
      const t = setTimeout(() => input.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    Keyboard.dismiss();
  }, [mode]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: mode === 'keys' ? kb : 0, backgroundColor: '#161624', borderTopLeftRadius: px(22), borderTopRightRadius: px(22) }}>
        <View style={{ marginHorizontal: px(16), marginTop: px(16), height: px(46), borderRadius: px(23), backgroundColor: 'rgba(255,255,255,0.09)', flexDirection: 'row', alignItems: 'center', paddingLeft: px(16), paddingRight: px(14), gap: px(14) }}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            returnKeyType="send"
            maxLength={500}
            placeholder="Typing..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{ flex: 1, padding: 0, fontFamily: typography.fontFamily.regular, fontSize: px(15), color: colors.white }}
          />
          <Pressable onPress={onImage} hitSlop={8}><ImageIcon size={px(24)} color="#fff" /></Pressable>
          <Pressable onPress={submit} hitSlop={8}><Send size={px(24)} color={text.trim() ? '#fff' : 'rgba(255,255,255,0.6)'} /></Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: px(22), height: px(60) }}>
          {recent.map((e) => (
            <Pressable key={e} onPress={() => pick(e)}>
              <Text style={{ fontSize: px(28) }}>{e}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setMode(mode === 'grid' ? 'keys' : 'grid')} style={{ width: px(30), height: px(30), borderRadius: px(15), borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: px(13), color: '#fff' }}>{mode === 'grid' ? '⌨' : '☺'}</Text>
          </Pressable>
        </View>
        {mode === 'grid' ? (
          <View style={{ height: height * 0.38, backgroundColor: '#25274A' }}>
            <FlatList
              data={ALL_EMOJI}
              keyExtractor={(e) => e}
              numColumns={GRID_COLS}
              renderItem={renderGlyph}
              initialNumToRender={GRID_COLS * 5}
              maxToRenderPerBatch={GRID_COLS * 3}
              windowSize={5}
              removeClippedSubviews
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: px(8), paddingTop: px(10), paddingBottom: px(70) }}
            />
            <View style={{ position: 'absolute', left: px(14), bottom: px(14), width: px(48), height: px(40), borderRadius: px(10), backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: px(22) }}>😄</Text>
            </View>
            <Pressable onPress={() => setText((d) => Array.from(d).slice(0, -1).join(''))} style={{ position: 'absolute', right: px(14), bottom: px(14), width: px(56), height: px(40), borderRadius: px(10), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: px(18), color: '#fff' }}>⌫</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** A roll over its player's seat: the faces tumble for ~1.5 s, settle on the server's draw, rest ~2 s, then fade. */
export function CasualBubble({ casual, x, y, size, onDone }: { casual: Casual; x: number; y: number; size: number; onDone: () => void }) {
  const { px } = useDesignScale();
  const [tick, setTick] = useState(0);
  const ROLL = casual.type === 'emoji' ? 0 : 15;
  const settled = tick >= ROLL;
  const t = useRef(new Animated.Value(0)).current;
  const life = casual.type === 'emoji' ? 2250 : 3700;

  useEffect(() => {
    const spin = setInterval(() => setTick((n) => (n < ROLL ? n + 1 : n)), 100);
    Animated.timing(t, { toValue: 1, duration: life, easing: Easing.linear, useNativeDriver: true }).start();
    const done = setTimeout(onDone, life);
    return () => {
      clearInterval(spin);
      clearTimeout(done);
    };
    // The bubble is keyed by the roll, so these run once per roll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const face = (list: number[], r: number, i = 0) => (settled ? list[r] : list[(tick * 3 + i * 4 + r) % list.length]);
  const faces =
    casual.type === 'emoji'
      ? []
      : casual.type === 'dice'
        ? [face(DICE, casual.result[0] - 1)]
        : casual.type === 'mora'
          ? [face(MORA, casual.result[0])]
          : casual.result.map((d, i) => face(MACHINE, d, i));
  const w = casual.type === 'machine' ? size * 0.36 : size * 0.9;
  const rollEnd = ROLL * 100 / life;
  const opacity = t.interpolate({ inputRange: [0, 0.04, 0.88, 1], outputRange: [0, 1, 1, 0] });
  // Tumbling while rolling (a few swings that die away), still once it has landed.
  const rotate = t.interpolate({ inputRange: [0, rollEnd * 0.33, rollEnd * 0.66, Math.max(rollEnd, 0.001), 1], outputRange: ['-24deg', '20deg', '-12deg', '0deg', '0deg'] });
  // An emoji has no roll: it pops in and stays. Dice/slots pop, tumble, then bounce once on landing.
  const scale =
    casual.type === 'emoji'
      ? t.interpolate({ inputRange: [0, 0.1, 0.2, 1], outputRange: [0.4, 1.12, 1, 1] })
      : t.interpolate({ inputRange: [0, 0.05, rollEnd, rollEnd + 0.04, 1], outputRange: [0.4, 1.12, 1.0, 1.12, 1] });

  if (casual.type === 'emoji') {
    // Mazag plays the GIF over the seat, far bigger than the avatar, for a couple of seconds.
    return (
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: px(x), top: px(y), width: px(size), height: px(size), alignItems: 'center', justifyContent: 'center', opacity, transform: [{ scale }] }}>
        <Image source={emojiSource(casual.result[0])} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: px(x), top: px(y), width: px(size), height: px(size), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity, transform: [{ rotate }, { scale }] }}>
      {faces.map((src, i) => (
        <Image key={i} source={src} resizeMode="contain" style={{ width: px(w), height: px(w) }} />
      ))}
    </Animated.View>
  );
}
