import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Image as ImageIcon, Send } from 'lucide-react-native';

import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import type { Casual, CasualKind } from './useRoom';

const DICE = [require('../../assets/room/mz/dice-1.png'), require('../../assets/room/mz/dice-2.png'), require('../../assets/room/mz/dice-3.png'), require('../../assets/room/mz/dice-4.png'), require('../../assets/room/mz/dice-5.png'), require('../../assets/room/mz/dice-6.png')];
const MORA = [require('../../assets/room/mz/mora-0.png'), require('../../assets/room/mz/mora-1.png'), require('../../assets/room/mz/mora-2.png')];
const MACHINE = [require('../../assets/room/mz/machine-0.png'), require('../../assets/room/mz/machine-1.png'), require('../../assets/room/mz/machine-2.png'), require('../../assets/room/mz/machine-3.png'), require('../../assets/room/mz/machine-4.png'), require('../../assets/room/mz/machine-5.png'), require('../../assets/room/mz/machine-6.png'), require('../../assets/room/mz/machine-7.png'), require('../../assets/room/mz/machine-8.png'), require('../../assets/room/mz/machine-9.png')];
const CASUAL_ICON: Record<CasualKind, number> = {
  dice: require('../../assets/room/mz/cat-dice.png'),
  mora: require('../../assets/room/mz/cat-mora.png'),
  machine: require('../../assets/room/mz/cat-machine.png'),
};

const MORE = ['😆', '😉', '😋', '😜', '🤪', '🤗', '🤭', '🤫', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '🤤', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '😵', '🤯', '🤠', '🥸', '😕', '😟', '🙁', '😮', '😲', '😳', '🥺', '😦', '😨', '😰', '😥', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😠', '🤬', '😈', '💀', '💩', '🤡', '👻', '👽', '🤖', '🙈', '🙉', '🙊', '💋', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💔', '🧡', '💛', '💚', '💙', '💜', '🖤', '👋', '🤝', '✌️', '🤞', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇', '✊', '👊', '💪', '🙌', '🎂', '🍕', '🍔', '🍺', '☕', '⚽', '🏆', '🎵', '🚀'];
const SMILEYS = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👏', '🙏', '🔥', '❤️', '🎉', '🌹', '💯', '😅', '🤣', '😘', '😇', '🥳', '😴', '🤩', '😭'];

export const ALL_EMOJI = [...SMILEYS, ...MORE];

type Tab = 'casual' | 'smileys';

const SHEET_BG = '#1E1F33';

/** Mazag's emoji panel: a bottom sheet with a tab strip, a section label and the casual games. One tap on an emoji sends it. */
export function EmojiSheet({
  onClose,
  onCasual,
  onSmiley,
  onKeyboard,
}: {
  onClose: () => void;
  onCasual: (kind: CasualKind) => void;
  onSmiley: (emoji: string) => void;
  onKeyboard: () => void;
}) {
  const { px } = useDesignScale();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('casual');
  const tabs: { key: Tab; node: React.ReactNode }[] = [
    { key: 'casual', node: <Image source={require('../../assets/room/mz/mora-1.png')} style={{ width: px(34), height: px(34) }} /> },
    { key: 'smileys', node: <Text style={{ fontSize: px(30) }}>🙂</Text> },
  ];
  const text = { fontFamily: typography.fontFamily.regular, color: colors.white };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.43, backgroundColor: SHEET_BG, borderTopLeftRadius: px(22), borderTopRightRadius: px(22) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: px(18), paddingTop: px(24), gap: px(14) }}>
          {tabs.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ width: px(50), height: px(50), borderRadius: px(10), alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t.key ? 'rgba(255,255,255,0.12)' : 'transparent' }}>
              {t.node}
            </Pressable>
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onKeyboard} style={{ width: px(40), height: px(40), borderRadius: px(20), backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: px(18), color: SHEET_BG }}>⌨</Text>
          </Pressable>
        </View>
        {tab === 'casual' ? (
          <>
            <Text style={[text, { marginTop: px(18), marginLeft: px(20), fontSize: px(15) }]}>Casual</Text>
            <View style={{ flexDirection: 'row', marginTop: px(16), paddingHorizontal: px(20), gap: px(34) }}>
              {(['dice', 'mora', 'machine'] as CasualKind[]).map((k) => (
                <Pressable key={k} onPress={() => onCasual(k)}>
                  <Image source={CASUAL_ICON[k]} resizeMode="contain" style={{ width: px(56), height: px(56) }} />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={[text, { marginTop: px(18), marginLeft: px(20), fontSize: px(15) }]}>Emoji</Text>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: px(14), paddingTop: px(10) }}>
              {ALL_EMOJI.map((e) => (
                <Pressable key={e} onPress={() => onSmiley(e)} style={{ width: '20%', alignItems: 'center', paddingVertical: px(10) }}>
                  <Text style={{ fontSize: px(30) }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
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
  onSend: () => void;
  onClose: () => void;
  onImage: () => void;
  recent: string[];
  onPickEmoji: (e: string) => void;
}) {
  const { px } = useDesignScale();
  const { height } = useWindowDimensions();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

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
            value={draft}
            onChangeText={onDraft}
            onSubmitEditing={onSend}
            returnKeyType="send"
            maxLength={500}
            placeholder="Typing..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{ flex: 1, padding: 0, fontFamily: typography.fontFamily.regular, fontSize: px(15), color: colors.white }}
          />
          <Pressable onPress={onImage} hitSlop={8}><ImageIcon size={px(24)} color="#fff" /></Pressable>
          <Pressable onPress={onSend} hitSlop={8}><Send size={px(24)} color={draft.trim() ? '#fff' : 'rgba(255,255,255,0.6)'} /></Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: px(22), height: px(60) }}>
          {recent.map((e) => (
            <Pressable key={e} onPress={() => onPickEmoji(e)}>
              <Text style={{ fontSize: px(28) }}>{e}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setMode(mode === 'grid' ? 'keys' : 'grid')} style={{ width: px(30), height: px(30), borderRadius: px(15), borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: px(13), color: '#fff' }}>{mode === 'grid' ? '⌨' : '☺'}</Text>
          </Pressable>
        </View>
        {mode === 'grid' ? (
          <View style={{ height: height * 0.38, backgroundColor: '#25274A' }}>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: px(8), paddingTop: px(10), paddingBottom: px(70) }}>
              {ALL_EMOJI.map((e) => (
                <Pressable key={e} onPress={() => onPickEmoji(e)} style={{ width: '14.28%', alignItems: 'center', paddingVertical: px(9) }}>
                  <Text style={{ fontSize: px(28) }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ position: 'absolute', left: px(14), bottom: px(14), width: px(48), height: px(40), borderRadius: px(10), backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: px(22) }}>😄</Text>
            </View>
            <Pressable onPress={() => onDraft(Array.from(draft).slice(0, -1).join(''))} style={{ position: 'absolute', right: px(14), bottom: px(14), width: px(56), height: px(40), borderRadius: px(10), borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: px(18), color: '#fff' }}>⌫</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** A roll over its player's seat: the faces shuffle for a moment, settle on the server's draw, then clear. */
export function CasualBubble({ casual, x, y, size, onDone }: { casual: Casual; x: number; y: number; size: number; onDone: () => void }) {
  const { px } = useDesignScale();
  const [tick, setTick] = useState(0);
  const settled = tick >= 12;

  useEffect(() => {
    const spin = setInterval(() => setTick((t) => (t < 12 ? t + 1 : t)), 100);
    const done = setTimeout(onDone, 4200);
    return () => {
      clearInterval(spin);
      clearTimeout(done);
    };
    // The bubble is keyed by the roll, so these run once per roll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const face = (list: number[], r: number, i = 0) => (settled ? list[r] : list[(tick * 3 + i * 4 + r) % list.length]);
  const faces =
    casual.type === 'dice'
      ? [face(DICE, casual.result[0] - 1)]
      : casual.type === 'mora'
        ? [face(MORA, casual.result[0])]
        : casual.result.map((d, i) => face(MACHINE, d, i));
  const w = casual.type === 'machine' ? size * 0.55 : size * 0.95;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: px(x), top: px(y), width: px(size), height: px(size), alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
      {faces.map((src, i) => (
        <Image key={i} source={src} resizeMode="contain" style={{ width: px(w), height: px(w) }} />
      ))}
    </View>
  );
}
