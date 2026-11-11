import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, DevSettings, Pressable, Text, View } from 'react-native';
import { Alert } from '../../components/AppAlert';

import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { setLanguage } from '../../i18n';
import { findLanguage } from '../../i18n/languages';
import { LANGUAGE } from './geometry';
import { SettingsHeader, styles as s, useSettingsUnit } from './parts';

/** Figma's five, in its order and spelling. */
const CHOICES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ur', label: 'Urdu' },
  { code: 'bn', label: 'Bengal' },
];

/**
 * Settings → Language (Figma 602:4688). The choice is saved on the account
 * (`PATCH /profile`, `language`) and switches the app's own text where a translation
 * exists; Marathi has none yet, so the app stays in English for it.
 */
export default function LanguageScreen() {
  const u = useSettingsUnit();
  const { i18n } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const current = user?.language ?? i18n.language ?? 'en';

  const choose = async (code: string) => {
    if (code === current || saving) return;
    setSaving(code);
    try {
      await updateProfile({ language: code });
      const uiChanges = findLanguage(code).code !== i18n.language;
      const directionChanged = await setLanguage(code);
      // Restart the JS so every screen comes back in the new language — as the
      // language picker on the welcome screen does; a release build asks instead.
      if (uiChanges && __DEV__) DevSettings.reload();
      else if (directionChanged) Alert.alert('Language', 'Restart the app to finish switching the layout direction.');
    } catch (e) {
      Alert.alert('Language', e instanceof ApiError ? e.displayMessage : 'Could not change the language.');
    } finally {
      setSaving(null);
    }
  };

  const L = LANGUAGE;
  return (
    <View style={s.screen}>
      <SettingsHeader title="Language" />
      <View style={{ position: 'absolute', left: u(L.x), top: u(L.y), width: u(L.width), gap: u(L.gap) }}>
        {CHOICES.map((c) => {
          const on = c.code === current;
          const look = on ? L.on : L.off;
          return (
            <Pressable
              key={c.code}
              onPress={() => choose(c.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[s.center, { height: u(L.height), borderRadius: u(L.radius), borderWidth: 1, borderColor: look.border, backgroundColor: look.background }]}
            >
              {saving === c.code ? (
                <ActivityIndicator color={L.on.text} />
              ) : (
                <Text style={[s.medium, { color: look.text, fontSize: u(L.size) }]}>{c.label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
