import { CircleQuestionMark, Mars, Transgender, Venus } from 'lucide-react-native';

import type { SelectOption } from '../components/SelectModal';

/**
 * `apiValue` is what POST /auth/profile/setup accepts — the backend enum is only
 * male/female/undisclosed, so the two non-binary choices both report as
 * undisclosed while staying distinct in the UI.
 */
export type GenderOption = SelectOption & {
  apiValue: 'male' | 'female' | 'undisclosed';
};

export const GENDER_OPTIONS: GenderOption[] = [
  { value: 'Male', label: 'Male', Icon: Mars, apiValue: 'male' },
  { value: 'Female', label: 'Female', Icon: Venus, apiValue: 'female' },
  { value: 'Other', label: 'Other', Icon: Transgender, apiValue: 'undisclosed' },
  {
    value: 'Prefer not to say',
    label: 'Prefer not to say',
    Icon: CircleQuestionMark,
    apiValue: 'undisclosed',
  },
];

/** Translation keys for each choice's label — sign-up and Settings → Account share them. */
export const GENDER_LABEL_KEYS: Record<string, string> = {
  Male: 'profile.male',
  Female: 'profile.female',
  Other: 'profile.other',
  'Prefer not to say': 'profile.preferNot',
};

/**
 * The choice a saved gender reads as. `undisclosed` covers both Other and Prefer not to
 * say, so it shows as Other.
 */
export const genderOptionFor = (apiValue: string | null | undefined) =>
  GENDER_OPTIONS.find((o) => o.apiValue === apiValue);

