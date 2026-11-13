import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, CheckCircle2, HelpCircle, Info, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { typography } from '../theme/tokens';

/**
 * Drop-in replacement for react-native's `Alert` — same `Alert.alert(title, message?, buttons?, options?)`
 * call, but drawn as the app's own rounded dialog (icon, title, message, pill buttons) instead of the
 * grey system box. Only one shows at a time; the rest wait in a queue. `<AlertHost />` must be mounted once.
 */

export type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};
/** `live`: the plain white box with a gradient Confirm of the live rooms; `live-sheet`: their bottom action list. */
type AlertOptions = { cancelable?: boolean; onDismiss?: () => void; look?: 'live' | 'live-sheet' };
type Item = { id: number; title: string; message?: string; buttons: AlertButton[]; options?: AlertOptions };

let seq = 0;
let queue: Item[] = [];
let listener: ((current: Item | null) => void) | null = null;

const publish = () => listener?.(queue[0] ?? null);

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    queue.push({ id: ++seq, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options });
    // Nothing mounted yet (very early call): the host picks the queue up when it mounts.
    if (queue.length === 1) publish();
  },
};

type Tone = 'success' | 'error' | 'danger' | 'question' | 'info' | 'menu';

/** Icon + colour picked from the wording, so call sites don't have to say what kind of dialog it is. */
function toneOf(item: Item): Tone {
  // A title with a list of actions and no message is a menu (e.g. a seat's actions), not a warning.
  if (!item.message && item.buttons.length >= 3) return 'menu';
  const text = `${item.title} ${item.message ?? ''}`.toLowerCase();
  if (item.buttons.some((b) => b.style === 'destructive')) return 'danger';
  if (/could not|couldn't|failed|error|invalid|not enough|do not have|don't have|wrong|unable|no longer|already|denied|not available|try again/.test(text)) return 'error';
  if (/success|purchased|sent|added|done|saved|thank|updated|submitted|received|requested|copied|unblocked|equipped|welcome/.test(text)) return 'success';
  if (item.buttons.length > 1 || /\?/.test(text)) return 'question';
  return 'info';
}

const TONES: Record<Tone, { color: string; tint: string; Icon: typeof Info }> = {
  success: { color: '#16A34A', tint: '#DCFCE7', Icon: CheckCircle2 },
  error: { color: '#EA580C', tint: '#FFEDD5', Icon: XCircle },
  danger: { color: '#DC2626', tint: '#FEE2E2', Icon: AlertTriangle },
  question: { color: '#2563EB', tint: '#DBEAFE', Icon: HelpCircle },
  info: { color: '#2563EB', tint: '#DBEAFE', Icon: Info },
  menu: { color: '#2563EB', tint: '#DBEAFE', Icon: Info },
};

export function AlertHost() {
  const [current, setCurrent] = useState<Item | null>(null);
  const { width } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0.88)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listener = setCurrent;
    setCurrent(queue[0] ?? null);
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    scale.setValue(0.88);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [current, scale, fade]);

  const close = useCallback((button?: AlertButton) => {
    const item = queue.shift();
    publish();
    if (button) button.onPress?.();
    else item?.options?.onDismiss?.();
  }, []);

  if (!current) return null;

  if (current.options?.look === 'live-sheet' || current.options?.look === 'live') {
    const cancelBtn = current.buttons.find((b) => b.style === 'cancel');
    const dismissLive = () => close(cancelBtn);
    if (current.options.look === 'live-sheet') {
      const rows = current.buttons.filter((b) => b !== cancelBtn);
      return (
        <Modal transparent animationType="fade" statusBarTranslucent visible onRequestClose={dismissLive}>
          <View style={live.backdropBottom}>
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissLive} />
            <View style={live.sheet}>
              {current.title ? <Text style={live.sheetTitle}>{current.title}</Text> : null}
              {rows.map((b, i) => (
                <Pressable key={`${b.text}-${i}`} onPress={() => close(b)} style={[live.sheetRow, i > 0 || current.title ? live.sheetRowLine : null]}>
                  <Text style={live.sheetText}>{b.text}</Text>
                </Pressable>
              ))}
              <View style={live.sheetGap} />
              <Pressable onPress={dismissLive} style={live.sheetRow}>
                <Text style={[live.sheetText, { color: '#777777' }]}>{cancelBtn?.text ?? 'Cancel'}</Text>
              </Pressable>
              <View style={{ height: 14 }} />
            </View>
          </View>
        </Modal>
      );
    }
    const okBtns = current.buttons.filter((b) => b !== cancelBtn);
    return (
      <Modal transparent animationType="fade" statusBarTranslucent visible onRequestClose={dismissLive}>
        <View style={live.backdropCenter}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissLive} />
          <View style={[live.box, { width: Math.min(width - 56, 330) }]}>
            <Text style={live.line}>{current.title}</Text>
            {current.message ? <Text style={live.sub}>{current.message}</Text> : null}
            <View style={live.row}>
              {cancelBtn ? (
                <Pressable onPress={dismissLive} style={[live.pill, { backgroundColor: '#DADADD' }]}>
                  <Text style={[live.pillText, { color: '#8A8A8F' }]}>{cancelBtn.text ?? 'Cancel'}</Text>
                </Pressable>
              ) : null}
              {okBtns.map((b, i) => (
                <Pressable key={`${b.text}-${i}`} onPress={() => close(b)} style={live.pill}>
                  <LinearGradient colors={['#F6D90B', '#00D3B3']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
                  <Text style={[live.pillText, { color: '#FFFFFF' }]}>{b.text ?? 'OK'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const tone = TONES[toneOf(current)];
  const Icon = tone.Icon;
  // Three buttons, or two whose labels would not fit side by side, go one under the other.
  const stacked = current.buttons.length > 2 || current.buttons.reduce((n, b) => n + (b.text?.length ?? 2), 0) > 14;
  const cancelButton = current.buttons.find((b) => b.style === 'cancel');
  // Android Back / tapping outside: same as Cancel when there is one, otherwise only if the caller allowed it.
  const dismissible = !!cancelButton || current.options?.cancelable === true || current.buttons.length === 1;
  const onDismiss = () => {
    if (!dismissible) return;
    if (cancelButton) close(cancelButton);
    else close();
  };
  const cardWidth = Math.min(width - 48, 340);

  return (
    <Modal transparent animationType="none" statusBarTranslucent visible onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <Animated.View style={[styles.card, { width: cardWidth, transform: [{ scale }], opacity: fade }]}>
          {toneOf(current) === 'menu' ? null : (
            <View style={[styles.iconWrap, { backgroundColor: tone.tint }]}>
              <Icon size={28} color={tone.color} strokeWidth={2.2} />
            </View>
          )}
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={[styles.buttons, stacked ? { flexDirection: 'column' } : { flexDirection: 'row' }]}>
            {current.buttons.map((b, i) => {
              const secondary = b.style === 'cancel';
              const destructive = b.style === 'destructive';
              const bg = secondary ? '#F1F1F3' : destructive ? '#DC2626' : '#111111';
              return (
                <Pressable
                  key={`${b.text}-${i}`}
                  onPress={() => close(b)}
                  style={({ pressed }) => [
                    styles.button,
                    stacked ? { width: '100%' } : { flex: 1 },
                    { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text numberOfLines={1} style={[styles.buttonText, { color: secondary ? '#333333' : '#FFFFFF' }]}>{b.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  iconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: typography.fontFamily.semiBold, fontSize: 18, lineHeight: 24, color: '#111111', textAlign: 'center' },
  message: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 21, color: '#6B6B73', textAlign: 'center', marginTop: 6 },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
  button: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  buttonText: { fontFamily: typography.fontFamily.medium, fontSize: 15 },
});

/** The look of the live rooms' own dialogs and action lists (Ziigo's): plain white, thin grey text, a gradient Confirm. */
const live = StyleSheet.create({
  backdropCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  backdropBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 18, paddingTop: 34, paddingBottom: 22, alignItems: 'center' },
  line: { fontFamily: typography.fontFamily.regular, fontSize: 16, lineHeight: 22, color: '#4A4A4F', textAlign: 'center' },
  sub: { fontFamily: typography.fontFamily.regular, fontSize: 13, lineHeight: 19, color: '#8A8A8F', textAlign: 'center', marginTop: 8 },
  row: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: 14, marginTop: 30 },
  pill: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pillText: { fontFamily: typography.fontFamily.medium, fontSize: 16 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  sheetTitle: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: '#8A8A8F', textAlign: 'center', paddingVertical: 14 },
  sheetRow: { height: 56, alignItems: 'center', justifyContent: 'center' },
  sheetRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6E6E8' },
  sheetText: { fontFamily: typography.fontFamily.regular, fontSize: 17, color: '#1B1B1B' },
  sheetGap: { height: 8, backgroundColor: '#F2F2F4' },
});
