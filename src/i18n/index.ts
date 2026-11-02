import i18n from 'i18next';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';
import { initReactI18next } from 'react-i18next';

import { findLanguage, LANGUAGES } from './languages';

const STORAGE_KEY = 'guftagu.language';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: Object.fromEntries(LANGUAGES.map((l) => [l.code, { translation: l.messages }])),
  interpolation: { escapeValue: false },
  returnNull: false,
});

I18nManager.allowRTL(true);

/** Restores the saved language; call once at startup. */
export async function loadSavedLanguage() {
  try {
    const code = await SecureStore.getItemAsync(STORAGE_KEY);
    if (code) await i18n.changeLanguage(findLanguage(code).code);
  } catch {
    // Unreadable storage just means we stay on English.
  }
}

/**
 * Switches the whole UI at once (every `useTranslation` consumer re-renders) and
 * remembers the choice. Returns true when the layout direction flipped, which
 * React Native only applies after a restart.
 */
export async function setLanguage(code: string): Promise<boolean> {
  const lang = findLanguage(code);
  await i18n.changeLanguage(lang.code);
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, lang.code);
  } catch {
    // Choice still applies for this session.
  }
  if (I18nManager.isRTL === lang.rtl) return false;
  I18nManager.forceRTL(lang.rtl);
  return true;
}

export default i18n;
