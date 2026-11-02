import ar from './locales/ar';
import bn from './locales/bn';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import hi from './locales/hi';
import ur from './locales/ur';

export type Language = {
  code: string;
  /** Name written in the language itself, so a user who can't read the current UI still finds it. */
  native: string;
  english: string;
  rtl: boolean;
  messages: object;
};

// Adding a language = add one locale file and one row here.
export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English', rtl: false, messages: en },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', rtl: false, messages: hi },
  { code: 'ur', native: 'اردو', english: 'Urdu', rtl: true, messages: ur },
  { code: 'ar', native: 'العربية', english: 'Arabic', rtl: true, messages: ar },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', rtl: false, messages: bn },
  { code: 'es', native: 'Español', english: 'Spanish', rtl: false, messages: es },
  { code: 'fr', native: 'Français', english: 'French', rtl: false, messages: fr },
];

export const findLanguage = (code: string) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
