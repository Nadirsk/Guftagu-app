import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Alert } from '../../components/AppAlert';
import { SvgXml } from 'react-native-svg';

import { API_BASE_URL } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../theme/tokens';
import { FEEDBACK } from './geometry';
import { SettingsHeader, styles as s, useSettingsUnit } from './parts';

/** camera (606:3684) — Material Symbols photo_camera, in the page's faded ink. */
const camera = `<svg width="24" height="24" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path fill="rgba(0,0,0,0.3)" d="M480-260q75 0 127.5-52.5T660-440q0-75-52.5-127.5T480-620q-75 0-127.5 52.5T300-440q0 75 52.5 127.5T480-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM160-120q-33 0-56.5-23.5T80-200v-480q0-33 23.5-56.5T160-760h126l74-80h240l74 80h126q33 0 56.5 23.5T880-680v480q0 33-23.5 56.5T800-120H160Zm0-80h640v-480H638l-73-80H395l-73 80H160v480Zm320-240Z"/></svg>`;

/** `FeedbackController::store` caps. */
const DESCRIPTION_MAX = 120;
const CONTACT_MAX = 100;
const IMAGES_MAX = 6;

type Picked = { uri: string; mime: string; name: string };

/**
 * Settings → Feedback (Figma 602:4907): what went wrong, up to six photos, and an email
 * to answer on. Sent as one multipart `POST /feedback`, so the photos travel with it.
 */
export default function FeedbackScreen() {
  const u = useSettingsUnit();
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const [text, setText] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);

  const addPhotos = async () => {
    const room = IMAGES_MAX - photos.length;
    if (room <= 0) return Alert.alert('Upload photos', `You can add up to ${IMAGES_MAX} photos.`);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: room });
    if (result.canceled) return;
    const picked = result.assets.slice(0, room).map((a, i) => {
      const mime = a.mimeType ?? 'image/jpeg';
      return { uri: a.uri, mime, name: a.fileName ?? `feedback-${Date.now()}-${i}.${mime.split('/')[1] ?? 'jpg'}` };
    });
    setPhotos((prev) => [...prev, ...picked]);
  };

  const submit = async () => {
    if (!text.trim()) return Alert.alert('Feedback', 'Tell us what happened first.');
    // Flow chart: feedback needs at least 10 words.
    const words = text.trim().split(/\s+/).length;
    if (words < 10) return Alert.alert('Feedback', `Please write at least 10 words so we can help you better (you wrote ${words}).`);
    if (!email.trim()) return Alert.alert('Feedback', 'Add an email so we can reply.');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('description', text.trim());
      form.append('contact', email.trim());
      // React Native's FormData takes a file as { uri, name, type }.
      photos.forEach((p) => form.append('images[]', { uri: p.uri, name: p.name, type: p.mime } as unknown as Blob));
      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : null) },
        body: form,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) {
        const details = body?.error?.details as Record<string, string[]> | undefined;
        throw new Error((details && Object.values(details)[0]?.[0]) || body?.message || 'Could not send your feedback.');
      }
      Alert.alert('Feedback', body?.message ?? 'Thanks for your feedback!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Feedback', e instanceof Error ? e.message : 'Could not send your feedback.');
    } finally {
      setBusy(false);
    }
  };

  const F = FEEDBACK;
  const B = F.box;
  const U = F.upload;
  const C = F.contact;
  const labelStyle = [s.medium, { fontSize: u(F.label.size), lineHeight: u(F.label.line) }];
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ height: u(F.submit.y + F.submit.height + 40) }} keyboardShouldPersistTaps="handled">
        <SettingsHeader title="Feedback" />

        {/* Frame 1597881638 — the description. */}
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          maxLength={DESCRIPTION_MAX}
          textAlignVertical="top"
          placeholder="Please write 10 more words , for we can provide better help"
          placeholderTextColor="rgba(0,0,0,0.3)"
          style={[
            s.regular,
            {
              position: 'absolute',
              left: u(F.x),
              top: u(B.y),
              width: u(B.width),
              height: u(B.height),
              borderRadius: u(F.radius),
              backgroundColor: F.field,
              paddingHorizontal: u(B.padX),
              paddingTop: u(B.padY),
              paddingBottom: u(16),
              fontSize: u(B.size),
              lineHeight: u(B.line),
            },
          ]}
        />

        {/* Frame 1597881642 — Upload Image; picked photos line up to its right. */}
        <Text style={[labelStyle, { position: 'absolute', left: u(F.x), top: u(U.labelY) }]}>Upload Image</Text>
        <View style={{ position: 'absolute', left: u(F.x), top: u(U.boxY), flexDirection: 'row', gap: u(10) }}>
          <Pressable onPress={addPhotos} style={[s.center, { width: u(U.width), height: u(U.height), borderRadius: u(F.radius), backgroundColor: F.field }]}>
            <SvgXml xml={camera} width={u(U.camera)} height={u(U.camera)} />
            <Text style={[s.regular, { fontSize: u(U.size), lineHeight: u(U.line), opacity: 0.4, marginTop: u(2) }]}>Upload photos</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: u(397 - U.width - 10) }} contentContainerStyle={{ gap: u(8) }}>
            {photos.map((p, i) => (
              <Pressable key={p.uri} onLongPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>
                <Image source={{ uri: p.uri }} style={{ width: u(U.height * 0.8), height: u(U.height), borderRadius: u(F.radius) }} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Frame 1597881640 — Contact Information. */}
        <Text style={[labelStyle, { position: 'absolute', left: u(F.x), top: u(C.labelY) }]}>Contact Information</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          maxLength={CONTACT_MAX}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          placeholderTextColor="rgba(0,0,0,0.3)"
          style={[s.regular, { position: 'absolute', left: u(F.x), top: u(C.fieldY), width: u(C.width), height: u(C.height), borderRadius: u(F.radius), backgroundColor: F.field, paddingHorizontal: u(C.padX), fontSize: u(C.size) }]}
        />

        {/* Frame 1597881643 — Submit. */}
        <Pressable
          onPress={submit}
          disabled={busy}
          style={[s.center, { position: 'absolute', left: u(F.x), top: u(F.submit.y), width: u(F.submit.width), height: u(F.submit.height), borderRadius: u(F.radius), backgroundColor: '#000000', opacity: busy ? 0.6 : 1 }]}
        >
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={[s.medium, { color: colors.white, fontSize: u(F.submit.size), lineHeight: u(F.submit.line) }]}>Submit</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
