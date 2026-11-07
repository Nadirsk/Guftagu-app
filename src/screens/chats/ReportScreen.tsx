import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Check,
  EyeOff,
  Lock,
  Mail,
  ShieldAlert,
  Tag,
  TriangleAlert,
  User,
  X,
} from 'lucide-react-native';
import { type ComponentType, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError, uploadFile } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { useDesignScale } from '../../theme/layout';
import { colors, typography } from '../../theme/tokens';
import { avatarOf, nameOf } from './parts';
import { UserAvatar } from '../../components/UserAvatar';

/**
 * Report a user. Chat Settings → Report.
 *
 * Submit is real: the screenshot (if any) goes up through `POST /media`, then
 * `POST /reports` writes the report into the same table the Moderator queue
 * reads, so it is in the queue the moment it is sent.
 *
 * Each reason files under one of `reports.category`'s values.
 */

const INK = '#17171A';
const SUBTLE = '#6B6B73';
const HAIRLINE = '#EEECE8';
const WASH = '#F4F3F1';
const ACCENT = '#D13D00';
const ACCENT_TEXT = '#B83500';
const ACCENT_WASH = '#FDF1EA';
const ACCENT_ICON = '#FBE3D6';

const MAX_REASON = 500;

type Reason = {
  /** `reports.category` */
  category: string;
  title: string;
  hint: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

const REASONS: Reason[] = [
  { category: 'abuse', title: 'Inappropriate nickname', hint: 'Offensive or misleading name', Icon: Tag },
  { category: 'nudity', title: 'Pornographic or vulgar', hint: 'Nudity, sexual or explicit content', Icon: EyeOff },
  { category: 'spam', title: 'Advertising or spam', hint: 'Promotions, links or repeated messages', Icon: Mail },
  { category: 'harassment', title: 'Personal attack', hint: 'Insults, threats or harassment', Icon: TriangleAlert },
  { category: 'fraud', title: 'Scam or fraud', hint: 'Asking for money or tricking others', Icon: ShieldAlert },
  { category: 'underage', title: 'Underage user', hint: 'Looks younger than 18', Icon: User },
];

export default function ReportScreen() {
  const { px } = useDesignScale();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userUuid, peer } = useRoute<RouteProp<RootStackParamList, 'Report'>>().params;
  const { token } = useAuth();

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Android is edge-to-edge, so the window does not resize for the keyboard: pad the
  // bottom by its height so the Send button stays above it.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const ready = reason !== null && details.trim().length >= 3;

  const pickPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!picked.canceled && picked.assets[0]) {
      const asset = picked.assets[0];
      setPhoto({ uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' });
    }
  };

  const send = async () => {
    if (!ready || sending || !reason) return;
    setSending(true);
    setError(null);
    try {
      const evidence = photo ? [(await uploadFile<{ url: string }>('/media', photo, token)).url] : undefined;
      await api('/reports', {
        method: 'POST',
        token,
        body: {
          target_uuid: userUuid,
          category: reason.category,
          // The category carries the kind; the wording they picked is worth keeping too.
          description: `${reason.title}: ${details.trim()}`,
          ...(evidence ? { evidence_urls: evidence } : null),
        },
      });
      Keyboard.dismiss();
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.displayMessage : 'Could not send the report. Try again.');
    } finally {
      setSending(false);
    }
  };

  const helper = error ?? (ready ? '' : reason ? 'Add a few words about what happened.' : 'Choose a reason to continue.');

  if (sent) {
    return (
      <View style={[styles.screen, styles.sentWrap, { paddingHorizontal: px(32) }]}>
        <View style={[styles.sentHalo, { width: px(84), height: px(84), borderRadius: px(42) }]}>
          <View style={[styles.sentDisc, { width: px(56), height: px(56), borderRadius: px(28) }]}>
            <Check size={px(28)} color={colors.white} strokeWidth={3} />
          </View>
        </View>
        <Text style={[styles.sentTitle, { marginTop: px(24), fontSize: px(22) }]}>Report sent</Text>
        <Text style={[styles.sentBody, { marginTop: px(8), fontSize: px(14.5), lineHeight: px(23), maxWidth: px(290) }]}>
          Thank you for helping keep Guftagu safe. Our team will review it and act if it breaks the rules.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          style={[styles.primary, { marginTop: px(32), height: px(52), borderRadius: px(26), alignSelf: 'stretch' }]}
        >
          <Text style={[styles.primaryLabel, { fontSize: px(16) }]}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 16) + px(6), paddingHorizontal: px(8), paddingBottom: px(8) },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityLabel="Back"
          style={[styles.back, { width: px(44), height: px(44) }]}
        >
          <ArrowLeft size={px(24)} color={INK} />
        </Pressable>
        <Text style={[styles.title, { fontSize: px(18) }]}>Report</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: px(16), paddingTop: px(16), paddingBottom: px(24) }}
      >
        {/* who */}
        <View style={[styles.who, { padding: px(14), borderRadius: px(18), gap: px(12) }]}>
          {peer ? (
            <UserAvatar source={avatarOf(peer)} frame={peer.frame} size={px(48)} imageStyle={{ backgroundColor: colors.white }} />
          ) : (
            <View style={[styles.avatarFallback, { width: px(48), height: px(48), borderRadius: px(24) }]}>
              <User size={px(22)} color={SUBTLE} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.whoName, { fontSize: px(16) }]}>
              {peer ? nameOf(peer) : 'This user'}
            </Text>
            <Text style={[styles.muted, { marginTop: px(1), fontSize: px(12.5) }]}>You are reporting this profile</Text>
          </View>
        </View>

        {/* reason */}
        <Text style={[styles.h2, { marginTop: px(22), fontSize: px(16) }]}>What is the problem?</Text>
        <Text style={[styles.muted, { marginTop: px(2), fontSize: px(13) }]}>Choose the one that fits best.</Text>
        <View accessibilityRole="radiogroup" style={{ marginTop: px(12), gap: px(8) }}>
          {REASONS.map((r) => {
            const on = reason?.category === r.category;
            return (
              <Pressable
                key={r.category}
                onPress={() => setReason(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[
                  styles.option,
                  {
                    paddingVertical: px(12),
                    paddingHorizontal: px(14),
                    borderRadius: px(16),
                    gap: px(12),
                    borderColor: on ? ACCENT : HAIRLINE,
                    backgroundColor: on ? ACCENT_WASH : colors.white,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { width: px(38), height: px(38), borderRadius: px(19), backgroundColor: on ? ACCENT_ICON : WASH },
                  ]}
                >
                  <r.Icon size={px(19)} color={on ? ACCENT_TEXT : INK} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { fontSize: px(14.5), lineHeight: px(20) }]}>{r.title}</Text>
                  <Text style={[styles.muted, { fontSize: px(12.5), lineHeight: px(18) }]}>{r.hint}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      width: px(22),
                      height: px(22),
                      borderRadius: px(11),
                      borderColor: on ? ACCENT : '#B9B6B0',
                      backgroundColor: on ? ACCENT : colors.white,
                    },
                  ]}
                >
                  {on ? <Check size={px(12)} color={colors.white} strokeWidth={3.5} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* details */}
        <Text style={[styles.h2, { marginTop: px(24), fontSize: px(16) }]}>Tell us what happened</Text>
        <Text style={[styles.muted, { marginTop: px(2), fontSize: px(13) }]}>Names, times or messages help us act faster.</Text>
        <View style={[styles.box, { marginTop: px(12), borderRadius: px(16), paddingHorizontal: px(14), paddingTop: px(12), paddingBottom: px(8) }]}>
          <TextInput
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={MAX_REASON}
            placeholder="Write what they did…"
            placeholderTextColor={SUBTLE}
            textAlignVertical="top"
            accessibilityLabel="What happened"
            style={[styles.input, { height: px(96), fontSize: px(14.5), lineHeight: px(22) }]}
          />
          <Text style={[styles.counter, { fontSize: px(12) }]}>{details.length}/{MAX_REASON}</Text>
        </View>

        {/* screenshot */}
        <Text style={[styles.h2, { marginTop: px(24), fontSize: px(16) }]}>
          Add a screenshot <Text style={[styles.muted, { fontSize: px(13) }]}>(optional)</Text>
        </Text>
        <View style={{ marginTop: px(12), flexDirection: 'row' }}>
          {photo ? (
            <View style={{ width: px(96), height: px(96), borderRadius: px(16), overflow: 'hidden' }}>
              <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ width: px(96), height: px(96) }} />
              <Pressable
                onPress={() => setPhoto(null)}
                hitSlop={8}
                accessibilityLabel="Remove photo"
                style={[styles.removePhoto, { top: px(6), right: px(6), width: px(26), height: px(26), borderRadius: px(13) }]}
              >
                <X size={px(12)} color={colors.white} strokeWidth={3} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickPhoto}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              style={[styles.addPhoto, { width: px(96), height: px(96), borderRadius: px(16), gap: px(6) }]}
            >
              <Camera size={px(24)} color={SUBTLE} strokeWidth={1.8} />
              <Text style={[styles.addPhotoLabel, { fontSize: px(12.5) }]}>Add photo</Text>
            </Pressable>
          )}
        </View>

        {/* privacy */}
        <View style={{ marginTop: px(24), flexDirection: 'row', gap: px(10), alignItems: 'flex-start' }}>
          <View style={{ marginTop: px(2) }}>
            <Lock size={px(16)} color={SUBTLE} />
          </View>
          <Text style={[styles.muted, { flex: 1, fontSize: px(12.5), lineHeight: px(19) }]}>
            Reports are private. The person you report is not told who sent it.
          </Text>
        </View>
      </ScrollView>

      {/* send */}
      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: px(16),
            paddingTop: px(10),
            paddingBottom: keyboardHeight > 0 ? px(10) : Math.max(insets.bottom, px(10)) + px(8),
          },
        ]}
      >
        <Pressable
          onPress={send}
          disabled={!ready || sending}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || sending }}
          style={[styles.primary, { height: px(52), borderRadius: px(26), backgroundColor: ready ? ACCENT : '#EDEBE7' }]}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.primaryLabel, { fontSize: px(16), color: ready ? colors.white : '#8A8A92' }]}>Send report</Text>
          )}
        </Pressable>
        <Text
          style={[styles.helper, { marginTop: px(8), minHeight: px(18), fontSize: px(12.5), color: error ? '#C62828' : SUBTLE }]}
        >
          {helper}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  back: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: typography.fontFamily.semiBold, color: INK, marginLeft: 4 },

  who: { flexDirection: 'row', alignItems: 'center', backgroundColor: WASH },
  whoName: { fontFamily: typography.fontFamily.semiBold, color: INK },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  h2: { fontFamily: typography.fontFamily.semiBold, color: INK },
  muted: { fontFamily: typography.fontFamily.regular, color: SUBTLE },

  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  optionIcon: { alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: typography.fontFamily.medium, color: INK },
  radio: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  box: { backgroundColor: WASH },
  input: { fontFamily: typography.fontFamily.regular, color: INK, padding: 0 },
  counter: { fontFamily: typography.fontFamily.regular, color: SUBTLE, textAlign: 'right' },

  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9B6B0' },
  addPhotoLabel: { fontFamily: typography.fontFamily.medium, color: SUBTLE },
  removePhoto: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },

  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: HAIRLINE },
  primary: { alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  primaryLabel: { fontFamily: typography.fontFamily.semiBold, color: colors.white },
  helper: { fontFamily: typography.fontFamily.regular, textAlign: 'center' },

  sentWrap: { alignItems: 'center', justifyContent: 'center' },
  sentHalo: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDEEE6' },
  sentDisc: { alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  sentTitle: { fontFamily: typography.fontFamily.semiBold, color: INK },
  sentBody: { fontFamily: typography.fontFamily.regular, color: SUBTLE, textAlign: 'center' },
});
