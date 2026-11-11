import { Bell, BellOff, Check, Heart, type LucideIcon, MessageCircle, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';

import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/tokens';
import { HEADER } from './geometry';
import { SettingsHeader, styles as s, useSettingsUnit } from './parts';

/**
 * Settings → Notification. Figma's frame (602:4812) was never read — the quota ran out —
 * so this is drawn in the section's own language (white page, Poppins, the Language
 * screen's blue): one master card that pauses everything, then a card of the three kinds,
 * each with what it covers. Saved on the account as `notification_prefs`
 * (`PATCH /profile`); anything never set counts as on.
 */

const BLUE = '#1E74F4';

const KINDS: { key: Kind; title: string; detail: string; Icon: LucideIcon; tint: string }[] = [
  { key: 'messages', title: 'Messages', detail: 'New chats and replies from people', Icon: MessageCircle, tint: BLUE },
  { key: 'moments', title: 'Moments', detail: 'New moments from people you follow', Icon: Sparkles, tint: '#E0459B' },
  { key: 'interactions', title: 'Interaction alerts', detail: 'Likes, comments, follows and gifts', Icon: Heart, tint: '#F07B1D' },
];
type Kind = 'messages' | 'moments' | 'interactions';
type Prefs = Record<Kind, boolean>;
const KEYS: Kind[] = ['messages', 'moments', 'interactions'];

/** A switch that slides and springs; `onDark` is for the blue master card. */
function Toggle({ on, onDark = false, onPress, label }: { on: boolean; onDark?: boolean; onPress: () => void; label: string }) {
  const u = useSettingsUnit();
  const W = 52;
  const H = 30;
  const K = 24;
  const pad = (H - K) / 2;
  const slide = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: on ? 1 : 0, useNativeDriver: false, speed: 22, bounciness: 7 }).start();
  }, [on, slide]);
  const track = onDark ? ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.35)'] : ['rgba(0,0,0,0.12)', BLUE];
  return (
    <Pressable onPress={onPress} hitSlop={u(10)} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }}>
      <Animated.View style={{ width: u(W), height: u(H), borderRadius: u(H / 2), backgroundColor: slide.interpolate({ inputRange: [0, 1], outputRange: track }) }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: u(pad),
            left: slide.interpolate({ inputRange: [0, 1], outputRange: [u(pad), u(W - pad - K)] }),
            width: u(K),
            height: u(K),
            borderRadius: u(K / 2),
            backgroundColor: colors.white,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function NotificationScreen() {
  const u = useSettingsUnit();
  const { user, updateProfile } = useAuth();
  const saved = user?.notification_prefs ?? {};
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    messages: saved.messages !== false,
    moments: saved.moments !== false,
    interactions: saved.interactions !== false,
  }));
  const all = KEYS.every((k) => prefs[k]);
  const none = KEYS.every((k) => !prefs[k]);
  const onCount = KEYS.filter((k) => prefs[k]).length;

  // "Saved", faded in and out after every change that reached the server.
  const toast = useRef(new Animated.Value(0)).current;
  const flashSaved = () => {
    toast.stopAnimation();
    Animated.sequence([
      Animated.timing(toast, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toast, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const write = async (next: Prefs) => {
    const before = prefs;
    setPrefs(next);
    try {
      await updateProfile({ notification_prefs: { ...next, all: KEYS.every((k) => next[k]) } });
      flashSaved();
    } catch (e) {
      setPrefs(before);
      Alert.alert('Notification', e instanceof ApiError ? e.displayMessage : 'Could not save that. Try again.');
    }
  };

  // The master card pauses everything when anything is on, and turns everything back on when all is off.
  const toggleAll = () => write(none ? { messages: true, moments: true, interactions: true } : { messages: false, moments: false, interactions: false });
  const toggle = (k: Kind) => write({ ...prefs, [k]: !prefs[k] });

  const masterOn = !none;
  const status = all ? 'You will hear about everything' : none ? 'Paused — you won’t get any alerts' : `${onCount} of ${KEYS.length} kinds are on`;
  const top = HEADER.back.y + HEADER.back.size + 34;
  const MasterIcon = masterOn ? Bell : BellOff;

  return (
    <View style={s.screen}>
      <SettingsHeader title="Notification" />

      <ScrollView style={{ position: 'absolute', left: 0, right: 0, top: u(top), bottom: 0 }} contentContainerStyle={{ paddingHorizontal: u(21), paddingBottom: u(60) }} showsVerticalScrollIndicator={false}>
        {/* The master switch: blue while anything is on, grey once everything is paused. */}
        <Pressable
          onPress={toggleAll}
          accessibilityRole="switch"
          accessibilityLabel="All notifications"
          accessibilityState={{ checked: masterOn }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: u(14),
            padding: u(18),
            borderRadius: u(20),
            backgroundColor: masterOn ? BLUE : 'rgba(0,0,0,0.05)',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <View style={[s.center, { width: u(48), height: u(48), borderRadius: u(24), backgroundColor: masterOn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)' }]}>
            <MasterIcon size={u(24)} color={masterOn ? colors.white : 'rgba(0,0,0,0.55)'} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: u(2) }}>
            <Text style={[s.medium, { fontSize: u(18), lineHeight: u(23), color: masterOn ? colors.white : '#000' }]}>All notifications</Text>
            <Text style={[s.regular, { fontSize: u(13), lineHeight: u(18), color: masterOn ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)' }]}>{status}</Text>
          </View>
          <Toggle on={masterOn} onDark={masterOn} onPress={toggleAll} label="All notifications" />
        </Pressable>

        <Text style={[s.medium, { marginTop: u(30), marginBottom: u(12), marginLeft: u(4), fontSize: u(14), lineHeight: u(18), opacity: 0.45 }]}>Notify me about</Text>

        <View style={{ borderRadius: u(20), borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {KINDS.map((k, n) => {
            const on = prefs[k.key];
            return (
              <Pressable
                key={k.key}
                onPress={() => toggle(k.key)}
                accessibilityRole="switch"
                accessibilityLabel={k.title}
                accessibilityState={{ checked: on }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: u(14),
                  paddingHorizontal: u(16),
                  paddingVertical: u(16),
                  backgroundColor: pressed ? 'rgba(0,0,0,0.03)' : colors.white,
                  borderTopWidth: n === 0 ? 0 : 1,
                  borderTopColor: 'rgba(0,0,0,0.06)',
                })}
              >
                <View style={[s.center, { width: u(44), height: u(44), borderRadius: u(22), backgroundColor: on ? `${k.tint}1F` : 'rgba(0,0,0,0.05)' }]}>
                  <k.Icon size={u(22)} color={on ? k.tint : 'rgba(0,0,0,0.35)'} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: u(2), opacity: on ? 1 : 0.55 }}>
                  <Text style={[s.medium, { fontSize: u(17), lineHeight: u(22) }]}>{k.title}</Text>
                  <Text style={[s.regular, { fontSize: u(13), lineHeight: u(18), opacity: 0.55 }]}>{k.detail}</Text>
                </View>
                <Toggle on={on} onPress={() => toggle(k.key)} label={k.title} />
              </Pressable>
            );
          })}
        </View>

        <Text style={[s.regular, { marginTop: u(18), marginHorizontal: u(8), textAlign: 'center', fontSize: u(13), lineHeight: u(19), opacity: 0.4 }]}>
          Saved to your account, so they follow you to every phone you sign in on.
        </Text>
      </ScrollView>

      {/* "Saved" — confirms each change reached the server. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          alignSelf: 'center',
          bottom: u(48),
          flexDirection: 'row',
          alignItems: 'center',
          gap: u(6),
          paddingHorizontal: u(16),
          height: u(38),
          borderRadius: u(19),
          backgroundColor: '#111',
          opacity: toast,
          transform: [{ translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [u(10), 0] }) }],
        }}
      >
        <Check size={u(16)} color={colors.white} strokeWidth={2.6} />
        <Text style={[s.medium, { color: colors.white, fontSize: u(14) }]}>Saved</Text>
      </Animated.View>
    </View>
  );
}
