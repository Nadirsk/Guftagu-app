import { useTranslation } from 'react-i18next';
import { DevSettings } from 'react-native';
import { Alert } from './AppAlert';

import { setLanguage } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import SelectModal from './SelectModal';

const OPTIONS = LANGUAGES.map((l) => ({
  value: l.code,
  // English name too, so the search box finds "Hindi" as well as "हिन्दी".
  // The leading LRM pins the row to left-to-right; without it an Arabic-script name
  // makes the whole label RTL and "(Urdu)" jumps to the front.
  label: l.native === l.english ? l.native : `‎${l.native} (${l.english})`,
}));

type Props = { visible: boolean; onClose: () => void };

export default function LanguageModal({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();

  async function choose(code: string) {
    const directionChanged = await setLanguage(code);
    // Reload so the whole app, including the layout direction, starts in the new
    // language. The choice is saved first, so the reloaded app picks it up.
    // DevSettings.reload only exists in dev builds; a release build has no
    // reload API without expo-updates, so it asks for a manual restart instead.
    if (__DEV__) DevSettings.reload();
    else if (directionChanged) Alert.alert(t('common.restartTitle'), t('common.restartBody'));
  }

  return (
    <SelectModal
      visible={visible}
      title={t('common.selectLanguage')}
      options={OPTIONS}
      selectedValue={i18n.language}
      searchable
      searchPlaceholder={t('common.searchLanguages')}
      onSelect={choose}
      onClose={onClose}
    />
  );
}
